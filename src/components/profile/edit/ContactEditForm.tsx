import React from 'react';
import styles from '../../css/profile.module.css';
import { EditAvatarButton } from './EditAvatarButton';

interface ContactEditFormProps {
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

export const ContactEditForm: React.FC<ContactEditFormProps> = ({
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
}) => {
  return (
    <div className={styles['profile-edit-mode']}>
      <h3 className={styles['profile-edit-title']}>
        {currentChatUser.isContact ? 'Изменить контакт' : 'Добавить контакт'}
      </h3>

      <div className={styles['profile-edit-header']}>
        <EditAvatarButton
          avatarUrl={currentChatUser.avatarUrl}
          avatarColor={currentChatUser.avatarColor || '#007aff'}
          fallbackLetter={editFirstName.substring(0, 1) || currentChatUser.username?.substring(0, 1) || '?'}
          isEditable={false}
        />

        <div className={styles['profile-edit-user-meta']}>
          <div className={styles['profile-meta-name']}>
            {`${editFirstName} ${editLastName}`.trim() || currentChatUser.username}
          </div>
          <div className={styles['profile-meta-phone']}>
            @{currentChatUser.uniqueId || currentChatUser.username}
          </div>
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
            id="editFirstName-input" 
            autoComplete="off"
          />
          <label className={styles['profile-field-label']} htmlFor="editFirstName-input">
            Имя
          </label>
        </div>

        <div className={styles['profile-input-field']}>
          <input 
            type="text" 
            value={editLastName} 
            onChange={(e) => setEditLastName(e.target.value)}
            placeholder=" "
            className={styles['profile-line-input']}
            id="editLastName-input"
            autoComplete="off"
          />
          <label className={styles['profile-field-label']} htmlFor="editLastName-input">
            Фамилия
          </label>
        </div>

        <div className={styles['profile-input-field']}>
          <input 
            type="text" 
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder=" " 
            className={styles['profile-line-input']} 
            id="editNote-input" 
            autoComplete="off"
          />
          <label className={styles['profile-field-label']} htmlFor="editNote-input">
            Заметка
          </label>
        </div>
      </div>

      {currentChatUser.isContact && onDeleteContact && (
        <button type="button" className={styles['profile-delete-link']} onClick={onDeleteContact}>
          Удалить контакт
        </button>
      )}

      <div className={styles['profile-edit-footer']}>
        <button type="button" className={styles['profile-footer-cancel-btn']} onClick={onCancel}>
          Отмена
        </button>
        <button type="button" className={styles['profile-footer-ready-btn']} onClick={onSave}>
          Готово
        </button>
      </div>
    </div>
  );
};