import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import * as jose from 'jose'; 

export function useCallsLogic(currentUser: any, showToast: any) {
  const [currentCall, setCurrentCall] = useState<any | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<any | null>(null);

  // 📞 1. Инициализация исходящего вызова с генерацией JWT-токена LiveKit
  const handleStartAudioCall = async (partnerId: string) => {
    if (!currentUser) return;
    
    const myIdStr = String(currentUser.id);
    const targetIdStr = String(partnerId);

    if (myIdStr === targetIdStr) {
      showToast('Вы не можете позвонить самому себе! ❌', 'error');
      return;
    }

    try {
      showToast('Вызов пользователя...', 'info');
      
      const generatedRoomName = targetIdStr.startsWith('group_')
        ? `call_${targetIdStr}`
        : (Number(myIdStr) < Number(targetIdStr) ? `call_${myIdStr}_${targetIdStr}` : `call_${targetIdStr}_${myIdStr}`);

      console.log(`[WebRTC_Call] Инициализация вызова в комнату: ${generatedRoomName}`);

      const apiKey = "APIdub3CsA3TNJE";
      const apiSecret = "CptL3A3BQjVaaFzG9f0hbtz23YfQvVuB0cerptM1UbyA";
      const secretBuffer = new TextEncoder().encode(apiSecret);

      const validToken = await new jose.SignJWT({
        video: { roomJoin: true, room: generatedRoomName, audio: true, video: false },
        name: currentUser.username || 'Пользователь',
      })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuer(apiKey)
        .setSubject(currentUser.username || 'username')
        .setExpirationTime('1h')
        .sign(secretBuffer);

      // Стираем старые вызовы
      await supabase
        .from('calls')
        .delete()
        .or(`and(callerId.eq.${myIdStr},receiverId.eq.${targetIdStr}),and(callerId.eq.${targetIdStr},receiverId.eq.${myIdStr})`);

      const { data: newCallRow, error: insertError } = await supabase
        .from('calls')
        .insert([{
          roomName: generatedRoomName,
          token: validToken, 
          callerId: myIdStr,
          receiverId: targetIdStr,
          status: 'ringing'
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Ошибка записи вызова в Supabase:', insertError.message);
        showToast('Не удалось отправить вызов собеседнику', 'error');
        return;
      }

      // 🚀 ЖЕЛЕЗНЫЙ ФИКС №1: Записываем создателя как активного числового участника
      await supabase
        .from('call_participants')
        .insert([{ callId: Number(newCallRow.id), userId: myIdStr }]);

      setCurrentCall(newCallRow);

    } catch (err) {
      console.error('🔴 Критическая ошибка WebRTC соединения jose:', err);
      showToast('Не удалось запустить аудиодвижок', 'error');
    }
  };

  // ✅ 2. Принятие входящего вызова получателем
  const handleAcceptCall = async () => {
    if (!incomingCallData) return;
    try {
      const { data, error } = await supabase
        .from('calls')
        .update({ status: 'accepted' })
        .eq('id', incomingCallData.id)
        .select()
        .single();

      if (!error && data) {
        // 🚀 ЖЕЛЕЗНЫЙ ФИКС №2: Преобразуем id звонка в число перед инсертом участника
        await supabase
          .from('call_participants')
          .insert([{ callId: Number(incomingCallData.id), userId: String(currentUser.id) }]);

        setCurrentCall(data); 
        setIncomingCallData(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ❌ 3. Отклонение/Сброс вызова (Персональный выход из комнаты)
  const handleHangUp = async () => {
    const activeCall = currentCall || incomingCallData;
    if (!activeCall) return;

    const myIdStr = String(currentUser?.id);
    const isGroupCall = String(activeCall.receiverId).startsWith('group_');
    const isIAnAuthor = String(activeCall.callerId) === myIdStr;

    try {
      setCurrentCall(null);
      setIncomingCallData(null);

      // 🚀 ЖЕЛЕЗНЫЙ ФИКС №3: Удаляем себя из таблицы сессий, приводя callId строго к числу!
      await supabase
        .from('call_participants')
        .delete()
        .eq('callId', Number(activeCall.id))
        .eq('userId', myIdStr);

      if (!isGroupCall || (isGroupCall && isIAnAuthor && activeCall.status === 'ringing')) {
        await supabase
          .from('calls')
          .update({ status: 'cancelled' })
          .eq('id', activeCall.id);
        showToast('Звонок отменен', 'info');
      } else {
        // Проверяем, остался ли кто-то ещё в конференции
        const { data: remaining } = await supabase
          .from('call_participants')
          .select('id')
          .eq('callId', Number(activeCall.id));
             
        if (!remaining || remaining.length === 0) {
          await supabase.from('calls').update({ status: 'ended' }).eq('id', activeCall.id);
        }
        showToast('Вы вышли из конференции', 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 🕒 4. Реалтайм-слушатель изменений статусов звонков
  useEffect(() => {
    if (!currentUser) return;
    const myIdStr = String(currentUser.id);

    const callSubscription = supabase
      .channel('calls-live-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls' },
        async (payload) => {
          console.log('[WebRTC_Socket] Сигнал звонка:', payload.eventType, payload);

          // А. Входящий звонок
          if (payload.eventType === 'INSERT') {
            const isGroupCall = String(payload.new.receiverId).startsWith('group_');
            const isIAnAuthor = String(payload.new.callerId) === myIdStr;

            if (isGroupCall) {
              if (!isIAnAuthor) { 
                const { data: membership } = await supabase
                  .from('group_members')
                  .select('id')
                  .eq('chatId', payload.new.receiverId)
                  .eq('userId', myIdStr)
                  .maybeSingle();

                if (membership && payload.new.status === 'ringing') {
                  setIncomingCallData(payload.new);
                }
              }
            } else {
              if (String(payload.new.receiverId) === myIdStr && payload.new.status === 'ringing') {
                setIncomingCallData(payload.new);
              }
            }
          }

          // Б. Обновление статуса
          if (payload.eventType === 'UPDATE') {
            const isGroupCall = String(payload.new.receiverId).startsWith('group_');
            const isCaller = String(payload.new.callerId) === myIdStr;
            const isReceiver = String(payload.new.receiverId) === myIdStr;
            
            let isParticipant = isCaller || isReceiver;
            if (isGroupCall && !isParticipant) {
              const { data: membership } = await supabase
                .from('group_members')
                .select('id')
                .eq('chatId', payload.new.receiverId)
                .eq('userId', myIdStr)
                .maybeSingle();
              if (membership) isParticipant = true;
            }

            if (!isParticipant) return;

            if (payload.new.status === 'accepted') {
              if (isCaller || currentCall) { 
                setCurrentCall(payload.new);
                setIncomingCallData(null);
              }
            }

            if (payload.new.status === 'cancelled' || payload.new.status === 'ended') {
              if (!currentCall || !isGroupCall) {
                setIncomingCallData(null);
                setCurrentCall(null);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(callSubscription);
    };
  }, [currentUser, currentCall]);

  return {
    currentCall, setCurrentCall,
    incomingCallData, setIncomingCallData,
    handleStartAudioCall, handleAcceptCall, handleHangUp
  };
}
