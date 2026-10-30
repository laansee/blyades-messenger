import React, { useState } from 'react';
import styles from '../../css/profile.module.css';
import { X } from 'lucide-react';
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
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleClose = () => {
    setIdentifier('');
    setFirstName('');
    setLastName('');
    setNote('');
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
        note: note.trim() || '',
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
    <div className={styles['modal-overlay']} onClick={handleClose} style={{ zIndex: 1000002 }}>
      <div 
        className={styles['profile-modal-card']} 
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '380px',
          backgroundColor: '#1b1b24',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.75)',
          border: '1px solid #282833'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#fff' }}>Новый контакт</h3>
          <button 
            type="button" 
            onClick={handleClose} 
            style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', padding: '2px', display: 'flex' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', color: '#8e8e93', display: 'block', marginBottom: '6px' }}>
              Имя пользователя (@login) или телефон *
            </label>
            <input 
              type="text" 
              value={identifier} 
              onChange={e => setIdentifier(e.target.value)} 
              placeholder="@username или +7..."
              required
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#14141c',
                border: '1px solid #282834',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#8e8e93', display: 'block', marginBottom: '6px' }}>
              Имя
            </label>
            <input 
              type="text" 
              value={firstName} 
              onChange={e => setFirstName(e.target.value)} 
              placeholder="Имя"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#14141c',
                border: '1px solid #282834',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#8e8e93', display: 'block', marginBottom: '6px' }}>
              Фамилия
            </label>
            <input 
              type="text" 
              value={lastName} 
              onChange={e => setLastName(e.target.value)} 
              placeholder="Фамилия"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#14141c',
                border: '1px solid #282834',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#8e8e93', display: 'block', marginBottom: '6px' }}>
              Заметка (видна только вам)
            </label>
            <input 
              type="text" 
              value={note} 
              onChange={e => setNote(e.target.value)} 
              placeholder="Например: коллега"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#14141c',
                border: '1px solid #282834',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
            <button 
              type="button" 
              onClick={handleClose}
              style={{ background: 'none', border: 'none', color: '#8e8e93', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}
            >
              Отмена
            </button>
            <button 
              type="submit" 
              disabled={loading}
              style={{
                backgroundColor: '#7b66dc',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 22px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Сохранение...' : 'Готово'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}