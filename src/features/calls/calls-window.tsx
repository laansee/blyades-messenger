import React, { useState, useEffect } from 'react';
import { Phone, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import useMessengerContext from '../../context/messengerContext';

export default function CallsWindow() {
  const ctx = useMessengerContext();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const isCallActive = !!ctx.currentCall;
  const roomName = ctx.currentCall?.roomName || '';

  // 🕒 ТАЙМЕР РАЗГОВОРА
  useEffect(() => {
    let interval: any = null;
    if (isCallActive) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // ❌ СЦЕНАРИЙ А: Если звонков сейчас нет — рендерим твою красивую заглушку
  if (!isCallActive) {
    return (
      <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '20px', backgroundColor: '#0e0e12' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#1c1c24', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#636366' }}>
          <Phone size={36} />
        </div>
        <h2 style={{ color: '#fff', fontSize: '18px', margin: 0, fontWeight: '600' }}>Выберите звонок из списка</h2>
        <p style={{ color: '#636366', fontSize: '14px', margin: 0, textAlign: 'center', maxWidth: '280px', lineHeight: '1.4' }}>
          Здесь будет отображаться детальная история вызовов, длительность разговоров и панель аудио-связи WebRTC.
        </p>
      </div>
    );
  }

  // 📞 СЦЕНАРИЙ Б: ЕСЛИ ИДЕТ АКТИВНЫЙ РАЗГОВОР — ОЖИВЛЯЕМ ТВОЙ СТЕНД С КНОПКАМИ
  return (
    <div style={{ flex: 1, height: '100%', backgroundColor: '#1e1f22', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '40px' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginBottom: '60px' }}>
        <div style={{
          width: '140px', height: '140px', borderRadius: '50%',
          backgroundColor: '#7212b1', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '48px', fontWeight: 'bold', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', position: 'relative'
        }}>
          🤙
          <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #2ec761', animation: 'pulse 1.5s infinite ease-out' }} />
        </div>

        <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '600', margin: 0 }}>Разговор в сети</h1>
        <span style={{ color: '#2ec761', fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>
          {formatTime(seconds)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#111214', padding: '12px 24px', borderRadius: '32px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', position: 'absolute', bottom: '40px' }}>
        <button type="button" onClick={() => setIsVideoOn(!isVideoOn)} style={buttonStyle(isVideoOn ? '#ffffff' : '#2b2d31', isVideoOn ? '#000000' : '#dbdee1')} title={isVideoOn ? "Выключить видео" : "Включить видео"}>
          {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        <button type="button" onClick={ctx.handleEndCall} style={buttonStyle('#da373c', '#ffffff')} title="Завершить вызов">
          <Phone size={20} style={{ transform: 'rotate(135deg)' }} />
        </button>

        <button type="button" onClick={() => setIsMuted(!isMuted)} style={buttonStyle(isMuted ? '#da373c' : '#2b2d31', isMuted ? '#ffffff' : '#dbdee1')} title={isMuted ? "Включить звук" : "Выключить звук"}>
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function buttonStyle(bgColor: string, iconColor: string) {
  return {
    width: '48px', height: '48px', borderRadius: '50%', backgroundColor: bgColor, color: iconColor,
    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    transition: 'background-color 0.15s ease, color 0.15s ease'
  };
}
