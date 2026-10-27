import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { livekitService } from '../../services/livekitService';

export function useCallsLogic(currentUser: any, showToast: any) {
  const [currentCall, setCurrentCall] = useState<any | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<any | null>(null);
  const [isCallMinimized, setIsCallMinimized] = useState<boolean>(false);
  const [activeGroupCalls, setActiveGroupCalls] = useState<Record<string, any>>({});

  // Вспомогательная функция для надёжного извлечения числового ID пользователя
  const resolveNumericId = async (userObj: any): Promise<number | null> => {
    if (!userObj) return null;
    const directNum = Number(userObj.id);
    if (!isNaN(directNum) && directNum > 0) return directNum;

    // Если userObj.id это UUID — ищем числовой ID в таблице users
    const uuidToSearch = userObj.uuid || userObj.id;
    if (uuidToSearch) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .or(`uuid.eq.${uuidToSearch},id.eq.${uuidToSearch}`)
        .maybeSingle();

      if (data && Number(data.id)) {
        return Number(data.id);
      }
    }
    return null;
  };

  // 📞 Старт звонка
  const handleStartAudioCall = async (targetId: string | number, options?: { isGroup?: boolean; isSilent?: boolean }) => {
    let effectiveUser = currentUser;
    if (!effectiveUser) {
      const { data: { session } } = await supabase.auth.getSession();
      effectiveUser = session?.user;
    }

    if (!effectiveUser) {
      showToast('Ошибка авторизации профиля', 'error');
      return;
    }

    // 🎯 Разрешаем числовой ID даже если у пользователя строковый UUID
    const myNumericId = await resolveNumericId(effectiveUser);
    const myIdStr = String(myNumericId || effectiveUser.id || '');

    if (!myNumericId) {
      console.error('[WebRTC] Не удалось определить числовой ID для пользователя:', effectiveUser);
      showToast('Ошибка: профиль не найден в базе', 'error');
      return;
    }

    const isGroup = options?.isGroup || String(targetId).startsWith('group_');
    const isSilent = Boolean(options?.isSilent);

    const rawTargetId = String(targetId).replace('group_', '');
    const receiverIdStr = isGroup ? `group_${rawTargetId}` : String(targetId);

    if (!isGroup && (receiverIdStr === myIdStr || receiverIdStr === String(effectiveUser.uuid))) {
      showToast('Вы не можете позвонить самому себе! ❌', 'error');
      return;
    }

    try {
      // Для личного звонка также пытаемся определить числовой ID собеседника
      let partnerNumericId: number | null = null;
      if (!isGroup) {
        partnerNumericId = Number(rawTargetId);
        if (isNaN(partnerNumericId) || partnerNumericId <= 0) {
          const { data: pUser } = await supabase
            .from('users')
            .select('id')
            .or(`uuid.eq.${rawTargetId},id.eq.${rawTargetId}`)
            .maybeSingle();
          if (pUser) partnerNumericId = Number(pUser.id);
        }
      }

      // Генерация имени комнаты: call_min_max для ЛС
      const generatedRoomName = isGroup
        ? `call_group_${receiverIdStr.replace('group_', '')}`
        : (partnerNumericId
            ? (myNumericId < partnerNumericId
                ? `call_${myNumericId}_${partnerNumericId}`
                : `call_${partnerNumericId}_${myNumericId}`)
            : `call_${myNumericId}_${rawTargetId}`);

      // 1. Генерируем токен LiveKit
      const token = await livekitService.generateToken(
        generatedRoomName,
        myIdStr,
        effectiveUser.username || `User_${myNumericId}`
      );

      // 2. Проверяем существующий звонок
      const { data: existingCall } = await supabase
        .from('calls')
        .select('*')
        .eq('roomName', generatedRoomName)
        .in('status', ['ringing', 'accepted'])
        .maybeSingle();

      if (existingCall) {
        await handleJoinExistingCall(existingCall);
        return;
      }

      // Очистка старых звонков между собеседниками
      if (!isGroup && partnerNumericId) {
        await supabase
          .from('calls')
          .delete()
          .or(`and(callerId.eq.${myNumericId},receiverId.eq.${receiverIdStr}),and(callerId.eq.${partnerNumericId},receiverId.eq.${myIdStr})`);
      }

      const initialStatus = isSilent ? 'accepted' : 'ringing';

      // 3. Создаем запись в calls
      const { data: newCallRow, error: insertError } = await supabase
        .from('calls')
        .insert([{
          roomName: generatedRoomName,
          token,
          callerId: myNumericId,
          receiverId: receiverIdStr,
          status: initialStatus
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // 4. Добавляем себя в call_participants
      await supabase
        .from('call_participants')
        .insert([{
          callId: Number(newCallRow.id),
          userId: myNumericId
        }]);

      setCurrentCall({ ...newCallRow, isGroup, isSilent, token });
      setIsCallMinimized(false);
      showToast(isSilent ? 'Комната создана. Вы в сети' : 'Вызов начат...', 'info');

    } catch (err: any) {
      console.error('Ошибка запуска звонка:', err);
      showToast(`Ошибка запуска звонка: ${err.message}`, 'error');
    }
  };

  // 🚪 Присоединение к уже существующему звонку
  const handleJoinExistingCall = async (callToJoin: any) => {
    try {
      const myNumericId = await resolveNumericId(currentUser);
      if (!myNumericId) throw new Error('Не определен ID пользователя');
      const myIdStr = String(myNumericId);

      const token = await livekitService.generateToken(
        callToJoin.roomName,
        myIdStr,
        currentUser?.username || `User_${myNumericId}`
      );

      const { data: existingPart } = await supabase
        .from('call_participants')
        .select('id')
        .eq('callId', Number(callToJoin.id))
        .eq('userId', myNumericId)
        .maybeSingle();

      if (!existingPart) {
        await supabase
          .from('call_participants')
          .insert([{
            callId: Number(callToJoin.id),
            userId: myNumericId
          }]);
      }

      setCurrentCall({ ...callToJoin, token });
      setIncomingCallData(null);
      setIsCallMinimized(false);
      showToast('Вы присоединились к звонку 🎙️', 'success');
    } catch (err: any) {
      console.error('Ошибка входа в звонок:', err);
      showToast('Не удалось войти в звонок', 'error');
    }
  };

  // ✅ Принятие входящего вызова
  const handleAcceptCall = async () => {
    if (!incomingCallData) return;
    try {
      const myNumericId = await resolveNumericId(currentUser);
      if (!myNumericId) throw new Error('Не определен ID пользователя');
      const myIdStr = String(myNumericId);

      const { data, error } = await supabase
        .from('calls')
        .update({ status: 'accepted' })
        .eq('id', Number(incomingCallData.id))
        .select()
        .single();

      if (error) throw error;

      const token = await livekitService.generateToken(
        data.roomName,
        myIdStr,
        currentUser?.username || `User_${myNumericId}`
      );

      await supabase
        .from('call_participants')
        .insert([{
          callId: Number(incomingCallData.id),
          userId: myNumericId
        }]);

      setCurrentCall({ ...data, token });
      setIncomingCallData(null);
      setIsCallMinimized(false);
    } catch (err) {
      console.error('Ошибка принятия вызова:', err);
    }
  };

  // ❌ Отбой / Завершение
  const handleHangUp = async () => {
    const active = currentCall || incomingCallData;
    if (!active) return;

    try {
      const myNumericId = await resolveNumericId(currentUser);

      setCurrentCall(null);
      setIncomingCallData(null);
      setIsCallMinimized(false);

      if (myNumericId) {
        await supabase
          .from('call_participants')
          .delete()
          .eq('callId', Number(active.id))
          .eq('userId', myNumericId);
      }

      const isGroupCall = String(active.receiverId).startsWith('group_');

      if (!isGroupCall && active.status === 'ringing') {
        await supabase
          .from('calls')
          .update({ status: 'cancelled' })
          .eq('id', Number(active.id));
      } else {
        const { data: remaining } = await supabase
          .from('call_participants')
          .select('id')
          .eq('callId', Number(active.id));

        if (!remaining || remaining.length === 0) {
          await supabase
            .from('calls')
            .update({ status: 'ended' })
            .eq('id', Number(active.id));
        }
      }
      showToast('Звонок завершён', 'info');
    } catch (err) {
      console.error('Ошибка при выходе из звонка:', err);
    }
  };

  // 🕒 Realtime подписка на входящие вызовы
  useEffect(() => {
    if (!currentUser) return;

    const myNumericId = Number(currentUser.id);
    const myIdStr = String(currentUser.id || '');
    const myUuidStr = String(currentUser.uuid || '');

    const channel = supabase
      .channel('calls-live-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls' },
        async (payload: any) => {
          const row = payload.new;
          if (!row) return;

          const isGroup = String(row.roomName).startsWith('call_group_') || String(row.receiverId).startsWith('group_');
          const isCaller = Number(row.callerId) === myNumericId || String(row.callerId) === myUuidStr;
          const isReceiver = String(row.receiverId) === myIdStr || String(row.receiverId) === myUuidStr;

          const groupKey = isGroup 
            ? (String(row.receiverId).startsWith('group_') ? row.receiverId : `group_${row.receiverId}`)
            : null;

          if (payload.eventType === 'INSERT') {
            if (!isCaller && row.status === 'ringing') {
              if (isGroup) {
                const numericChatId = Number(
                  row.roomName.replace('call_group_', '').replace('group_', '') || 
                  row.receiverId.replace('group_', '')
                );

                const { data: membership } = await supabase
                  .from('chat_members')
                  .select('id')
                  .eq('chatId', numericChatId)
                  .or(`userId.eq.${myUuidStr},userId.eq.${myIdStr}`)
                  .maybeSingle();

                if (membership) {
                  setIncomingCallData(row);
                }
              } else if (isReceiver) {
                setIncomingCallData(row);
              }
            }

            if (isGroup && groupKey && row.status !== 'ended' && row.status !== 'cancelled') {
              setActiveGroupCalls(prev => ({ ...prev, [groupKey]: row }));
            }
          }

          if (payload.eventType === 'UPDATE') {
            if (row.status === 'accepted') {
              if (currentCall && Number(currentCall.id) === Number(row.id)) {
                setCurrentCall((prev: any) => ({ ...prev, status: 'accepted' }));
              }
            }

            if (row.status === 'cancelled' || row.status === 'ended') {
              if (currentCall && Number(currentCall.id) === Number(row.id)) {
                setCurrentCall(null);
                setIsCallMinimized(false);
              }
              if (incomingCallData && Number(incomingCallData.id) === Number(row.id)) {
                setIncomingCallData(null);
              }
              if (isGroup && groupKey) {
                setActiveGroupCalls(prev => {
                  const updated = { ...prev };
                  delete updated[groupKey];
                  return updated;
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, currentCall, incomingCallData]);

  return {
    currentCall, setCurrentCall,
    incomingCallData, setIncomingCallData,
    isCallMinimized, setIsCallMinimized,
    activeGroupCalls,
    handleStartAudioCall,
    handleJoinExistingCall,
    handleAcceptCall,
    handleHangUp
  };
}