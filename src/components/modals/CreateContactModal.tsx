import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import styles from '../css/profile.module.css';
import useMessengerContext from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';
import { userService } from '../../services/userService';
import SmartAvatar from '../common/SmartAvatar';

interface CreateContactModalProps {
  show: boolean;
  onClose: () => void;
}

export default function CreateContactModal({ show, onClose }: CreateContactModalProps) {
  const ctx = useMessengerContext();
  const [searchTag, setSearchTag] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<any | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!show) return null;

  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = searchTag.replace('@', '').trim();
    if (!cleanTag) return;

    setSearching(true);
    setFoundUser(null);

    try {
      // Ищем пользователя по uniqueId, username или phone
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`uniqueId.eq.${cleanTag},username.eq.${cleanTag},phone.eq.${cleanTag}`)
        .maybeSingle();

      if (error || !data) {
        ctx.showToast('Пользователь не найден', 'info');
      } else {
        setFoundUser(data);
        setFirstName(data.firstName || data.username || '');
        setLastName(data.lastName || '');
      }
    } catch (err) {
      console.error(err);
      ctx.showToast('Ошибка при поиске', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleSaveNewContact = async () => {
    if (!foundUser) return;
    const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');
    const targetUuid = String(foundUser.uuid || foundUser.id);

    if (myUuid === targetUuid) {
      ctx.showToast('Нельзя добавить себя в контакты', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        userId: myUuid,
        user_id: myUuid,
        contactId: targetUuid,
        contact_id: targetUuid,
        firstName: firstName.trim(),
        first_name: firstName.trim(),
        lastName: lastName.trim(),
        last_name: lastName.trim(),
        note: note.trim(),
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('contacts').upsert(payload);

      if (error) {
        // Fallback для snake_case
        await supabase.from('contacts').upsert({
          user_id: myUuid,
          contact_id: targetUuid,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          note: note.trim(),
          updated_at: new Date().toISOString()
        });
      }

      // Обновляем список контактов в контексте
      if (ctx.setContacts) {
        ctx.setContacts((prev: any[]) => [
          ...prev.filter(c => String(c.uuid || c.partnerId || c.contactId) !== targetUuid),
          {
            ...foundUser,
            partnerId: targetUuid,
            uuid: targetUuid,
            contactFirstName: firstName.trim(),
            contactLastName: lastName.trim(),
            note: note.trim(),
            isContact: true
          }
        ]);
      }

      ctx.showToast('Контакт успешно добавлен!', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      ctx.showToast('Не удалось добавить контакт', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles['modal-overlay']} onClick={onClose} style={{ display: 'flex', opacity: 1, pointerEvents: 'auto' }}>
      <div 
        className={styles['profile-modal-card']} 
        onClick={(e) => e.stopPropagation()}
        style={{ width: '380px' }}
      >
        <div className={styles['modal-header-simple']}>
          <h3 className={styles['modal-title-text']}>Новый контакт</h3>
          <button type="button" className={styles['close-modal-btn']} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Поле поиска пользователя */}
          {!foundUser ? (
            <form onSubmit={handleSearchUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className={styles['profile-input-field']} style={{ marginBottom: 0 }}>
                <input
                  type="text"
                  value={searchTag}
                  onChange={(e) => setSearchTag(e.target.value)}
                  placeholder=" "
                  className={styles['profile-line-input']}
                  id="searchTag-input"
                  autoFocus
                  autoComplete="off"
                />
                <label className={styles['profile-field-label']} htmlFor="searchTag-input">
                  @username или номер телефона
                </label>
              </div>

              <button
                type="submit"
                disabled={searching || !searchTag.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#8b5cf6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: searching || !searchTag.trim() ? 'not-allowed' : 'pointer',
                  opacity: searching || !searchTag.trim() ? 0.6 : 1,
                  marginTop: '10px'
                }}
              >
                <Search size={16} />
                {searching ? 'Поиск...' : 'Найти пользователя'}
              </button>
            </form>
          ) : (
            /* Форма ввода локального имени контакта */
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                <SmartAvatar
                  size={48}
                  avatarUrl={foundUser.avatarUrl}
                  avatarColor={foundUser.avatarColor || '#8b5cf6'}
                  name={foundUser.username}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>
                    {userService.resolveDisplayName(foundUser)}
                  </span>
                  <span style={{ color: '#8e8e98', fontSize: '13px' }}>
                    @{foundUser.uniqueId || foundUser.username}
                  </span>
                </div>
              </div>

              <div className={styles['profile-inputs-list']}>
                <div className={styles['profile-input-field']}>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder=" "
                    className={styles['profile-line-input']}
                    id="newContactFirstName"
                    autoComplete="off"
                  />
                  <label className={styles['profile-field-label']} htmlFor="newContactFirstName">
                    Имя
                  </label>
                </div>

                <div className={styles['profile-input-field']}>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder=" "
                    className={styles['profile-line-input']}
                    id="newContactLastName"
                    autoComplete="off"
                  />
                  <label className={styles['profile-field-label']} htmlFor="newContactLastName">
                    Фамилия
                  </label>
                </div>

                <div className={styles['profile-input-field']}>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder=" "
                    className={styles['profile-line-input']}
                    id="newContactNote"
                    autoComplete="off"
                  />
                  <label className={styles['profile-field-label']} htmlFor="newContactNote">
                    Заметка (необязательно)
                  </label>
                </div>
              </div>

              <div className={styles['profile-edit-footer']} style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className={styles['profile-footer-cancel-btn']}
                  onClick={() => setFoundUser(null)}
                >
                  Назад
                </button>
                <button
                  type="button"
                  className={styles['profile-footer-ready-btn']}
                  disabled={saving}
                  onClick={handleSaveNewContact}
                >
                  {saving ? 'Сохранение...' : 'Добавить'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}