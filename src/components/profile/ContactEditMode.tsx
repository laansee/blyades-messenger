import React from 'react';
import styles from '../css/profile.module.css';

interface ContactEditModeProps {
  currentChatUser: any;
  editFirstName: string;
  setEditFirstName: (v: string) => void;
  editLastName: string;
  setEditLastName: (v: string) => void;
  editNote: string;
  setEditNote: (v: string) => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onDeleteContact?: () => void;
}

export default function ContactEditMode({
  currentChatUser,
  editFirstName,
  setEditFirstName,
  editLastName,
  setEditLastName,
  editNote,
  setEditNote,
  onCancel,
  onSave,
  onDeleteContact
}: ContactEditModeProps) {
  return (
    <div className={styles['profile-edit-mode']}>
      <h3 className={styles['profile-edit-title']}>
        {currentChatUser.isGroup ? 'Настройки беседы' : (currentChatUser.isContact ? 'Изменить контакт' : 'Добавить контакт')}
      </h3>

      <div className={styles['profile-edit-header']}>
        {currentChatUser.avatarUrl ? (
          <img
            src={currentChatUser.avatarUrl}
            alt="Avatar"
            style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          />
        ) : (
          <div className={styles['profile-edit-avatar']} style={{ backgroundColor: currentChatUser.avatarColor }}>
            {editFirstName.substring(0, 1).toUpperCase() || '?'}
          </div>
        )}
        {/* <div className={styles['tg-edit-avatar']} style={{ backgroundColor: currentChatUser.avatarColor }}>
          {editFirstName.substring(0, 1).toUpperCase() || '?'}
        </div> */}
        <div className={styles['profile-edit-user-meta']}>
          {currentChatUser.isGroup ? 
            <div className={styles['profile-meta-name']}>{editFirstName}</div>
          : 
            <div className={styles['profile-meta-name']}>{editFirstName} {editLastName}</div>
          }
          {!currentChatUser.isGroup &&
            <div className={styles['profile-meta-phone']}>@{currentChatUser.uniqueId || currentChatUser.username}</div>
          }
          {/* <div className={styles['profile-meta-phone']}>@{currentChatUser.uniqueId || currentChatUser.username}</div> */}
        </div>
      </div>

      <div className={styles['profile-inputs-list']}>
        <div className={styles['profile-input-field']}>
          <input 
            type="text" 
            value={editFirstName}
            onChange={(e) => setEditFirstName(e.target.value)}
            placeholder=" "
            className={styles['profile-line-input']} 
            id='editFirstName-input' 
          />
          <label className={styles['profile-field-label']} htmlFor='editFirstName-input'>
            {currentChatUser.isGroup ? 'Название беседы' : 'Имя'}
          </label>
        </div>

        {!currentChatUser.isGroup && (
          <>
            <div className={styles['profile-input-field']}>
              <input 
                type="text" 
                value={editLastName} 
                onChange={(e) => setEditLastName(e.target.value)}
            placeholder=" "
                className={styles['profile-line-input']}
                id='editLastName-input'
              />
              <label className={styles['profile-field-label']} htmlFor='editLastName-input'>Фамилия</label>
            </div>

            <div className={styles['profile-input-field']}>
              <input 
                type="text" 
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder=" " 
                className={styles['profile-line-input']} 
                id='editNote-input' 
              />
              <label className={styles['profile-field-label']} htmlFor='editNote-input'>Заметка</label>
            </div>
          </>
        )}
      </div>

      {currentChatUser.isContact && onDeleteContact && (
        <button type="button" className={styles['profile-delete-link']} onClick={onDeleteContact}>
          Удалить контакт
        </button>
      )}

      <div className={styles['profile-edit-footer']}>
        <button type="button" className={styles['profile-footer-cancel-btn']} onClick={onCancel}>Отмена</button>
        <button type="button" className={styles['profile-footer-ready-btn']} onClick={onSave}>Готово</button>
      </div>
    </div>
  );
}
