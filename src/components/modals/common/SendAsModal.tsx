import React from 'react';
import { createPortal } from 'react-dom';
import styles from '../../css/profile.module.css';
import SmartAvatar from '../../common/SmartAvatar';

interface SendAsModalProps {
  show: boolean;
  currentUserId?: string;
  currentUser: any;
  currentChannel: any;
  subscribersCount: number;
  selectedType: 'user' | 'channel';
  onSelect: (type: 'user' | 'channel') => void;
  onClose: () => void;
}

export const SendAsModal: React.FC<SendAsModalProps> = ({
  show,
  currentUser,
  currentChannel,
  subscribersCount,
  selectedType,
  onSelect,
  onClose
}) => {
  if (!show) return null;

  const myFullName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim();
  const userDisplayName = myFullName || currentUser?.username || 'Личный профиль';
  const channelName = currentChannel?.name || 'Канал';

  const formatSubs = (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${count} подписчиков`;
    if (mod10 === 1) return `${count} подписчик`;
    if (mod10 >= 2 && mod10 <= 4) return `${count} подписчика`;
    return `${count} подписчиков`;
  };

  return createPortal(
    <div
      className={styles['modal-overlay']}
      onClick={onClose}
      style={{ zIndex: 1000003 }}
    >
      <div
        className={styles['profile-modal-card']}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '360px',
          backgroundColor: '#21212b',
          borderRadius: '16px',
          padding: '24px 20px 16px 20px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.75)',
          border: '1px solid #2f2f3d',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          color: '#fff'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
          Написать от имени...
        </h3>

        <p style={{ margin: 0, fontSize: '13px', color: '#9a9ca6', lineHeight: 1.4 }}>
          Выберите, хотите ли Вы участвовать от своего имени или от имени канала.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
          {/* Личный аккаунт */}
          <div
            onClick={() => onSelect('user')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '8px 10px',
              borderRadius: '10px',
              cursor: 'pointer',
              backgroundColor: selectedType === 'user' ? 'rgba(135, 116, 225, 0.12)' : 'transparent',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (selectedType !== 'user') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
            }}
            onMouseLeave={(e) => {
              if (selectedType !== 'user') e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{
              padding: '2px',
              borderRadius: '50%',
              border: selectedType === 'user' ? '2px solid #8774e1' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <SmartAvatar
                size={40}
                avatarUrl={currentUser?.avatarUrl}
                avatarColor={currentUser?.avatarColor || '#5865F2'}
                name={userDisplayName}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userDisplayName}
              </span>
              <span style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>
                личный аккаунт
              </span>
            </div>
          </div>

          {/* Канал */}
          <div
            onClick={() => onSelect('channel')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '8px 10px',
              borderRadius: '10px',
              cursor: 'pointer',
              backgroundColor: selectedType === 'channel' ? 'rgba(135, 116, 225, 0.12)' : 'transparent',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (selectedType !== 'channel') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
            }}
            onMouseLeave={(e) => {
              if (selectedType !== 'channel') e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{
              padding: '2px',
              borderRadius: '50%',
              border: selectedType === 'channel' ? '2px solid #8774e1' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <SmartAvatar
                size={40}
                avatarUrl={currentChannel?.avatarUrl}
                avatarColor={currentChannel?.avatarColor || '#9d7bf6'}
                name={channelName}
                isChannel={true}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {channelName}
              </span>
              <span style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>
                {formatSubs(subscribersCount)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8774e1',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            Готово
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};