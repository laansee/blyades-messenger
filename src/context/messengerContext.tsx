import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  ToastNotification, 
  ConfirmModal, 
  type ToastState, 
  type ConfirmState 
} from '../components/common/GlobalUI';
// import ProfileModal from '../components/profile/profileModal'; 
// import CallModal from '../features/calls/CallOverlay'; 

// Импортируем наши изолированные хуки логики
import { useCallsLogic } from './messenger/useCallsLogic';
import { useGroupChats } from './messenger/useGroupChats';
import { useRealtimeSubscription } from './messenger/useRealtimeSubscription';
import { useChatMessages } from './messenger/useChatMessages';
import { usePresence } from './messenger/usePresence';
import { userService } from '../services/userService';

const MessengerContext = createContext<any>(null);

export function MessengerProvider({ children }: { children: React.ReactNode }) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const [theme, setTheme] = useState('dark');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true); 
  const [chatsLoading, setChatsLoading] = useState(true);
  const [chats, setChats] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const activeChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const {
    messages: allMessages,
    setMessages: setAllMessages,
    messagesLoading,
    olderMessagesLoading,
    messagesError,
    hasMoreMessages,
    loadOlderMessages,
  } = useChatMessages(activeChatId);

  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState<any>(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [typingUser, setTypingUser] = useState(false);
  const [ctxMenu, setCtxMenu] = useState({ show: false, x: 0, y: 0, items: [] as any[] });
  const [showCallsHistoryModal, setShowCallsHistoryModal] = useState(false);
  
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'info',
  });
  const [confirm, setConfirm] = useState<ConfirmState>({
    show: false,
    title: '',
    text: '',
    isDanger: false,
    onConfirm: () => {},
  });
  const [users, setUsers] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const showConfirm = (
    title: string, 
    text: string, 
    onConfirm: () => void | Promise<void>, 
    isDanger = false
  ) => {
    setConfirm({ show: true, title, text, onConfirm, isDanger });
  };

  const closeContextMenu = () => setCtxMenu(prev => ({ ...prev, show: false }));

  const fetchAndMatchChats = React.useCallback(async () => {
    if (authLoading) return;

    if (!currentUser) {
      console.log("⚠️ [Chats_Debug] Пользователь не авторизован");
      return;
    }
    
    const { data: newsChannelData } = await supabase
      .from('chats')
      .select('*')
      .eq('id', 1)
      .single();

    const myIdStr = String(currentUser.uuid || currentUser.id);

    try {
      setChatsLoading(true);

      // 1. Получаем членство пользователя в комнатах
      const membershipsResult = await supabase
        .from('chat_members')
        .select('*')
        .eq('userId', myIdStr);

      if (membershipsResult.error) throw membershipsResult.error;

      const myMemberships = (membershipsResult.data ?? []).filter(
        (member: any) => !member.leftAt
      );

      const chatIds = [
        ...new Set(myMemberships.map((member: any) => Number(member.chatId))),
      ];

      if (chatIds.length === 0) {
        setChats([]);
        setUsers([]);
        setChatsLoading(false);
        return;
      }

      const [
        chatsResult,
        membersResult,
        contactsResult,
        whoAddedMeResult,
      ] = await Promise.all([
        supabase.from('chats').select('*').in('id', chatIds),
        supabase.from('chat_members').select('*').in('chatId', chatIds),
        supabase.from('contacts').select('*').eq('userId', myIdStr),
        supabase.from('contacts').select('userId').eq('contactId', myIdStr),
      ]);

      if (chatsResult.error) throw chatsResult.error;
      if (membersResult.error) throw membersResult.error;
      if (contactsResult.error) throw contactsResult.error;
      if (whoAddedMeResult.error) throw whoAddedMeResult.error;

      const chatRows = chatsResult.data ?? [];
      const members = (membersResult.data ?? []).filter((member: any) => !member.leftAt);
      const contacts = contactsResult.data ?? [];
      const whoAddedMe = whoAddedMeResult.data ?? [];

      setContacts(contacts);

      // 3. Собираем UUID всех участников для отображения никнеймов
      const allNeededUserIds = [
        ...new Set(members.map((m: any) => String(m.userId)))
      ];

      const usersList = await userService.getUsersByUuids(allNeededUserIds);
      setUsers(usersList);

      const currentActiveId = String(activeChatIdRef?.current || activeChatId || '');

      const formattedChats = chatRows
        .filter((chat: any) => {
          // Если это личный чат без сообщений, но прямо сейчас открыт пользователем — НЕ скрываем его!
          if (chat.type === 'direct' && chat.lastMessageId === null) {
            return String(chat.id) === currentActiveId;
          }
          return true;
        })
        .map((chat: any) => {
          const chatIdStr = String(chat.id);
          const isDirect = chat.type === 'direct';

          const membership = myMemberships.find(
            (member: any) => String(member.chatId) === chatIdStr
          );

          const partnerMembership = isDirect
            ? members.find(
                (member: any) => String(member.chatId) === chatIdStr && String(member.userId) !== myIdStr
              )
            : undefined;

          const partnerId = partnerMembership ? String(partnerMembership.userId) : undefined;
          
          const user = isDirect && partnerId 
            ? usersList.find((item: any) => String(item.uuid) === partnerId || String(item.id) === partnerId) 
            : undefined;

          const contact = isDirect && partnerId 
            ? contacts.find((item: any) => 
                String(item.contactId) === partnerId || 
                (user && String(item.contactId) === String(user.id)) ||
                (user && String(item.contactId) === String(user.uuid))
              ) 
            : undefined;

          const groupMembersCount = members.filter((m: any) => String(m.chatId) === chatIdStr).length;

          if (isDirect && user) {
            chat.name = userService.resolveDisplayName(user, {
              contact,
              isAmHisContact: whoAddedMe.some((item: any) => String(item.userId) === partnerId)
            });
          }

          const contactFirstName = isDirect && contact?.firstName && contact.firstName !== 'EMPTY' 
            ? contact.firstName 
            : '';
          const contactLastName = isDirect && contact?.lastName && contact.lastName !== 'EMPTY' 
            ? contact.lastName 
            : '';

          let resolvedName = chat.name || (isDirect ? 'Пользователь' : 'Беседа без названия');
          if (isDirect && contact && (contactFirstName || contactLastName)) {
            resolvedName = `${contactFirstName} ${contactLastName}`.trim();
          } else if (isDirect && user) {
            resolvedName = userService.resolveDisplayName(user, {
              contact,
              isAmHisContact: whoAddedMe.some((item: any) => String(item.userId) === partnerId)
            });
          }

          return {
            ...(isDirect ? user ?? {} : {}),
            id: chatIdStr, 
            chatId: chatIdStr,
            internalChatId: chatIdStr,
            partnerId,
            type: chat.type,
            name: resolvedName,
            firstName: (isDirect && contact && contactFirstName) ? contactFirstName : user?.firstName,
            lastName: (isDirect && contact && contactLastName) ? contactLastName : user?.lastName,
            isGroup: !isDirect,
            isChannel: chat.type === 'channel',
            memberCount: groupMembersCount,

            avatarUrl: isDirect ? user?.avatarUrl : chat.avatarUrl,
            avatarColor: (isDirect ? user?.avatarColor : chat.avatarColor) || '#5865F2',
            nameColor: user?.nameColor || '#007aff',
            aboutMe: isDirect ? user?.aboutMe || '' : chat.description || '',
            updatedAt: isDirect ? user?.updatedAt : chat.updatedAt,

            isContact: isDirect ? !!contact : false,
            isAmHisContact: isDirect ? whoAddedMe.some((item: any) => String(item.userId) === partnerId) : false,
            note: isDirect ? (contact?.note || '') : '',
            contactFirstName: isDirect ? contactFirstName : '',
            contactLastName: isDirect ? contactLastName : '',

            privacyPhone: user?.privacyPhone || 'all',
            privacyEmail: user?.privacyEmail || 'all',
            privacyOnline: user?.privacyOnline || 'all',
            privacyNameFormat: user?.privacyNameFormat || 'username',
            privacyFullName: user?.privacyFullName || 'all',

            ownerId: chat.createdBy || chat.ownerId,
            isPinned: membership?.isPinned ?? false,
            isArchived: membership?.isArchived ?? false,
            unreadCount: membership?.unreadCount ?? null,

            lastMessageId: chat.lastMessageId,
            lastMessageText: chat.lastMessageText,
            lastMessageSenderUUID: chat.lastMessageSenderUUID,
            lastMessageStatus: chat.lastMessageStatus || 'send',
            lastMessageType: chat.lastMessageType,
            lastMessageAt: chat.lastMessageAt,

            lastMessage: chat.lastMessageText ?? 'Нет сообщений',
            lastMessageTime: chat.lastMessageAt
              ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
          };
      });
      
      let finalChats = [...formattedChats];

      if (newsChannelData) {
        const newsChatObj: any = {
          id: String(newsChannelData.id),
          chatId: String(newsChannelData.id),
          internalChatId: String(newsChannelData.id),
          partnerId: undefined,
          type: 'channel',
          name: newsChannelData.name || 'Новости Blyades',
          isGroup: false,
          isChannel: true,
          memberCount: null,
          avatarUrl: newsChannelData.avatarUrl,
          avatarColor: newsChannelData.avatarColor || '#9d7bf6',
          nameColor: '#9d7bf6',
          aboutMe: newsChannelData.description || 'Официальный новостной канал',
          updatedAt: newsChannelData.updatedAt || newsChannelData.createdAt,
          isContact: false,
          isAmHisContact: false,
          note: '',
          contactFirstName: '',
          contactLastName: '',
          privacyPhone: 'all',
          privacyEmail: 'all',
          privacyOnline: 'all',
          privacyNameFormat: 'username',
          privacyFullName: 'all',
          iownerId: newsChannelData.createdBy || newsChannelData.ownerId,
          isPinned: true,
          isArchived: false,
          unreadCount: null,
          lastMessageSenderUUID: newsChannelData.lastMessageSenderUUID,
          lastMessageId: newsChannelData.lastMessageId,
          lastMessageText: newsChannelData.lastMessageText,
          lastMessageSenderId: newsChannelData.lastMessageSenderId,
          lastMessageType: newsChannelData.lastMessageType,
          lastMessageAt: newsChannelData.lastMessageAt,
          lastMessage: newsChannelData.lastMessageText ?? 'Добро пожаловать в новостной канал!',
          lastMessageTime: newsChannelData.lastMessageAt
            ? new Date(newsChannelData.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '',
        };

        // Проверяем, чтобы не сдублировался, и ставим на самое первое место
        finalChats = [
          newsChatObj,
          ...formattedChats.filter((c: any) => String(c.id) !== '1')
        ];
      }

      setChats(finalChats);
    } catch (error) {
      console.error('Ошибка загрузки списка чатов:', error);
    } finally {
      setChatsLoading(false);
    }
  }, [currentUser?.id, currentUser?.uuid, authLoading]);

  useEffect(() => {fetchAndMatchChats();}, [fetchAndMatchChats]);

  // 🚀 ПОДКЛЮЧАЕМ НАШИ МОДУЛЬНЫЕ ХУКИ
  const calls = useCallsLogic(currentUser, showToast);
  const groups = useGroupChats(currentUser, showToast, setActiveChatId, setActiveTab, fetchAndMatchChats);
  useRealtimeSubscription(
    currentUser,
    setAllMessages,
    activeChatId,
    setChats
  );

  const { onlineUserIds } = usePresence(currentUser);

  // Функция проверки: находится ли пользователь онлайн с учётом приватности
  const isUserOnline = React.useCallback((chatOrUser: any): boolean => {
    if (!chatOrUser) return false;
    if (chatOrUser.isGroup || chatOrUser.isChannel || chatOrUser.type === 'group' || chatOrUser.type === 'channel') {
      return false;
    }

    const myUuid = String(currentUser?.uuid || currentUser?.id || '');
    const targetUuid = String(
      chatOrUser.partnerId || 
      chatOrUser.uuid || 
      (chatOrUser.type === 'direct' ? chatOrUser.partnerId : chatOrUser.id) || 
      ''
    );

    if (!targetUuid || targetUuid === myUuid) return false;

    const privacy = chatOrUser.privacyOnline || 'all';
    if (privacy === 'none') return false;
    if (privacy === 'contacts' && !chatOrUser.isAmHisContact) return false;

    return onlineUserIds.has(targetUuid);
  }, [currentUser?.uuid, currentUser?.id, onlineUserIds]);

  useEffect(() => {
    const fetchSessionUser = async () => {
      const storedId = localStorage.getItem('blyades_user_id'); 
        if (!storedId) {
          setAuthLoading(false);
          return;
        }

      try {
        const user = await userService.getUserByIdentifier(storedId);
        if (!user) {
          localStorage.removeItem('blyades_user_id');
          setCurrentUser(null);
        } else {
          setCurrentUser(user);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setAuthLoading(false);
      }
    };
    fetchSessionUser();
  }, []);

  // 🚀 АВТОМАТИЧЕСКИЙ СБРОС СЧЁТЧИКОВ И ГАЛОК: Срабатывает при выборе любого чата!
  useEffect(() => {
    if (!activeChatId || !currentUser) return;

    const currentChat = chats.find((c: any) => String(c.id) === String(activeChatId));
    const isGroup = currentChat?.type === 'group' || currentChat?.isGroup;
    const isChannel = currentChat?.type === 'channel' || currentChat?.isChannel;

    // В каналах статус прочтения сообщений в базе не ведется
    if (isChannel) return;

    const markMessagesAsRead = async () => {
      try {
        const myIdStr = String(currentUser?.uuid);

        // Защита от запросов с невалидным UUID
        if (!myIdStr || myIdStr === 'null' || myIdStr === 'undefined') return;

        const numericRoomId = Number(activeChatId);
        if (isNaN(numericRoomId)) return;

        if (isGroup) {
          // ========================================================
          // 👥 СЦЕНАРИЙ А: ГРУППОВАЯ БЕСЕДЕ (Индивидуальные логи)
          // ========================================================
          setChats(prevChats => 
            prevChats.map(c => Number(c.id) === numericRoomId ? { ...c, unreadCount: 0 } : c)
          );
          
          const { data: currentRoomMsgs } = await supabase
            .from('messages')
            .select('id, senderId')
            .eq('chatId', numericRoomId);

          if (!currentRoomMsgs || currentRoomMsgs.length === 0) return;

          const foreignMessages = currentRoomMsgs.filter(m => String(m.senderId) !== myIdStr);
          if (foreignMessages.length === 0) return;

          const messageIdsToCheck = foreignMessages.map(m => Number(m.id));

          const { data: alreadyReadData } = await supabase
            .from('message_reads')
            .select('messageId')
            .eq('userId', myIdStr)
            .in('messageId', messageIdsToCheck);

          const alreadyReadIds = alreadyReadData ? alreadyReadData.map(r => Number(r.messageId)) : [];
          const newMessagesToMark = foreignMessages.filter(m => !alreadyReadIds.includes(Number(m.id)));

          if (newMessagesToMark.length > 0) {
            const readsToInsert = newMessagesToMark.map(m => ({
              messageId: Number(m.id),
              userId: myIdStr
            }));

            await supabase.from('message_reads').insert(readsToInsert);
            if (fetchAndMatchChats) fetchAndMatchChats();
          }
        } else {
          // 👤 В ЛИЧНЫХ ЧАТАХ (ЛС): Вычисляем имя комнаты
          await supabase
            .from('messages')
            .update({ status: 'read' })
            .eq('chatId', numericRoomId)
            .neq('senderId', myIdStr)
            .eq('status', 'send');
        }
      } catch (err) {
        console.error("Ошибка отметки сообщений прочитанными:", err);
      }
    };

    markMessagesAsRead();
  }, [activeChatId, currentUser, allMessages, fetchAndMatchChats]); // Пересчитываем в реалтайме при новых сообщениях!

  // 🚀 УМНАЯ ОТПРАВКА: Автоматически разделяет создание нового текста и РЕДАКТИРОВАНИЕ старого!
  const handleSendMessage = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !activeChatId || !currentUser) return;

    // 🎯 Теперь myId — это строковый UUID текущего пользователя
    const myId = String(currentUser.uuid || currentUser.id);
    const textToSend = messageText.trim();
    
    setMessageText('');

    const currentJoinedRoom = Number(activeChatId); 

    // ==========================================
    // ✏️ ФАЗА 1: РЕЖИМ РЕДАКТИРОВАНИЯ СООБЩЕНИЯ
    // ==========================================
    if (editingMessage) {
      const targetMessageId = editingMessage.id;
      
      // 1. Сбрасываем стейт редактирования, чтобы плашка ушла с экрана
      setEditingMessage(null);

      // 2. Оптимистично обновляем текст сообщения у себя на экране для мгновенного отклика
      setAllMessages((prev) => 
        prev.map(m => m.id === targetMessageId ? { ...m, text: textToSend, isEdited: true } : m)
      );

      // 3. Отправляем UPDATE-запрос в таблицу messages базы данных Supabase
      const { error } = await supabase
        .from('messages')
        .update({ 
          text: textToSend,
          isEdited: true // Ставим флаг, что сообщение отредактировано
        })
        .eq('id', targetMessageId);

      if (error) {
        showToast('Не удалось сохранить изменения', 'error');
        console.error('[Update_Error]', error.message);
      }
      return; // 🎯 Прерываем функцию, чтобы код не пошел создавать новое сообщение!
    }

    // ==========================================
    // ➕ ФАЗА 2: РЕЖИМ ОТПРАВКИ НОВОГО СООБЩЕНИЯ
    // ==========================================

    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const optimisticMessage = {
      id: tempId,
      chatId: String(currentJoinedRoom),
      senderId: myId,
      text: textToSend,
      status: 'sending',
      createdAt: new Date().toISOString()
    };

    setAllMessages((prev) => [...prev, optimisticMessage]);

    // 🚀 ВОТ СЮДА ВСТАВЛЯЕМ (между 499 и 501 строкой):
    setChats((prev) => {
      const chatIndex = prev.findIndex((c) => Number(c.id) === currentJoinedRoom);
      if (chatIndex === -1) return prev;

      const targetChat = {
        ...prev[chatIndex],
        lastMessageId: tempId,
        lastMessageText: textToSend,
        lastMessage: textToSend,
        lastMessageAt: nowIso,
        lastMessageSenderId: myId,
        lastMessageStatus: 'send', // 👈 Статус для отображения галочки
        lastMessageTime: new Date(nowIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const updated = [...prev];
      updated.splice(chatIndex, 1);
      return [targetChat, ...updated];
    });

    await supabase.from('messages').insert([{
      chatId: currentJoinedRoom,
      senderId: myId,
      text: textToSend,
      status: 'send'
    }]);
  };

  const handleCopyMessageText = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => showToast('Текст скопирован в буфер обмена! 📋', 'success'))
      .catch(() => showToast('Не удалось скопировать текст', 'error'));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleAddUsersToGroup = async (groupId: string, userIds: string[]) => {
    if (!currentUser || !groupId || userIds.length === 0) return;

    try {
      showToast('Добавление участников...', 'info');

      const rowsToInsert = userIds.map(id => ({
        chatId: groupId,
        userId: String(id)
      }));

      const { error: insertErr } = await supabase
        .from('chat_members')
        .insert(rowsToInsert);

      if (insertErr) throw insertErr;

      // 2. Вычисляем красивые приватные имена для системного уведомления в чате
      const userData = await userService.getUsersByUuids(userIds);     

      // Перебираем добавленных людей и шлём системные бабблы по центру
      if (userData) {
        for (const user of userData) {
          await supabase.from('messages').insert({
            chatId: groupId,
            senderId: '00000000-0000-0000-0000-000000000000',
            text: `{{user:${currentUser.uuid || currentUser.id}}} пригласил(а) {{user:${user.uuid || user.id}}} в беседу`,
            status: 'send'
          });
        }
      }

      showToast('Участники успешно добавлены! 👥', 'success');

      // 3. Реактивно обновляем сайдбары, чтобы пересчитать счётчики
      if (fetchAndMatchChats) {
        await fetchAndMatchChats();
      }

    } catch (err: any) {
      console.error('Ошибка добавления участников:', err);
      showToast(`Не удалось пригласить: ${err.message}`, 'error');
    }
  };

  const handleLeaveOrDeleteGroup = async (groupId: string, ownerId: string) => {
    if (!currentUser || !groupId) return;
    const myIdStr = String(currentUser.uuid);
    const isOwner = String(ownerId) === myIdStr;

    try {
      if (isOwner) {
        // --- СЦЕНАРИЙ А: ВЛАДЕЛЕЦ УДАЛЯЕТ БЕСЕДУ ДЛЯ ВСЕХ ---
        showToast('Удаление беседы со всеми данными...', 'info');

        // 1. Выжигаем все сообщения этой комнаты
        const { error: msgErr } = await supabase
          .from('messages')
          .delete()
          .eq('chatId', groupId);
        if (msgErr) throw msgErr;

        // 2. Очищаем список участников в связующей таблице
        const { error: partErr } = await supabase
          .from('chat_members')
          .delete()
          .eq('chatId', groupId);
        if (partErr) throw partErr;

        // 3. Удаляем саму комнату чата
        const { error: chatErr } = await supabase
          .from('chats')
          .delete()
          .eq('id', groupId);
        if (chatErr) throw chatErr;

        // Удаляем локально из стейта переписки
        setAllMessages((prev: any[]) => prev.filter(m => m.chatId !== groupId));
        showToast('Беседа успешно удалена для всех участников! 🗑️', 'success');

      } else {
        // --- СЦЕНАРИЙ Б: ОБЫЧНЫЙ ЮЗЕР ПРОСТО ПОКИДАЕТ ЧАТ ---
        showToast('Выход из беседы...', 'info');

        // 1. Удаляем строчку связи текущего пользователя с этой группой
        const { error: partErr } = await supabase
          .from('chat_members')
          .delete()
          .eq('chatId', groupId)
          .eq('userId', myIdStr);
        if (partErr) throw partErr;

        const { error: sysMsgErr } = await supabase
          .from('messages')
          .insert({
            chatId: groupId,
            senderId: '00000000-0000-0000-0000-000000000000',
            text: `{{user:${myIdStr}}} покинул(а) беседу`,
            status: 'send',
            createdAt: new Date().toISOString()
          });
        if (sysMsgErr) throw sysMsgErr;

        showToast('Вы успешно покинули беседу! 🚪', 'success');
      }

      // Общий финал: сбрасываем активный чат на заглушку
      setActiveChatId(null);
      
      // Перезапрашиваем актуальный список чатов с сервера
      if (fetchAndMatchChats) {
        await fetchAndMatchChats();
      }

    } catch (err: any) {
      console.error('Ошибка при выходе/удалении беседы:', err);
      showToast(`Не удалось выполнить действие: ${err.message}`, 'error');
    }
  };

  const handleKickUserFromGroup = async (groupId: string, targetUserId: string) => {
    if (!currentUser || !groupId || !targetUserId) return;

    try {
      showToast('Исключение участника...', 'info');

      const { error: deleteErr } = await supabase
        .from('chat_members')
        .delete()
        .eq('chatId', groupId)
        .eq('userId', String(targetUserId));

      if (deleteErr) throw deleteErr;

      // 2. Получаем имя исключённого для системного сообщения
      const targetUser = await userService.getUserByIdentifier(targetUserId);

      if (targetUser) {
        // Шлём системный баббл по центру
        await supabase.from('messages').insert({
          chatId: groupId,
          senderId: '00000000-0000-0000-0000-000000000000',
          text: `{{user:${currentUser.uuid || currentUser.id}}} исключил(а) {{user:${targetUserId}}} из беседы`,
          status: 'send'
        });
      }

      showToast('Пользователь исключён из беседы! 🚪', 'success');

      // 3. Реактивно обновляем список чатов
      if (fetchAndMatchChats) {
        await fetchAndMatchChats();
      }

    } catch (err: any) {
      console.error('Ошибка при исключении участника:', err);
      showToast(`Не удалось исключить: ${err.message}`, 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('blyades_user_id');
    window.location.reload();
  };

  // 🚀 Открытие существующего или создание нового прямого диалога с пользователем
  const openOrCreateDirectChat = async (targetUser: any) => {
    if (!currentUser || !targetUser) return;

    const myUuid = String(currentUser.uuid || currentUser.id || '');
    const targetUuid = String(
      targetUser.uuid || 
      targetUser.partnerId || 
      targetUser.contactId || 
      targetUser.id || 
      ''
    );

    if (!targetUuid || targetUuid === myUuid) return;

    try {
      // 1. Ищем существующий диалог среди локальных чатов
      const existingLocalChat = (chats || []).find((c: any) => {
        if (c.isGroup || c.type === 'group' || c.type === 'channel') return false;
        const pId = String(c.partnerId || c.uuid || '');
        return pId === targetUuid;
      });

      if (existingLocalChat) {
        setActiveChatId(String(existingLocalChat.id));
        if (activeChatIdRef) activeChatIdRef.current = String(existingLocalChat.id);
        setSearchQuery('');
        setShowUserModal(false);
        return;
      }

      // 🎯 2. Если в стейте нет — проверяем в таблице chat_members базы данных
      const { data: myMemberships } = await supabase
        .from('chat_members')
        .select('chatId')
        .eq('userId', myUuid);

      if (myMemberships && myMemberships.length > 0) {
        const myChatIds = myMemberships.map((m: any) => Number(m.chatId)).filter(Boolean);

        const { data: partnerMemberships } = await supabase
          .from('chat_members')
          .select('chatId, chats!inner(type)')
          .eq('userId', targetUuid)
          .in('chatId', myChatIds)
          .eq('chats.type', 'direct')
          .limit(1);

        if (partnerMemberships && partnerMemberships.length > 0) {
          const commonChatId = String(partnerMemberships[0].chatId);
          setActiveChatId(commonChatId);
          if (activeChatIdRef) activeChatIdRef.current = commonChatId;
          setSearchQuery('');
          setShowUserModal(false);
          if (fetchAndMatchChats) await fetchAndMatchChats();
          return;
        }
      }

      // 🎯 3. Создаем новую комнату в таблице chats
      const sortedPair = [myUuid, targetUuid].sort().join('_');
      const generatedUniqueId = `direct_${sortedPair}`;

      const { data: newChat, error: chatErr } = await supabase
        .from('chats')
        .insert({
          uniqueId: generatedUniqueId,
          type: 'direct',
          createdBy: myUuid,
          accessType: 'private'
        })
        .select()
        .single();

      if (chatErr) throw chatErr;

      // 4. Связываем обоих пользователей в таблице chat_members
      const { error: membersErr } = await supabase
        .from('chat_members')
        .insert([
          { chatId: newChat.id, userId: myUuid },
          { chatId: newChat.id, userId: targetUuid }
        ]);

      if (membersErr) throw membersErr;

      const savedContact = (contacts || []).find((c: any) => 
        String(c.contactId || c.partnerId || c.uuid) === targetUuid
      );
      const contactFullName = savedContact && (savedContact.firstName || savedContact.lastName)
        ? `${savedContact.firstName || ''} ${savedContact.lastName || ''}`.trim()
        : null;

      // 🎯 5. Создаем карточку чата для мгновенного отображения без ожидания
      const directChatCard = {
        ...targetUser,
        id: String(newChat.id),
        chatId: String(newChat.id),
        internalChatId: String(newChat.id),
        partnerId: targetUuid,
        uuid: targetUuid,
        type: 'direct',
        name: contactFullName || targetUser.name || targetUser.username || 'Пользователь',
        username: targetUser.username || targetUser.uniqueId,
        uniqueId: targetUser.uniqueId,
        isGroup: false,
        isChannel: false,
        memberCount: null,
        avatarUrl: targetUser.avatarUrl,
        avatarColor: targetUser.avatarColor || '#5865F2',
        updatedAt: targetUser.updatedAt || new Date().toISOString(),
        isContact: Boolean(savedContact || targetUser.isContact),
        lastMessage: 'Нет сообщений',
        lastMessageText: '',
        lastMessageAt: null,
        unreadCount: 0
      };

      // Добавляем в стейт и делаем активным
      if (activeChatIdRef) activeChatIdRef.current = String(newChat.id);
      setChats((prev: any[]) => [directChatCard, ...prev]);
      setActiveChatId(String(newChat.id));
      setSearchQuery('');
      setShowUserModal(false);
      
    } catch (err: any) {
      console.error('Ошибка при открытии/создании чата:', err);
      showToast(`Не удалось открыть чат: ${err.message}`, 'error');
    } finally {
      if (setChatsLoading) setChatsLoading(false);
    }
  };

  return (
    <MessengerContext.Provider
      value={{
        activeTab, setActiveTab,
        theme, setTheme,
        currentUser, setCurrentUser,
        chats, setChats,
        contacts, setContacts,
        allMessages, setAllMessages,
        activeChatId, setActiveChatId,
        searchQuery, setSearchQuery,
        messageSearchQuery, setMessageSearchQuery,
        showMsgSearch, setShowMsgSearch,
        messageText, setMessageText,
        editingMessage, setEditingMessage,
        showUserModal, setShowUserModal,
        showProfileMenu, setShowProfileMenu,
        typingUser, setTypingUser,
        ctxMenu, setCtxMenu,
        toast, setToast,
        confirm, setConfirm,
        onlineUserIds, isUserOnline,
        messagesEndRef, chatsLoading, authLoading,
        isNavOpen, setIsNavOpen, openOrCreateDirectChat,
        messagesLoading, olderMessagesLoading, messagesError,
        hasMoreMessages, loadOlderMessages, users,
        showToast, showConfirm, closeContextMenu,
        handleCopyMessageText, handleSendMessage,
        handleKeyDown, handleLogout,
        showCallsHistoryModal, setShowCallsHistoryModal,
        currentCall: calls.currentCall,
        setCurrentCall: calls.setCurrentCall,
        incomingCallData: calls.incomingCallData,
        setIncomingCallData: calls.setIncomingCallData,
        isCallMinimized: calls.isCallMinimized,
        setIsCallMinimized: calls.setIsCallMinimized,
        activeGroupCalls: calls.activeGroupCalls,
        handleStartAudioCall: calls.handleStartAudioCall,
        handleJoinExistingCall: calls.handleJoinExistingCall,
        handleAcceptCall: calls.handleAcceptCall,
        handleHangUp: calls.handleHangUp,
        handleCreateGroupChat: groups.handleCreateGroupChat,
        handleLeaveOrDeleteGroup, handleAddUsersToGroup,
        handleKickUserFromGroup
      }}
    >
      {children}

      {/* ==================================================== */}
      {/* 📞 НАТИВНОЕ ОКНО ЗВOНКОВ (ИСХОДЯЩИЕ И ВХОДЯЩИЕ)      */}
      {/* ==================================================== */}
      {/* {(calls.currentCall || calls.incomingCallData) && (
        <CallModal 
          currentCall={calls.currentCall} 
          setCurrentCall={calls.setCurrentCall}
          incomingCallData={calls.incomingCallData}
          setIncomingCallData={calls.setIncomingCallData}
        />
      )} */}

      {/* ===================================================== */}
      {/* 👤 ГЛАВНАЯ МОДАЛКА ПРОФИЛЕЙ (ЮЗЕРЫ, КОНТАКТЫ, ГРУППЫ) */}
      {/* ===================================================== */}
      {/* <ProfileModal /> */}

      {/* ==================================== */}
      {/* 🚀 ВЫЗОВ ТОСТА СЛОЕМ ПОВЕРХ ОКНА    */}
      {/* ==================================== */}
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999999 }}>
        <ToastNotification toast={toast} />
      </div>

      {/* ==================================== */}
      {/* 🚀 2. ВЫЗОВ  МОДAЛКИ ПОДТВЕРЖДЕНИЯ   */}
      {/* ==================================== */}
      <div style={{ position: 'fixed', zIndex: 888888 }}>
        <ConfirmModal confirm={confirm} setConfirm={setConfirm} />
      </div>
    </MessengerContext.Provider>
  );
}

