import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from '../../components/css/chat-window.module.css';
import ContextMenu, { type ContextMenuItem } from '../../components/common/contextMenu';
import useMessengerContext, { formatUserOnlineStatus } from '../../context/messengerContext';
import { DropdownMenu, AddParticipantsModal } from '../../components/common/GlobalUI'; 
import { supabase } from '../../services/supabaseClient';
import { renderUserStatusBadge } from '../../utils/statusBadge';
import { userService } from '../../services/userService';
import SmartAvatar from '../../components/common/SmartAvatar';
import { 
  Search, EllipsisVertical, X, Check, CheckCheck, Pencil, Paperclip, 
  Send, ArrowUp, ArrowDown, User, 
  BellOff, MessageSquare, Trash, Phone, Clock, 
  Pin, Users, Megaphone 
} from 'lucide-react';

function formatHoursAndMinutes(isoString: string | undefined): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
}

export default function ChatWindow() {
  const ctx = useMessengerContext();
  const messagesBodyRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  
  const previousChatIdRef = useRef<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [existingUsers, setExistingUsers] = useState<string[]>([]);

  const currentChatUser = useMemo(() => {
    if (!ctx.activeChatId) return null;
    const targetIdStr = String(ctx.activeChatId);

    // 1. Ищем в списке активных чатов
    const foundInChats = (ctx.chats || []).find((c: any) => 
      String(c.id) === targetIdStr ||
      String(c.chatId) === targetIdStr ||
      String(c.internalChatId) === targetIdStr ||
      String(c.partnerId) === targetIdStr ||
      String(c.uuid) === targetIdStr
    );
    if (foundInChats) return foundInChats;

    // 2. Ищем в сохранённых контактах
    const foundContact = (ctx.contacts || []).find((c: any) => 
      String(c.contactId || c.partnerId || c.uuid || c.id) === targetIdStr
    );
    if (foundContact) {
      const contactUuid = String(foundContact.contactId || foundContact.partnerId || foundContact.uuid);
      const globalUser = (ctx.users || []).find((u: any) => String(u.uuid || u.id) === contactUuid);
      const fName = foundContact.firstName && foundContact.firstName !== 'EMPTY' ? foundContact.firstName : '';
      const lName = foundContact.lastName && foundContact.lastName !== 'EMPTY' ? foundContact.lastName : '';
      const fullName = `${fName} ${lName}`.trim();

      return {
        ...(globalUser || {}),
        ...foundContact,
        id: targetIdStr,
        uuid: contactUuid,
        partnerId: contactUuid,
        name: fullName || globalUser?.username || 'Контакт',
        username: globalUser?.username || foundContact.username,
        avatarUrl: globalUser?.avatarUrl || foundContact.avatarUrl,
        avatarColor: globalUser?.avatarColor || foundContact.avatarColor || '#5865F2',
        updatedAt: globalUser?.updatedAt || foundContact.updatedAt,
        isContact: true
      };
    }

    // 3. Ищем в общем списке пользователей
    const foundUser = (ctx.users || []).find((u: any) => String(u.uuid || u.id) === targetIdStr);
    if (foundUser) {
      return {
        ...foundUser,
        id: targetIdStr,
        partnerId: String(foundUser.uuid || foundUser.id),
        name: foundUser.username || foundUser.name || 'Пользователь',
        isContact: false
      };
    }

    return null;
  }, [ctx.chats, ctx.contacts, ctx.users, ctx.activeChatId]);
  const myId = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');
  const activeChatIdStr = String(ctx.activeChatId || '');
  const memberCount = currentChatUser?.type === 'group' ? (currentChatUser?.memberCount ?? 0) : null;

  const displayedMessages = useMemo(() => {
    if (!myId || !ctx.activeChatId) return [];

    const roomMessages = (ctx.allMessages || []).filter(
      (m: any) => String(m.chatId) === activeChatIdStr
    );

    return roomMessages
      .filter((m: any) => {
        if (!ctx.showMsgSearch || !ctx.messageSearchQuery.trim()) return true;
        return (m.text || '').toLowerCase().includes(ctx.messageSearchQuery.toLowerCase());
      })
      .sort((a: any, b: any) => {
        if (String(a.id).startsWith('temp-')) return 1;
        if (String(b.id).startsWith('temp-')) return -1;
        return Number(a.id) - Number(b.id);
      });
  }, [ctx.allMessages, activeChatIdStr, ctx.showMsgSearch, ctx.messageSearchQuery, myId]);

  // 🚀 Единый скролл и отметка о прочтении
  useEffect(() => {
    if (!messagesBodyRef.current || !ctx.activeChatId) return;

    const isChatChanged = previousChatIdRef.current !== ctx.activeChatId;
    previousChatIdRef.current = ctx.activeChatId;

    if (isChatChanged) {
      if (ctx.setEditingMessage) ctx.setEditingMessage(null);
      if (ctx.setMessageText) ctx.setMessageText('');
      
      messagesBodyRef.current.scrollTop = messagesBodyRef.current.scrollHeight;
      setShowScrollBtn(false);
      messageInputRef.current?.focus();
    } else {
      const { scrollTop, scrollHeight, clientHeight } = messagesBodyRef.current;
      const isUserNearBottom = scrollHeight - scrollTop - clientHeight < 250;
      if (isUserNearBottom) {
        messagesBodyRef.current.scrollTo({
          top: scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [ctx.activeChatId, ctx.allMessages]);

  useEffect(() => {
    if (ctx.setEditingMessage) ctx.setEditingMessage(null);
    if (ctx.setMessageText) ctx.setMessageText('');

    const timer = setTimeout(() => {
      if (messagesBodyRef.current) {
        messagesBodyRef.current.scrollTop = messagesBodyRef.current.scrollHeight;
      }
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [ctx.activeChatId, ctx.allMessages]);

  if (!ctx.activeChatId) {
    return (
      <main className={styles['chat-window']}>
        <div className={styles['chat-placeholder']}>
          <div className={styles['placeholder-content']}>
            <div className={styles['placeholder-icon']}>
              <MessageSquare size={64}/>
            </div>
            <p>Выберите чат, чтобы начать общение</p>
          </div>
        </div>
      </main>
    );
  }

  const scrollInToTop = () => {
    messagesBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollInToBottom = () => {
    if (messagesBodyRef.current) {
      messagesBodyRef.current.scrollTo({ top: messagesBodyRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  // const handleOpenDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
  //   e.stopPropagation();
  //   setShowMenu((prev) => !prev);
  // };

  const isGroup = currentChatUser?.isGroup || String(ctx.activeChatId).startsWith('group_');
  const isChannel = currentChatUser?.isChannel || currentChatUser?.type === 'channel';

  const headerDropdownItems = isChannel
    ? [
        {
          id: 'channel-info',
          text: 'Информация о канале',
          icon: Megaphone,
          onClick: () => ctx.setShowUserModal(true),
        },
        { id: 'to-top', text: 'Наверх', icon: ArrowUp, onClick: scrollInToTop },
      ]
    : isGroup 
    ? [
        {
          id: 'add-members',
          text: 'Добавить участников',
          icon: Users,
          onClick: async () => {
            // 🎯 Таблица chat_members вместо устаревшей group_members
            const { data } = await supabase
              .from('chat_members')
              .select('userId')
              .eq('chatId', Number(activeChatIdStr));
            if (data) {
              setExistingUsers(data.map(m => String(m.userId)));
            }
            setShowAddModal(true);
          }
        },
        { id: 'group-info', text: 'Информация о беседе', icon: Users, onClick: () => ctx.setShowUserModal(true) },
        { id: 'to-top', text: 'Наверх', icon: ArrowUp, isSeparatorBefore: true, onClick: scrollInToTop },
        {
          id: 'leave-group',
          text: String(currentChatUser?.ownerId) === myId ? 'Удалить беседу' : 'Покинуть беседу',
          danger: true,
          icon: Trash,
          onClick: () => {
            const isOwner = String(currentChatUser?.ownerId) === myId;
            ctx.showConfirm(
              isOwner ? 'Удаление беседы' : 'Выход из беседы',
              isOwner 
                ? `Вы являетесь создателем беседы "${currentChatUser?.name || ''}". Удаление сотрёт чат для ВСЕХ участников. Продолжить?`
                : `Вы действительно хотите покинуть беседу "${currentChatUser?.name || ''}"?`,
              async () => {
                if (ctx.handleLeaveOrDeleteGroup) {
                  await ctx.handleLeaveOrDeleteGroup(activeChatIdStr, currentChatUser?.ownerId);
                }
              },
              true
            );
          }
        }
      ]
    : [{ 
          id: 'notifications', 
          text: 'Уведомления', 
          icon: BellOff, 
          onClick: () => ctx.showToast('В разработке', 'info')
        },
        { 
          id: 'pin-chat', 
          text: 'Закрепить переписку (заглушка)', 
          icon: Pin, 
          onClick: scrollInToTop
        },
        { 
          id: 'profile',
          text: 'Профиль пользователя',
          icon: User,
          onClick: () => ctx.setShowUserModal(true)
        },
        { id: 'to-top', text: 'Наверх', icon: ArrowUp, isSeparatorBefore: true, onClick: scrollInToTop },
        { 
          id: 'delete-chat', 
          text: 'Удалить чат', 
          icon: Trash, 
          danger: true,
          onClick: () => {
            ctx.showConfirm(
              'Удаление чата', 
              `Вы действительно хотите полностью очистить историю переписки с "${currentChatUser?.name || ''}"?`, 
              async () => {
                // 🎯 Удаление сообщений по числовому ID комнаты из таблицы chats
                const numericRoomId = Number(activeChatIdStr);
                const { error } = await supabase
                  .from('messages')
                  .delete()
                  .eq('chatId', numericRoomId);

                if (error) {
                  ctx.showToast('Не удалось очистить чат', 'error');
                  return;
                }

                ctx.setAllMessages((prev: any[]) => prev.filter(m => String(m.chatId) !== activeChatIdStr));
                ctx.setActiveChatId(null);
                if (ctx.fetchAndMatchChats) await ctx.fetchAndMatchChats();
                ctx.showToast('Чат успешно очищен', 'success');
              },
              true
            );
          }
        }
      ];
  
  // 🎯 Динамический парсер системных сообщений
  const renderSystemMessageContent = (text: string) => {
    // 🎯 Регулярка ловит как {{user:UUID}}, так и {{chat:ID}}
    const entityTokenRegex = /\{\{(user|chat):([a-zA-Z0-9_-]+)\}\}/g;

    if (!text.includes('{{user:') && !text.includes('{{chat:')) {
      return <span dangerouslySetInnerHTML={{ __html: text }} />;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = entityTokenRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      const entityType = match[1]; // 'user' или 'chat'
      const entityId = match[2];   // UUID пользователя или ID чата

      if (matchIndex > lastIndex) {
        elements.push(text.slice(lastIndex, matchIndex));
      }

      if (entityType === 'chat') {
        // 🎯 Обработка токена чата
        const foundChat = (ctx.chats || []).find((c: any) => String(c.id) === String(entityId));
        const chatTitle = foundChat?.name || 'Беседа';

        elements.push(
          <strong key={`chat-${entityId}-${matchIndex}`}>
            «{chatTitle}»
          </strong>
        );
      } else {
        // 🎯 Обработка токена пользователя
        let resolvedName = 'Пользователь';
        const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');

        if (entityId === myUuid) {
          resolvedName = 'Вы';
        } else {
          const contact = (ctx.contacts || []).find((c: any) => 
            String(c.contactId || c.partnerId || c.uuid || c.id) === entityId
          );

          if (contact && (contact.firstName || contact.lastName)) {
            resolvedName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
          } else {
            const user = (ctx.users || []).find((u: any) => String(u.uuid || u.id) === entityId);
            if (user) {
              resolvedName = user.username || user.name || 'Пользователь';
            }
          }
        }

        elements.push(
          <strong
            key={`user-${entityId}-${matchIndex}`}
            onClick={(e) => {
              e.stopPropagation();
              if (entityId !== myUuid) {
                ctx.setShowUserModal(entityId);
              }
            }}
            style={{ 
              cursor: entityId !== myUuid ? 'pointer' : 'default'
            }}
          >
            {resolvedName}
          </strong>
        );
      }

      lastIndex = entityTokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      elements.push(text.slice(lastIndex));
    }

    return <>{elements}</>;
  };

  return (
    <main className={styles['chat-window']}>
      <header className={styles['chat-header']}>
        <div 
          className={styles['chat-header-user']} 
          onClick={() => ctx.setShowUserModal(true)}
        >
          <SmartAvatar
            size={40}
            avatarUrl={currentChatUser?.avatarUrl}
            avatarColor={currentChatUser?.avatarColor}
            name={currentChatUser?.name || currentChatUser?.username}
            isChannel={currentChatUser?.isChannel}
          />
          <div>
            <h3 className={styles['chat-header-user-name']}>
              {renderUserStatusBadge(currentChatUser)} 
              {currentChatUser?.name || currentChatUser?.username || 'Загрузка...'}
            </h3>

            <span 
              className={`${styles['user-status']} ${
                !isGroup && ctx.isUserOnline && ctx.isUserOnline(currentChatUser) ? styles['online'] : ''
              }`}
            >
              {currentChatUser?.isChannel 
                ? 'официальный канал' 
                : isGroup 
                ? (memberCount !== null 
                    ? `${memberCount} ${
                        memberCount % 10 === 1 && memberCount % 100 !== 11
                          ? 'участник'
                          : [2, 3, 4].includes(memberCount % 10) && ![12, 13, 14].includes(memberCount % 100)
                          ? 'участника'
                          : 'участников'
                      }`
                    : 'Загрузка участников...'
                  )
                : ctx.isUserOnline && ctx.isUserOnline(currentChatUser)
                ? 'в сети'
                : formatUserOnlineStatus(currentChatUser?.updatedAt, currentChatUser?.privacyOnline).text
              }
            </span>
          </div>
        </div>

        <div className={styles['chat-header-actions']}>
          {currentChatUser && (
            <button 
              type="button" 
              className={styles['header-action-btn']} 
              onClick={() => ctx.handleStartAudioCall(currentChatUser.id)} 
              title={currentChatUser.isGroup ? "Начать групповой созвон" : "Позвонить пользователю"}
            >
              <Phone size={20} color="#aaa8a8" />
            </button>
          )}

          <button 
            type="button"
            className={styles['header-btn']} 
            onClick={() => { 
              ctx.setShowMsgSearch(!ctx.showMsgSearch); 
              ctx.setMessageSearchQuery(''); 
            }}
          >
            <Search size={20} />
          </button>

          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <button 
              type="button"
              className={`${styles['header-btn']} dropdown-trigger-btn`} 
              onClick={(e) => { e.stopPropagation(); setShowMenu(prev => !prev); }}
            >
              <EllipsisVertical size={20} />
            </button>
            
            <DropdownMenu 
              show={showMenu} 
              onClose={() => setShowMenu(false)} 
              x={0} y={0}
              items={headerDropdownItems} 
            />
          </div>

          <button 
            type="button"
            className={styles['header-btn']} 
            onClick={() => {
              ctx.setActiveChatId(null);
              if (ctx.setEditingMessage) ctx.setEditingMessage(null);
              if (ctx.setMessageText) ctx.setMessageText('');
            }}
          >
            <X size={24} />
          </button>
        </div>
      </header>

      {ctx.showMsgSearch && (
        <div className={styles['message-search-bar']}>
          <input  
            type="text" 
            placeholder="Поиск по истории сообщений..." 
            value={ctx.messageSearchQuery}
            id='messageSearchQuery-input'
            onChange={e => ctx.setMessageSearchQuery(e.target.value)} 
            className={styles['message-search-input']}
            autoComplete="off"
          />
        </div>
      )}

      <div 
        className={styles['messages-body']} 
        ref={messagesBodyRef}
        onScroll={() => {
          if (!messagesBodyRef.current) return;
          const { scrollTop, scrollHeight, clientHeight } = messagesBodyRef.current;
          setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 300);
        }}
      >
        {/* 💀 РЕНДЕР СКЕЛЕТОНА ПРИ ЗАГРУЗКЕ СООБЩЕНИЙ */}
        {ctx.messagesLoading ? (
          <div className={styles['skeleton-container']}>
            {/* 1. Входящее короткое */}
            <div className={`${styles['skeleton-row']} ${styles['skeleton-incoming']}`}>
              <div className={styles['skeleton-avatar']} />
              <div className={`${styles['skeleton-bubble']} ${styles['skeleton-bubble-incoming']}`} style={{ width: '180px' }}>
                <div className={styles['skeleton-line']} style={{ width: '70%' }} />
                <div className={styles['skeleton-meta']} />
              </div>
            </div>

            {/* 2. Исходящее среднее */}
            <div className={`${styles['skeleton-row']} ${styles['skeleton-outgoing']}`}>
              <div className={`${styles['skeleton-bubble']} ${styles['skeleton-bubble-outgoing']}`} style={{ width: '240px' }}>
                <div className={`${styles['skeleton-line']} ${styles['skeleton-line-outgoing']}`} style={{ width: '90%' }} />
                <div className={`${styles['skeleton-line']} ${styles['skeleton-line-outgoing']}`} style={{ width: '50%' }} />
                <div className={styles['skeleton-meta']} />
              </div>
            </div>

            {/* 3. Входящее длинное из двух строк */}
            <div className={`${styles['skeleton-row']} ${styles['skeleton-incoming']}`}>
              <div className={styles['skeleton-avatar']} />
              <div className={`${styles['skeleton-bubble']} ${styles['skeleton-bubble-incoming']}`} style={{ width: '310px' }}>
                <div className={styles['skeleton-line']} style={{ width: '95%' }} />
                <div className={styles['skeleton-line']} style={{ width: '80%' }} />
                <div className={styles['skeleton-line']} style={{ width: '40%' }} />
                <div className={styles['skeleton-meta']} />
              </div>
            </div>

            {/* 4. Исходящее короткое */}
            <div className={`${styles['skeleton-row']} ${styles['skeleton-outgoing']}`}>
              <div className={`${styles['skeleton-bubble']} ${styles['skeleton-bubble-outgoing']}`} style={{ width: '160px' }}>
                <div className={`${styles['skeleton-line']} ${styles['skeleton-line-outgoing']}`} style={{ width: '85%' }} />
                <div className={styles['skeleton-meta']} />
              </div>
            </div>

            {/* 5. Входящее среднее */}
            <div className={`${styles['skeleton-row']} ${styles['skeleton-incoming']}`}>
              <div className={styles['skeleton-avatar']} />
              <div className={`${styles['skeleton-bubble']} ${styles['skeleton-bubble-incoming']}`} style={{ width: '220px' }}>
                <div className={styles['skeleton-line']} style={{ width: '88%' }} />
                <div className={styles['skeleton-line']} style={{ width: '60%' }} />
                <div className={styles['skeleton-meta']} />
              </div>
            </div>

            {/* 3. Входящее длинное из двух строк */}
            <div className={`${styles['skeleton-row']} ${styles['skeleton-incoming']}`}>
              <div className={styles['skeleton-avatar']} />
              <div className={`${styles['skeleton-bubble']} ${styles['skeleton-bubble-incoming']}`} style={{ width: '310px' }}>
                <div className={styles['skeleton-line']} style={{ width: '95%' }} />
                <div className={styles['skeleton-line']} style={{ width: '80%' }} />
                <div className={styles['skeleton-line']} style={{ width: '40%' }} />
                <div className={styles['skeleton-meta']} />
              </div>
            </div>

            {/* 2. Исходящее среднее */}
            <div className={`${styles['skeleton-row']} ${styles['skeleton-outgoing']}`}>
              <div className={`${styles['skeleton-bubble']} ${styles['skeleton-bubble-outgoing']}`} style={{ width: '240px' }}>
                <div className={`${styles['skeleton-line']} ${styles['skeleton-line-outgoing']}`} style={{ width: '90%' }} />
                <div className={`${styles['skeleton-line']} ${styles['skeleton-line-outgoing']}`} style={{ width: '50%' }} />
                <div className={styles['skeleton-meta']} />
              </div>
            </div>
            
          </div>
        ) : (
          displayedMessages.map((msg: any, index: number) => {
            const currentMsgDate = new Date(msg.createdAt);
            const currentDayStr = currentMsgDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

            let showDateDivider = false;
            if (index === 0) showDateDivider = true;
            else {
              const prevMsgDate = new Date(displayedMessages[index - 1].createdAt);
              const prevDayStr = prevMsgDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
              if (currentDayStr !== prevDayStr) showDateDivider = true;
            }

            const isSystemMsg = msg.senderId === 'system' || String(msg.senderId) === '00000000-0000-0000-0000-000000000000';

            

            return (
              <React.Fragment key={`msg-group-${msg.id}`}>
                {showDateDivider && (
                  <div className={styles['chat-date-divider']}>
                    <span className={styles['chat-date-text']}>{currentDayStr}</span>
                  </div>
                )}

                {/* ======================================================== */}
                {/* 🎯 ПУНКТ 1: РЕНДЕР СИСТЕМНЫХ СООБЩЕНИЙ ПО ЦЕНТРУ ЭКРАНА */}
                {/* ======================================================== */}
                {isSystemMsg ? (
                  <div className={styles['system-message-container']}>
                    <div 
                      className={styles['system-message-bubble']}
                      onContextMenu={(e) => {
                        e.preventDefault();

                        // Очищаем системный текст от токенов шаблона и тегов для буфера обмена
                        const plainSystemText = msg.text
                          .replace(/\{\{user:[a-zA-Z0-9_-]+\}\}/g, 'пользователь')
                          .replace(/<\/?[^>]+(>|$)/g, '')
                          .trim();

                        const menuItems: ContextMenuItem[] = [
                          { 
                            label: 'Копировать текст', 
                            icon: '📋', 
                            onClick: () => {
                              if (ctx.handleCopyMessageText) {
                                ctx.handleCopyMessageText(plainSystemText);
                              } else {
                                navigator.clipboard.writeText(plainSystemText);
                              }
                            } 
                          }
                        ];

                        // Удаление системного сообщения (для администратора или создателя беседы)
                        const canDeleteSystemMsg = 
                          ctx.currentUser?.userStatus === 'administrator' || 
                          String(currentChatUser?.ownerId) === myId;

                        if (canDeleteSystemMsg) {
                          menuItems.push(
                            { isDivider: true } as any,
                            { 
                              label: 'Удалить уведомление', 
                              icon: '🗑️', 
                              isDanger: true, 
                              onClick: () => {
                                if (ctx.closeContextMenu) ctx.closeContextMenu();
                                ctx.showConfirm('Удаление уведомления', 'Удалить системное сообщение?', async () => {
                                  if (ctx.setAllMessages) {
                                    ctx.setAllMessages((prev: any[]) => prev.filter((m: any) => String(m.id) !== String(msg.id)));
                                  }
                                  await supabase.from('messages').delete().eq('id', msg.id);
                                  ctx.showToast('Системное сообщение удалено', 'success');
                                }, true);
                              }
                            }
                          );
                        }

                        ctx.setCtxMenu({ show: true, x: e.clientX, y: e.clientY, items: menuItems });
                      }}
                    >
                      {/* 🎯 ВОТ ЗДЕСЬ ВЫЗЫВАЕТСЯ ДИНАМИЧЕСКИЙ ПАРСЕР: */}
                      {renderSystemMessageContent(msg.text)}
                    </div>
                  </div>
                ) : (
                  /* ======================================================== */
                  /* 👥 ОБЫЧНЫЕ ТЕКСТОВЫЕ СООБЩЕНИЯ (ЛС ИЛИ БЕСЕДА)          */
                  /* ======================================================== */
                  (() => {
                    const isMyMsg = String(msg.senderId) === myId;
                    const isGroupChat = currentChatUser?.type === 'group';

                    // 1. Проверяем: сохранён ли автор сообщения у нас в контактах
                    const contactEntry = (ctx.contacts || []).find((c: any) => 
                      String(c.contactId || c.partnerId || c.uuid || c.id) === String(msg.senderId)
                    );

                    // 2. Ищем данные пользователя
                    const baseUserObj = (ctx.users || []).find((u: any) => String(u.uuid) === String(msg.senderId)) || 
                                        (ctx.chats || []).find((c: any) => String(c.uuid) === String(msg.senderId));

                    const senderUserObj = contactEntry ? { ...baseUserObj, ...contactEntry } : baseUserObj;

                    // 3. Если есть контакт с именем/фамилией — показываем их, иначе никнейм
                    const senderDisplayName = contactEntry && (contactEntry.firstName || contactEntry.lastName)
                      ? `${contactEntry.firstName || ''} ${contactEntry.lastName || ''}`.trim()
                      : senderUserObj?.name || senderUserObj?.username || `Участник`;

                    const senderAvatarColor = senderUserObj?.avatarColor || '#007aff';
                    const senderNameColor = senderUserObj?.nameColor || '#007aff';

                    const isFirstInRow = (() => {
                      if (index === 0) return true;
                      const prevMsg = displayedMessages[index - 1];
                      if (prevMsg.senderId !== msg.senderId) return true;
                      const prevDay = new Date(prevMsg.createdAt).toLocaleDateString('ru-RU');
                      return currentDayStr !== prevDay;
                    })();

                    const messageBubbleContent = (
                      <div 
                        className={`${styles.message} ${isMyMsg ? styles['message-outgoing'] : styles['message-incoming']}`}
                        style={{ marginTop: isFirstInRow ? '8px' : '2px' }}
                        onContextMenu={(e) => {
                          e.preventDefault();              
                          
                          const menuItems: ContextMenuItem[] = [
                            {
                              label: 'Ответить',
                              icon: '↩️',
                              disabled: true,
                              title: 'Ответы на сообщения в разработке',
                              onClick: () => {}
                            },
                            { 
                              label: 'Копировать текст', 
                              icon: '📋', 
                              onClick: () => {
                                if (ctx.handleCopyMessageText) ctx.handleCopyMessageText(msg.text);
                                else navigator.clipboard.writeText(msg.text);
                              } 
                            },
                            {
                              label: 'Закрепить',
                              icon: '📌',
                              disabled: true,
                              title: 'Закрепление сообщений в разработке',
                              onClick: () => {}
                            },
                            {
                              label: 'Переслать',
                              icon: '➡️',
                              disabled: true,
                              title: 'Пересылка сообщений в разработке',
                              onClick: () => {}
                            }
                          ];

                          if (isMyMsg) {
                            menuItems.splice(1, 0, {
                              label: 'Редактировать',
                              icon: '✏️',
                              onClick: () => {
                                ctx.setEditingMessage(msg);
                                ctx.setMessageText(msg.text);
                                messageInputRef.current?.focus();
                              }
                            });
                          }

                          menuItems.push(
                            { isDivider: true } as any,
                            { 
                              label: 'Удалить', 
                              icon: '🗑️', 
                              isDanger: true, 
                              onClick: () => {
                                if (ctx.closeContextMenu) ctx.closeContextMenu();
                                ctx.showConfirm('Удаление сообщения', 'Удалить это сообщение?', async () => {
                                  if (ctx.setAllMessages) {
                                    ctx.setAllMessages((prev: any[]) => prev.filter((m: any) => String(m.id) !== String(msg.id)));
                                  }
                                  await supabase.from('messages').delete().eq('id', msg.id);
                                  ctx.showToast('Сообщение удалено', 'success');
                                }, true);
                              }
                            }
                          );

                          ctx.setCtxMenu({ show: true, x: e.clientX, y: e.clientY, items: menuItems });
                        }}
                      >
                        <div className={styles['message-bubble']}>
                          <div className={styles['message-text']}>
                            {isGroupChat && !isMyMsg && isFirstInRow && (
                              <span 
                                className={styles['group-msg-sender-name']} 
                                style={{ color: senderNameColor }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  ctx.setShowUserModal(String(msg.senderId));
                                }}
                              >
                                {renderUserStatusBadge(senderUserObj)}
                                {senderDisplayName}
                              </span>
                            )}

                            {msg.text}
                            
                            <span className={styles['message-meta']}>
                              <span className={styles['message-time']}>
                                {msg.isEdited && <i>ред. </i>}
                                {formatHoursAndMinutes(msg.createdAt)}
                              </span>
                              {isMyMsg && (
                                <span className={styles['message-status']}>
                                  {msg.status === 'sending' && <Clock size={12} style={{ color: '#9ca3af' }} />}
                                  {msg.status === 'send' && <Check size={14} style={{ color: '#9ca3af' }} />}
                                  {msg.status === 'read' && <CheckCheck size={14} style={{ color: '#007aff' }} />}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );

                    if (isGroupChat && !isMyMsg) {
                      return (
                        <div className={styles['message-with-avatar']} key={`msg-avatar-group-${msg.id}`}>
                          {isFirstInRow ? (
                            <SmartAvatar
                              size={32}
                              avatarUrl={senderUserObj?.avatarUrl}
                              avatarColor={senderAvatarColor}
                              name={senderDisplayName}
                              onClick={() => ctx.setShowUserModal(String(msg.senderId))}
                              className={styles['group-msg-avatar-smart']}
                            />
                          ) : (
                            <div style={{ width: '32px', flexShrink: 0 }} />
                          )}
                          {messageBubbleContent}
                        </div>
                      );
                    }

                    return messageBubbleContent;
                  })()
                )}
              </React.Fragment>
            );
          })
        )}
      </div>


      {ctx.editingMessage && (
        <div className={styles['block-editing']}>
          <Pencil size={20}/>
          <div><span>Редактирование</span><p>{ctx.editingMessage.text}</p></div>
          <button type="button" onClick={() => { ctx.setEditingMessage(null); ctx.setMessageText(''); }}>
            <X size={20}/>
          </button>
        </div>
      )}

      <button 
        type="button"
        onClick={scrollInToBottom}
        className={`${styles['scroll-bottom-btn']} ${showScrollBtn ? styles['visible'] : ''}`}
      >
        <ArrowDown size={20} />
      </button>

      {currentChatUser?.isChannel && ctx.currentUser?.userStatus !== 'administrator' ? (
        <div style={{
          padding: '16px',
          textAlign: 'center',
          backgroundColor: '#16171b',
          borderTop: '1px solid #232428',
          color: '#8e8e93',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <Megaphone size={16} color="#9d7bf6" />
          <span>Только администраторы могут оставлять записи в канале</span>
        </div>
      ) : (
        <form className={styles['chat-input-zone']} onSubmit={ctx.handleSendMessage}>
          <button type="button" className={styles['input-action-btn']} disabled style={{ cursor: 'not-allowed' }}>
            <Paperclip color='#585757'/>
          </button>
          <textarea 
            placeholder="Напишите сообщение..." 
            ref={messageInputRef} 
            value={ctx.messageText}
            id='messageText-input'
            onChange={e => ctx.setMessageText(e.target.value)} 
            onKeyDown={ctx.handleKeyDown}
            className={styles['main-message-input']} 
            autoComplete="off"
            rows={1}
          />
          <button type="submit" className={styles['send-message-btn']}>
            <Send color='#aaa8a8'/>
          </button>
        </form>
      )}

      <ContextMenu 
        show={ctx.ctxMenu.show} 
        x={ctx.ctxMenu.x} 
        y={ctx.ctxMenu.y} 
        onClose={ctx.closeContextMenu} 
        items={ctx.ctxMenu.items} 
      />

      <AddParticipantsModal
        show={showAddModal}
        existingUserIds={existingUsers}
        onClose={() => setShowAddModal(false)}
        onAdd={async (selectedIds) => {
          if (ctx.handleAddUsersToGroup) {
            await ctx.handleAddUsersToGroup(activeChatIdStr, selectedIds);
          }
        }}
      />
    </main>
  );
}
