import React, { useEffect, useState, useRef } from 'react';
import useMessengerContext from '../context/messengerContext';
import { supabase } from '../services/supabaseClient';
import { Phone, PhoneOff, Volume2, Mic, MicOff, Users } from 'lucide-react';

export default function CallOverlay() {
  const ctx = useMessengerContext();
  const [isMuted, setIsMuted] = useState(false);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [myVolume, setMyVolume] = useState(0); 

  const [conferenceUsers, setConferenceUsers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const activeCall = ctx?.currentCall || ctx?.incomingCallData;
  const myIdStr = ctx?.currentUser ? String(ctx.currentUser.id) : '';

  // 1. 🕒 МОНИТОРИНГ И ОТРИСОВКА ПОДКЛЮЧИВШИХСЯ УЧАСТНИКОВ
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'accepted' || !ctx?.chats || !myIdStr) return;

    const updateActiveConferenceUsers = async () => {
      setLoadingMembers(true);
      try {
        const { data: activeSessions } = await supabase
          .from('call_participants')
          .select('userId')
          .eq('callId', Number(activeCall.id));

        if (activeSessions && activeSessions.length > 0) {
          const activeUserIds = activeSessions.map(s => String(s.userId));
          
          const { data: usersData } = await supabase
            .from('users')
            .select('id, username, avatarColor, firstName, lastName')
            .in('id', activeUserIds);
          
          if (usersData) {
            const filtered = usersData.filter(u => String(u.id) !== myIdStr);
            setConferenceUsers(filtered);
          }
        } else {
          setConferenceUsers([]);
        }
      } catch (err) {
        console.error('Ошибка загрузки участников:', err);
      } finally {
        setLoadingMembers(false);
      }
    };

    updateActiveConferenceUsers();

    const participantSubscription = supabase
      .channel(`call-room-people-${activeCall.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_participants', filter: `callId=eq.${Number(activeCall.id)}` }, () => {
        updateActiveConferenceUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantSubscription);
    };
  }, [activeCall?.status, activeCall?.id, ctx?.chats, myIdStr]);

  // 2. 🎙️ НАСТОЯЩИЙ ИЗОЛИРОВАННЫЙ ТАБЛИЧНЫЙ WebRTC ДВИЖОК
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'accepted' || !myIdStr) return;

    let localStream: MediaStream | null = null;
    let pc: RTCPeerConnection | null = null;
    let animId: number;

    // Инициализируем PeerConnection без падающих STUN серверов для локальных тестов
    const pcInstance = new RTCPeerConnection({});
    pc = pcInstance;
    pcRef.current = pcInstance;

    // 🎯 ВАЖНО: Ловим аудиодорожку от собеседника по сети и выводим строго в динамики!
    pcInstance.ontrack = (event) => {
      console.log('[WebRTC_Table] УСПЕХ! Поймали входящий аудиопоток от собеседника!');
      const remoteStream = event.streams[0]; 
      
      let audioEl = document.getElementById('blymessenger-remote-audio') as HTMLAudioElement | null;
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = 'blymessenger-remote-audio';
        document.body.appendChild(audioEl);
      }

      audioEl.srcObject = remoteStream;
      audioEl.autoplay = true;
      audioEl.volume = 1.0;
      
      audioEl.play().catch(err => {
        console.warn('[WebRTC_Audio_Play_Error] Ожидание взаимодействия с экраном:', err);
      });
    };

    // 🚀 ЖЕЛЕЗНЫЙ ФИКС №1: Записываем сетевые ICE-кандидаты строго в поле "ice" и приводим объект к JSON строке!
    pcInstance.onicecandidate = async (event) => {
      if (event.candidate && activeCall?.id) {
        await supabase
          .from('call_participants')
          .update({ ice: event.candidate.toJSON() })
          .eq('callId', Number(activeCall.id))
          .eq('userId', myIdStr);
      }
    };

    const startAudioEngine = async () => {
      try {
        // Захватываем микрофон у операционной системы
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        console.log('[WebRTC_Table] Локальный микрофон успешно запущен!');
        localStreamRef.current = localStream;

        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTracks[0].applyConstraints({ echoCancellation: true, noiseSuppression: true });
        }

        // Привязываем микрофон к передатчику WebRTC
        localStream.getTracks().forEach(track => pcInstance.addTrack(track, localStream!));

        // Настройка визуальных прыгающих полосок частот
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(localStream);
        source.connect(analyser);
        analyser.fftSize = 32;
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const checkVolume = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          setMyVolume(sum / bufferLength);
          animId = requestAnimationFrame(checkVolume);
        };
        checkVolume();

        // 🚀 ТАКТИКА ГИТХАБА: Создатель звонка генерирует Offer первым в свою строку!
        const isCaller = String(activeCall.callerId) === myIdStr;
        if (isCaller) {
          console.log('[WebRTC_Table] Мы создатель звонка. Пушим Offer в базу...');
          const offer = await pcInstance.createOffer();
          await pcInstance.setLocalDescription(offer);

          // 🚀 ЖЕЛЕЗНЫЙ ФИКС №2: Сериализуем offer через валидный плоский объект без offer2 и без .toJSON()!
          await supabase
            .from('call_participants')
            .update({ sdp: { type: offer.type, sdp: offer.sdp } })
            .eq('callId', Number(activeCall.id))
            .eq('userId', myIdStr);
        }
      } catch (err) {
        console.error('Ошибка запуска микрофона:', err);
      }
    };

    startAudioEngine();

    // ⚡ ТАБЛИЧНЫЙ СИГНАЛИНГ: Слушаем изменения строк ДРУГ ДРУГА через Realtime сокеты
    const signalingSubscription = supabase
      .channel(`webrtc-table-signaling-${activeCall.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'call_participants', filter: `callId=eq.${Number(activeCall.id)}` },
        async (payload) => {
          const partnerId = String(payload.new.userId);
          if (partnerId === myIdStr) return; // Свои апдейты полностью игнорируем!

          // А. Ловим Offer от создателя и пишем Answer в свою ЛИЧНУЮ строку!
          if (payload.new.sdp && payload.new.sdp.type === 'offer' && String(activeCall.callerId) !== myIdStr) {
            console.log('[WebRTC_Table] Поймали Offer от создателя. Ставим RemoteDescription...');
            await pcInstance.setRemoteDescription(new RTCSessionDescription(payload.new.sdp));
            const answer = await pcInstance.createAnswer();
            await pcInstance.setLocalDescription(answer);

            // 🚀 ЖЕЛЕЗНЫЙ ФИКС №3: Сериализуем answer через валидный плоский объект в базу!
            await supabase
              .from('call_participants')
              .update({ sdp: { type: answer.type, sdp: answer.sdp } })
              .eq('callId', Number(activeCall.id))
              .eq('userId', myIdStr);
          }

          // Б. Ловим Answer на стороне создателя звонка
          if (payload.new.sdp && payload.new.sdp.type === 'answer' && String(activeCall.callerId) === myIdStr) {
            // 🚀 ПРЕДОХРАНИТЕЛЬ: Применяем Answer ТОЛЬКО если соединение еще не находится в стабильной фазе!
            // Это полностью сотрет ошибку "Called in wrong state: stable" из консоли навсегда!
            if (pcInstance.signalingState !== 'stable' && pcInstance.signalingState !== 'closed') {
              console.log('[WebRTC_Table] Поймали Answer от собеседника! Сетевой мост состыкован!');
              await pcInstance.setRemoteDescription(new RTCSessionDescription(payload.new.sdp));
            }
          }

          // В. Ловим сетевые ICE кандидаты собеседника
          if (payload.new.ice) {
            try {
              await pcInstance.addIceCandidate(new RTCIceCandidate(payload.new.ice));
            } catch (e) {
              // Игнорируем мелкие дубликаты
            }
          }
        }
      )
      .subscribe();

    return () => {
      cancelAnimationFrame(animId);
      supabase.removeChannel(signalingSubscription);
      if (audioContextRef.current) audioContextRef.current.close();
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      if (pcRef.current) pcRef.current.close();
      const el = document.getElementById('blymessenger-remote-audio');
      if (el) el.remove();
    };
  }, [activeCall?.status, activeCall?.id, myIdStr]);

  // Контроль мута
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
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: isIncoming ? '#2ec761' : '#007aff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 0 rgba(0, 122, 255, 0.4)', animation: 'pulse 1.6s infinite' }}>
            <Volume2 size={44} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 8px 0' }}>{isIncoming ? 'Входящий аудиозвонок' : 'Исходящий аудиозвонок'}</h2>
            <p style={{ color: '#9ca3af', margin: 0, fontSize: '14px' }}>Комната: {activeCall.roomName}</p>
          </div>
          <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
            {isIncoming ? (
              <>
                <button type="button" onClick={ctx.handleHangUp} style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ff453a', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><PhoneOff size={24} color="#fff" /></button>
                <button type="button" onClick={ctx.handleAcceptCall} style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#2ec761', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Phone size={24} color="#fff" /></button>
              </>
            ) : (
              <button type="button" onClick={ctx.handleHangUp} style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ff453a', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><PhoneOff size={24} color="#fff" /></button>
            )}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 🔊 ФАЗА 2: АКТИВНЫЙ ГРУППОВОЙ СОЗВОН (ДИНАМИЧЕСКАЯ СЕТКА)*/
        /* ======================================================== */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '900px', gap: '40px', padding: '0 20px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}><Users size={24} color="#2ec761" /> Аудиоконференция беседы</h2>
            <p style={{ color: '#9ca3af', margin: '6px 0 0 0', fontSize: '13px' }}>Комната: {activeCall.roomName}</p>
          </div>

          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
            {/* КАРТОЧКА 1: ВЫ (Всегда первая) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', backgroundColor: '#1e1f22', border: '2px solid #2b2d31', borderRadius: '16px', padding: '28px', minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
              <div style={{ width: '84px', height: '84px', borderRadius: '50%', backgroundColor: myAvatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 'bold', boxShadow: isMuted ? 'none' : `0 0 0 ${Math.max(2, myVolume / 6)}px #2ec761`, transition: 'box-shadow 0.05s ease' }}>{myName.substring(0, 1).toUpperCase()}</div>
              <span style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>{myName} (Вы)</span>
              <div style={{ display: 'flex', gap: '3px', height: '16px', alignItems: 'flex-end', marginTop: '2px' }}>
                <div style={{ width: '3px', height: liveHeight1, backgroundColor: '#2ec761', borderRadius: '2px' }} />
                <div style={{ width: '3px', height: liveHeight2, backgroundColor: '#2ec761', borderRadius: '2px' }} />
                <div style={{ width: '3px', height: liveHeight3, backgroundColor: '#2ec761', borderRadius: '2px' }} />
              </div>
            </div>

            {/* КАРТОЧКИ ОСТАЛЬНЫХ РЕАЛЬНЫХ УЧАСТНИКОВ */}
            {loadingMembers ? (
              <div style={{ color: '#9ca3af', fontSize: '14px', alignSelf: 'center' }}>Синхронизация участников...</div>
            ) : (
              conferenceUsers.map((member) => {
                const memberNameText = `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.username;
                return (
                  <div key={member.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', backgroundColor: '#1e1f22', border: '2px solid #2b2d31', borderRadius: '16px', padding: '28px', minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                    <div style={{ width: '84px', height: '84px', borderRadius: '50%', backgroundColor: member.avatarColor || '#5865F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 'bold', boxShadow: `0 0 0 4px #2ec761`, animation: 'voice-pulse 1.4s infinite alternate' }}>{memberNameText.substring(0, 1).toUpperCase()}</div>
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

          <div style={{ display: 'flex', gap: '24px', backgroundColor: '#141517', padding: '14px 40px', borderRadius: '28px', border: '1px solid #2b2d31' }}>
            <button type="button" onClick={() => setIsMuted(!isMuted)} style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: isMuted ? '#ff453a' : '#2b2d31', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{isMuted ? <MicOff size={22} /> : <Mic size={22} />}</button>
            <button type="button" onClick={ctx.handleHangUp} style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#ff453a', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(255, 69, 58, 0.4)' }}><PhoneOff size={22} /></button>
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
