import React, { useState } from 'react';
import useMessengerContext from '../../context/messengerContext';
import { formatUserOnlineStatus } from '../../context/messengerContext';
import styles from '../css/profile.module.css';

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
  if (!currentChatUser) return null;

  return (
    <div className={styles['view-mode']}>
      
      <div style={{ padding: '24px'}}>
        <div className={styles['profile-avatar-wrapper']}>
          {currentChatUser.avatarUrl ? (
            <img
              src={currentChatUser.avatarUrl}
              alt="Avatar"
            />
          ) : (
            <div className={styles['profile-avatar']} style={{ backgroundColor: currentChatUser.avatarColor || '#007aff' }}>
              {baseName.substring(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <h2 className={styles['profile-name']}>{baseName}</h2>
        <span 
          className={`${styles['profile-status']} ${
            (() => {
              const statusInfo = formatUserOnlineStatus(currentChatUser?.updatedAt, currentChatUser?.privacyOnline);
              return statusInfo.isOnline ? styles['online'] : '';
            })()
          }`}
        >
          {formatUserOnlineStatus(currentChatUser?.updatedAt, currentChatUser?.privacyOnline).text}
        </span>

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
      </div>

      <div className={styles['info-section']}>

        {currentChatUser.privacyNameFormat === 'username' && 
         shouldShowField(currentChatUser.privacyFullName, currentChatUser.isAmHisContact) && 
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

        {currentChatUser.aboutMe && currentChatUser.aboutMe.trim() !== '' && (
          <div className={styles['info-item']}>
            <span className={styles['info-value']}>{currentChatUser.aboutMe}</span>
            <span className={styles['info-label']}>О себе</span>
          </div>
        )}
        
        {shouldShowField(currentChatUser.privacyPhone, currentChatUser.isAmHisContact) && currentChatUser.phone && currentChatUser.phone.trim() !== '' && (
          <div className={styles['info-item']}>
            <span className={styles['info-value']}>{currentChatUser.phone}</span>
            <span className={styles['info-label']}>Телефон</span>
          </div>
        )}

        {shouldShowField(currentChatUser.privacyEmail, currentChatUser.isAmHisContact) && currentChatUser.email && currentChatUser.email.trim() !== '' && (
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

        {/* В БУДУЩЕМ ДОБАВИТЬ ВИДИМОСТЬ ЭТОГО БЛОКА ТОЛЬКО ДЛЯ АДМИНА */}
        {/* <div style={{ backgroundColor: '#2c1a1a', border: '1px solid #ff453a', padding: '10px', borderRadius: '8px', margin: '10px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#ff453a', fontWeight: 'bold', textTransform: 'uppercase' }}>Отладчик приватности Блидес</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#aaa' }}>Добавлен ли он у меня (isContact):</span>
            <span style={{ color: currentChatUser.isContact ? '#34c759' : '#ff453a', fontWeight: 'bold' }}>
              {currentChatUser.isContact ? 'ДА (true)' : 'НЕТ (false)'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#aaa' }}>Добавлен ли я у него (isAmHisContact):</span>
            <span style={{ color: currentChatUser.isAmHisContact ? '#34c759' : '#ff453a', fontWeight: 'bold' }}>
              {currentChatUser.isAmHisContact ? 'ДА (true)' : 'НЕТ (false)'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px', borderTop: '1px solid #3a1a1a', paddingTop: '4px', color: '#8e8e93' }}>
            <span>Настройка отображения имени (и приватность):</span>
            <span style={{width: 'min-content'}}>{currentChatUser.privacyNameFormat} ({currentChatUser.privacyFullName})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px', borderTop: '1px solid #3a1a1a', paddingTop: '4px', color: '#8e8e93' }}>
            <span>Настройка телефона:</span>
            <span>{currentChatUser.privacyPhone}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px', borderTop: '1px solid #3a1a1a', paddingTop: '4px', color: '#8e8e93' }}>
            <span>Настройка эл. почты:</span>
            <span>{currentChatUser.privacyEmail}</span>
          </div>
        </div> */}
      </div>
    </div>
  );
}
