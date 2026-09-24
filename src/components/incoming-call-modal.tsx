import React, { useEffect } from 'react';
import useMessengerContext from '../context/messengerContext';
import { supabase } from '../services/supabaseClient';
import { Phone, PhoneOff } from 'lucide-react';
import * as jose from 'jose'; // 🚀 ИМПОРТИРУЕМ JOSE ДЛЯ ИДЕАЛЬНЫХ JWT ТОКЕНОВ!

// Глобальный замок для предотвращения дубликатов в Strict Mode
let isIncomingChannelInitialized = false;

export default function IncomingCallModal() {
  const ctx = useMessengerContext();
  const call = ctx.incomingCallData;

  useEffect(() => {
    if (!ctx.currentUser) return;

    const myIdStr = String(ctx.currentUser.id).trim();
    const channelName = `incoming_calls_stream_${myIdStr}`;

    // 🛑 ЖЕЛЕЗНЫЙ ФИКС: Если замок уже заперт — мгновенно выходим и не плодим дубликаты!
    if (isIncomingChannelInitialized) {
      console.log(`[WebRTC_Call] Блокировка дубликата Strict Mode для канала входящих звонков: ${channelName}`);
      return;
    }

    console.log(`[WebRTC_Call] Создаем ОДИН чистый канал звонков в модалке: ${channelName}`);
    isIncomingChannelInitialized = true; // Запираем замок!

    const callsChannel = supabase.channel(channelName);

    callsChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'calls' },
      async (payload: any) => {
        const callRow = payload.new as any;

        // 📞 1. ВХОДЯЩИЙ ЗВОНОК (INSERT)
        if (payload.eventType === 'INSERT' && String(callRow.receiverId) === myIdStr && callRow.status === 'ringing') {
          const { data: callerUser } = await supabase
          .from('users')
          .select('username')
          .eq('id', callRow.callerId)
          .single();
          ctx.setIncomingCallData({ ...callRow, callerName: callerUser?.username || 'Неизвестный контакт' });
        }

        // 🔄 2. ЗВОНОК ЗАВЕРШЕН ИЛИ ОТКЛОНЕН (UPDATE)
        if (payload.eventType === 'UPDATE') {
          // Гасим окно только если звонок РЕАЛЬНО отменили или сбросили
          if (String(callRow.receiverId) === myIdStr && (callRow.status === 'rejected' || callRow.status === 'ended')) {
            ctx.setIncomingCallData(null);
            ctx.setCurrentCall(null);
          }
        }

        // 🗑️ 3. СТРОКА УДАЛЕНА ИЗ БАЗЫ (DELETE)
        if (payload.eventType === 'DELETE') {
          ctx.setIncomingCallData(null);
        }
      }
    );

    callsChannel.subscribe();

    return () => {};
  }, [ctx.currentUser?.id]);

  if (!call) return null;

  // 👍 КНОПКА «ПРИНЯТЬ»: Генерируем ИДЕАЛЬНЫЙ ЛИЧНЫЙ токен через JOSE
  const handleAcceptCall = async () => {
    if (!ctx.currentUser) return;
    console.log('[WebRTC_Call] Принимаем вызов. Генерируем JWT токен ответа через библиотеку jose...');

    try {
      const apiKey = "APIdub3CsA3TNJE";
      const apiSecret = "CptL3A3BQjVaaFzG9f0hbtz23YfQvVuB0cerptM1UbyA";
      const secretBuffer = new TextEncoder().encode(apiSecret);

      const myPersonalToken = await new jose.SignJWT({
        video: { roomJoin: true, room: call.roomName, audio: true, video: false },
        name: ctx.currentUser.username,
      })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuer(apiKey)
        .setSubject(ctx.currentUser.username)
        .setExpirationTime('1h')
        .sign(secretBuffer);

      console.log('[WebRTC_Call] Токен ответа успешно создан. Обновляем статус в базе...');

      // 3. Обновляем статус строки в Supabase на 'accepted', чтобы звонящий узнал об ответе
      await supabase.from('calls')
                    .update({ status: 'accepted' })
                    .eq('id', call.id);

      ctx.setCurrentCall({ id: call.id, roomName: call.roomName, token: myPersonalToken, status: 'accepted' });
      ctx.setIncomingCallData(null);

    } catch (err) {
      console.error('🔴 Критическая ошибка генерации токена ответа jose:', err);
      ctx.showToast('Не удалось подключиться к аудиоканалу', 'error');
    }
  };

  // 👎 КНОПКА «СБРОСИТЬ»
  const handleRejectCall = async () => {
    console.log('[WebRTC_Call] Отклоняем вызов...');
    await supabase.from('calls')
                  .update({ status: 'rejected' })
                  .eq('id', call.id);
    ctx.setIncomingCallData(null);
  };

  return (
    <div style={{
      position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '360px', backgroundColor: '#1e1f22', border: '1px solid #383842',
      borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 30000, color: '#fff'
    }}>
      <div style={{
        width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#007aff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold'
      }}>
        {call.callerName?.substring(0, 1).toUpperCase() || '?'}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, textAlign: 'left' }}>
        <span style={{ fontSize: '15px', fontWeight: 'bold' }}>{call.callerName}</span>
        <span style={{ fontSize: '13px', color: '#2ec761', marginTop: '2px' }}>Входящий аудиозвонок...</span>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={handleRejectCall} style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#ef4444', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><PhoneOff size={16} /></button>
        <button type="button" onClick={handleAcceptCall} style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#2ec761', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Phone size={16} /></button>
      </div>
    </div>
  );
}
