import React, { useState } from 'react';
import useMessengerContext from '../../context/messengerContext';
import { formatUserOnlineStatus } from '../../context/messengerContext';
import styles from '../css/profile.module.css';
import { renderUserStatusBadge } from '../../utils/statusBadge';

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

        <h2 className={styles['profile-name']}>
          {renderUserStatusBadge(currentChatUser)}
          {baseName}
        </h2>
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

        {/* 🔑 ИДЕНТИФИКАТОРЫ СЕССИИ И МАРШРУТА КОМНАТЫ */} 
        {ctx.currentUser?.userStatus === 'administrator' && (
          <div>
            <div style={{ backgroundColor: '#1a1f2c', border: '1px solid #007aff', padding: '10px', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#007aff', fontWeight: 'bold', textTransform: 'uppercase' }}>Маршрутизация пакетов (Room Router)</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Мой ID (ctx.currentUser.id):</span>
                <span style={{ fontFamily: 'monospace', color: '#fff' }}>{ctx.currentUser?.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>ID Собеседника (currentChatUser.id):</span>
                <span style={{ fontFamily: 'monospace', color: '#fff' }}>{currentChatUser.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Имя нашей ЛС-комнаты:</span>
                <span style={{ fontFamily: 'monospace', color: '#ffcc00', fontWeight: 'bold' }}>
                  {Number(ctx.currentUser?.id) < Number(currentChatUser.id) 
                    ? `${ctx.currentUser?.id}_${currentChatUser.id}` 
                    : `${currentChatUser.id}_${ctx.currentUser?.id}`}
                </span>
              </div>
            </div>
            {currentChatUser?.isContact && 
              <div style={{ backgroundColor: '#212124', border: '1px solid #8e8e93', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#8e8e93', fontWeight: 'bold', textTransform: 'uppercase' }}>Сырые метаданные (Meta Tracker)</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>firstName:</span>
                  <span style={{ color: '#fff' }}>"{currentChatUser.firstName}"</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>lastName:</span>
                  <span style={{ color: '#fff' }}>"{currentChatUser.lastName}"</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>displayName:</span>
                  <span style={{ color: '#fff' }}>"{currentChatUser.username}"</span>
                </div>
              </div>
            }
            <div style={{ backgroundColor: '#1a2421', border: '1px solid #34c759', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#34c759', fontWeight: 'bold', textTransform: 'uppercase' }}>Сетевой статус (Supabase Realtime)</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Сырой updatedAt из БД:</span>
                <span style={{ fontFamily: 'monospace', color: '#fff' }}>{currentChatUser.updatedAt || 'NULL / Отсутствует'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Чистая разница времени:</span>
                <span style={{ fontWeight: 'bold', color: '#34c759' }}>
                  {currentChatUser.updatedAt ? `${Math.floor((new Date().getTime() - new Date(currentChatUser.updatedAt).getTime()) / 1000)} сек. назад` : '∞'}
                </span>
              </div>
            </div>
            <div style={{ 
              backgroundColor: '#18181f', 
              border: '1px solid #9d7bf6', 
              padding: '12px', 
              borderRadius: '0 0 16px 16px', 
              boxSizing: 'border-box'
            }}>
              <span style={{ 
                fontSize: '11px', 
                color: '#9d7bf6', 
                fontWeight: 'bold', 
                display: 'block', 
                marginBottom: '8px',
                letterSpacing: '0.5px'
              }}>
                RAW DATA DUMP (currentChatUser)
              </span>
              <pre style={{ 
                margin: 0, 
                padding: '10px', 
                backgroundColor: '#111214', 
                borderRadius: '6px', 
                color: '#34c759', // Приятный хакерский зелёный шрифт логов
                fontSize: '11px', 
                fontFamily: 'monospace', 
                overflowX: 'auto', // Горизонтальный скролл длинных полей
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-all',
                maxHeight: '150px', // Зажимаем по высоте, чтобы не ломать Collapsing-эффект карточки
                overflowY: 'auto' // Внутренний вертикальный скролл лога
              }}>
                {JSON.stringify(currentChatUser, null, 2)}
              </pre>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
