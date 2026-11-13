import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from '../../components/css/chat-window.module.css';
import useMessengerContext, { formatUserOnlineStatus } from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';
import { chatSendStrategies } from '../../services/chatSendStrategies';
import { 
  Search, EllipsisVertical, X, Check, CheckCheck, Pencil, Paperclip, 
  Send, ArrowUp, ArrowDown, User, Eye,
  BellOff, MessageSquare, Trash, Phone, Clock, 
  Pin, Users, Megaphone, Bookmark, ArrowLeft,
  Reply,
  Copy,
  Forward,
} from 'lucide-react';

import { DropdownMenu, AddParticipantsModal } from '../../components/common/GlobalUI';
import SmartAvatar from '../../components/common/SmartAvatar';
import StartGroupCallModal from '../calls/StartGroupCallModal';
import { SendAsModal } from '../../components/modals/common/SendAsModal';
import { type ContextMenuItem } from '../../components/common/ContextMenu';
import { getNameColor } from '../../utils/themeColors';
import { getUserStatusBadge } from '../../services/userService';
import { renderMessageWithLinks } from '../../utils/linkParser';

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

  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isDatesVisible, setIsDatesVisible] = useState(false);
  const [floatingDateTitle, setFloatingDateTitle] = useState<string | null>(null);
  const hideDatesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerDatesVisibility = () => {
    setIsDatesVisible(true);
    if (hideDatesTimerRef.current) {
      clearTimeout(hideDatesTimerRef.current);
    }
    hideDatesTimerRef.current = setTimeout(() => {
      setIsDatesVisible(false);
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (hideDatesTimerRef.current) clearTimeout(hideDatesTimerRef.current);
    };
  }, []);

  // 🎯 Стейты для плавной анимации открытия и закрытия на мобилках
  const [renderedChatId, setRenderedChatId] = useState<string | null>(
    ctx.activeChatId ? String(ctx.activeChatId) : null
  );
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(Boolean(ctx.activeChatId));

  useEffect(() => {
    if (ctx.activeChatId) {
      setRenderedChatId(String(ctx.activeChatId));
      const rafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsMobileOpen(true);
        });
      });
      return () => cancelAnimationFrame(rafId);
    } else {
      setIsMobileOpen(false);
      // Таймаут сброса: для продакшна 300мс (под transition: 0.28s).
      // Если тестируете на 3 секундах, поставьте здесь 3000
      const closeTimer = setTimeout(() => {
        setRenderedChatId(null);
      }, 300);
      return () => clearTimeout(closeTimer);
    }
  }, [ctx.activeChatId]);

  // Канал: настройки и выбор авторства
  const [sendAsType, setSendAsType] = useState<'user' | 'channel'>('channel');
  const [showSendAsModal, setShowSendAsModal] = useState(false);
  const [channelSignMessages, setChannelSignMessages] = useState<boolean>(false);
  const [channelShowAuthorProfiles, setChannelShowAuthorProfiles] = useState<boolean>(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [existingUsers, setExistingUsers] = useState<string[]>([]);

  const myId = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');
  const activeChatIdStr = String(renderedChatId || ctx.activeChatId || '');

  const currentChatUser = useMemo(() => {
    // 🎯 Проверяем activeChatIdStr (он сохраняет ID до конца анимации)
    if (!activeChatIdStr) return null;
    const targetIdStr = activeChatIdStr;

    const foundInChats = (ctx.chats || []).find((c: any) => 
      String(c.id) === targetIdStr ||
      String(c.chatId) === targetIdStr ||
      String(c.internalChatId) === targetIdStr ||
      String(c.partnerId) === targetIdStr ||
      String(c.uuid) === targetIdStr
    );
    if (foundInChats) return foundInChats;

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
  }, [ctx.chats, ctx.contacts, ctx.users, activeChatIdStr]);

  // 2. Определение режима чата
  const isChannel = Boolean(currentChatUser?.isChannel || currentChatUser?.type === 'channel');
  const isGroup = Boolean(currentChatUser?.isGroup || currentChatUser?.type === 'group' || activeChatIdStr.startsWith('group_'));
  
  const isSavedMessages = Boolean(
    currentChatUser?.type === 'saved' || 
    currentChatUser?.isSaved || 
    activeChatIdStr === 'saved' ||
    (currentChatUser?.partnerId && String(currentChatUser.partnerId) === myId) ||
    (currentChatUser?.uuid && String(currentChatUser.uuid) === myId)
  );

  const memberCount = isGroup ? (currentChatUser?.memberCount ?? null) : null;

  // Синхронизация флагов канала
  useEffect(() => {
    if (!isChannel || !activeChatIdStr) return;

    if (typeof currentChatUser?.signMessages === 'boolean') {
      setChannelSignMessages(currentChatUser.signMessages);
    }
    if (typeof currentChatUser?.showAuthorProfiles === 'boolean') {
      setChannelShowAuthorProfiles(currentChatUser.showAuthorProfiles);
    }

    const numId = Number(currentChatUser?.internalChatId || currentChatUser?.id || activeChatIdStr);
    if (isNaN(numId) || numId <= 0) return;

    supabase
      .from('chats')
      .select('settings')
      .eq('id', numId)
      .single()
      .then(({ data }) => {
        if (data) {
          const settings = data.settings || {};
          setChannelSignMessages(Boolean(settings.signMessages));
          setChannelShowAuthorProfiles(Boolean(settings.showAuthorProfiles));
        }
      });
  }, [isChannel, activeChatIdStr, currentChatUser?.signMessages, currentChatUser?.showAuthorProfiles]);

  const handleCustomSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = (ctx.messageText || '').trim();
    if (!text || !myId) return;

    // Редактирование[cite: 30]
    if (ctx.editingMessage) {
      try {
        const { error } = await supabase
          .from('messages')
          .update({ text, isEdited: true })
          .eq('id', ctx.editingMessage.id);

        if (error) throw error;

        if (ctx.setAllMessages) {
          ctx.setAllMessages((prev: any[]) =>
            prev.map(m => m.id === ctx.editingMessage.id ? { ...m, text, isEdited: true } : m)
          );
        }
        ctx.setEditingMessage(null);
        ctx.setMessageText('');
        return;
      } catch (err: any) {
        ctx.showToast?.(`Ошибка редактирования: ${err.message}`, 'error');
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;
    const targetRoomId = Number(currentChatUser?.internalChatId || currentChatUser?.id || activeChatIdStr);

    const isSignActive = Boolean(currentChatUser?.signMessages ?? channelSignMessages);
    const isShowAuthorsActive = Boolean(currentChatUser?.showAuthorProfiles ?? channelShowAuthorProfiles);

    const optimisticSenderType = (isChannel && isShowAuthorsActive && sendAsType !== 'channel')
      ? 'user'
      : (isChannel ? 'channel' : 'user');

    const userDisplayName = (ctx.currentUser?.username || '').trim();
    const userFullName = `${ctx.currentUser?.firstName || ''} ${ctx.currentUser?.lastName || ''}`.trim();
    const fallbackId = (ctx.currentUser?.publicId || ctx.currentUser?.uniqueId || '').trim();

    const authorSignature = userDisplayName || userFullName || fallbackId || 'Автор';

    const optimisticMessage = {
      id: tempId,
      chatId: activeChatIdStr,
      senderId: myId,
      senderType: optimisticSenderType,
      authorSignature: isSignActive && sendAsType !== 'channel'
        ? authorSignature
        : null,
      text,
      status: 'sending',
      createdAt: nowIso
    };

    if (ctx.setAllMessages) {
      ctx.setAllMessages((prev: any[]) => [...prev, optimisticMessage]);
    }
    ctx.setMessageText('');

    try {
      let createdMessage: any = null;

      if (isChannel) {
        createdMessage = await chatSendStrategies.sendChannel({
          chatId: isNaN(targetRoomId) ? activeChatIdStr : targetRoomId,
          myId,
          text,
          nowIso,
          sendAsType,
          isSignModeActive: isSignActive,
          isShowAuthorProfilesActive: isShowAuthorsActive,
          authorSignature
        });
      } else if (isSavedMessages) {
        createdMessage = await chatSendStrategies.sendSaved({
          chatId: isNaN(targetRoomId) ? activeChatIdStr : targetRoomId,
          myId,
          text,
          nowIso
        });
      } else if (isGroup) {
        createdMessage = await chatSendStrategies.sendGroup({
          chatId: isNaN(targetRoomId) ? activeChatIdStr : targetRoomId,
          myId,
          text,
          nowIso
        });
      } else {
        createdMessage = await chatSendStrategies.sendDirect({
          chatId: isNaN(targetRoomId) ? activeChatIdStr : targetRoomId,
          myId,
          text,
          nowIso
        });
      }

      if (ctx.setAllMessages && createdMessage) {
        ctx.setAllMessages((prev: any[]) =>
          prev.map(m => m.id === tempId ? createdMessage : m)
        );
      }
      if (ctx.fetchAndMatchChats) await ctx.fetchAndMatchChats();
    } catch (err: any) {
      console.error('Ошибка отправки:', err);
      ctx.showToast?.(`Ошибка отправки: ${err.message}`, 'error');
    }
  };

  const displayedMessages = useMemo(() => {
    // 🎯 Сообщения остаются в DOM на время уезда окна
    if (!myId || !activeChatIdStr) return [];

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

  // 5. Группировка с учётом динамического состояния канала
  const currentShowAuthors = Boolean(currentChatUser?.showAuthorProfiles ?? channelShowAuthorProfiles);

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
        isRenderAsAuthor: boolean;
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

      if (!currentDayObj || currentDayObj.dateKey !== dayKey) {
        currentDayObj = {
          dateKey: dayKey,
          dateTitle: currentDayStr,
          clusters: []
        };
        days.push(currentDayObj);
        currentCluster = null;
      }

      const isSystemMsg = msg.senderId === 'system' || String(msg.senderId) === '00000000-0000-0000-0000-000000000000';

      // 🎯 Проверка авторства для канала:
      // Рендерится как автор ТОЛЬКО если сообщение было отправлено с senderType === 'user' И прямо сейчас showAuthorProfiles === true
      const isPostCreatedByUser = msg.senderType === 'user';
      const isRenderAsAuthor = isChannel && isPostCreatedByUser && currentShowAuthors;

      const effectiveSenderId = isChannel
        ? (isRenderAsAuthor ? String(msg.senderId) : String(currentChatUser?.id || activeChatIdStr))
        : String(msg.senderId);

      // В Избранном и Канале все сообщения выводятся слева
      const isOutgoing = (isSavedMessages || isChannel)
        ? false
        : (effectiveSenderId === myId);

      const authorUserObj = (ctx.users || []).find((u: any) => String(u.uuid || u.id) === String(msg.senderId)) ||
                            (ctx.contacts || []).find((c: any) => String(c.contactId || c.partnerId || c.uuid || c.id) === String(msg.senderId));

      const senderDisplayName = isChannel
        ? (isRenderAsAuthor ? (authorUserObj?.username || authorUserObj?.name || 'Автор') : (currentChatUser?.name || 'Канал'))
        : (() => {
            const contact = (ctx.contacts || []).find((c: any) => String(c.contactId || c.partnerId || c.uuid || c.id) === effectiveSenderId);
            if (contact && (contact.firstName || contact.lastName)) {
              return `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
            }
            const user = (ctx.users || []).find((u: any) => String(u.uuid) === effectiveSenderId);
            return user?.username || user?.name || 'Участник';
          })();

      const senderAvatarColor = isChannel
        ? (isRenderAsAuthor ? (authorUserObj?.avatarColor || '#5865F2') : (currentChatUser?.avatarColor || '#9d7bf6'))
        : (authorUserObj?.avatarColor || '#007aff');

      const senderNameColor = isChannel
        ? (isRenderAsAuthor ? (authorUserObj?.nameColor || '#5eaddf') : '#5288c1')
        : (authorUserObj?.nameColor || '#007aff');

      let canAppendToCluster = false;
      if (
        currentCluster && 
        !currentCluster.isSystem && 
        !isSystemMsg && 
        currentCluster.senderId === effectiveSenderId &&
        currentCluster.isRenderAsAuthor === isRenderAsAuthor
      ) {
        const lastMsg = currentCluster.messages[currentCluster.messages.length - 1]?.msg;
        if (lastMsg) {
          const diffMs = new Date(msg.createdAt).getTime() - new Date(lastMsg.createdAt).getTime();
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
          senderId: effectiveSenderId,
          isOutgoing,
          isSystem: isSystemMsg,
          isRenderAsAuthor,
          senderUserObj: isChannel ? (isRenderAsAuthor ? authorUserObj : currentChatUser) : authorUserObj,
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
  }, [displayedMessages, myId, ctx.contacts, ctx.users, isChannel, currentShowAuthors, isSavedMessages, currentChatUser, activeChatIdStr]);

  const inputPlaceholder = isChannel ? 'Публикация...' : 'Сообщение...';

  const openMessageContextMenu = (
    e: React.MouseEvent | React.TouchEvent | { clientX: number; clientY: number; preventDefault?: () => void },
    msg: any,
    isMyMsg: boolean
  ) => {
    if ('preventDefault' in e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    // Определяем координаты клика или тапа
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Если координаты по какой-то причине нулевые (программный вызов), центрируем по экрану
    if (!clientX && !clientY) {
      clientX = window.innerWidth / 2;
      clientY = window.innerHeight / 2;
    }

    const menuItems: ContextMenuItem[] = [
      {
        label: 'Ответить',
        icon: <Reply size={16} />,
        disabled: true,
        title: 'Ответы на сообщения в разработке',
        onClick: () => {}
      },
      { 
        label: 'Копировать текст', 
        icon: <Copy size={16} />, 
        onClick: () => {
          if (ctx.handleCopyMessageText) ctx.handleCopyMessageText(msg.text);
          else navigator.clipboard.writeText(msg.text);
          ctx.showToast?.('Текст скопирован', 'success');
        } 
      },
      {
        label: 'Закрепить',
        icon: <Pin size={16} />,
        disabled: true,
        title: 'Закрепление сообщений в разработке',
        onClick: () => {}
      },
      {
        label: 'Переслать',
        icon: <Forward size={16} />,
        disabled: true,
        title: 'Пересылка сообщений в разработке',
        onClick: () => {}
      }
    ];

    if (isMyMsg || String(msg.senderId) === myId) {
      menuItems.splice(1, 0, {
        label: 'Редактировать',
        icon: <Pencil size={16} />,
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
        icon: <Trash size={16} />,
        isDanger: true, 
        onClick: () => {
          if (ctx.closeContextMenu) ctx.closeContextMenu();
          
          ctx.showConfirm('Удаление сообщения', 'Удалить это сообщение?', async () => {
            // 1. Сначала отправляем запрос на сервер (пока кнопка в модалке крутит лоадер)
            const { error } = await supabase.from('messages').delete().eq('id', msg.id);
            
            if (error) {
              ctx.showToast('Не удалось удалить сообщение', 'error');
              throw error; // Это позволит модалке корректно обработать ошибку, если она настроена
            }

            // 2. Когда сервер ответил успехом, удаляем из локального стейта
            if (ctx.setAllMessages) {
              ctx.setAllMessages((prev: any[]) => prev.filter((m: any) => String(m.id) !== String(msg.id)));
            }

            // 3. Показываем уведомление (модалка при этом закроется автоматически)
            ctx.showToast('Сообщение удалено', 'success');
          }, true);
        }
      }
    );

    ctx.setCtxMenu({ show: true, x: clientX, y: clientY, items: menuItems });
  };

  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent, msg: any, isOutgoing: boolean) => {
    isLongPressTriggeredRef.current = false;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    // Запускаем таймер долгого нажатия (420мс)
    touchTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(35); // Тактильный отклик при срабатывании
      }
      openMessageContextMenu(e, msg, isOutgoing);
    }, 420);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Если палец сдвинулся более чем на 8px (пользователь просто скроллит ленту) — отменяем меню
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const diffY = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (diffX > 8 || diffY > 8) {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
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

    if (isChatChanged) {
      if (ctx.setEditingMessage) ctx.setEditingMessage(null);
      if (ctx.setMessageText) ctx.setMessageText('');

      prevMessagesLengthRef.current = displayedMessages.length;
      requestAnimationFrame(() => {
        if (messagesBodyRef.current) {
          messagesBodyRef.current.scrollTop = messagesBodyRef.current.scrollHeight;
        }
      });
      setShowScrollBtn(false);
      triggerDatesVisibility();

      if (window.innerWidth > 739) {
        messageInputRef.current?.focus();
      }
      return;
    }

    if (!ctx.messagesLoading && prevMessagesLengthRef.current === 0 && displayedMessages.length > 0) {
      prevMessagesLengthRef.current = displayedMessages.length;
      messagesBodyRef.current.scrollTop = messagesBodyRef.current.scrollHeight;
      return;
    }

    const isNewMessage = displayedMessages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = displayedMessages.length;

    if (!isNewMessage) return;

    const lastMsg = displayedMessages[displayedMessages.length - 1];
    const isMyLastMsg = String(lastMsg?.senderId) === myId;

    const { scrollTop, scrollHeight, clientHeight } = messagesBodyRef.current;
    const isUserNearBottom = scrollHeight - scrollTop - clientHeight < 250;

    if (isMyLastMsg || isUserNearBottom) {
      messagesBodyRef.current.scrollTo({
        top: messagesBodyRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [ctx.activeChatId, ctx.messagesLoading, displayedMessages, myId]);

  if (!activeChatIdStr) {
    return (
      <main className={`${styles['chat-window']} ${isMobileOpen ? styles['chat-mobile-open'] : ''}`}>
        <div className={styles['chat-placeholder']}>
          <div className={styles['placeholder-content']}>
            <div className={styles['placeholder-icon']}>
              <MessageSquare size={38} color="#585966"/>
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
    : isSavedMessages
    ? [
        { id: 'to-top', text: 'Наверх', icon: ArrowUp, onClick: scrollInToTop }
      ]
    : [
        { 
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
  
  const renderSystemMessageContent = (text: string) => {
    const entityTokenRegex = /\{\{(user|chat):([a-zA-Z0-9_-]+)\}\}/g;

    if (!text.includes('{{user:') && !text.includes('{{chat:')) {
      return <span dangerouslySetInnerHTML={{ __html: text }} />;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = entityTokenRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      const entityType = match[1];
      const entityId = match[2];

      if (matchIndex > lastIndex) {
        elements.push(text.slice(lastIndex, matchIndex));
      }

      if (entityType === 'chat') {
        const foundChat = (ctx.chats || []).find((c: any) => String(c.id) === String(entityId));
        const chatTitle = foundChat?.name || 'Беседа';

        elements.push(
          <strong key={`chat-${entityId}-${matchIndex}`}>
            «{chatTitle}»
          </strong>
        );
      } else {
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

  const handleMessagesScroll = () => {
    const container = messagesBodyRef.current;
    if (!container) return;

    // Управление кнопкой «вниз»
    const { scrollTop, scrollHeight, clientHeight } = container;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 300);

    // 🚀 Скролл пошел -> включаем видимость красной плашки сверху
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Определяем, какая дата сейчас находится в верхней части экрана
    const containerTop = container.getBoundingClientRect().top;
    const groups = container.querySelectorAll<HTMLElement>('[data-date-title]');

    let currentStuckDate: string | null = null;
    groups.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= containerTop + 80 && rect.bottom >= containerTop) {
        currentStuckDate = el.getAttribute('data-date-title');
      }
    });

    setFloatingDateTitle(currentStuckDate);

    // ⏱️ Если 2.5 секунды нет скролла -> плавно гасим красную плашку сверху
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 2500);
  };

  const isChannelReadOnlyForUser = isChannel && 
    ctx.currentUser?.userStatus !== 'administrator' && 
    currentChatUser?.role !== 'owner' && 
    currentChatUser?.role !== 'admin';

  return (
    <main className={`${styles['chat-window']} ${isMobileOpen ? styles['chat-mobile-open'] : ''}`}>
      {/* Шапка чата */}
      <header className={styles['chat-header']} style={{ height: '58px', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
        <div style={{display: "flex"}}>
          {/* Кнопка «Назад» для мобильных экранов (<= 739px) */}
          <button
            type="button"
            className={styles['chat-header-back-btn']}
            onClick={() => {
              ctx.setActiveChatId(null);
              if (ctx.setEditingMessage) ctx.setEditingMessage(null);
              if (ctx.setMessageText) ctx.setMessageText('');
            }}
            title="Назад к чатам"
          >
            <ArrowLeft size={20} />
          </button>

          {/* 🎯 Аватарка в шапке окна чатов при скрытом сайдбаре (<= 739px) */}
          <div 
            className={styles['chat-header-avatar-mobile']}
            onClick={() => !isSavedMessages && ctx.setShowUserModal(true)}
            style={{ cursor: isSavedMessages ? 'default' : 'pointer' }}
          >
            {isSavedMessages ? (
              <div className={styles['saved-messages-header-circle']}>
                <Bookmark size={20} />
              </div>
            ) : (
              <SmartAvatar
                size={40}
                avatarUrl={currentChatUser?.avatarUrl}
                avatarColor={currentChatUser?.avatarColor || '#5865F2'}
                name={currentChatUser?.name || currentChatUser?.username || 'Чат'}
                isChannel={isChannel}
              />
            )}
          </div>

          <div 
            className={styles['chat-header-user']} 
            onClick={() => !isSavedMessages && ctx.setShowUserModal(true)}
            style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0', cursor: isSavedMessages ? 'default' : 'pointer', flex: 1 }}
          >
            <h3 className={styles['chat-header-user-name']} style={{ margin: 0 }}>
              {isSavedMessages ? (
                'Избранное'
              ) : (
                <>
                  {(() => {
                    const badge = getUserStatusBadge(currentChatUser);
                    return badge ? (
                      <span title={badge.title} style={{ cursor: 'help', userSelect: 'none' }}>
                        {badge.icon}
                      </span>
                    ) : null;
                  })()}
                  {currentChatUser?.name || currentChatUser?.username || 'Загрузка...'}
                </>
              )}
            </h3>

            {/* Онлайн-статус скрыт для «Избранного» */}
            {!isSavedMessages && (
              <span 
                className={`${styles['user-status']} ${
                  !isGroup && !isChannel && ctx.isUserOnline && ctx.isUserOnline(currentChatUser) ? styles['online'] : ''
                }`}
              >
                {isChannel ? (
                  'официальный канал'
                ) : isGroup ? (
                  memberCount !== null 
                    ? `${memberCount} ${
                        memberCount % 10 === 1 && memberCount % 100 !== 11
                          ? 'участник'
                          : [2, 3, 4].includes(memberCount % 10) && ![12, 13, 14].includes(memberCount % 100)
                          ? 'участника'
                          : 'участников'
                      }`
                    : 'Загрузка участников...'
                ) : ctx.isUserOnline && ctx.isUserOnline(currentChatUser) ? (
                  'в сети'
                ) : (
                  formatUserOnlineStatus(currentChatUser?.updatedAt, currentChatUser?.privacyOnline).text
                )}
              </span>
            )}
          </div>
        </div>

        <div className={styles['chat-header-actions']}>
          <button 
            type="button"
            className={`${styles['header-btn']} ${ctx.showMsgSearch ? styles['active-search'] : ''}`} 
            onClick={() => ctx.setShowMsgSearch?.(!ctx.showMsgSearch)}
            title="Поиск сообщений"
          >
            <Search size={20} />
          </button>

          {!isSavedMessages && !isChannel && currentChatUser && (
            <button 
              type="button" 
              className={styles['header-btn']} 
              onClick={handleCallButton} 
              title={isGroup ? "Начать голосовой чат" : "Позвонить пользователю"}
            >
              <Phone size={20} color="#aaa8a8" />
            </button>
          )}

          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <button 
              type="button"
              className={styles['header-btn']}
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
        </div>
      </header>

      {/* БАННЕР АКТИВНОГО ЗВОНКА */}
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
          const container = messagesBodyRef.current;
          if (!container) return;

          // Кнопка прокрутки вниз
          const { scrollTop, scrollHeight, clientHeight } = container;
          setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 300);

          // 🚀 Скролл пошел -> показываем плашку сверху
          setIsScrolling(true);
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
          }

          // Вычисляем, какая дата сейчас находится в верхней части экрана
          const containerTop = container.getBoundingClientRect().top;
          const groups = container.querySelectorAll<HTMLElement>('[data-date-title]');

          let currentStuckDate: string | null = null;
          groups.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.top <= containerTop + 80 && rect.bottom >= containerTop) {
              currentStuckDate = el.getAttribute('data-date-title');
            }
          });

          if (currentStuckDate) {
            setFloatingDateTitle(currentStuckDate);
          }

          // ⏱️ Если 2.5 секунды нет скролла -> плавно гасим плашку сверху
          scrollTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
          }, 2500);
        }}
      >
        {!ctx.messagesLoading && floatingDateTitle && (
          <div className={styles['floating-date-wrapper']}>
            <div
              className={styles['sticky-date']}
              style={{
                opacity: isScrolling ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              {floatingDateTitle}
            </div>
          </div>
        )}
        
        {ctx.messagesLoading ? (
          <div className={styles['skeleton-container']}>
            <div className={`${styles['skeleton-row']} ${styles['skeleton-incoming']}`}>
              <div className={styles['skeleton-avatar']} />
              <div className={`${styles['skeleton-bubble']} ${styles['skeleton-bubble-incoming']}`} style={{ width: '180px' }}>
                <div className={styles['skeleton-line']} style={{ width: '70%' }} />
                <div className={styles['skeleton-meta']} />
              </div>
            </div>
            <div className={`${styles['skeleton-row']} ${styles['skeleton-outgoing']}`}>
              <div className={`${styles['skeleton-bubble']} ${styles['skeleton-bubble-outgoing']}`} style={{ width: '240px' }}>
                <div className={`${styles['skeleton-line']} ${styles['skeleton-line-outgoing']}`} style={{ width: '90%' }} />
                <div className={`${styles['skeleton-line']} ${styles['skeleton-line-outgoing']}`} style={{ width: '50%' }} />
                <div className={styles['skeleton-meta']} />
              </div>
            </div>
          </div>
        ) : (
          groupedDays.map((dayGroup) => {
            // 🎯 Прозрачность 0 только для той даты в потоке, которая сейчас дублируется плавающей плашкой сверху при скролле
            const isCurrentSticky = isScrolling && floatingDateTitle === dayGroup.dateTitle;

            return (
              <div 
                key={dayGroup.dateKey} 
                className={styles['message-date-group']}
                data-date-title={dayGroup.dateTitle}
              >
                <div 
                  className={styles['chat-date-divider']}
                  style={{
                    opacity: isCurrentSticky ? 0 : 1,
                    transition: 'opacity 0.25s ease',
                  }}
                >
                  <div className={styles['chat-date-text']}>
                    {dayGroup.dateTitle}
                  </div>
                </div>

                {dayGroup.clusters.map((cluster) => {
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
                                    icon: <Copy size={16} />,
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
                  // Аватарка рендерится в беседах или в авторских постах канала (Скриншот 4)
                  const showAvatar = (isGroupChat && !cluster.isOutgoing) || (isChannel && cluster.isRenderAsAuthor);

                  return (
                    <div 
                      key={cluster.clusterId}
                      className={`${styles['sender-group-container']} ${
                        cluster.isOutgoing ? styles.outgoing : styles.incoming
                      }`}
                    >
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

                      <div className={styles['sender-messages-col']}>
                        {cluster.messages.map(({ msg, isFirstInGroup, isLastInGroup }) => {
                          const showSenderHeaderName = isFirstInGroup && (
                            isChannel 
                              ? cluster.isRenderAsAuthor 
                              : (isGroup && !cluster.isOutgoing)
                          );

                          // Подпись автора снизу: только если пост рендерится как от канала и в базе сохранился authorSignature
                          const resolvedSignature = isChannel && !cluster.isRenderAsAuthor
                            ? (
                                cluster.senderUserObj?.username ||
                                `${cluster.senderUserObj?.firstName || ''} ${cluster.senderUserObj?.lastName || ''}`.trim() ||
                                msg.authorSignature
                              )
                            : null;

                          const showBottomSignature = Boolean(resolvedSignature && msg.authorSignature);

                          return (
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
                                // ПК: правый клик мыши
                                onContextMenu={(e) => openMessageContextMenu(e, msg, cluster.isOutgoing)}
                                // Мобилка 1: Долгое удержание пальца (как в Telegram Android/iOS)
                                onTouchStart={(e) => handleTouchStart(e, msg, cluster.isOutgoing)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onTouchCancel={handleTouchEnd}
                                // Мобилка 2: Обычный тап пальцем на экранах <= 739px (если не сработало долгое нажатие)
                                onClick={(e) => {
                                  if (window.innerWidth <= 739) {
                                    if (isLongPressTriggeredRef.current) {
                                      isLongPressTriggeredRef.current = false;
                                      return;
                                    }
                                    openMessageContextMenu(e, msg, cluster.isOutgoing);
                                  }
                                }}
                              >
                                <div className={styles['message-bubble']}>
                                  <div className={styles['message-text']}>
                                    
                                    {/* 🎯 Рендерим имя только если выполняется условие */}
                                    {showSenderHeaderName && (
                                      <span 
                                        className={styles['group-msg-sender-name']} 
                                        style={{ 
                                          color: isChannel 
                                            ? '#5288c1' 
                                            : getNameColor(cluster.senderNameColor), 
                                          cursor: 'pointer' 
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          ctx.setShowUserModal(cluster.senderId);
                                        }}
                                      >
                                        {!isChannel && (() => {
                                          const badge = getUserStatusBadge(cluster.senderUserObj);
                                          return badge ? (
                                            <span title={badge.title} style={{ cursor: 'help', userSelect: 'none' }}>
                                              {badge.icon}
                                            </span>
                                          ) : null;
                                        })()}
                                        {cluster.senderDisplayName}
                                      </span>
                                    )}

                                    {renderMessageWithLinks(msg.text, (tag) => {
                                      // 1. Ищем среди каналов/чатов (по publicId, username или uniqueId)
                                      const targetChannelOrChat = (ctx.chats || []).find(
                                        (c: any) => c.publicId === tag || c.username === tag || c.uniqueId === tag
                                      );

                                      if (targetChannelOrChat) {
                                        // Если это канал/чат — открываем его профиль или переходим в него
                                        ctx.setShowUserModal(targetChannelOrChat.uuid || targetChannelOrChat.id);
                                        return;
                                      }

                                      // 2. Ищем среди пользователей
                                      const targetUser = (ctx.users || []).find(
                                        (u: any) => u.publicId === tag || u.username === tag || u.uniqueId === tag
                                      );

                                      if (targetUser) {
                                        ctx.setShowUserModal(targetUser.uuid || targetUser.id);
                                      } else {
                                        ctx.showToast?.(`Элемент @${tag} не найден`, 'info');
                                      }
                                    })}
                                  
                                    <span className={styles['message-meta']}>
                                      {/* Глазок с просмотрами в канале */}
                                      {isChannel && (
                                        <span 
                                          style={{ 
                                            display: 'inline-flex', 
                                            alignItems: 'center', 
                                            gap: '3px', 
                                            color: '#8e8e93', 
                                            fontSize: '11px', 
                                            marginRight: '6px'
                                          }}
                                        >
                                          <Eye size={13} />
                                          <span>{Array.isArray(msg.readBy) ? Math.max(1, msg.readBy.length) : (msg.views || 1)}</span>
                                        </span>
                                      )}

                                      {/* Подпись снизу в канале */}
                                      {showBottomSignature && (
                                        <span style={{ color: '#ffffff73', fontSize: '11px', marginRight: '5px' }}>
                                          {resolvedSignature},
                                        </span>
                                      )}

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
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
          )})
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

      {/* ======================================================== */}
      {/* ЗОНА ВВОДА СООБЩЕНИЙ                                     */}
      {/* ======================================================== */}
      {isChannelReadOnlyForUser ? (
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
        <form className={styles['chat-input-zone']} onSubmit={handleCustomSendMessage}>
          <button type="button" className={styles['input-action-btn']} disabled style={{ cursor: 'not-allowed' }}>
            <Paperclip color='#585757'/>
          </button>

          {/* Переключатель авторства в канале[cite: 37] */}
          {isChannel && (
            <div
              onClick={() => setShowSendAsModal(true)}
              title="Написать от имени..."
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                margin: 'auto 4px 9px',
                flexShrink: 0,
                borderRadius: '50%'
              }}
            >
              <SmartAvatar
                size={30}
                avatarUrl={sendAsType === 'user' ? ctx.currentUser?.avatarUrl : currentChatUser?.avatarUrl}
                avatarColor={sendAsType === 'user' ? (ctx.currentUser?.avatarColor || '#5865F2') : (currentChatUser?.avatarColor || '#9d7bf6')}
                name={sendAsType === 'user' ? (ctx.currentUser?.username || 'User') : currentChatUser?.name}
                isChannel={sendAsType === 'channel'}
              />
            </div>
          )}

          <textarea 
            ref={messageInputRef} 
            placeholder={inputPlaceholder}
            value={ctx.messageText}
            id="messageText-input"
            onChange={e => ctx.setMessageText(e.target.value)} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCustomSendMessage(e);
              }
            }}
            className={styles['main-message-input']} 
            autoComplete="off"
            rows={1}
          />
          
          <button type="submit" className={styles['send-message-btn']}>
            <Send color="#aaa8a8"/>
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

      <SendAsModal
        show={showSendAsModal}
        currentUserId={myId}
        currentUser={ctx.currentUser}
        currentChannel={currentChatUser}
        subscribersCount={currentChatUser?.memberCount || currentChatUser?.membersCount || 1}
        selectedType={sendAsType}
        onSelect={(t) => setSendAsType(t)}
        onClose={() => setShowSendAsModal(false)}
      />
    </main>
  );
}