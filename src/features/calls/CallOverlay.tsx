import { useState, useEffect } from 'react';
import useMessengerContext from '../../context/messengerContext';
import { useWebRTCCalls } from '../../hooks/useWebRTCCalls';
import { Phone, PhoneOff, Volume2, Mic, MicOff, Users, Minimize2, Maximize2 } from 'lucide-react';
import styles from '../../components/css/calls.module.css';

export default function CallOverlay() {
  const ctx = useMessengerContext();
  const {
    isMuted,
    setIsMuted,
    myVolume,
    conferenceUsers,
    activeCall,
    myIdStr,
    speakingUserIds,
  } = useWebRTCCalls(ctx);

  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let timer: any;
    if (activeCall && activeCall.status === 'accepted') {
      timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [activeCall?.status]);

  if (!ctx || !activeCall) return null;

  const isIncoming = Boolean(ctx.incomingCallData);
  const isRinging = activeCall.status === 'ringing';
  const isMinimized = Boolean(ctx.isCallMinimized);

  const isMeSpeaking = !isMuted && (speakingUserIds.includes(myIdStr) || myVolume > 15);

  const formatSecs = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  if (isMinimized && !isRinging) {
    return (
      <div className={styles.pipContainer}>
        <div className={styles.pipTimer}>
          <span className={styles.pipDot} />
          <span className={styles.pipTimeText}>{formatSecs(callDuration)}</span>
        </div>

        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className={`${styles.pipButton} ${isMuted ? styles.pipButtonMuted : ''}`}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <button
          type="button"
          onClick={() => ctx.setIsCallMinimized(false)}
          className={styles.pipButton}
          title="Развернуть"
        >
          <Maximize2 size={16} />
        </button>

        <button
          type="button"
          onClick={ctx.handleHangUp}
          className={`${styles.pipButton} ${styles.pipButtonHangUp}`}
          title="Завершить"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className={styles.fullOverlay}>
      {!isRinging && (
        <button
          type="button"
          onClick={() => ctx.setIsCallMinimized(true)}
          className={styles.minimizeButton}
        >
          <Minimize2 size={16} />
          <span>Свернуть</span>
        </button>
      )}

      {isRinging ? (
        <div className={styles.ringingContainer}>
          <div
            className={`${styles.ringingAvatar} ${
              isIncoming ? styles.ringingIncoming : styles.ringingOutgoing
            }`}
          >
            <Volume2 size={44} color="#fff" />
          </div>
          <div>
            <h2 className={styles.ringingTitle}>
              {isIncoming ? 'Входящий звонок' : 'Исходящий вызов...'}
            </h2>
            <p className={styles.ringingRoomName}>Комната: {activeCall.roomName}</p>
          </div>
          <div className={styles.ringingActions}>
            {isIncoming ? (
              <>
                <button
                  type="button"
                  onClick={ctx.handleHangUp}
                  className={`${styles.callActionButton} ${styles.hangUpButton}`}
                >
                  <PhoneOff size={24} color="#fff" />
                </button>
                <button
                  type="button"
                  onClick={ctx.handleAcceptCall}
                  className={`${styles.callActionButton} ${styles.acceptButton}`}
                >
                  <Phone size={24} color="#fff" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={ctx.handleHangUp}
                className={`${styles.callActionButton} ${styles.hangUpButton}`}
              >
                <PhoneOff size={24} color="#fff" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.activeCallContainer}>
          <div className={styles.activeCallHeader}>
            <h2 className={styles.activeCallTitle}>
              <Users size={24} color="#2ec761" /> Созвон в сети
            </h2>
            <div className={styles.activeCallDuration}>{formatSecs(callDuration)}</div>
          </div>

          <div className={styles.participantsGrid}>
            {/* Текущий юзер */}
            <div className={styles.userCard}>
              <div
                className={`${styles.userAvatarCircle} ${isMeSpeaking ? styles.avatarSpeaking : ''}`}
                style={{ backgroundColor: '#007aff' }}
              >
                {(ctx.currentUser?.username || 'U')[0].toUpperCase()}
              </div>
              <span className={styles.userNameText}>
                {ctx.currentUser?.username || 'Вы'} (Вы)
              </span>
              {/* {isMeSpeaking && <div className={styles.speakingBadge}>Говорит...</div>} */}
            </div>

            {/* Собеседники */}
            {conferenceUsers.map((m: any) => {
              const isSpeaking = speakingUserIds.includes(String(m.id));
              return (
                <div key={m.id} className={styles.userCard}>
                  <div
                    className={`${styles.userAvatarCircle} ${isSpeaking ? styles.avatarSpeaking : ''}`}
                    style={{ backgroundColor: m.avatarColor || '#5865F2' }}
                  >
                    {(m.username || 'U')[0].toUpperCase()}
                  </div>
                  <span className={styles.userNameText}>{m.username}</span>
                  {/* {isSpeaking && <div className={styles.speakingBadge}>Говорит...</div>} */}
                </div>
              );
            })}
          </div>

          <div className={styles.controlBar}>
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={`${styles.controlButton} ${
                isMuted ? styles.micMuted : styles.micActive
              }`}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              type="button"
              onClick={ctx.handleHangUp}
              className={`${styles.controlButton} ${styles.hangUpButton}`}
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}