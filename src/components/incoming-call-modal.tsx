import React from 'react';
import useMessengerContext from '../context/messengerContext';
import { supabase } from '../services/supabaseClient';
import { Phone, PhoneOff } from 'lucide-react';

export default function IncomingCallModal() {
  const ctx = useMessengerContext();
  const call = ctx.incomingCallData;

  if (!call) return null;

  // 👍 КНОПКА «ПРИНЯТЬ»: Подключаемся к той же WebRTC комнате по готовому токену
  const handleAcceptCall = async () => {
    await supabase.from('calls').update({ status: 'accepted' }).eq('id', call.id);
    
    // Врубаем оверлей голосовой связи с токеном звонящего
    ctx.setCurrentCall({ roomName: call.roomName, token: call.token });
    ctx.setIncomingCallData(null); // Закрываем окно входящего вызова
  };

  // 👎 КНОПКА «СБРОСИТЬ»: Сворачиваем звонок у обоих
  const handleRejectCall = async () => {
    await supabase.from('calls').update({ status: 'rejected' }).eq('id', call.id);
    await supabase.from('calls').delete().eq('id', call.id); // Чистим строку из базы
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
        width: '46px', height: '46px', borderRadius: '50%', backgroundColor: 'var(--accent, #aa3bff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold'
      }}>
        {call.callerName.substring(0, 1).toUpperCase()}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, textAlign: 'left' }}>
        <span style={{ fontSize: '15px', fontWeight: 'bold' }}>{call.callerName}</span>
        <span style={{ fontSize: '13px', color: '#2ec761', marginTop: '2px', animation: 'pulse 1.5s infinite' }}>Входящий аудиозвонок...</span>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button" onClick={handleRejectCall}
          style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#ef4444', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <PhoneOff size={16} />
        </button>
        <button
          type="button" onClick={handleAcceptCall}
          style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#2ec761', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Phone size={16} />
        </button>
      </div>
    </div>
  );
}
