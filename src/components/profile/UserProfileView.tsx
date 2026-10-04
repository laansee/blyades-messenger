import React from 'react';
import styles from '../css/chat-window.module.css';

interface UserProfileViewProps {
  currentChatUser: any;
  baseName: string;
  shouldShowField: (setting: string | undefined, isContact: boolean) => boolean;
  onStartCall: () => void;
  onEditToggle: () => void;
  onClose: () => void;
  ctx: any;
}

export default function UserProfileView({
  currentChatUser,
  baseName,
  shouldShowField,
  onStartCall,
  onEditToggle,
  onClose,
  ctx
}: UserProfileViewProps) {
  return (
    <div className={styles['view-mode']}>
      <div className={styles['profile-avatar-wrapper']}>
        {currentChatUser.avatarUrl ? (
          <img
            src={currentChatUser.avatarUrl}
            alt="Avatar"
            style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          />
        ) : (
          <div className={styles['profile-avatar']} style={{ backgroundColor: currentChatUser.avatarColor || '#007aff' }}>
            {baseName.substring(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      <h2 className={styles['profile-name']}>{baseName}</h2>
      <span className={styles['profile-status']}>был(а) недавно</span>

      <div className={styles['action-buttons-row']}>
        <button 
          type="button" 
          className={styles['action-btn']} 
          onClick={() => { ctx.setActiveChatId(currentChatUser.id); onClose(); }}
        >
          <span className={styles['btn-icon']}>💬</span>
          <span className={styles['btn-text']}>Чат</span>
        </button>
        <button type="button" className={styles['action-btn']}>
          <span className={styles['btn-icon']}>🔔</span>
          <span className={styles['btn-text']}>Звук</span>
        </button>
        <button type="button" onClick={onStartCall} className={styles['action-btn']}>
          <span className={styles['btn-icon']}>📞</span>
          <span className={styles['btn-text']}>Звонок</span>
        </button>
        <button type="button" className={styles['action-btn']} onClick={onEditToggle}>
          <span className={styles['btn-icon']}>{currentChatUser.isContact ? '⚙️' : '➕'}</span>
          <span className={styles['btn-text']}>
            {currentChatUser.isContact ? 'Изменить' : 'Добавить'}
          </span>
        </button>
      </div>

      <div className={styles['info-section']}>

        {currentChatUser.privacyNameFormat === 'username' && 
         shouldShowField(currentChatUser.privacyFullName, currentChatUser.isContact) && 
         (currentChatUser.firstName || currentChatUser.lastName) && (
          <div className={styles['info-item']}>
            <span className={styles['info-value']}>
              {`${currentChatUser.firstName || ''} ${currentChatUser.lastName || ''}`.trim()}
            </span>
            <span className={styles['info-label']}>Настоящие Имя и Фамилия</span>
          </div>
        )}
        
        <div className={styles['info-item']}>
          <span className={styles['info-value']}>@{currentChatUser.uniqueId || currentChatUser.username || 'не указан'}</span>
          <span className={styles['info-label']}>Имя пользователя</span>
        </div>

        {currentChatUser.about_me && currentChatUser.about_me.trim() !== '' && (
          <div className={styles['info-item']}>
            <span className={styles['info-value']}>{currentChatUser.about_me}</span>
            <span className={styles['info-label']}>О себе</span>
          </div>
        )}
        
        {shouldShowField(currentChatUser.privacyPhone, currentChatUser.isContact) && currentChatUser.phone && currentChatUser.phone.trim() !== '' && (
          <div className={styles['info-item']}>
            <span className={styles['info-value']}>{currentChatUser.phone}</span>
            <span className={styles['info-label']}>Телефон</span>
          </div>
        )}

        {shouldShowField(currentChatUser.privacyEmail, currentChatUser.isContact) && currentChatUser.email && currentChatUser.email.trim() !== '' && (
          <div className={styles['info-item']}>
            <span className={styles['info-value']}>{currentChatUser.email}</span>
            <span className={styles['info-label']}>Электронная почта</span>
          </div>
        )}

        {currentChatUser.note && (
          <div className={styles['info-item']}>
            <span className={styles['info-value']}>{currentChatUser.note}</span>
            <span className={styles['info-label']}>Ваша заметка</span>
          </div>
        )}
      </div>
    </div>
  );
}