export default function useMessengerContext() {
  return useContext(MessengerContext);
}

// 🚀 УМНЫЙ ПАРСЕР ОНЛАЙНА: Вычисляет точное время визита по канонам Telegram Premium
export function formatUserOnlineStatus(
  updatedAtString: string | undefined, 
  privacyOnline: string = 'all'
): { text: string; isOnline: boolean } {
  const defaultRes = { text: 'был(а) недавно', isOnline: false };
  if (!updatedAtString || privacyOnline === 'none') return defaultRes;
  
  try {
    const lastSeen = new Date(updatedAtString);
    const now = new Date();
    
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 1000 / 60);
    const safeMins = diffMins < 0 ? 0 : diffMins;

    // Меньше 1 минуты — пишем «был(а) только что»
    if (safeMins < 1) return { text: 'в сети', isOnline: true };

    const hoursStr = String(lastSeen.getHours()).padStart(2, '0');
    const minsStr = String(lastSeen.getMinutes()).padStart(2, '0');

    if (safeMins < 60) {
      const lastDigit = safeMins % 10;
      const lastTwoDigits = safeMins % 100;
      
      const minsWord = (lastDigit === 1 && lastTwoDigits !== 11)
        ? 'минуту'
        : ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits))
        ? 'минуты'
        : 'минут';
        
      return { text: `был(а) ${safeMins} ${minsWord} назад`, isOnline: false };
    }

    const diffHours = Math.floor(safeMins / 60);

    if (diffHours < 24 && lastSeen.getDate() === now.getDate() && lastSeen.getMonth() === now.getMonth() && lastSeen.getFullYear() === now.getFullYear()) {
      return { text: `был(а) сегодня в ${hoursStr}:${minsStr}`, isOnline: false };
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (lastSeen.getDate() === yesterday.getDate() && lastSeen.getMonth() === yesterday.getMonth() && lastSeen.getFullYear() === yesterday.getFullYear()) {
      return { text: `был(а) вчера в ${hoursStr}:${minsStr}`, isOnline: false };
    }

    const isCurrentYear = lastSeen.getFullYear() === now.getFullYear();
    if (isCurrentYear) {
      const dayAndMonth = lastSeen.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      return { text: `был(а) ${dayAndMonth}`, isOnline: false };
    } else {
      return { text: `был(а) ${lastSeen.toLocaleDateString('ru-RU')}`, isOnline: false };
    }
  } catch (e) {
    console.error('Ошибка парсинга онлайна:', e);
    return defaultRes;
  }
}
