import React, { useState, useEffect } from 'react';
import styles from '../../css/profile.module.css';
import { Smile } from 'lucide-react';
import useMessengerContext from '../../../context/messengerContext';
import { supabase } from '../../../services/supabaseClient';
import SmartAvatar from '../../common/SmartAvatar';

interface EditContactModalProps {
  show: boolean;
  contact: any | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditContactModal({ show, contact, onClose, onSuccess }: EditContactModalProps) {
  const ctx = useMessengerContext();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contact) {
      setFirstName(contact.firstName || contact.contactFirstName || '');
      setLastName(contact.lastName || contact.contactLastName || '');
      setNote(contact.note || '');
    }
  }, [contact]);

  if (!show || !contact) return null;

  const contactUuid = String(contact.contactId || contact.partnerId || contact.uuid || contact.id);
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || contact.username || contact.name || 'Пользователь';
  const phoneDisplay = contact.phone || '@' + (contact.uniqueId || contact.username || 'user');

  // 🗑️ Удаление контакта
  const handleDelete = () => {
    ctx.showConfirm?.(
      'Удаление контакта',
      `Удалить «${displayName}» из списка контактов?`,
      async () => {
        try {
          setLoading(true);
          const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');

          const { error } = await supabase
            .from('contacts')
            .delete()
            .eq('userId', myUuid)
            .eq('contactId', contactUuid);

          if (error) throw error;

          ctx.setChats?.((prev: any[]) => prev.map(c => {
            const isTarget = String(c.partnerId) === contactUuid || String(c.id) === contactUuid || String(c.uuid) === contactUuid;
            if (!isTarget) return c;
            return {
              ...c,
              isContact: false,
              name: c.username || 'Пользователь',
              contactFirstName: '',
              contactLastName: '',
              note: ''
            };
          }));

          ctx.showToast?.('Контакт удалён', 'info');
          if (ctx.fetchAndMatchChats) await ctx.fetchAndMatchChats();
          onClose();
          onSuccess?.();
        } catch (err: any) {
          ctx.showToast?.(`Ошибка удаления: ${err.message}`, 'error');
        } finally {
          setLoading(false);
        }
      },
      true
    );
  };

  // ✏️ Сохранение изменений
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');

      const { error } = await supabase
        .from('contacts')
        .update({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          note: note.trim(),
          updatedAt: new Date().toISOString()
        })
        .eq('userId', myUuid)
        .eq('contactId', contactUuid);

      if (error) throw error;

      ctx.showToast?.('Контакт обновлён', 'success');
      if (ctx.fetchAndMatchChats) await ctx.fetchAndMatchChats();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      ctx.showToast?.(`Ошибка сохранения: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['modal-overlay']} onClick={onClose} style={{zIndex: '1000001'}}>
      <div className={styles['profile-modal-card']} onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}  className={styles['modal-edit-container']}>
          <div className={styles['modal-edit-header']}>
            <h3 className={styles['modal-edit-title']}>Изменить контакт</h3>
          </div>

          <div className={styles['modal-edit-body']}>
            <div className={styles['modal-edit-top']}>
              <SmartAvatar
                size={60}
                avatarUrl={contact.avatarUrl}
                avatarColor={contact.avatarColor || '#5865F2'}
                name={displayName}
              />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName}
                </span>
                <span style={{ fontSize: '13px', color: '#8e8e93', marginTop: '2px' }}>
                  {phoneDisplay}
                </span>
              </div>
            </div>
          
            <div className={styles['profile-input-field']}>
              <input 
                type="text" 
                value={firstName} 
                onChange={e => setFirstName(e.target.value)} 
                placeholder=" "
                autoFocus
                className={styles['profile-line-input']}
                autoComplete="off"
              />
              <label className={styles['profile-field-label']}>Имя</label>
            </div>

            <div className={styles['profile-input-field']}>
              <input 
                type="text" 
                value={lastName} 
                onChange={e => setLastName(e.target.value)} 
                placeholder=" "
                className={styles['profile-line-input']}
                autoComplete="off"
              />
              <label className={styles['profile-field-label']}>Фамилия</label>
            </div>

            <div className={styles['info-divider']} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
              <div className={styles['profile-input-field']} style={{ display: 'flex', alignItems: 'center' }}>
                <input 
                type="text" 
                value={note} 
                onChange={e => setNote(e.target.value)} 
                placeholder=" "
                className={styles['profile-line-input']}
                autoComplete="off"
              />
              <label className={styles['profile-field-label']}>Заметка</label>
                <Smile size={20} color="#8e8e93" style={{ position: 'absolute', right: 0, cursor: 'pointer' }} onClick={() => ctx.showToast?.('Эмодзи в разработке', 'info')} />
              </div>
              <span className={styles['info-block']}>
                Заметку видите только Вы.
              </span>
            </div>

            <div style={{ marginTop: '6px', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className={styles['modal-delete-btn']}
              >
                <span>Удалить контакт</span>
              </button>
            </div>
          </div>

         

          <div className={styles['modal-edit-footer']}>
            <button type="button" onClick={onClose} className={styles['modal-footer-btn-cancel']}>
              Отмена
            </button>
            <button type="submit" disabled={loading} className={styles['modal-footer-btn-save']}>
              {loading ? 'Сохранение...' : 'Готово'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}