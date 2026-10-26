import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { livekitService } from '../../services/livekitService';

export function useCallsLogic(currentUser: any, showToast: any) {
  const [currentCall, setCurrentCall] = useState<any | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<any | null>(null);
  const [isCallMinimized, setIsCallMinimized] = useState<boolean>(false);
  const [activeGroupCalls, setActiveGroupCalls] = useState<Record<string, any>>({});

  // ЧИСЛОВОЙ ID пользователя для колонок int8 в Supabase (callerId, userId)
  const myNumericId = Number(currentUser?.id);
  const myIdStr = String(currentUser?.id || '');

  // 📞 Старт звонка
  const handleStartAudioCall = async (targetId: string | number, options?: { isGroup?: boolean; isSilent?: boolean }) => {
    if (!currentUser || !myNumericId) {
      showToast('Ошибка авторизации профиля', 'error');
      return;
    }

    const isGroup = options?.isGroup || String(targetId).startsWith('group_');
    const isSilent = Boolean(options?.isSilent);

    // Гарантируем, что для групп в receiverId всегда пишется "group_ID"
    const rawTargetId = String(targetId).replace('group_', '');
    const receiverIdStr = isGroup ? `group_${rawTargetId}` : String(targetId);

    // Защита от звонка самому себе в ЛС
    if (!isGroup && receiverIdStr === myIdStr) {
      showToast('Вы не можете позвонить самому себе! ❌', 'error');
      return;
    }

    try {
      // Имя комнаты: call_group_123 для групп, call_minId_maxId для direct
      const generatedRoomName = isGroup
        ? `call_group_${receiverIdStr.replace('group_', '')}`
        : (myNumericId < Number(receiverIdStr)
            ? `call_${myNumericId}_${receiverIdStr}`
            : `call_${receiverIdStr}_${myNumericId}`);

      // 1. Генерируем токен LiveKit
      const token = await livekitService.generateToken(
        generatedRoomName,
        myIdStr,
        currentUser.username || `User_${myNumericId}`
      );

      // 2. Проверяем, идёт ли уже звонок в этой комнате
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

      // Если личный звонок — удаляем зависшие старые вызовы между этими двумя собеседниками
      if (!isGroup) {
        await supabase
          .from('calls')
          .delete()
          .or(`and(callerId.eq.${myNumericId},receiverId.eq.${receiverIdStr}),and(callerId.eq.${Number(receiverIdStr)},receiverId.eq.${myIdStr})`);
      }

      const initialStatus = isSilent ? 'accepted' : 'ringing';

      // 3. Создаем запись в calls (callerId = int8, receiverId = text)
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

      // 4. Добавляем себя в call_participants (callId = int8, userId = int8)
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
      const token = await livekitService.generateToken(
        callToJoin.roomName,
        myIdStr,
        currentUser?.username || `User_${myNumericId}`
      );

      // Проверяем, не записаны ли мы уже в участники
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
      setCurrentCall(null);
      setIncomingCallData(null);
      setIsCallMinimized(false);

      // Удаляем себя из списка активных участников
      await supabase
        .from('call_participants')
        .delete()
        .eq('callId', Number(active.id))
        .eq('userId', myNumericId);

      const isGroupCall = String(active.receiverId).startsWith('group_');

      if (!isGroupCall && active.status === 'ringing') {
        // Личный вызов отклонен до поднятия трубки
        await supabase
          .from('calls')
          .update({ status: 'cancelled' })
          .eq('id', Number(active.id));
      } else {
        // Проверяем, остался ли кто-то ещё в комнате
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

          console.log('[WebRTC_Call_Event]', payload.eventType, row);

          // 🎯 Надёжное определение группы по roomName или receiverId
          const isGroup = String(row.roomName).startsWith('call_group_') || String(row.receiverId).startsWith('group_');
          const isCaller = Number(row.callerId) === myNumericId || String(row.callerId) === myUuidStr;
          const isReceiver = String(row.receiverId) === myIdStr || String(row.receiverId) === myUuidStr;

          const groupKey = isGroup 
            ? (String(row.receiverId).startsWith('group_') ? row.receiverId : `group_${row.receiverId}`)
            : null;

          if (payload.eventType === 'INSERT') {
            if (!isCaller && row.status === 'ringing') {
              if (isGroup) {
                // Извлекаем числовой ID чата (отрезаем call_group_ или group_)
                const numericChatId = Number(
                  row.roomName.replace('call_group_', '').replace('group_', '') || 
                  row.receiverId.replace('group_', '')
                );

                // Проверяем членство пользователя в беседе
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
                // Входящий звонок в ЛС
                setIncomingCallData(row);
              }
            }

            // Добавляем звонок в активные для зелёного баннера в шапке
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