import React from 'react';
import styles from '../css/profile.module.css';
import { Megaphone, ShieldCheck, X, Pencil, Copy, Hash } from 'lucide-react';
import SmartAvatar from '../common/SmartAvatar';

interface ChannelProfileViewProps {
  currentChatUser: any;
  baseName: string;
  onClose: () => void;
  onEditToggle?: () => void;
  ctx: any;
}

export default function ChannelProfileView({
  currentChatUser,
  baseName,
  onClose,
  onEditToggle,
  ctx,
}: ChannelProfileViewProps) {
  const isNewsChannel = String(currentChatUser.id) === '1' || currentChatUser.uniqueId === 'news';
  const channelIdDisplay = currentChatUser.internalChatId || currentChatUser.id;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    ctx.showToast?.(`${label} скопирован в буфер`, 'success');
  };

  return (
    <div className={styles['view-mode']}>
      {/* 🔮 ВЕРХНЯЯ ШАПКА В ЕДИНОМ СТИЛЕ */}
      <div className={styles['profile-header-gradient']}>
        <div className={styles['profile-header-actions']}>
          <button
            type="button"
            onClick={onClose}
            title="Закрыть"
            className={styles['close-modal-btn']}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles['profile-avatar-wrapper']}>
          <SmartAvatar
            size={84}
            avatarUrl={currentChatUser.avatarUrl}
            avatarColor={currentChatUser.avatarColor || '#9d7bf6'}
            name={baseName}
            isChannel={true}
          />
        </div>

        <h2 className={styles['profile-name']}>{baseName}</h2>
        <span className={styles['profile-status']}>
          {isNewsChannel ? 'официальный новостной канал' : 'публичный канал'}
        </span>

        <div className={styles['action-buttons-row']}>
          <button
            type="button"
            className={styles['action-btn']}
            onClick={() => {
              ctx.setActiveChatId(String(currentChatUser.id));
              onClose();
            }}
          >
            <span className={styles['btn-icon']}>💬</span>
            <span className={styles['btn-text']}>Перейти</span>
          </button>
          
          <button
            type="button"
            className={styles['action-btn']}
            onClick={() => ctx.showToast('Настройки уведомлений в разработке', 'info')}
          >
            <span className={styles['btn-icon']}>🔔</span>
            <span className={styles['btn-text']}>Звук</span>
          </button>

          {onEditToggle && (
            <button type="button" className={styles['action-btn']} onClick={onEditToggle}>
              <span className={styles['btn-icon']}>⚙️</span>
              <span className={styles['btn-text']}>Настройки</span>
            </button>
          )}
        </div>
      </div>

      {/* 📋 СЕКЦИЯ ИНФОРМАЦИИ */}
      <div className={styles['info-section']}>
        {/* Описание канала */}
        <div className={styles['info-item']} style={{ cursor: 'default' }}>
          <div className={styles['info-item-content']}>
            <span className={`${styles['info-value']} ${styles['multiline']}`}>
              {currentChatUser.aboutMe || currentChatUser.description || 'Официальные новости, анонсы и обновления платформы Blyades.'}
            </span>
            <span className={styles['info-label']}>Описание канала</span>
          </div>
        </div>

        {/* Ссылка / уникальный тег */}
        <div 
          onClick={() => handleCopy(`@${currentChatUser.uniqueId || 'news'}`, 'Ссылка')}
          className={styles['info-item']}
        >
          <div className={styles['info-item-content']}>
            <span className={`${styles['info-value']} ${styles['accent']}`}>
              @{currentChatUser.uniqueId || 'news'}
            </span>
            <span className={styles['info-label']}>Ссылка для перехода</span>
          </div>
          <Copy size={18} className={styles['info-icon']} />
        </div>

        {/* Права публикации */}
        <div className={styles['info-item']} style={{ cursor: 'default' }}>
          <div className={styles['info-item-content']}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="#9d7bf6" />
              <span className={styles['info-value']}>Публикация только для администрации</span>
            </div>
            <span className={styles['info-label']}>Права публикации</span>
          </div>
        </div>

        {/* Числовой ID канала */}
        <div 
          onClick={() => handleCopy(String(channelIdDisplay), 'Идентификатор')}
          className={styles['info-item']}
        >
          <div className={styles['info-item-content']}>
            <span className={`${styles['info-value']} ${styles['mono']}`}>
              #{channelIdDisplay}
            </span>
            <span className={styles['info-label']}>Системный идентификатор</span>
          </div>
          <Hash size={16} className={styles['info-icon']} />
        </div>
      </div>
    </div>
  );
}