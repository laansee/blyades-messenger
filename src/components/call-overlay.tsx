import React, { useEffect, useState, useRef } from 'react';
import useMessengerContext from '../context/messengerContext';
import { supabase } from '../services/supabaseClient';
import { Phone, PhoneOff, Volume2, Mic, MicOff, Users } from 'lucide-react';

export default function CallOverlay() {
  const ctx = useMessengerContext();
  const [isMuted, setIsMuted] = useState(false);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [myVolume, setMyVolume] = useState(0); 

  // 👥 Стейт для хранения реальных участников созвона беседы
  const [conferenceUsers, setConferenceUsers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const activeCall = ctx?.currentCall || ctx?.incomingCallData;

  // 🕒 ПОДГРУЗКА УЧАСТНИКОВ КОНФЕРЕНЦИИ
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'accepted' || !ctx?.chats) return;

    const isGroupCall = String(activeCall.receiverId).startsWith('group_');

    const fetchConferencePeople = async () => {
      setLoadingMembers(true);
      if (isGroupCall) {
        // 👥 Если это группа — вытягиваем всех её членов из базы данных
        const { data: membersData } = await supabase
          .from('group_members')
          .select('userId')
          .eq('chatId', activeCall.receiverId);

        if (membersData) {
          const userIds = membersData.map(m => String(m.userId));
          const { data: usersData } = await supabase
            .from('users')
            .select('id, username, avatarColor, firstName, lastName')
            .in('id', userIds);
          
          if (usersData) {
            // Исключаем из списка участников самого себя (так как мы рендеримся отдельно первой карточкой)
            const filtered = usersData.filter(u => String(u.id) !== String(ctx.currentUser?.id));
            setConferenceUsers(filtered);
          }
        }
      } else {
        // 👤 Если это личный чат (ЛС) — просто берем одного собеседника
        const partnerId = String(ctx.activeChatId);
        const partnerObj = ctx.chats.find((c: any) => String(c.id) === partnerId);
        if (partnerObj) {
          setConferenceUsers([{
            id: partnerObj.id,
            username: partnerObj.username || partnerObj.name,
            avatarColor: partnerObj.avatarColor
          }]);
        }
      }
      setLoadingMembers(false);
    };

    fetchConferencePeople();
  }, [activeCall?.status, activeCall?.receiverId, ctx?.chats]);

  // 🎙️ Захват микрофона WebRTC API
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'accepted') return;

    let animationFrameId: number;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        console.log('[Блидес_Audio] Микрофон запущен!');
        localStreamRef.current = stream;

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const remoteAudio = document.createElement('audio');
          remoteAudio.srcObject = stream;
          remoteAudio.autoplay = true;
          remoteAudio.volume = 1.0;
          audioTracks.applyConstraints({ echoCancellation: true, noiseSuppression: true });
        }

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
          setMyVolume(average); 
          animationFrameId = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      })
      .catch(err => console.error(err));

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [activeCall?.status]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
    }
  }, [isMuted]);

  if (!ctx || !activeCall) return null;
  const isIncoming = !!ctx.incomingCallData; 
  const isRinging = activeCall.status === 'ringing'; 

  const myName = ctx.currentUser?.username || 'Вы';
  const myAvatarColor = ctx.currentUser?.avatarColor || '#007aff';

  // Высота полосок звука
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
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
            {isIncoming ? (
              <>
                <button type="button" onClick={ctx.handleHangUp} style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ff453a', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <PhoneOff size={24} color="#fff" />
                </button>
                <button type="button" onClick={ctx.handleAcceptCall} style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#2ec761', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Phone size={24} color="#fff" />
                </button>
              </>
            ) : (
              <button type="button" onClick={ctx.handleHangUp} style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ff453a', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <PhoneOff size={24} color="#fff" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 🔊 ФАЗА 2: АКТИВНЫЙ ГРУППОВОЙ СОЗВОН (ДИНАМИЧЕСКАЯ СЕТКА)*/
        /* ======================================================== */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '900px', gap: '40px', padding: '0 20px' }}>
          
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
              <Users size={24} color="#2ec761" /> Аудиоконференция беседы
            </h2>
            <p style={{ color: '#9ca3af', margin: '6px 0 0 0', fontSize: '13px' }}>Комната: {activeCall.roomName}</p>
          </div>

          {/* 🚀 ДИНАМИЧЕСКИЙ РЕНДЕР КАРТОЧЕК УЧАСТНИКОВ ИЗ БАЗЫ ДАННЫХ */}
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
            
            {/* КАРТОЧКА 1: ВЫ (Всегда первая) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', backgroundColor: '#1e1f22', border: '2px solid #2b2d31', borderRadius: '16px', padding: '28px', minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
              <div style={{
                width: '84px', height: '84px', borderRadius: '50%', backgroundColor: myAvatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 'bold',
                boxShadow: isMuted ? 'none' : `0 0 0 ${Math.max(2, myVolume / 6)}px #2ec761`,
                transition: 'box-shadow 0.05s ease'
              }}>
                {myName.substring(0, 1).toUpperCase()}
              </div>
              <span style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>{myName} (Вы)</span>
              
              <div style={{ display: 'flex', gap: '3px', height: '16px', alignItems: 'flex-end', marginTop: '2px' }}>
                <div style={{ width: '3px', height: liveHeight1, backgroundColor: '#2ec761', borderRadius: '2px' }} />
                <div style={{ width: '3px', height: liveHeight2, backgroundColor: '#2ec761', borderRadius: '2px' }} />
                <div style={{ width: '3px', height: liveHeight3, backgroundColor: '#2ec761', borderRadius: '2px' }} />
              </div>
            </div>

            {/* КАРТОЧКИ ОСТАЛЬНЫХ РЕАЛЬНЫХ УЧАСТНИКОВ ИЗ ТАБЛИЦЫ GROUP_MEMBERS */}
            {loadingMembers ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', alignSelf: 'center' }}>Синхронизация участников...</div>
            ) : (
              conferenceUsers.map((member) => {
                const memberNameText = `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username;
                return (
                  <div key={member.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', backgroundColor: '#1e1f22', border: '2px solid #2b2d31', borderRadius: '16px', padding: '28px', minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                    <div style={{
                      width: '84px', height: '84px', borderRadius: '50%', backgroundColor: member.avatarColor || '#5865F2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 'bold',
                      boxShadow: `0 0 0 ${Math.max(2, myVolume / 7)}px #2ec761`,
                      animation: 'voice-pulse 1.4s infinite alternate'
                    }}>
                      {memberNameText.substring(0, 1).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>{memberNameText}</span>
                    
                    <div style={{ display: 'flex', gap: '3px', height: '16px', alignItems: 'flex-end', marginTop: '2px' }}>
                      <div style={{ width: '3px', height: liveHeight3, backgroundColor: '#2ec761', borderRadius: '2px' }} />
                      <div style={{ width: '3px', height: liveHeight1, backgroundColor: '#2ec761', borderRadius: '2px' }} />
                      <div style={{ width: '3px', height: liveHeight2, backgroundColor: '#2ec761', borderRadius: '2px' }} />
                    </div>
                  </div>
                );
              })
            )}

          </div>

          {/* НИЖНЯЯ ПАНЕЛЬ СБРОСА */}
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
        @keyframes voice-pulse {
          0% { boxShadow: 0 0 0 2px #2ec761; }
          100% { boxShadow: 0 0 0 8px rgba(46, 199, 97, 0.4); }
        }
      `}</style>
    </div>
  );
}

              
