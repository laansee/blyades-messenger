import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import useMessengerContext from '../../context/messengerContext';

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
      const startText = 'Канал создан';
      
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert([
          {
            name: name.trim(),
            description: description.trim() || null,
            type: 'channel',
            avatarColor: randomColor,
            createdBy: myUuid,
            uniqueId: channelUniqueId,
            lastMessageText: startText,
            lastMessageType: 'text',
            lastMessageAt: nowIso,
            lastMessageSenderUUID: '00000000-0000-0000-0000-000000000000',
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

      // 3. Отправляем шаблонное системное сообщение о создании канала
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

      // 4. Актуализируем lastMessageText в chats
      await supabase
        .from('chats')
        .update({
          lastMessageText: channelStartText,
          lastMessageAt: nowIso,
        })
        .eq('id', newChat.id);

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
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#201f29',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '380px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Верхний блок: иконка камеры и инпут названия */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: '#479bf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Camera size={30} color="#fff" strokeWidth={2.2} />
            </div>

            <div className="tg-field-group" style={{ position: 'relative', flex: 1, paddingTop: '18px' }}>
              <input
                id="channel-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=" "
                className="tg-clean-input"
                autoComplete="off"
              />
              <label htmlFor="channel-name-input" className="tg-floating-label">
                Название канала
              </label>
              <div className="tg-active-border" />
            </div>
          </div>

          {/* Поле описания канала */}
          <div className="tg-field-group" style={{ position: 'relative', width: '100%', paddingTop: '18px' }}>
            <input
              id="channel-desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder=" "
              className="tg-clean-input"
              autoComplete="off"
            />
            <label htmlFor="channel-desc-input" className="tg-floating-label">
              Описание (необязательно)
            </label>
            <div className="tg-active-border" />
          </div>

          {/* Кнопки управления */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#8b84f7',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '6px 8px',
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              style={{
                background: 'none',
                border: 'none',
                color: name.trim() && !loading ? '#8b84f7' : '#4d4a65',
                fontSize: '15px',
                fontWeight: '600',
                cursor: name.trim() && !loading ? 'pointer' : 'not-allowed',
                padding: '6px 8px',
                transition: 'color 0.15s ease',
              }}
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .tg-clean-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid #3d3b4a;
          color: #fff;
          font-size: 15px;
          padding: 4px 0 6px 0;
          outline: none;
          display: block;
          box-sizing: border-box;
        }

        .tg-floating-label {
          position: absolute;
          left: 0;
          top: 22px;
          color: #7a7889;
          font-size: 15px;
          pointer-events: none;
          transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
          transform-origin: left top;
        }

        .tg-active-border {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #a894e6;
          transform: scaleX(0);
          transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .tg-clean-input:focus ~ .tg-active-border {
          transform: scaleX(1);
        }

        .tg-clean-input:focus ~ .tg-floating-label {
          top: 0px;
          font-size: 12px;
          color: #a894e6;
        }

        .tg-clean-input:not(:placeholder-shown):not(:focus) ~ .tg-floating-label {
          top: 0px;
          font-size: 12px;
          color: #7a7889;
        }
      `}</style>
    </div>,
    document.body
  );
}