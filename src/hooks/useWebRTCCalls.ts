import { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

export function useWebRTCCalls(ctx: any) {
  const [isMuted, setIsMuted] = useState(false);
  const [myVolume, setMyVolume] = useState(0); 
  const [conferenceUsers, setConferenceUsers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null); 
  const groupPcsRef = useRef<{ [userId: string]: RTCPeerConnection }>({}); 
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const activeCall = ctx?.currentCall || ctx?.incomingCallData;
  const myIdStr = ctx?.currentUser ? String(ctx.currentUser.id) : '';

  // 🕒 1. Мониторинг участников конференции в базе данных
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
            .select('id, username, avatarColor, avatarUrl, firstName, lastName')
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

  // 🎙️ 2. Сетевой гибридный WebRTC движок
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'accepted' || !myIdStr) return;

    const isGroupCall = String(activeCall.receiverId).startsWith('group_');
    let localStream: MediaStream | null = null;
    let pcInstance: RTCPeerConnection | null = null;
    let animId: number;

    // Фабрика пиров для Группы (Mesh)
    const createGroupPeerConnection = (targetUserId: string, stream: MediaStream) => {
      if (groupPcsRef.current[targetUserId]) return groupPcsRef.current[targetUserId];

      const gPc = new RTCPeerConnection({});
      stream.getTracks().forEach(track => gPc.addTrack(track, stream));

      gPc.ontrack = (event) => {
        console.log(`[Mesh_WebRTC] Поймали аудио от участника ${targetUserId}`);
        
        // 🎯 ЖЕЛЕЗНЫЙ ФИКС ЗВУКА ДЛЯ БЕСЕД: Вытаскиваем строго ПЕРВЫЙ стрим из массива!
        const remoteStream = event.streams[0]; 
        
        let audioEl = document.getElementById(`audio-remote-${targetUserId}`) as HTMLAudioElement | null;
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.id = `audio-remote-${targetUserId}`;
          document.body.appendChild(audioEl);
        }
        audioEl.srcObject = remoteStream;
        audioEl.autoplay = true;
        audioEl.volume = 1.0;
        
        // Пробиваем блокировку автоплея браузера
        audioEl.play().catch(e => console.warn('[Mesh_Audio_Play_Error]', e));
      };

      gPc.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabase
            .from('call_participants')
            .update({ ice: { candidate: event.candidate.toJSON(), from: myIdStr, to: targetUserId, isGroup: true } })
            .eq('callId', Number(activeCall.id))
            .eq('userId', myIdStr);
        }
      };

      groupPcsRef.current[targetUserId] = gPc;
      return gPc;
    };

    // Коннект для Личных звонков (1 на 1)
    if (!isGroupCall) {
      pcInstance = new RTCPeerConnection({});
      pcRef.current = pcInstance;

      pcInstance.ontrack = (event) => {
        console.log('[WebRTC_ЛС] Поймали аудиопоток от собеседника!');
        
        // 🎯 ВЫТАШИЛИ ИЗ МАССИВА ОДИНОЧНЫЙ ОБЪЕКТ MEDIASTREAM
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
        audioEl.play().catch(err => console.warn('[WebRTC_Audio_Play_Error]', err));
      };

      pcInstance.onicecandidate = async (event) => {
        if (event.candidate && activeCall?.id) {
          await supabase
            .from('call_participants')
            .update({ ice: event.candidate.toJSON() })
            .eq('callId', Number(activeCall.id))
            .eq('userId', myIdStr);
        }
      };
    }

    const startAudioEngine = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = localStream;

        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTracks[0].applyConstraints({ echoCancellation: true, noiseSuppression: true });
        }

        if (!isGroupCall && pcInstance) {
          localStream.getTracks().forEach(track => pcInstance!.addTrack(track, localStream!));
        }

        // Настройка визуальных прыгающих полосок
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

        const isCaller = String(activeCall.callerId) === myIdStr;
        if (isCaller) {
          if (!isGroupCall && pcInstance) {
            const offer = await pcInstance.createOffer();
            await pcInstance.setLocalDescription(offer);
            await supabase
              .from('call_participants')
              .update({ sdp: { type: offer.type, sdp: offer.sdp } })
              .eq('callId', Number(activeCall.id))
              .eq('userId', myIdStr);
          } else {
            // Групповой Mesh-старт
            const { data: members } = await supabase
              .from('call_participants')
              .select('userId')
              .eq('callId', Number(activeCall.id));

            if (members) {
              for (const m of members) {
                const targetId = String(m.userId);
                if (targetId !== myIdStr) {
                  const gPc = createGroupPeerConnection(targetId, localStream);
                  const offer = await gPc.createOffer();
                  await gPc.setLocalDescription(offer);
                  await supabase
                    .from('call_participants')
                    .update({ sdp: { type: offer.type, sdp: offer.sdp, from: myIdStr, to: targetId, isGroup: true } })
                    .eq('callId', Number(activeCall.id))
                    .eq('userId', myIdStr);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Ошибка запуска микрофона:', err);
      }
    };

    startAudioEngine();

    // Слушаем сигналы UPDATE
    const signalingSubscription = supabase
      .channel(`webrtc-hybrid-signaling-${activeCall.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'call_participants', filter: `callId=eq.${Number(activeCall.id)}` },
        async (payload) => {
          const newUserId = String(payload.new.userId);
          if (newUserId === myIdStr || !localStreamRef.current || !isGroupCall) return;

          console.log(`[Mesh_WebRTC] Обнаружен вход нового участника ${newUserId}! Генерируем для него Offer...`);
          
          // Создаем для новенького персональный сетевой мост
          const gPc = createGroupPeerConnection(newUserId, localStreamRef.current);
          const offer = await gPc.createOffer();
          await gPc.setLocalDescription(offer);

          // Отправляем Offer адресно новому участнику
          await supabase
            .from('call_participants')
            .update({ sdp: { type: offer.type, sdp: offer.sdp, from: myIdStr, to: newUserId, isGroup: true } })
            .eq('callId', Number(activeCall.id))
            .eq('userId', myIdStr);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'call_participants', filter: `callId=eq.${Number(activeCall.id)}` },
        async (payload) => {
          const partnerId = String(payload.new.userId);
          if (partnerId === myIdStr || !payload.new.sdp) return;

          // ----------------------------------------------------
          // 👥 РУКАВ 1: ЛОГИКА ОБРАБОТКИ СИГНАЛОВ ДЛЯ БЕСЕД (Mesh)
          // ----------------------------------------------------
          if (isGroupCall) {
            const { type, from, to, sdp, isGroup } = payload.new.sdp;
            if (!isGroup || to !== myIdStr || !localStreamRef.current) return;

            // Новенький ловит Offers от старичков комнаты и генерирует Answers
            if (type === 'offer') {
              console.log(`[Mesh_WebRTC] Поймали персональный Offer от старого участника ${from}. Отвечаем...`);
              const gPc = createGroupPeerConnection(from, localStreamRef.current);
              await gPc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
              const answer = await gPc.createAnswer();
              await gPc.setLocalDescription(answer);

              await supabase
                .from('call_participants')
                .update({ sdp: { type: answer.type, sdp: answer.sdp, from: myIdStr, to: from, isGroup: true } })
                .eq('callId', Number(activeCall.id))
                .eq('userId', myIdStr);
            }

            // Старички ловят Answers от новенького — мосты связи замыкаются адресными парами!
            if (type === 'answer') {
              console.log(`[Mesh_WebRTC] Поймали Answer от участника ${from}. Сетевой канал состыкован!`);
              const gPc = groupPcsRef.current[from];
              if (gPc && gPc.signalingState !== 'stable') {
                await gPc.setRemoteDescription(new RTCSessionDescription({ type, sdp }));
              }
            }

            // Стыковка сетевых ICE кандидатов участников созвона
            if (payload.new.ice && payload.new.ice.isGroup && payload.new.ice.to === myIdStr) {
              const gPc = groupPcsRef.current[payload.new.ice.from];
              if (gPc) {
                try { await gPc.addIceCandidate(new RTCIceCandidate(payload.new.ice.candidate)); } catch (e) {}
              }
            }
          } 
          // ----------------------------------------------------
          // 👤 РУКАВ 2: ТВОЯ СТАБИЛЬНАЯ ОРИГИНАЛЬНАЯ ЛОГИКА ЛС
          // ----------------------------------------------------
          else if (pcInstance) {
            if (payload.new.sdp.type === 'offer' && String(activeCall.callerId) !== myIdStr) {
              await pcInstance.setRemoteDescription(new RTCSessionDescription(payload.new.sdp));
              const answer = await pcInstance.createAnswer();
              await pcInstance.setLocalDescription(answer);
              await supabase
                .from('call_participants')
                .update({ sdp: { type: answer.type, sdp: answer.sdp } })
                .eq('callId', Number(activeCall.id))
                .eq('userId', myIdStr);
            }

            if (payload.new.sdp.type === 'answer' && String(activeCall.callerId) === myIdStr) {
              if (pcInstance.signalingState !== 'stable' && pcInstance.signalingState !== 'closed') {
                await pcInstance.setRemoteDescription(new RTCSessionDescription(payload.new.sdp));
              }
            }

            if (payload.new.ice && !payload.new.ice.isGroup) {
              try { await pcInstance.addIceCandidate(new RTCIceCandidate(payload.new.ice)); } catch (e) {}
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
      const singleAudio = document.getElementById('blymessenger-remote-audio');
      if (singleAudio) singleAudio.remove();

      Object.keys(groupPcsRef.current).forEach(uid => {
        groupPcsRef.current[uid].close();
        const el = document.getElementById(`audio-remote-${uid}`);
        if (el) el.remove();
      });
      groupPcsRef.current = {};
    };
  }, [activeCall?.status, activeCall?.id, myIdStr]);

  // Контроль мута
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
    }
  }, [isMuted]);

  return {
    isMuted,
    setIsMuted,
    myVolume,
    conferenceUsers,
    loadingMembers,
    activeCall,
    myIdStr
  };
}
