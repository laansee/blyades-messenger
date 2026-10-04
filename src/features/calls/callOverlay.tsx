import React from 'react';
import useMessengerContext from '../../context/messengerContext';
import { useWebRTCCalls } from '../../hooks/useWebRTCCalls'; // 🚀 Импортируем наш вынесенный WebRTC-движок
import { Phone, PhoneOff, Volume2, Mic, MicOff, Users } from 'lucide-react';

export default function CallOverlay() {
  const ctx = useMessengerContext();
  
  // Подключаем наш изолированный хук звонков
  const {
    isMuted,
    setIsMuted,
    myVolume,
    conferenceUsers,
    loadingMembers,
    activeCall,
    myIdStr
  } = useWebRTCCalls(ctx);

  if (!ctx || !activeCall) return null;
  
  const isIncoming = !!ctx.incomingCallData; 
  const isRinging = activeCall.status === 'ringing'; 

  const myName = ctx.currentUser?.username || 'Вы';
  const myAvatarColor = ctx.currentUser?.avatarColor || '#007aff';
  const myAvatarUrl = ctx.currentUser?.avatarUrl || '';

  // Вычисляем динамическую высоту полосок частот на основе живого стейта из хука
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
              
              {/* <div style={{ width: '84px', height: '84px', borderRadius: '50%', backgroundColor: myAvatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 'bold', boxShadow: isMuted ? 'none' : `0 0 0 ${Math.max(2, myVolume / 6)}px #2ec761`, transition: 'box-shadow 0.05s ease' }}>
                {myName.substring(0, 1).toUpperCase()}
              </div> */}
              {myAvatarUrl ? (
                <img
                  src={myAvatarUrl}
                  alt="Avatar"
                  style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                />
              ) : (
                <div style={{ width: '84px', height: '84px', borderRadius: '50%', backgroundColor: myAvatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 'bold', boxShadow: isMuted ? 'none' : `0 0 0 ${Math.max(2, myVolume / 6)}px #2ec761`, transition: 'box-shadow 0.05s ease' }}>
                  {myName.substring(0, 1).toUpperCase()}
                </div>
              )}

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
                    
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt="Avatar"
                        style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                      />
                    ) : (
                      <div style={{ width: '84px', height: '84px', borderRadius: '50%', backgroundColor: member.avatarColor || '#5865F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 'bold', boxShadow: `0 0 0 4px #2ec761`, animation: 'voice-pulse 1.4s infinite alternate' }}>
                        {memberNameText.substring(0, 1).toUpperCase()}
                      </div>
                    )}

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