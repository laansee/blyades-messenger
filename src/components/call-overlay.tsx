import React from 'react';
import useMessengerContext from '../context/messengerContext';
import { LiveKitRoom, AudioConference, RoomAudioRenderer, ControlBar } from '@livekit/components-react';
import '@livekit/components-styles'; // Подключаем официальные стили сеток LiveKit
import { PhoneOff } from 'lucide-react';

export default function CallOverlay() {
  const ctx = useMessengerContext();
  
  if (!ctx.currentCall) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(20, 20, 26, 0.95)', backdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 20000, color: '#fff'
    }}>
      <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Аудиозвонок</h2>
      <p style={{ color: '#9ca3af', marginBottom: '40px' }}>Комната: {ctx.currentCall.roomName}</p>

      {/* 🎙️ ЦЕНТРАЛЬНЫЙ ПАКЕТ ТРАНСЛЯЦИИ ЗВУКА LIVEKIT */}
      <LiveKitRoom
        audio={true}
        video={false}
        token={ctx.currentCall.token}
        serverUrl={import.meta.env.VITE_LIVEKIT_URL}
        
        /* 🚀 ИСПРАВЛЕНИЕ: Мягко закрываем окно при отключении, не ломая сессию юзера */
        onDisconnected={() => ctx.setCurrentCall(null)} 
        
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
      >
        {/* Сетка участников со светящимися индикаторами разговора */}
        <AudioConference />
        
        {/* Системный рендерер звука в динамики */}
        <RoomAudioRenderer />

        {/* Панель управления (Вкл/Выкл микрофон) */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '16px' }}>
          <ControlBar controls={{ microphone: true, camera: false, screenShare: false, leave: false }} />
          
          <button
            type="button"
            onClick={() => ctx.setCurrentCall(null)}
            style={{
              width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#ef4444',
              color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
            }}
            title="Положить трубку"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </LiveKitRoom>
    </div>
  );
}
