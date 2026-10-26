import { useState, useEffect, useRef } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { livekitService } from '../services/livekitService';

export function useWebRTCCalls(ctx: any) {
  const [isMuted, setIsMuted] = useState(false);
  const [myVolume, setMyVolume] = useState(0);
  const [conferenceUsers, setConferenceUsers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [speakingUserIds, setSpeakingUserIds] = useState<string[]>([]);

  const roomRef = useRef<Room | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const activeCall = ctx?.currentCall || ctx?.incomingCallData || null;
  const myIdStr = String(ctx?.currentUser?.id || '');

  useEffect(() => {
    if (!activeCall || activeCall.status !== 'accepted' || !activeCall.token) {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      setConferenceUsers([]);
      setSpeakingUserIds([]);
      return;
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    roomRef.current = room;

    const attachedElements: HTMLMediaElement[] = [];

    const updateParticipantsList = () => {
      const remoteUsers: any[] = [];
      room.remoteParticipants.forEach((p) => {
        const found = (ctx?.users || []).find(
          (u: any) => String(u.id) === String(p.identity) || String(u.uuid) === String(p.identity)
        );

        remoteUsers.push({
          id: p.identity,
          username: found?.name || found?.username || p.name || `User #${p.identity}`,
          avatarUrl: found?.avatarUrl || null,
          avatarColor: found?.avatarColor || '#9d7bf6',
        });
      });
      setConferenceUsers(remoteUsers);
      setLoadingMembers(false);
    };

    const attachAudioTrack = (track: any) => {
      if (track.kind === Track.Kind.Audio || track.kind === 'audio') {
        const el = track.attach();
        el.autoplay = true;
        el.volume = 1.0;
        el.muted = false;
        el.style.display = 'none';
        document.body.appendChild(el);
        attachedElements.push(el);

        el.play().catch(() => {
          const resumeAudio = () => {
            el.play().catch(console.error);
            room.startAudio().catch(console.error);
            window.removeEventListener('click', resumeAudio);
          };
          window.addEventListener('click', resumeAudio, { once: true });
        });
      }
    };

    // 🟢 1. Подписываемся на входящие аудиодорожки
    room.on(RoomEvent.TrackSubscribed, (track: any, publication: any, participant: any) => {
      console.log('[LiveKit] TrackSubscribed от участника:', participant.identity);
      if (track.kind === Track.Kind.Audio || track.kind === 'audio') {
        // LiveKit сам создает и настраивает правильный HTMLAudioElement
        const el = track.attach();
        attachedElements.push(el);
        document.body.appendChild(el);
      }
    });

    // 🟢 2. Подцепляем треки тех, кто УЖЕ в комнате
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((pub: any) => {
        if (pub.track && (pub.track.kind === Track.Kind.Audio || pub.track.kind === 'audio')) {
          console.log('[LiveKit] Найден существующий трек участника:', participant.identity);
          attachAudioTrack(pub.track);
        }
      });
    });

    const connectLiveKit = async () => {
      setLoadingMembers(true);
      try {
        const wsUrl = livekitService.getWsUrl();
        if (!wsUrl) return;

        await room.connect(wsUrl, activeCall.token);
        await room.startAudio();
        await room.localParticipant.setMicrophoneEnabled(true);

        updateParticipantsList();

        // 🟢 1. Слушаем активных говорящих (LiveKit VAD)
        room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          const activeIds = speakers.map(s => String(s.identity));
          setSpeakingUserIds(activeIds);
        });

        // 🟢 2. Подписка на аудио-треки
        room.on(RoomEvent.TrackSubscribed, (track: any) => {
          attachAudioTrack(track);
        });

        room.on(RoomEvent.TrackUnsubscribed, (track: any) => {
          track.detach().forEach((el: any) => el.remove());
        });

        room.on(RoomEvent.ParticipantConnected, () => updateParticipantsList());
        room.on(RoomEvent.ParticipantDisconnected, () => updateParticipantsList());

        setupAudioAnalyser(room);
      } catch (error) {
        console.error('LiveKit connection error:', error);
      } finally {
        setLoadingMembers(false);
      }
    };

    connectLiveKit();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      attachedElements.forEach((el) => el.remove());
      room.disconnect();
      roomRef.current = null;
      setConferenceUsers([]);
      setSpeakingUserIds([]);
    };
  }, [activeCall?.status, activeCall?.token, activeCall?.roomName]);

  useEffect(() => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.setMicrophoneEnabled(!isMuted).catch(console.error);
  }, [isMuted]);

  const setupAudioAnalyser = (room: Room) => {
    try {
      const trackPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      const stream = trackPub?.track?.mediaStream;
      if (!stream) return;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setMyVolume(Math.min(100, Math.round(avg * 1.5)));

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('Analyser setup error:', e);
    }
  };

  return {
    isMuted,
    setIsMuted,
    myVolume,
    conferenceUsers,
    loadingMembers,
    activeCall,
    myIdStr,
    speakingUserIds,
  };
}