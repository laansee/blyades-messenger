import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import * as jose from 'jose'; // 🚀 ВОЗВРАЩАЕМ КРИПТОГРАФИЮ JOSE ДЛЯ ГЕНЕРАЦИИ ТОКЕНОВ ЛЕТУ!

export function useCallsLogic(currentUser: any, showToast: any) {
  const [currentCall, setCurrentCall] = useState<any | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<any | null>(null);

  // 📞 1. Инициализация исходящего вызова с генерацией легального JWT-токена LiveKit
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
      
      // Генерируем имя комнаты
      const generatedRoomName = targetIdStr.startsWith('group_')
        ? `call_${targetIdStr}`
        : (Number(myIdStr) < Number(targetIdStr) ? `call_${myIdStr}_${targetIdStr}` : `call_${targetIdStr}_${myIdStr}`);

      console.log(`[WebRTC_Call] Инициализация вызова в комнату: ${generatedRoomName}`);

      // 🔐 ГЕНЕРАЦИЯ ОРИГИНАЛЬНОГО ТОКЕНА LIVEKIT ЧЕРЕЗ JOSE ИЗ ТВОЕГО АРХИВА
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

      // 🧹 Стираем старые зависшие звонки между этими двумя пользователями (из твоего архива)
      await supabase
        .from('calls')
        .delete()
        .or(`and(callerId.eq.${myIdStr},receiverId.eq.${targetIdStr}),and(callerId.eq.${targetIdStr},receiverId.eq.${myIdStr})`);

      // 2. Делаем инсерт с РЕАЛЬНЫМ, валидным токеном и точными Case-Sensitive колонками таблицы!
      const { data: newCallRow, error: insertError } = await supabase
        .from('calls')
        .insert([{
          roomName: generatedRoomName,
          token: validToken, // 🎯 НАСТОЯЩИЙ ПОДПИСАННЫЙ JWT ТОКЕН УЛЕТАЕТ В БАЗУ!
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

      // Открываем модалку вызова у звонящего
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
        .update({ status: 'accepted' }) // Меняем статус на разговор
        .eq('id', incomingCallData.id)
        .select()
        .single();

      if (!error && data) {
        setCurrentCall(data); // Развертываем созвон у себя
        setIncomingCallData(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ❌ 3. Отклонение/Сброс вызова
  const handleHangUp = async () => {
    const activeCall = currentCall || incomingCallData;
    if (!activeCall) return;

    const myIdStr = String(currentUser?.id);
    const isGroupCall = String(activeCall.receiverId).startsWith('group_');
    const isIAnAuthor = String(activeCall.callerId) === myIdStr;

    try {
      // Мгновенно тушим интерфейс звонка СТРОГО у себя на экране
      setCurrentCall(null);
      setIncomingCallData(null);

      // Если это личный чат (ЛС) ИЛИ если звонок отменяет сам СОЗДАТЕЛЬ на этапе гудков — гасим запись в базе
      if (!isGroupCall || (isGroupCall && isIAnAuthor && activeCall.status === 'ringing')) {
        await supabase
          .from('calls')
          .update({ status: 'cancelled' })
          .eq('id', activeCall.id);
        showToast('Звонок отменен', 'info');
      } else {
        // Если обычный участник просто выходит из активной беседы — мы не ломаем строку в базе,
        // а просто пишем лог локального выхода, чтобы конференция продолжала жить для остальных!
        showToast('Вы вышли из конференции', 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

    // 🕒 Реалтайм-слушатель: Теперь умеет транслировать звонки на ВСЮ группу сразу!
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

          // ==========================================
          // 📞 А. ОБРАБОТКА ВХОДЯЩЕГО ЗВOНКА (INSERT)
          // ==========================================
          if (payload.eventType === 'INSERT') {
            const isGroupCall = String(payload.new.receiverId).startsWith('group_');
            const isIAnAuthor = String(payload.new.callerId) === myIdStr;

            if (isGroupCall) {
              // 👥 ГРУППОВОЙ ЗВOНОК: Проверяем, состоим ли мы в этой беседе
              if (!isIAnAuthor) { // Если звоним не мы сами
                const { data: membership } = await supabase
                  .from('group_members')
                  .select('id')
                  .eq('chatId', payload.new.receiverId)
                  .eq('userId', myIdStr)
                  .maybeSingle();

                if (membership && payload.new.status === 'ringing') {
                  console.log('[WebRTC_Call] Входящий вызов БЕСЕДЫ для нас!');
                  setIncomingCallData(payload.new);
                }
              }
            } else {
              // 👤 ЛИЧНЫЙ ЗВOНОК (Твоя старая проверенная логика ЛС)
              if (String(payload.new.receiverId) === myIdStr && payload.new.status === 'ringing') {
                setIncomingCallData(payload.new);
              }
            }
          }

          // ==========================================
          // 🔄 Б. ОБРАБОТКА ИЗМЕНЕНИЯ СТАТУСА (UPDATE)
          // ==========================================
                    // ==========================================
          // 🔄 Б. ОБРАБОТКА ИЗМЕНЕНИЯ СТАТУСА (UPDATE)
          // ==========================================
          if (payload.eventType === 'UPDATE') {
            const myIdStr = String(currentUser.id);
            const isGroupCall = String(payload.new.receiverId).startsWith('group_');
            
            // Проверяем, имеем ли мы отношение к этому звонку
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

            // 🎯 ЖЕЛЕЗНЫЙ ФИКС ДЛЯ СОЗДАТЕЛЯ И УЧАСТНИКОВ:
            // Если статус в базе стал accepted — ВСЕ, кто принял звонок (или создал его), переходят на экран разговора!
            if (payload.new.status === 'accepted') {
              if (isCaller || currentCall) { 
                // Создатель или тот, кто уже нажал "Принять", мгновенно переключаются на фазу разговора!
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
  }, [currentUser]);

  return {
    currentCall, setCurrentCall,
    incomingCallData, setIncomingCallData,
    handleStartAudioCall, handleAcceptCall, handleHangUp
  };
}
