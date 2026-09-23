import React, { useState, useEffect } from 'react';
import styles from './CSS/chat-window.module.css'; // Твои оригинальные стили модалки
import useMessengerContext from '../context/messengerContext';
import { supabase } from '../services/supabaseClient';

export default function ProfileModal() {
  const ctx = useMessengerContext();
  const [isAnimateClose, setIsAnimateClose] = useState(false);

  // Состояния для полей редактирования контакта в стиле Telegram
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Порядок хуков строго на самом верху компонента
  const targetUserId = ctx?.showUserModal === true ? ctx?.activeChatId : ctx?.showUserModal;
  const currentChatUser = ctx?.chats?.find((c: any) => String(c.id).trim() === String(targetUserId).trim());

  useEffect(() => {
    if (isEditing && currentChatUser) {
      // Если пользователя нет в контактах, подставляем его дефолтные данные из базы как базовый черновик
      const isNameVisible = currentChatUser.privacyFullName === 'all' || currentChatUser.isContact;

      // 1. Логика для инпута "Имя"
      if (currentChatUser.contactFirstName) {
        // Если мы его уже когда-то переименовали — берем наше имя из контактов
        setEditFirstName(currentChatUser.contactFirstName);
      } else if (isNameVisible && currentChatUser.firstName) {
        // Если имя скрыто настройками приватности, этот блок пропустится!
        setEditFirstName(currentChatUser.firstName);
      } else {
        // Если имя скрыто приватностью — вставляем в инпут "Имя" его публичный никнейм/username как черновик
        setEditFirstName(currentChatUser.username || currentChatUser.name || '');
      }

      // 2. Логика для инпута "Фамилия"
      if (currentChatUser.contactLastName) {
        setEditLastName(currentChatUser.contactLastName);
      } else if (isNameVisible && currentChatUser.lastName) {
        // Если фамилия скрыта приватностью, инпут останется идеально пустым!
        setEditLastName(currentChatUser.lastName);
      } else {
        setEditLastName('');
      }
      setEditNote(currentChatUser.note || '');
    }
  }, [isEditing, currentChatUser]);

  useEffect(() => {
    setIsEditing(false);
  }, [ctx?.showUserModal]);

  if (!ctx || !ctx.showUserModal || !currentChatUser) return null;

  const baseName = currentChatUser.name || currentChatUser.username || 'Пользователь';

  const handleCloseModalSmooth = () => {
    setIsAnimateClose(true);
    setTimeout(() => {
      ctx.setShowUserModal(false);
      setIsAnimateClose(false);
      setIsEditing(false);
    }, 200);
  };

  return (
    <div 
      className={styles['modal-overlay']} 
      onClick={handleCloseModalSmooth}
      style={{
        opacity: ctx.showUserModal ? 1 : 0,
        pointerEvents: ctx.showUserModal ? 'auto' : 'none',
        display: 'flex',
        transition: 'opacity 0.25s ease'
      }}
    >
      <div 
        className={styles['profile-modal-card']} 
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: ctx.showUserModal ? 'scale(1)' : 'scale(0.85)',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {/* ======================================================== */}
        {/* 👁️ ЭКРАН 1: РЕЖИМ ПРОСМОТРА КАРТОЧКИ                     */}
        {/* ======================================================== */}
        {!isEditing ? (
          <div className={styles['view-mode']}>
            <div className={styles['profile-avatar-wrapper']}>
              <div 
                className={styles['profile-avatar']} 
                style={{ backgroundColor: currentChatUser.avatarColor }}
              >
                {baseName.substring(0, 1).toUpperCase()}
              </div>
            </div>

            <h2 className={styles['profile-name']}>{baseName}</h2>
            <span className={styles['profile-status']}>был(а) недавно</span>

            <div className={styles['action-buttons-row']}>
              <button 
                type="button"
                className={styles['action-btn']} 
                onClick={() => { ctx.setActiveChatId(currentChatUser.id); handleCloseModalSmooth(); }}
              >
                <span className={styles['btn-icon']}>💬</span>
                <span className={styles['btn-text']}>Чат</span>
              </button>
              <button type="button" className={styles['action-btn']}>
                <span className={styles['btn-icon']}>🔔</span>
                <span className={styles['btn-text']}>Звук</span>
              </button>
              <button 
                type="button"
                onClick={() => {
                  handleCloseModalSmooth();
                  ctx.setActiveTab('calls');
                }}
                className={styles['action-btn']}
              >
                <span className={styles['btn-icon']}>📞</span>
                <span className={styles['btn-text']}>Звонок</span>
              </button>

              {/* 🚀 ДИНАМИЧЕСКАЯ КНОПКА: Добавить или Изменить на основе флага isContact */}
              <button type="button" className={styles['action-btn']} onClick={() => setIsEditing(true)}>
                <span className={styles['btn-icon']}>{currentChatUser.isContact ? '⚙️' : '➕'}</span>
                <span className={styles['btn-text']}>
                  {currentChatUser.isContact ? 'Изменить' : 'Добавить'}
                </span>
              </button>
            </div>

            <div className={styles['info-section']}>
              <div className={styles['info-item']}>
                <span className={styles['info-value']}>@{currentChatUser.uniqueId || 'не указан'}</span>
                <span className={styles['info-label']}>Имя пользователя</span>
              </div>
              
              {currentChatUser.phone && currentChatUser.privacyPhone === 'all' && (
                <div className={styles['info-item']}>
                  <span className={styles['info-value']}>{currentChatUser.phone}</span>
                  <span className={styles['info-label']}>Телефон</span>
                </div>
              )}

              {currentChatUser.email && currentChatUser.privacyEmail === 'all' && (
                <div className={styles['info-item']}>
                  <span className={styles['info-value']}>{currentChatUser.email}</span>
                  <span className={styles['info-label']}>Электронная почта</span>
                </div>
              )}

              {currentChatUser.privacyNameFormat === 'username' && 
               currentChatUser.privacyFullName === 'all' && 
               (currentChatUser.firstName || currentChatUser.lastName) && (
                <div className={styles['info-item']}>
                  <span className={styles['info-value']}>
                    {`${currentChatUser.firstName} ${currentChatUser.lastName}`.trim()}
                  </span>
                  <span className={styles['info-label']}>Имя и Фамилия</span>
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
        ) : (
          /* ======================================================== */
          /* 📝 ЭКРАН 2: РЕЖИМ ДОБАВЛЕНИЯ / РЕДАКТИРОВАНИЯ КОНТАКТА    */
          /* ======================================================== */
          <div className={styles['tg-edit-mode']}>
            <h3 className={styles['tg-edit-title']}>
              {currentChatUser.isContact ? 'Изменить контакт' : 'Добавить контакт'}
            </h3>

            <div className={styles['tg-edit-header']}>
              <div className={styles['tg-edit-avatar']} style={{ backgroundColor: currentChatUser.avatarColor }}>
                {editFirstName.substring(0, 1).toUpperCase() || '?'}
              </div>
              <div className={styles['tg-edit-user-meta']}>
                <div className={styles['tg-meta-name']}>{editFirstName} {editLastName}</div>
                <div className={styles['tg-meta-phone']}>@{currentChatUser.uniqueId}</div>
              </div>
            </div>

            <div className={styles['tg-inputs-list']}>
              <div className={styles['tg-input-field']}>
                <label className={styles['tg-field-label']}>Имя</label>
                <input 
                  type="text" 
                  className={styles['tg-line-input']}
                  value={editFirstName} 
                  onChange={(e) => setEditFirstName(e.target.value)}
                />
              </div>

              <div className={styles['tg-input-field']}>
                <label className={styles['tg-field-label']}>Фамилия</label>
                <input 
                  type="text" 
                  className={styles['tg-line-input']}
                  value={editLastName} 
                  onChange={(e) => setEditLastName(e.target.value)}
                />
              </div>

              <div className={styles['tg-input-field']}>
                <label className={styles['tg-field-label']}>Заметка</label>
                <input 
                  type="text" 
                  className={styles['tg-line-input']}
                  placeholder="Заметку видите только Вы."
                  value={editNote} 
                  onChange={(e) => setEditNote(e.target.value)}
                />
              </div>
            </div>

            {/* Показываем ссылку удаления, только если контакт РЕАЛЬНО уже существует в нашей записной книжке */}
            {currentChatUser.isContact && (
              <button 
                type="button"
                className={styles['tg-delete-link']}
                onClick={() => {                
                  ctx.showConfirm(
                    'Удаление контакта', 
                    `Вы действительно хотите удалить пользователя ${currentChatUser.username} из списка контактов?`, 
                    async () => {
                      await supabase
                        .from('contacts')
                        .delete()
                        .eq('contactId', currentChatUser.id)
                        .eq('userId', String(ctx.currentUser.id));
                        
                      ctx.setChats((prev: any[]) => prev.map(c => c.id === currentChatUser.id ? {
                        ...c,
                        isContact: false,
                        name: c.username,
                        contactFirstName: '',
                        contactLastName: '',
                        note: ''
                      } : c));
                      
                      handleCloseModalSmooth();
                      ctx.showToast('Контакт удален из записной книжки', 'success');
                    },
                    true
                  );
                }}
              >
                Удалить контакт
              </button>
            )}

            <div className={styles['tg-edit-footer']}>
              <button type="button" className={styles['tg-footer-cancel-btn']} onClick={() => setIsEditing(false)}>Отмена</button>
              <button 
                type="button"
                className={styles['tg-footer-ready-btn']} 
                onClick={async () => {
                  const updatedFields = {
                    userId: String(ctx.currentUser.id),
                    contactId: currentChatUser.id,
                    firstName: editFirstName,
                    lastName: editLastName,
                    note: editNote,
                    updatedAt: new Date().toISOString()
                  };

                  // Метод upsert автоматически сделает INSERT (создаст строку), если записи не было, 
                  // или UPDATE (обновит её), если этот контакт уже был у нас
                  await supabase.from('contacts').upsert(updatedFields);

                  // Синхронизируем состояние локально во всем приложении, взведя флаг isContact в true!
                  ctx.setChats((prev: any[]) => prev.map(c => c.id === currentChatUser.id ? {
                    ...c,
                    isContact: true,
                    contactFirstName: editFirstName,
                    contactLastName: editLastName,
                    name: `${editFirstName} ${editLastName}`.trim() || c.username,
                    note: editNote
                  } : c));

                  setIsEditing(false);
                  ctx.showToast(
                    currentChatUser.isContact 
                      ? 'Изменения сохранены!' 
                      : 'Пользователь успешно добавлен в контакты! ➕', 
                    'success'
                  );
                }}
              >
                Готово
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}