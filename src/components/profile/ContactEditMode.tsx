import React from 'react';
import styles from '../css/chat-window.module.css';

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
    <div className={styles['tg-edit-mode']}>
      <h3 className={styles['tg-edit-title']}>
        {currentChatUser.isGroup ? 'Настройки беседы' : (currentChatUser.isContact ? 'Изменить контакт' : 'Добавить контакт')}
      </h3>

      <div className={styles['tg-edit-header']}>
        <div className={styles['tg-edit-avatar']} style={{ backgroundColor: currentChatUser.avatarColor }}>
          {editFirstName.substring(0, 1).toUpperCase() || '?'}
        </div>
        <div className={styles['tg-edit-user-meta']}>
          <div className={styles['tg-meta-name']}>{editFirstName} {editLastName}</div>
          <div className={styles['tg-meta-phone']}>@{currentChatUser.uniqueId || currentChatUser.username}</div>
        </div>
      </div>

      <div className={styles['tg-inputs-list']}>
        <div className={styles['tg-input-field']}>
          <label className={styles['tg-field-label']} htmlFor='editFirstName-input'>
            {currentChatUser.isGroup ? 'Название беседы' : 'Имя'}
          </label>
          <input 
            type="text" className={styles['tg-line-input']} value={editFirstName}
            id='editFirstName-input' onChange={(e) => setEditFirstName(e.target.value)}
          />
        </div>

        {!currentChatUser.isGroup && (
          <>
            <div className={styles['tg-input-field']}>
              <label className={styles['tg-field-label']} htmlFor='editLastName-input'>Фамилия</label>
              <input 
                type="text" className={styles['tg-line-input']} value={editLastName}
                id='editLastName-input' onChange={(e) => setEditLastName(e.target.value)}
              />
            </div>

            <div className={styles['tg-input-field']}>
              <label className={styles['tg-field-label']} htmlFor='editNote-input'>Заметка</label>
              <input 
                type="text" className={styles['tg-line-input']} placeholder="Заметку видите только Вы." value={editNote}
                id='editNote-input' onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {currentChatUser.isContact && onDeleteContact && (
        <button type="button" className={styles['tg-delete-link']} onClick={onDeleteContact}>
          Удалить контакт
        </button>
      )}

      <div className={styles['tg-edit-footer']}>
        <button type="button" className={styles['tg-footer-cancel-btn']} onClick={onCancel}>Отмена</button>
        <button type="button" className={styles['tg-footer-ready-btn']} onClick={onSave}>Готово</button>
      </div>
    </div>
  );
}
