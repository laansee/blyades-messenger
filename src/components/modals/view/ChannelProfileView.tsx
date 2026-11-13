import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from '../../css/profile.module.css';
import { 
  X, Copy, Bell, SlidersHorizontal, AudioLines, Ellipsis, 
  UserPlus, FolderPlus, LogOut, MessageSquare, AlertTriangle, 
  Clock, Archive, Shield, Users,
} from 'lucide-react';
import SmartAvatar from '../../common/SmartAvatar';
import { DropdownMenu, type DropdownItem } from '../../common/GlobalUI';
import { supabase } from '../../../services/supabaseClient';
import { SubscribersModal } from './SubscribersModal';
import { AdministratorsModal } from './AdministratorsModal';
import EditChannelModal from '../edit/EditChannelModal';

interface ChannelProfileViewProps {
  currentChatUser: any;
  baseName: string;
  onClose: () => void;
  ctx: any;
}

export default function ChannelProfileView({
  currentChatUser,
  baseName,
  onClose,
  ctx,
}: ChannelProfileViewProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [menuState, setMenuState] = useState<'main' | 'folders'>('main');
  
  const [showSubscribersModal, setShowSubscribersModal] = useState(false);
  const [showAdminsModal, setShowAdminsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [subscribersCount, setSubscribersCount] = useState<number>(1);
  const [adminsCount, setAdminsCount] = useState<number>(1);

  const moreBtnRef = useRef<HTMLButtonElement>(null);

  const myId = String(ctx.currentUser?.id || '');
  const myUuid = String(ctx.currentUser?.uuid || '');
  
  const creatorId = String(currentChatUser.createdBy || currentChatUser.created_by || currentChatUser.ownerId || '');
  const userRole = currentChatUser.role || currentChatUser.myRole;

  const isOwner = Boolean(
    (creatorId && (creatorId === myId || creatorId === myUuid)) ||
    userRole === 'owner' || 
    userRole === 'admin'
  );

  const channelIdNum = Number(currentChatUser.internalChatId || currentChatUser.id);

  // Подсчёт количества подписчиков и администраторов
  const fetchCounts = async () => {
    if (!channelIdNum) return;
    try {
      const { data } = await supabase
        .from('chat_members')
        .select('role')
        .eq('chatId', channelIdNum);

      if (data) {
        setSubscribersCount(data.length);
        const admins = data.filter((m: any) => m.role === 'owner' || m.role === 'admin');
        setAdminsCount(admins.length);
      }
    } catch (e) {
      console.error('Ошибка подсчёта участников канала:', e);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, [channelIdNum]);

  const displayTag = currentChatUser.publicId 
    ? `@${currentChatUser.publicId}` 
    : (currentChatUser.uniqueId && !currentChatUser.uniqueId.startsWith('channel_') ? `@${currentChatUser.uniqueId}` : null);

  const displayDescription = currentChatUser.description || currentChatUser.aboutMe || null;
  
  const displayId = currentChatUser.uniqueId;

  const formatSubscribersWord = (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${count} подписчиков`;
    if (mod10 === 1) return `${count} подписчик`;
    if (mod10 >= 2 && mod10 <= 4) return `${count} подписчика`;
    return `${count} подписчиков`;
  };

  const formatAdminsWord = (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${count} администраторов`;
    if (mod10 === 1) return `${count} администратор`;
    if (mod10 >= 2 && mod10 <= 4) return `${count} администратора`;
    return `${count} администраторов`;
  };

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
            .eq('chatId', channelIdNum)
            .eq('userId', userIdentifier);

          ctx.showToast?.('Вы покинули канал', 'info');
          if (String(ctx.activeChatId) === String(channelIdNum)) {
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
    ctx.setActiveChatId(String(channelIdNum));
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
          isSeparatorBefore: true,
          icon: Clock,
          onClick: () => {},
        },
        {
          id: 'add-users',
          text: 'Добавить пользователей',
          icon: UserPlus,
          onClick: () => {
            setShowMoreMenu(false);
            setShowSubscribersModal(true);
          },
        },
        {
          id: 'archive-stories',
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
            setShowEditModal(true);
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
        onClick: handleLeaveChannel,
      },
    ];
  };

  // 🎯 Если включён режим редактирования — сразу показываем форму настроек канала
  if (showEditModal) {
    return (
      <EditChannelModal
        currentChatUser={currentChatUser}
        onCancel={() => setShowEditModal(false)}
        onSuccess={() => {
          setShowEditModal(false);
          fetchCounts();
          if (ctx.fetchAndMatchChats) ctx.fetchAndMatchChats();
        }}
      />
    );
  }

  return (
    <>
      <div className={styles['view-mode']}>
        {/* Шапка канала */}
        <div className={styles['profile-header-gradient']}>
          <div className={styles['profile-header-actions']}>
            <button
              type="button"
              onClick={onClose}
              // title="Закрыть"
              className={styles['close-modal-btn']}
            >
              <X size={18} />
            </button>
          </div>

          <div className={styles['profile-avatar-wrapper']}>
            <SmartAvatar
              size={84}
              avatarUrl={currentChatUser.avatarUrl}
              avatarColor={currentChatUser.appearance?.avatarColor || currentChatUser.avatarColor || '#9d7bf6'}
              name={baseName}
              isChannel={true}
            />
          </div>

          <h2 className={styles['profile-name']}>{baseName}</h2>
          <span className={styles['profile-status']}>
            {formatSubscribersWord(subscribersCount)}
          </span>

          {/* Кнопки действий под шапкой */}
          <div className={styles['action-top-buttons-row']}>
            <button
              type="button"
              className={styles['action-top-btn']}
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
              onClick={() => ctx.showToast?.('Настройки звука в разработке', 'info')}
            >
              <span className={styles['btn-icon']}><Bell size={20} /></span>
              <span className={styles['btn-text']}>Звук</span>
            </button>

            {isOwner ? (
              <>
                {/* 🎯 «Управление» вместо «Подписчики» */}
                <button
                  type="button"
                  className={styles['action-top-btn']}
                  onClick={() => setShowEditModal(true)}
                >
                  <span className={styles['btn-icon']}><SlidersHorizontal size={20} /></span>
                  <span className={styles['btn-text']}>Управление</span>
                </button>

                <button
                  type="button"
                  className={styles['action-top-btn']}
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
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
                  className={styles['action-top-btn']}
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                  onClick={() => ctx.showToast?.('Обсуждение в разработке', 'info')}
                >
                  <span className={styles['btn-icon']}><MessageSquare size={20} /></span>
                  <span className={styles['btn-text']}>Обсуждение</span>
                </button>

                <button
                  type="button"
                  className={styles['action-top-btn']}
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
              className={styles['action-top-btn']}
              onClick={handleToggleMore}
            >
              <span className={styles['btn-icon']}><Ellipsis size={20} /></span>
              <span className={styles['btn-text']}>Ещё</span>
            </button>
          </div>
        </div>

        {/* Выпадающий список "Ещё" через портал */}
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

        <div className={styles['info-section']}>
          {Boolean(displayTag) && (
            <div 
              onClick={() => handleCopy(displayTag!, 'Ссылка')}
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
          )}

          {Boolean(displayDescription && displayDescription.trim()) && (
            <div className={styles['info-item']} style={{ cursor: 'default' }}>
              <div className={styles['info-item-content']}>
                <span className={`${styles['info-value']} ${styles['multiline']}`}>
                  {displayDescription}
                </span>
                <span className={styles['info-label']}>Описание канала</span>
              </div>
            </div>
          )}

          <div 
            className={styles['info-item']} 
            style={{ cursor: 'default' }}
            title='Тут убрать "channel_" и сделать видимость только для админов канала и разрабов проекта'
          >
            <div className={styles['info-item-content']}>
              <span className={`${styles['info-value']} ${styles['multiline']}`}>
                {displayId}
              </span>
              <span className={styles['info-label']}>ID</span>
            </div>
          </div>

          {/* Кнопка «ОТКРЫТЬ КАНАЛ» */}
          <button
            type="button"
            onClick={handleOpenChannel}
            className={styles['action-bottom-btn']}
            style={{ marginBottom: "6px" }}
          >
            ОТКРЫТЬ КАНАЛ
          </button>

          <div className={styles['info-divider']}/>

          {/* 🎯 Блок «Подписчики» и «Администраторы» в стиле Telegram (как на референсе) */}
          {isOwner && (
            <div className={styles['action-bottom-buttons-row']}>
              <div 
                onClick={() => setShowSubscribersModal(true)}
                className={styles['action-bottom-btn']}
                style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
              >
                <Users size={20} />
                <span>
                  {formatSubscribersWord(subscribersCount)}
                </span>
              </div>

              <div 
                onClick={() => setShowAdminsModal(true)}
                className={styles['action-bottom-btn']}
                style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
              >
                <Shield size={20} />
                <span>
                  {formatAdminsWord(adminsCount)}
                </span>
              </div>

              {/* <div 
                onClick={() => setShowSubscribersModal(true)}
                className={styles['action-bottom-btn']}
                title='В другой бок добавить span с цифрой'
                style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: "6px" }}
              >
                <Shield size={20} />
                <span>
                  Баланс:
                </span>
              </div> */}
            </div>
          )}

          <div className={styles['info-divider']}/>

          {/* Нижняя кнопка «Покинуть канал» */}
          <button
            type="button"
            onClick={handleLeaveChannel}
            className={styles['action-bottom-btn']}
            data-red
            style={{ margin: "6px 0" }}
          >
            <LogOut size={18}/>
            <span>Покинуть канал</span>
          </button>
        </div>
      </div>

      {/* Модалка подписчиков */}
      <SubscribersModal
        show={showSubscribersModal}
        channelId={channelIdNum}
        channelName={baseName}
        currentUserId={myUuid || myId}
        isOwnerOrAdmin={isOwner}
        onClose={() => setShowSubscribersModal(false)}
        onSubscribersUpdated={fetchCounts}
      />

      {/* Модалка администраторов */}
      <AdministratorsModal
        show={showAdminsModal}
        channelId={channelIdNum}
        channelName={baseName}
        currentUserId={myUuid || myId}
        isOwner={isOwner}
        onClose={() => setShowAdminsModal(false)}
        onAdminsUpdated={fetchCounts}
      />
    </>
  );
}