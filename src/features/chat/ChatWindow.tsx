import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from '../../components/css/chat-window.module.css';
import { type ContextMenuItem } from '../../components/common/_ContextMenu';
import useMessengerContext, { formatUserOnlineStatus } from '../../context/messengerContext';
import { DropdownMenu, AddParticipantsModal } from '../../components/common/GlobalUI'; 
import { supabase } from '../../services/supabaseClient';
import { renderUserStatusBadge } from '../../utils/statusBadge';
import SmartAvatar from '../../components/common/SmartAvatar';
import StartGroupCallModal from '../calls/StartGroupCallModal';
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
  const prevMessagesLengthRef = useRef<number>(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showStartGroupCallModal, setShowStartGroupCallModal] = useState(false);

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

  // 🧠 Группировка сообщений по дням и пачкам авторов
  const groupedDays = useMemo(() => {
    if (!displayedMessages || displayedMessages.length === 0) return [];

    const days: Array<{
      dateKey: string;
      dateTitle: string;
      clusters: Array<{
        clusterId: string;
        senderId: string;
        isOutgoing: boolean;
        isSystem: boolean;
        senderUserObj: any;
        senderDisplayName: string;
        senderAvatarColor: string;
        senderNameColor: string;
        messages: Array<{
          msg: any;
          isFirstInGroup: boolean;
          isLastInGroup: boolean;
        }>;
      }>;
    }> = [];

    let currentDayObj: (typeof days)[0] | null = null;
    let currentCluster: (typeof days)[0]['clusters'][0] | null = null;

    displayedMessages.forEach((msg: any) => {
      const msgDate = new Date(msg.createdAt);
      const dayKey = msgDate.toDateString();
      const currentDayStr = msgDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

      // 1. Проверяем смену дня
      if (!currentDayObj || currentDayObj.dateKey !== dayKey) {
        currentDayObj = {
          dateKey: dayKey,
          dateTitle: currentDayStr,
          clusters: []
        };
        days.push(currentDayObj);
        currentCluster = null; // При смене дня начинаем новую пачку
      }

      const isSystemMsg = msg.senderId === 'system' || String(msg.senderId) === '00000000-0000-0000-0000-000000000000';
      const isMyMsg = String(msg.senderId) === myId;
      const senderIdStr = String(msg.senderId);

      // Ищем автора для корректного отображения
      const contactEntry = (ctx.contacts || []).find((c: any) => 
        String(c.contactId || c.partnerId || c.uuid || c.id) === senderIdStr
      );
      const baseUserObj = (ctx.users || []).find((u: any) => String(u.uuid) === senderIdStr) || 
                          (ctx.chats || []).find((c: any) => String(c.uuid) === senderIdStr);
      const senderUserObj = contactEntry ? { ...baseUserObj, ...contactEntry } : baseUserObj;
      const senderDisplayName = (() => {
        // 1. Приоритет №1: Если пользователь у нас в контактах
        if (contactEntry && (contactEntry.firstName || contactEntry.lastName)) {
          return `${contactEntry.firstName || ''} ${contactEntry.lastName || ''}`.trim();
        }

        // 2. Настоящее имя и фамилия из базы
        const fullName = `${senderUserObj?.firstName || ''} ${senderUserObj?.lastName || ''}`.trim();
        const privacyFormat = senderUserObj?.privacyNameFormat || 'username';

        // 3. Приоритет №2: Если в профиле пользователя выбрано отображение имени (full_name)
        if ((privacyFormat === 'full_name' || privacyFormat === 'name') && fullName) {
          return fullName;
        }

        // 4. Приоритет №3: Username или фоллбэк на fullName / никнейм
        return senderUserObj?.username || fullName || senderUserObj?.name || 'Участник';
      })();
      const senderAvatarColor = senderUserObj?.avatarColor || '#007aff';
      const senderNameColor = senderUserObj?.nameColor || '#007aff';

      // 2. Проверяем, можно ли прикрепить сообщение к текущей пачке автора
      let canAppendToCluster = false;
      if (currentCluster && !currentCluster.isSystem && !isSystemMsg && currentCluster.senderId === senderIdStr) {
        const lastMsg = currentCluster.messages[currentCluster.messages.length - 1]?.msg;
        if (lastMsg) {
          const diffMs = new Date(msg.createdAt).getTime() - new Date(lastMsg.createdAt).getTime();
          // Объединяем, если автор тот же и прошло меньше 7 минут
          if (diffMs < 15 * 60 * 1000) {
            canAppendToCluster = true;
          }
        }
      }

      if (canAppendToCluster && currentCluster) {
        currentCluster.messages.push({
          msg,
          isFirstInGroup: false,
          isLastInGroup: true
        });
        if (currentCluster.messages.length > 1) {
          currentCluster.messages[currentCluster.messages.length - 2].isLastInGroup = false;
        }
      } else {
        currentCluster = {
          clusterId: `cluster-${msg.id}`,
          senderId: senderIdStr,
          isOutgoing: isMyMsg,
          isSystem: isSystemMsg,
          senderUserObj,
          senderDisplayName,
          senderAvatarColor,
          senderNameColor,
          messages: [{
            msg,
            isFirstInGroup: true,
            isLastInGroup: true
          }]
        };
        currentDayObj.clusters.push(currentCluster);
      }
    });

    return days;
  }, [displayedMessages, myId, ctx.contacts, ctx.users, ctx.chats]);

  const openMessageContextMenu = (e: React.MouseEvent, msg: any, isMyMsg: boolean) => {
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
  };

  const handleCallButton = () => {
    if (isGroup) {
      setShowStartGroupCallModal(true);
    } else {
      ctx.handleStartAudioCall(currentChatUser.partnerId || currentChatUser.id);
    }
  };

  useEffect(() => {
    if (!messagesBodyRef.current || !ctx.activeChatId) return;

    const isChatChanged = previousChatIdRef.current !== ctx.activeChatId;
    previousChatIdRef.current = ctx.activeChatId;

    // 1. При переключении на другой чат — скроллим в самый низ
    if (isChatChanged) {
      if (ctx.setEditingMessage) ctx.setEditingMessage(null);
      if (ctx.setMessageText) ctx.setMessageText('');

      prevMessagesLengthRef.current = displayedMessages.length;
      messagesBodyRef.current.scrollTop = messagesBodyRef.current.scrollHeight;
      setShowScrollBtn(false);
      messageInputRef.current?.focus();
      return;
    }

    const isNewMessage = displayedMessages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = displayedMessages.length;

    // 🎯 Если длина не выросла (было редактирование или удаление) — НЕ СКРОЛЛИМ!
    if (!isNewMessage) return;

    const lastMsg = displayedMessages[displayedMessages.length - 1];
    const isMyLastMsg = String(lastMsg?.senderId) === myId;

    const { scrollTop, scrollHeight, clientHeight } = messagesBodyRef.current;
    const isUserNearBottom = scrollHeight - scrollTop - clientHeight < 250;

    // Скроллим вниз, только если написал сам юзер или он уже читал внизу
    if (isMyLastMsg || isUserNearBottom) {
      messagesBodyRef.current.scrollTo({
        top: messagesBodyRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [ctx.activeChatId, displayedMessages, myId]);

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
      <header className={styles['chat-header']} style={{height: '58px', padding: '0 16px'}}>
        <div 
          className={styles['chat-header-user']} 
          onClick={() => ctx.setShowUserModal(true)}
          style={{flexDirection: 'column', alignItems: 'flex-start', gap: '0'}}
        >
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
          {/* </div> */}
        </div>

        <div className={styles['chat-header-actions']}>
          <button 
            type="button"
            className={`${styles['header-btn']} ${ctx.showMsgSearch ? styles['active-search'] : ''}`} 
            style={ctx.showMsgSearch ? { 
              backgroundColor: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: '50%',
              color: '#fff' 
            } : {}}
            onClick={() => {
              if (ctx.setShowMsgSearch) {
                ctx.setShowMsgSearch(!ctx.showMsgSearch);
              }
            }}
            title="Поиск сообщений"
          >
            <Search size={20} />
          </button>

          {currentChatUser && (
            <button 
              type="button" 
              className={styles['header-btn']} 
              onClick={handleCallButton} 
              title={currentChatUser.isGroup ? "Начать голосовой чат" : "Позвонить пользователю"}
            >
              <Phone size={20} color="#aaa8a8" />
            </button>
          )}

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

      {/* 🟢 БАННЕР АКТИВНОГО ЗВОНКА В БЕСЕДЕ */}
      {isGroup && ctx.activeGroupCalls?.[`group_${activeChatIdStr}`] && !ctx.currentCall && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: '#1b2b22', borderBottom: '1px solid #234d31',
          padding: '10px 16px', color: '#2ec761'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2ec761', animation: 'pulse 1.2s infinite' }} />
            В этой беседе прямо сейчас идёт голосовой чат
          </div>
          <button
            type="button"
            onClick={() => ctx.handleJoinExistingCall(ctx.activeGroupCalls[`group_${activeChatIdStr}`])}
            style={{
              backgroundColor: '#2ec761', color: '#000', border: 'none',
              borderRadius: '8px', padding: '6px 14px', fontWeight: 600,
              fontSize: '13px', cursor: 'pointer'
            }}
          >
            Войти в созвон
          </button>
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
          groupedDays.map((dayGroup) => (
            <div key={dayGroup.dateKey} className={styles['message-date-group']}>
              
              {/* 📌 2. ПРИЛИПАЮЩАЯ ДАТА (sticky-date) */}
              <div className={styles['sticky-date']}>
                {dayGroup.dateTitle}
              </div>

              {/* 👥 3. ПАЧКИ СООБЩЕНИЙ ОТ ОДНОГО АВТОРА (message-group) */}
              {dayGroup.clusters.map((cluster) => {
                // Системные уведомления рендерим по центру
                if (cluster.isSystem) {
                  return (
                    <div key={cluster.clusterId} className={styles['system-message-container']}>
                      {cluster.messages.map(({ msg }) => (
                        <div 
                          key={msg.id} 
                          id={`message-${msg.id}`}
                          className={styles['system-message-bubble']}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            const plainSystemText = msg.text
                              .replace(/\{\{user:[a-zA-Z0-9_-]+\}\}/g, 'пользователь')
                              .replace(/<\/?[^>]+(>|$)/g, '')
                              .trim();
                            ctx.setCtxMenu({
                              show: true,
                              x: e.clientX,
                              y: e.clientY,
                              items: [
                                { 
                                  label: 'Копировать текст', 
                                  icon: '📋', 
                                  onClick: () => navigator.clipboard.writeText(plainSystemText)
                                }
                              ]
                            });
                          }}
                        >
                          {renderSystemMessageContent(msg.text)}
                        </div>
                      ))}
                    </div>
                  );
                }

                const isGroupChat = currentChatUser?.type === 'group';
                const showAvatar = isGroupChat && !cluster.isOutgoing;

                return (
                  <div 
                    key={cluster.clusterId}
                    className={`${styles['sender-group-container']} ${
                      cluster.isOutgoing ? styles.outgoing : styles.incoming
                    }`}
                  >
                    {/* 👤 4. БЛОК С АВАТАРКОЙ (залипает снизу пачки, как на скриншотах 3-4) */}
                    {showAvatar && (
                      <div className={styles['sender-avatar-col']}>
                        <SmartAvatar
                          size={34}
                          avatarUrl={cluster.senderUserObj?.avatarUrl}
                          avatarColor={cluster.senderAvatarColor}
                          name={cluster.senderDisplayName}
                          onClick={() => ctx.setShowUserModal(cluster.senderId)}
                        />
                      </div>
                    )}

                    {/* 💬 5. СТОЛБЕЦ СООБЩЕНИЙ ЭТОГО АВТОРА */}
                    <div className={styles['sender-messages-col']}>
                      {cluster.messages.map(({ msg, isFirstInGroup, isLastInGroup }) => (
                        <div 
                          key={msg.id}
                          id={`message-${msg.id}`}
                          className={`${styles['message-list-item']} ${
                            isFirstInGroup ? styles['first-in-group'] : ''
                          } ${isLastInGroup ? styles['last-in-group'] : ''}`}
                        >
                          <div 
                            className={`${styles.message} ${
                              cluster.isOutgoing ? styles['message-outgoing'] : styles['message-incoming']
                            }`}
                            onContextMenu={(e) => openMessageContextMenu(e, msg, cluster.isOutgoing)}
                          >
                            <div className={styles['message-bubble']}>
                              <div className={styles['message-text']}>
                                {/* Имя автора выводится ТОЛЬКО в первом сообщении кластера в группе */}
                                {isGroupChat && !cluster.isOutgoing && isFirstInGroup && (
                                  <span 
                                    className={styles['group-msg-sender-name']} 
                                    style={{ color: cluster.senderNameColor, cursor: 'pointer' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      ctx.setShowUserModal(cluster.senderId);
                                    }}
                                  >
                                    {renderUserStatusBadge(cluster.senderUserObj)}
                                    {cluster.senderDisplayName}
                                  </span>
                                )}

                                {msg.text}
                                
                                <span className={styles['message-meta']}>
                                  <span className={styles['message-time']}>
                                    {msg.isEdited && <i>ред. </i>}
                                    {formatHoursAndMinutes(msg.createdAt)}
                                  </span>
                                  {cluster.isOutgoing && (
                                    <span className={styles['message-status']}>
                                      {msg.status === 'sending' && <Clock size={12} style={{ color: '#9ca3af' }} />}
                                      {msg.status === 'send' && <Check size={14} style={{ color: '#9ca3af' }} />}
                                      {msg.status === 'read' && <CheckCheck size={14} style={{ color: '#9ca3af' }} />}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
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

      <StartGroupCallModal
        show={showStartGroupCallModal}
        groupName={currentChatUser?.name || 'Беседа'}
        onClose={() => setShowStartGroupCallModal(false)}
        onStart={(isSilent) => {
          setShowStartGroupCallModal(false);
          ctx.handleStartAudioCall(activeChatIdStr, { isGroup: true, isSilent });
        }}
      />
    </main>
  );
}
