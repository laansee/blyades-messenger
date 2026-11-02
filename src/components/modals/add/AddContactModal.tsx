import React, { useState } from 'react';
import styles from '../../css/profile.module.css';
import { User, Phone } from 'lucide-react';
import useMessengerContext from '../../../context/messengerContext';
import { supabase } from '../../../services/supabaseClient';
import { userService } from '../../../services/userService';

interface AddContactModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddContactModal({ show, onClose, onSuccess }: AddContactModalProps) {
  const ctx = useMessengerContext();
  const [identifier, setIdentifier] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleClose = () => {
    setIdentifier('');
    setFirstName('');
    setLastName('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIdent = identifier.trim().replace(/^@/, '');
    if (!cleanIdent) {
      ctx.showToast('Укажите @логин или телефон', 'warning');
      return;
    }

    setLoading(true);
    try {
      const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');
      const foundUser = await userService.getUserByIdentifier(cleanIdent);

      if (!foundUser) {
        ctx.showToast('Пользователь не найден', 'error');
        setLoading(false);
        return;
      }

      const targetUuid = String(foundUser.uuid || foundUser.id);
      if (targetUuid === myUuid) {
        ctx.showToast('Нельзя добавить себя в контакты', 'warning');
        setLoading(false);
        return;
      }

      const payload = {
        userId: myUuid,
        contactId: targetUuid,
        firstName: firstName.trim() || foundUser.firstName || foundUser.username,
        lastName: lastName.trim() || foundUser.lastName || '',
        updatedAt: new Date().toISOString()
      };

      const { error } = await supabase.from('contacts').upsert(payload, { onConflict: 'userId,contactId' });
      if (error) throw error;

      ctx.showToast('Контакт сохранён! 👤', 'success');
      if (ctx.fetchAndMatchChats) await ctx.fetchAndMatchChats();
      handleClose();
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      ctx.showToast(`Ошибка добавления: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['modal-overlay']} onClick={handleClose} style={{zIndex: '1000001'}}>
      <div className={styles['profile-modal-card']} onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}  className={styles['modal-edit-container']}>
          <div className={styles['modal-edit-header']}>
            <h3 className={styles['modal-edit-title']}>Новый контакт</h3>
          </div>

          <div className={styles['modal-edit-body']}>
            {/* Имя */}
            <div className={styles['profile-input-field']} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <User size={22} color="#8e8e93" style={{ flexShrink: 0 }} />
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
            </div>

            {/* Фамилия */}
            <div className={styles['profile-input-field']} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '40px', flexShrink: 0 }} /> {/* Отступ под иконку */}
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
            </div>

            {/* Телефон или юзернейм */}
            <div className={styles['profile-input-field']} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px' }}>
              <Phone size={22} color="#8e8e93" style={{ flexShrink: 0 }} />
              <div className={styles['profile-input-field']}>
                <input 
                  type="text" 
                  value={identifier} 
                  onChange={e => setIdentifier(e.target.value)} 
                  placeholder=" "
                  required
                  className={styles['profile-line-input']}
                  autoComplete="off"
                />
                <label className={styles['profile-field-label']}>Номер телефона</label>
              </div>
            </div>
          </div>

          <div className={styles['modal-edit-footer']}>
            <button type="button" onClick={handleClose} className={styles['btn-text-accent']}>
              Отмена
            </button>
            <button type="submit" disabled={loading} className={styles['btn-text-accent']}>
              {loading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}