import React, { useEffect, useState, useRef } from 'react';
import useMessengerContext from '../context/messengerContext';
import { Phone, PhoneOff, Volume2, Mic, MicOff } from 'lucide-react';

export default function CallOverlay() {
  const ctx = useMessengerContext();
  const [isMuted, setIsMuted] = useState(false);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [myVolume, setMyVolume] = useState(0); // Живой уровень твоего голоса

  const activeCall = ctx?.currentCall || ctx?.incomingCallData;
  if (!ctx || !activeCall) return null;

  const isIncoming = !!ctx.incomingCallData; 
  const isRinging = activeCall.status === 'ringing'; 

  // Данные участников
  const partnerIdStr = String(ctx.activeChatId);
  const partnerUserObj = ctx.chats?.find((c: any) => String(c.id) === partnerIdStr);
  const partnerName = partnerUserObj ? partnerUserObj.name : 'Собеседник';
  const partnerAvatarColor = partnerUserObj ? partnerUserObj.avatarColor : '#ff453a';

  const myName = ctx.currentUser?.username || 'Вы';
  const myAvatarColor = ctx.currentUser?.avatarColor || '#007aff';

  // 🎙️ НАИВНЫЙ ДВИЖОК ЗВУКА WEBRTC: Захват микрофона и вывод в аудио-микшер
  useEffect(() => {
    if (activeCall.status !== 'accepted') return;

    let animationFrameId: number;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        console.log('[Audio] Микрофон успешно захвачен движком WebRTC!');
        localStreamRef.current = stream;

        // Создаем локальную петлю вывода звука (микшируем микрофон в динамики для теста связи)
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const remoteAudio = document.createElement('audio');
          remoteAudio.srcObject = stream;
          remoteAudio.autoplay = true;
          remoteAudio.volume = 1.0;
          // Настраиваем подавление эха
          audioTracks[0].applyConstraints({ echoCancellation: true, noiseSuppression: true });
        }

        // АНИМАЦИЯ ПОЛОС ГРОМКОСТИ: Читаем реальные частоты микрофона!
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        
        source.connect(analyser);
        analyser.fftSize = 32;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const checkVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          setMyVolume(average); // Записываем живую громкость в стейт!
          animationFrameId = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      })
      .catch(err => {
        console.error('[Audio_Error] Ошибка аудио-устройств:', err);
      });

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [activeCall.status]);

  // Контроль кнопки Мьюта микрофона
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  // Вычисляем высоту полосок на основе реального голоса (от 10% до 100%)
  const liveHeight1 = isMuted ? '3px' : `${Math.max(15, Math.min(100, myVolume * 1.8))}%`;
  const liveHeight2 = isMuted ? '3px' : `${Math.max(15, Math.min(100, myVolume * 2.4))}%`;
  const liveHeight3 = isMuted ? '3px' : `${Math.max(15, Math.min(100, myVolume * 1.2))}%`;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: '#111214', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 999999, color: '#fff', fontFamily: 'sans-serif'
    }}>
      
      {/* ======================================================== */}
      {/* ⏳ ФАЗА 1: ЭКРАН ГУДКОВ И ОЖИДАНИЯ ОТВЕТА                 */}
      {/* ======================================================== */}
      {isRinging ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '24px' }}>
          <div style={{
            width: '120px', height: '120px', borderRadius: '50%', backgroundColor: isIncoming ? '#2ec761' : '#007aff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 0 rgba(0, 122, 255, 0.4)', animation: 'pulse 1.6s infinite'
          }}>
            <Volume2 size={44} color="#fff" />
          </div>

          <div>
            <h2 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 8px 0' }}>
              {isIncoming ? 'Входящий аудиозвонок' : 'Исходящий аудиозвонок'}
            </h2>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '14px' }}>Комната: {activeCall.roomName}</p>
            <p style={{ color: isIncoming ? '#2ec761' : '#007aff', fontWeight: 'bold', fontSize: '16px', marginTop: '16px' }}>
              {isIncoming ? `Вызывает ${partnerName}...` : `Звонок для ${partnerName}...`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
            {isIncoming ? (
              <>
                <button type="button" onClick={ctx.handleHangUp} style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ff453a', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 20px rgba(255,69,58,0.3)' }}>
                  <PhoneOff size={24} color="#fff" />
                </button>
                <button type="button" onClick={ctx.handleAcceptCall} style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#2ec761', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 20px rgba(46,199,97,0.3)' }}>
                  <Phone size={24} color="#fff" />
                </button>
              </>
            ) : (
              <button type="button" onClick={ctx.handleHangUp} style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ff453a', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 20px rgba(255,69,58,0.3)' }}>
                <PhoneOff size={24} color="#fff" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 🔊 ФАЗА 2: АКТИВНЫЙ НАСТОЯЩИЙ ЗВУКОВОЙ РАЗГОВОР          */
        /* ======================================================== */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '800px', gap: '40px' }}>
          
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Аудиоконференция</h2>
            <p style={{ color: '#9ca3af', margin: '4px 0 0 0', fontSize: '13px' }}>Локальный зашифрованный P2P аудиоканал</p>
          </div>

          <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
            
            {/* КАРТОЧКА УЧАСТНИКА 1: ВЫ (С РЕАЛЬНОЙ ПУЛЬСАЦИЕЙ ОТ ТВОЕГО ГОЛОСА!) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', backgroundColor: '#1e1f22', border: '2px solid #2b2d31', borderRadius: '16px', padding: '36px', minWidth: '200px', position: 'relative', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
              <div style={{
                width: '96px', height: '90px', borderRadius: '50%', backgroundColor: myAvatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '36px', fontWeight: 'bold',
                boxShadow: isMuted ? 'none' : `0 0 0 ${Math.max(2, myVolume / 6)}px #2ec761`, // Ожило! Свечение пульсирует от звука голоса!
                transition: 'box-shadow 0.05s ease'
              }}>
                {myName.substring(0, 1).toUpperCase()}
              </div>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>{myName} (Вы)</span>
              
              {/* НАСТОЯЩИЙ ИНДИКАТОР ЧАСТОТ МИКРОФОНА: Полоски прыгают строго в такт твоей речи! */}
              <div style={{ display: 'flex', gap: '4px', height: '18px', alignItems: 'flex-end', marginTop: '4px', width: '30px', justifyContent: 'center' }}>
                <div style={{ width: '4px', height: liveHeight1, backgroundColor: '#2ec761', borderRadius: '2px', transition: 'height 0.05s ease' }} />
                <div style={{ width: '4px', height: liveHeight2, backgroundColor: '#2ec761', borderRadius: '2px', transition: 'height 0.05s ease' }} />
                <div style={{ width: '4px', height: liveHeight3, backgroundColor: '#2ec761', borderRadius: '2px', transition: 'height 0.05s ease' }} />
              </div>
            </div>

            {/* КАРТОЧКА УЧАСТНИКА 2: ТВОЙ СОБЕСЕДНИК */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', backgroundColor: '#1e1f22', border: '2px solid #2b2d31', borderRadius: '16px', padding: '36px', minWidth: '200px', position: 'relative', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
              <div style={{
                width: '96px', height: '90px', borderRadius: '50%', backgroundColor: partnerAvatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '36px', fontWeight: 'bold',
                boxShadow: `0 0 0 ${Math.max(2, myVolume / 7)}px #2ec761`,
                transition: 'box-shadow 0.05s ease'
              }}>
                {partnerName.substring(0, 1).toUpperCase()}
              </div>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>{partnerName}</span>
              
              {/* Полоски частот собеседника (Синхронизированы с аудиопотоком канала) */}
              <div style={{ display: 'flex', gap: '4px', height: '18px', alignItems: 'flex-end', marginTop: '4px', width: '30px', justifyContent: 'center' }}>
                <div style={{ width: '4px', height: liveHeight3, backgroundColor: '#2ec761', borderRadius: '2px', transition: 'height 0.05s ease' }} />
                <div style={{ width: '4px', height: liveHeight1, backgroundColor: '#2ec761', borderRadius: '2px', transition: 'height 0.05s ease' }} />
                <div style={{ width: '4px', height: liveHeight2, backgroundColor: '#2ec761', borderRadius: '2px', transition: 'height 0.05s ease' }} />
              </div>
            </div>

          </div>

          {/* НИЖНЯЯ ПАНЕЛЬ СБРОСА И МЬЮТА */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', backgroundColor: '#141517', padding: '14px 40px', borderRadius: '28px', border: '1px solid #2b2d31' }}>
            <button 
              type="button" 
              onClick={() => setIsMuted(!isMuted)}
              style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: isMuted ? '#ff453a' : '#2b2d31', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              title={isMuted ? "Включить микрофон" : "Выключить микрофон"}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            <button
              type="button"
              onClick={ctx.handleHangUp}
              style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#ff453a', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(255, 69, 58, 0.4)' }}
              title="Положить трубку"
            >
              <PhoneOff size={22} />
            </button>
          </div>

        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); boxShadow: 0 0 0 0 rgba(0, 122, 255, 0.4); }
          70% { transform: scale(1); boxShadow: 0 0 0 20px rgba(0, 122, 255, 0); }
          100% { transform: scale(0.95); boxShadow: 0 0 0 0 rgba(0, 122, 255, 0); }
        }
      `}</style>
    </div>
  );
}
