import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '../../css/profile.module.css';
import { supabase } from '../../../services/supabaseClient';
import useMessengerContext from '../../../context/messengerContext';
import { Camera } from 'lucide-react';


interface CreateChannelModalProps {
  show: boolean;
  onClose: () => void;
}

const CHANNEL_COLORS = ['#9d7bf6', '#5865F2', '#3ba55c', '#faa61a', '#ed4245', '#eb459e'];

export default function CreateChannelModal({ show, onClose }: CreateChannelModalProps) {
  const ctx = useMessengerContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  if (!show) return null;

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() || loading || !ctx.currentUser) return;

    setLoading(true);
    const myUuid = String(ctx.currentUser.uuid || ctx.currentUser.id);
    const randomColor = CHANNEL_COLORS[Math.floor(Math.random() * CHANNEL_COLORS.length)];
    const channelUniqueId = `channel_${Date.now()}`;
    const nowIso = new Date().toISOString();

    try {
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert([
          {
            name: name.trim(),
            description: description.trim() || null,
            type: 'channel',
            accessType: 'private',
            appearance: { avatarColor: randomColor },
            settings: {
              signMessages: false,
              showAuthorProfiles: false,
              postMode: 'channel',
            },
            createdBy: myUuid,
            uniqueId: channelUniqueId,
            createdAt: nowIso,
            updatedAt: nowIso,
          },
        ])
        .select()
        .single();

      if (chatError || !newChat) throw chatError || new Error('Не удалось создать канал');

      const { error: memberError } = await supabase
        .from('chat_members')
        .insert([
          {
            chatId: newChat.id,
            userId: myUuid,
            role: 'owner',
            joinedAt: nowIso,
          },
        ]);

      if (memberError) throw memberError;

      const channelStartText = `Канал {{chat:${newChat.id}}} создан`;

      await supabase.from('messages').insert([
        {
          chatId: newChat.id,
          senderId: '00000000-0000-0000-0000-000000000000',
          text: channelStartText,
          status: 'send',
          createdAt: nowIso,
        },
      ]);

      ctx.showToast(`Канал «${name.trim()}» успешно создан! 📢`, 'success');

      if (ctx.fetchAndMatchChats) {
        await ctx.fetchAndMatchChats();
      }
      ctx.setActiveChatId(String(newChat.id));

      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      console.error('Ошибка создания канала:', err);
      ctx.showToast(`Не удалось создать канал: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className={styles['modal-overlay']} onClick={onClose}>
      <div className={styles['dialog-card']} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleCreate} className={styles['dialog-form']}>
          <div className={styles['create-channel-top-row']}>
            <div className={styles['create-channel-avatar-circle']}>
              <Camera size={30} color="#fff" strokeWidth={2.2} />
            </div>

            <div className={styles['floating-field']}>
              <input
                id="channel-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=" "
                className={styles['floating-input']}
                autoComplete="off"
              />
              <label htmlFor="channel-name-input" className={styles['floating-label']}>
                Название канала
              </label>
              <div className={styles['floating-border']} />
            </div>
          </div>

          <div className={styles['floating-field']}>
            <input
              id="channel-desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder=" "
              className={styles['floating-input']}
              autoComplete="off"
            />
            <label htmlFor="channel-desc-input" className={styles['floating-label']}>
              Описание (необязательно)
            </label>
            <div className={styles['floating-border']} />
          </div>

          <div className={styles['dialog-footer']}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={styles['btn-text-accent']}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className={styles['btn-text-accent']}
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}