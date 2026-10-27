import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from '../css/profile.module.css';
import { 
  X, Copy, Bell, SlidersHorizontal, AudioLines, Ellipsis, 
  UserPlus, FolderPlus, LogOut, MessageSquare, AlertTriangle, 
  Clock, Archive
} from 'lucide-react';
import SmartAvatar from '../common/SmartAvatar';
import { DropdownMenu, type DropdownItem } from '../common/GlobalUI';
import { supabase } from '../../services/supabaseClient';

interface ChannelProfileViewProps {
  currentChatUser: any;
  baseName: string;
  onClose: () => void;
  onEditToggle?: () => void;
  ctx: any;
}

export default function ChannelProfileView({
  currentChatUser,
  baseName,
  onClose,
  onEditToggle,
  ctx,
}: ChannelProfileViewProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [menuState, setMenuState] = useState<'main' | 'folders'>('main');
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  // 🛡️ Определение прав администратора/создателя
  const myId = String(ctx.currentUser?.id || '');
  const myUuid = String(ctx.currentUser?.uuid || '');
  
  const creatorId = String(currentChatUser.createdBy || currentChatUser.created_by || currentChatUser.ownerId || '');
  const userRole = currentChatUser.role || currentChatUser.myRole;

  const isOwner = Boolean(
    (creatorId && (creatorId === myId || creatorId === myUuid)) ||
    userRole === 'owner' || 
    userRole === 'admin'
  );

  const isNewsChannel = String(currentChatUser.id) === '1' || currentChatUser.publicId === 'news' || currentChatUser.uniqueId === 'news';

  const displayTag = currentChatUser.publicId 
    ? `@${currentChatUser.publicId}` 
    : (currentChatUser.uniqueId && !currentChatUser.uniqueId.startsWith('channel_') ? `@${currentChatUser.uniqueId}` : null);

  const displayDescription = currentChatUser.description || currentChatUser.aboutMe || null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    ctx.showToast?.(`${label} скопирован в буфер`, 'success');
  };

  const handleLeaveChannel = () => {
    setShowMoreMenu(false);
    ctx.showConfirm?.(
      'Покинуть канал',
      `Вы действительно хотите покинуть канал «${baseName}»?`,
      async () => {
        try {
          const userIdentifier = myUuid || myId;
          await supabase
            .from('chat_members')
            .delete()
            .eq('chatId', currentChatUser.id)
            .eq('userId', userIdentifier);

          ctx.showToast?.('Вы покинули канал', 'info');
          if (String(ctx.activeChatId) === String(currentChatUser.id)) {
            ctx.setActiveChatId(null);
          }
          if (ctx.fetchAndMatchChats) {
            await ctx.fetchAndMatchChats();
          }
          onClose();
        } catch (err: any) {
          ctx.showToast?.(`Ошибка: ${err.message}`, 'error');
        }
      },
      true
    );
  };

  const handleOpenChannel = () => {
    ctx.setActiveChatId(String(currentChatUser.id));
    onClose();
  };

  const handleToggleMore = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (showMoreMenu) {
      setShowMoreMenu(false);
      setMenuState('main');
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 260;
    let targetX = rect.right - menuWidth;
    if (targetX < 10) targetX = 10;
    const targetY = rect.bottom + 8;

    setMenuCoords({ x: targetX, y: targetY });
    setMenuState('main');
    setShowMoreMenu(true);
  };

  // 📋 Формирование списка пунктов с учётом роли и подменю папок
  const getMenuItems = (): DropdownItem[] => {
    if (menuState === 'folders') {
      return [
        {
          id: 'folders-back',
          text: 'Назад',
          onClick: () => setMenuState('main'),
        },
        {
          id: 'folder-work',
          text: 'Работа',
          onClick: () => ctx.showToast?.('В разработке', 'info'),
        },
        {
          id: 'folder-news',
          text: 'Новости  ✓',
          onClick: () => ctx.showToast?.('В разработке', 'info'),
        },
        {
          id: 'folder-create',
          text: '+ Создать новую папку',
          isSeparatorBefore: true,
          onClick: () => ctx.showToast?.('В разработке', 'info'),
        },
      ];
    }

    if (isOwner) {
      return [
        {
          id: 'auto-delete',
          text: 'Автоудаление',
          badge: 'В разработке',
          disabled: true,
          icon: Clock,
          onClick: () => {},
        },
        {
          id: 'add-users',
          text: 'Добавить пользователей',
          icon: UserPlus,
          isSeparatorBefore: true,
          onClick: () => {
            setShowMoreMenu(false);
            ctx.setShowAddParticipantsModal?.(true);
          },
        },
        {
          id: 'stories-archive',
          text: 'Архив историй',
          badge: 'В разработке',
          disabled: true,
          icon: Archive,
          onClick: () => {},
        },
        {
          id: 'manage-channel',
          text: 'Управление каналом',
          icon: SlidersHorizontal,
          onClick: () => {
            setShowMoreMenu(false);
            if (onEditToggle) onEditToggle();
          },
        },
        {
          id: 'add-to-folder',
          text: 'Добавить в папку',
          badge: 'В разработке',
          icon: FolderPlus,
          arrow: true,
          onClick: () => setMenuState('folders'),
        },
        {
          id: 'leave-channel',
          text: 'Покинуть канал',
          icon: LogOut,
          danger: true,
          isSeparatorBefore: true,
          onClick: handleLeaveChannel,
        },
      ];
    }

    return [
      {
        id: 'report-channel',
        text: 'Пожаловаться',
        badge: 'В разработке',
        icon: AlertTriangle,
        danger: true,
        disabled: true,
        onClick: () => {},
      },
      {
        id: 'leave-channel-user',
        text: 'Покинуть канал',
        icon: LogOut,
        danger: true,
        isSeparatorBefore: true,
        onClick: handleLeaveChannel,
      },
    ];
  };

  return (
    <div className={styles['view-mode']}>
      {/* 🔮 ВЕРХНЯЯ ШАПКА */}
      <div className={styles['profile-header-gradient']}>
        <div className={styles['profile-header-actions']}>
          <button
            type="button"
            onClick={onClose}
            title="Закрыть"
            className={styles['close-modal-btn']}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles['profile-avatar-wrapper']}>
          <SmartAvatar
            size={84}
            avatarUrl={currentChatUser.avatarUrl}
            avatarColor={currentChatUser.avatarColor || '#9d7bf6'}
            name={baseName}
            isChannel={true}
          />
        </div>

        <h2 className={styles['profile-name']}>{baseName}</h2>
        <span className={styles['profile-status']}>
          {isNewsChannel ? 'официальный новостной канал' : 'публичный канал'}
        </span>

        {/* КНОПКИ ДЕЙСТВИЙ */}
        <div className={styles['action-buttons-row']}>
          <button
            type="button"
            className={styles['action-btn']}
            onClick={() => ctx.showToast?.('Настройки звука в разработке', 'info')}
          >
            <span className={styles['btn-icon']}><Bell size={20} /></span>
            <span className={styles['btn-text']}>Звук</span>
          </button>

          {isOwner ? (
            <>
              <button
                type="button"
                className={styles['action-btn']}
                onClick={() => {
                  if (onEditToggle) onEditToggle();
                  else ctx.showToast?.('Управление каналом', 'info');
                }}
              >
                <span className={styles['btn-icon']}><SlidersHorizontal size={20} /></span>
                <span className={styles['btn-text']}>Управление</span>
              </button>

              <button
                type="button"
                className={styles['action-btn']}
                onClick={() => ctx.showToast?.('Трансляция в разработке', 'info')}
              >
                <span className={styles['btn-icon']}><AudioLines size={20} /></span>
                <span className={styles['btn-text']}>Трансляция</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles['action-btn']}
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                onClick={() => ctx.showToast?.('Обсуждение в разработке', 'info')}
              >
                <span className={styles['btn-icon']}><MessageSquare size={20} /></span>
                <span className={styles['btn-text']}>Обсуждение</span>
              </button>

              <button
                type="button"
                className={styles['action-btn']}
                onClick={handleLeaveChannel}
              >
                <span className={styles['btn-icon']}><LogOut size={20} color="#ff453a" /></span>
                <span className={styles['btn-text']} style={{ color: '#ff453a' }}>Покинуть</span>
              </button>
            </>
          )}

          <button 
            ref={moreBtnRef}
            type="button" 
            className={`${styles['action-btn']} dropdown-trigger-btn`}
            onClick={handleToggleMore}
          >
            <span className={styles['btn-icon']}><Ellipsis size={20} /></span>
            <span className={styles['btn-text']}>Ещё</span>
          </button>
        </div>
      </div>

      {/* 🚀 ВЫПАДАЮЩИЙ DROPDOWN ЧЕРЕЗ ПОРТАЛ В BODY ПОВЕРХ ВСЕГО */}
      {showMoreMenu && createPortal(
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999999 }}>
          <div style={{ pointerEvents: 'auto' }}>
            <DropdownMenu
              show={showMoreMenu}
              onClose={() => {
                setShowMoreMenu(false);
                setMenuState('main');
              }}
              x={menuCoords.x}
              y={menuCoords.y}
              items={getMenuItems()}
              style={{
                backgroundColor: '#1c1c24',
                border: '1px solid #2d2e38',
                borderRadius: '14px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.65)',
                width: '260px',
              }}
            />
          </div>
        </div>,
        document.body
      )}

      {/* 📋 СЕКЦИЯ ИНФОРМАЦИИ */}
      <div className={styles['info-section']}>
        {displayTag ? (
          <div 
            onClick={() => handleCopy(displayTag, 'Ссылка')}
            className={styles['info-item']}
          >
            <div className={styles['info-item-content']}>
              <span className={`${styles['info-value']} ${styles['accent']}`}>
                {displayTag}
              </span>
              <span className={styles['info-label']}>Ссылка для перехода</span>
            </div>
            <Copy size={18} className={styles['info-icon']} />
          </div>
        ) : (
          <div className={styles['info-item']} style={{ cursor: 'default', opacity: 0.7 }}>
            <div className={styles['info-item-content']}>
              <span className={styles['info-value']} style={{ color: '#8e8e93', fontStyle: 'italic' }}>
                Публичный тег не установлен
              </span>
              <span className={styles['info-label']}>Ссылка для перехода</span>
            </div>
          </div>
        )}

        <div className={styles['info-item']} style={{ cursor: 'default' }}>
          <div className={styles['info-item-content']}>
            <span className={`${styles['info-value']} ${styles['multiline']}`}>
              {displayDescription || (
                <span style={{ color: '#8e8e93', fontStyle: 'italic' }}>Описание отсутствует</span>
              )}
            </span>
            <span className={styles['info-label']}>Описание канала</span>
          </div>
        </div>

        {/* 🔘 НИЖНИЙ БЛОК ДЕЙСТВИЙ */}
        <div style={{ marginTop: '8px', borderTop: '1px solid #282933', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            type="button"
            onClick={handleOpenChannel}
            style={{
              background: 'none',
              border: 'none',
              color: '#3ea6ff',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textAlign: 'left',
              padding: '10px 12px',
              cursor: 'pointer',
              borderRadius: '8px',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(62, 166, 255, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            ОТКРЫТЬ КАНАЛ
          </button>

          <div style={{ height: '1px', backgroundColor: '#282933', margin: '4px 0' }} />

          <button
            type="button"
            onClick={handleLeaveChannel}
            style={bottomActionRowStyle}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e2029')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <LogOut size={18} color="#8e8e93" />
            <span style={{ color: '#fff' }}>Покинуть канал</span>
          </button>

          <button
            type="button"
            onClick={() => ctx.showToast?.('В разработке', 'info')}
            style={bottomActionRowStyle}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1e2029')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <AlertTriangle size={18} color="#ff453a" />
            <span style={{ color: '#ff453a' }}>Пожаловаться</span>
            <span style={badgeDevStyle}>В разработке</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const badgeDevStyle: React.CSSProperties = {
  fontSize: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  color: '#9ca3af',
  padding: '2px 6px',
  borderRadius: '6px',
  marginLeft: 'auto'
};

const bottomActionRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  padding: '10px 12px',
  background: 'none',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background-color 0.15s ease'
};