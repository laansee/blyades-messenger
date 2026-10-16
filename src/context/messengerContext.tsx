import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { ToastNotification, ConfirmModal } from '../components/GlobalUI'; 
import ProfileModal from '../components/profile/profileModal'; 
import CallModal from '../features/calls/callOverlay'; 

// Импортируем наши изолированные хуки логики
import { useCallsLogic } from './messenger/useCallsLogic';
import { useGroupChats } from './messenger/useGroupChats';
import { useRealtimeSubscription } from './messenger/useRealtimeSubscription';

const MessengerContext = createContext<any>(null);

export function MessengerProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState('chats');
  const [theme, setTheme] = useState('dark');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [chats, setChats] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // 🚀 АВТОМАТИЧЕСКИЙ СБРОС СЧЁТЧИКОВ И ГАЛОК: Срабатывает при выборе любого чата!
  useEffect(() => {
    if (!activeChatId || !currentUser) return;

    const myIdStr = String(currentUser.id);
    const isGroup = String(activeChatId).startsWith('group_');

    const markMessagesAsRead = async () => {
      try {
        if (isGroup) {
          // 👥 В БЕСЕДЕ: Переводим все чужие сообщения этой группы из 'send' в 'read'
          await supabase
            .from('messages')
            .update({ status: 'read' })
            .eq('chatId', activeChatId)
            .not('senderId', 'eq', myIdStr) // 🎯 ВАЖНО: Не читаем свои собственные сообщения!
            .eq('status', 'send');
        } else {
          // 👤 В ЛИЧНЫХ ЧАТАХ (ЛС): Вычисляем имя комнаты
          const currentJoinedRoom = Number(myIdStr) < Number(activeChatId) 
            ? `${myIdStr}_${activeChatId}` 
            : `${activeChatId}_${myIdStr}`;

          await supabase
            .from('messages')
            .update({ status: 'read' })
            .eq('chatId', currentJoinedRoom)
            .not('senderId', 'eq', myIdStr)
            .eq('status', 'send');
        }
      } catch (err) {
        console.error('Ошибка сброса счётчиков в базе:', err);
      }
    };

    markMessagesAsRead();
  }, [activeChatId, currentUser, allMessages]); // Пересчитываем в реалтайме при новых сообщениях!

  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState<any>(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [typingUser, setTypingUser] = useState(false);
  const [ctxMenu, setCtxMenu] = useState({ show: false, x: 0, y: 0, items: [] as any[] });
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' as 'info' | 'success' | 'error' | 'warning' });
  const [confirm, setConfirm] = useState({ show: false, title: '', text: '', onConfirm: () => {}, isDanger: false });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const showConfirm = (title: string, text: string, onConfirm: () => void, isDanger = false) => {
    setConfirm({ show: true, title, text, onConfirm, isDanger });
  };

  const closeContextMenu = () => setCtxMenu(prev => ({ ...prev, show: false }));

  // 🚀 ПОДКЛЮЧАЕМ НАШИ МОДУЛЬНЫЕ ХУКИ
  const calls = useCallsLogic(currentUser, showToast);
  const groups = useGroupChats(currentUser, showToast, setActiveChatId, setActiveTab);
  useRealtimeSubscription(currentUser, setAllMessages);

  useEffect(() => {
    if (!currentUser?.id) return;

    const sendHeartbeatPulse = async () => {
      await supabase
        .from('users')
        .update({ updatedAt: new Date().toISOString() })
        .eq('id', currentUser.id);
    };

    // Шлём первый импульс сразу при загрузке
    sendHeartbeatPulse();

    // Настраиваем бесконечный цикл на 30 секунд
    const pulseInterval = setInterval(sendHeartbeatPulse, 30000);
    
    return () => clearInterval(pulseInterval);
  }, [currentUser?.id]);

  useEffect(() => {
    // АВТОРИЗАЦИЯ: Холодный старт профиля из сессии
    const fetchSessionUser = async () => {
      const storedId = localStorage.getItem('blyades_user_id');
      if (!storedId) {
        setCurrentUser(null);
        return;
      }
      const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', storedId)
      .single();

      if (!error && data)
        setCurrentUser(data);
      else {
        // Если в базе юзер был удален админом, чистим сессию
        localStorage.removeItem('blyades_user_id');
        setCurrentUser(null);
      }
    };
    fetchSessionUser();
    
    // Накатываем холодную выгрузку всей истории сообщений для прогрева кэша
    const fetchHistory = async () => {
      const { data } = await supabase.from('messages').select('*').order('id', { ascending: true });
      if (data) setAllMessages(data);
    };
    fetchHistory();
  }, []);

  const fetchAndMatchChats = React.useCallback(async () => {
    if (!currentUser) return;
    const myId = String(currentUser.id);

    const { data: myContacts } = await supabase.from('contacts').select('*').eq('userId', myId);
    const { data: allUsers } = await supabase.from('users').select('*');
    const { data: myGroupMemberships } = await supabase.from('group_members').select('chatId').eq('userId', myId);

    const joinedGroupIds = myGroupMemberships ? myGroupMemberships.map(m => m.chatId) : [];

    let activeGroups: any[] = [];
    if (joinedGroupIds.length > 0) {
      const { data: groupsData } = await supabase.from('group_chats').select('*').in('id', joinedGroupIds);
      if (groupsData) activeGroups = groupsData;
    }

    if (allUsers) {
      // А. Форматируем личные чаты
      const formattedPersonalChats = allUsers
        .filter((u: any) => String(u.id).trim() !== myId.trim())
        .map((u: any) => {
          const contactMeta = myContacts?.find((c: any) => String(c.contactId).trim() === String(u.id).trim());
          const isContact = !!contactMeta;

          let calculatedName = u.username;
          if (isContact) {
            calculatedName = `${contactMeta.firstName || ''} ${contactMeta.lastName || ''}`.trim() || u.username;
          } else if (u.privacyNameFormat === 'full_name' && (u.firstName || u.lastName)) {
            calculatedName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
          }

          const partnerId = String(u.id);
          const roomName = Number(myId) < Number(partnerId) ? `${myId}_${partnerId}` : `${partnerId}_${myId}`;
          const roomMessages = allMessages.filter(m => m.chatId === roomName);
          const lastMsg = roomMessages[roomMessages.length - 1];

          return {
            id: String(u.id),
            username: u.username,
            uniqueId: u.uniqueId,
            name: calculatedName,
            nameColor: u.nameColor || '#007aff',
            avatarColor: u.avatarColor || '#007aff',
            avatarUrl: u.avatarUrl,
            isContact: isContact,
            isGroup: false,
            phone: u.phone || '',
            email: u.email || '',
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            privacyPhone: u.privacyPhone || 'all',
            privacyEmail: u.privacyEmail || 'all',
            privacyOnline: u.privacyOnline || 'all',
            privacyNameFormat: u.privacyNameFormat || 'username',
            privacyFullName: u.privacyFullName || 'all',
            lastMessage: lastMsg ? lastMsg.text : 'Нет сообщений',
            lastMessageTime: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
          };
        });

      // Б. 👥 Форматируем групповые чаты (беседы) С ЖЕЛЕЗНЫМ ВЫЧИСЛЕНИЕМ КОМНАТЫ
      const formattedGroupChats = activeGroups.map((g: any) => {
        const roomMessages = allMessages.filter(m => m.chatId === g.id);
        const lastMsg = roomMessages[roomMessages.length - 1];

        return {
          id: g.id, 
          name: g.name, 
          avatarColor: g.avatarColor || '#5865F2',
          isGroup: true, 
          ownerId: g.ownerId,
          lastMessage: lastMsg ? lastMsg.text : 'Нет сообщений',
          lastMessageTime: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        };
      });

      setChats([...formattedPersonalChats, ...formattedGroupChats]);
      setChatsLoading(false);
    } else {
      setChatsLoading(false);
    }
  }, [currentUser, allMessages]);

  useEffect(() => {fetchAndMatchChats();}, [fetchAndMatchChats]);

  // 🚀 УМНАЯ ОТПРАВКА: Автоматически разделяет создание нового текста и РЕДАКТИРОВАНИЕ старого!
  const handleSendMessage = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !activeChatId || !currentUser) return;

    const myId = String(currentUser.id);
    const partnerId = String(activeChatId);
    const textToSend = messageText.trim();
    
    // Очищаем инпут сразу
    setMessageText('');

    const isGroupChat = partnerId.startsWith('group_');
    const currentJoinedRoom = isGroupChat 
      ? partnerId 
      : (Number(myId) < Number(partnerId) ? `${myId}_${partnerId}` : `${partnerId}_${myId}`);

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

    const optimisticMessage = {
      id: tempId,
      chatId: currentJoinedRoom,
      senderId: myId,
      text: textToSend,
      status: 'sending',
      createdAt: new Date().toISOString()
    };

    setAllMessages((prev) => [...prev, optimisticMessage]);

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

      // 1. Формируем массив объектов для вставки в связующую таблицу group_members
      const rowsToInsert = userIds.map(id => ({
        chatId: groupId,
        userId: String(id)
      }));

      const { error: insertErr } = await supabase
        .from('group_members')
        .insert(rowsToInsert);

      if (insertErr) throw insertErr;

      // 2. Вычисляем красивые приватные имена для системного уведомления в чате
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds);      

      const showFullName = currentUser?.privacyNameFormat === 'full_name';
      const hasNamesFilled = (currentUser?.firstName && currentUser.firstName.trim() !== '') || 
                              (currentUser?.lastName && currentUser.lastName.trim() !== '');

      const inviterName = (showFullName && hasNamesFilled)
        ? `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim()
        : (currentUser?.username && currentUser.username.trim() !== '' ? currentUser.username : `@${currentUser?.uniqueId}`);

      
      // Перебираем добавленных людей и шлём системные бабблы по центру
      if (userData) {
        for (const user of userData) {
          const showFullName = user.privacyNameFormat === 'full_name';
          const hasNamesFilled = (user.firstName && user.firstName.trim() !== '') || 
                                 (user.lastName && user.lastName.trim() !== '');

          const invitedName = (showFullName && hasNamesFilled)
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
            : (user.username && user.username.trim() !== '' ? user.username : `@${user.uniqueId}`);

          await supabase.from('messages').insert({
            chatId: groupId,
            senderId: 'system',
            text: `<b>${inviterName}</b> пригласил(а) <b>${invitedName}</b> в беседу`,
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
    const myIdStr = String(currentUser.id);
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
          .from('group_members')
          .delete()
          .eq('chatId', groupId);
        if (partErr) throw partErr;

        // 3. Удаляем саму комнату чата
        const { error: chatErr } = await supabase
          .from('group_chats')
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
          .from('group_members')
          .delete()
          .eq('chatId', groupId)
          .eq('userId', myIdStr);
        if (partErr) throw partErr;

        const showFullName = currentUser?.privacyNameFormat === 'full_name';
        const hasNamesFilled = (currentUser?.firstName && currentUser.firstName.trim() !== '') || 
                               (currentUser?.lastName && currentUser.lastName.trim() !== '');

        const systemDisplayName = (showFullName && hasNamesFilled)
          ? `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim()
          : (currentUser?.username && currentUser.username.trim() !== '' ? currentUser.username : `@${currentUser?.uniqueId}`);

        const { error: sysMsgErr } = await supabase
          .from('messages')
          .insert({
            chatId: groupId,
            senderId: 'system', // Твой системный тег рендера по центру
            text: `<b>${systemDisplayName}</b> покинул(а) беседу`,
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

      // 1. Удаляем запись из таблицы group_members
      const { error: deleteErr } = await supabase
        .from('group_members')
        .delete()
        .eq('chatId', groupId)
        .eq('userId', String(targetUserId));

      if (deleteErr) throw deleteErr;

      // 2. Получаем имя исключённого для системного сообщения
      const { data: targetUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', targetUserId)
        .single();

      const showFullName = currentUser?.privacyNameFormat === 'full_name';
      const hasNamesFilled = (currentUser?.firstName && currentUser.firstName.trim() !== '') || 
                              (currentUser?.lastName && currentUser.lastName.trim() !== '');

      const adminName = (showFullName && hasNamesFilled)
        ? `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim()
        : (currentUser?.username && currentUser.username.trim() !== '' ? currentUser.username : `@${currentUser?.uniqueId}`);
      
      if (targetUser) {
        const showFullName = targetUser.privacyNameFormat === 'full_name';
        const hasNamesFilled = (targetUser.firstName && targetUser.firstName.trim() !== '') || 
                               (targetUser.lastName && targetUser.lastName.trim() !== '');

        const kickedName = (showFullName && hasNamesFilled)
          ? `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim()
          : (targetUser.username && targetUser.username.trim() !== '' ? targetUser.username : `@${targetUser.uniqueId}`);

        // Шлём системный баббл по центру
        await supabase.from('messages').insert({
          chatId: groupId,
          senderId: 'system',
          text: `<b>${adminName}</b> исключил(а) <b>${kickedName}</b> из беседы`,
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

  return (
    <MessengerContext.Provider
      value={{
        activeTab, setActiveTab,
        theme, setTheme,
        currentUser, setCurrentUser,
        chats, setChats,
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
        messagesEndRef, chatsLoading,
        showToast, showConfirm, closeContextMenu,
        handleCopyMessageText, handleSendMessage,
        handleKeyDown, handleLogout,
        currentCall: calls.currentCall,
        setCurrentCall: calls.setCurrentCall,
        incomingCallData: calls.incomingCallData,
        setIncomingCallData: calls.setIncomingCallData,
        handleStartAudioCall: calls.handleStartAudioCall,
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
      {(calls.currentCall || calls.incomingCallData) && (
        <CallModal 
          currentCall={calls.currentCall} 
          setCurrentCall={calls.setCurrentCall}
          incomingCallData={calls.incomingCallData}
          setIncomingCallData={calls.setIncomingCallData}
        />
      )}

      {/* ===================================================== */}
      {/* 👤 ГЛАВНАЯ МОДАЛКА ПРОФИЛЕЙ (ЮЗЕРЫ, КОНТАКТЫ, ГРУППЫ) */}
      {/* ===================================================== */}
      <ProfileModal />
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
export function formatUserOnlineStatus(updatedAtString: string | undefined, privacyOnline: string = 'all'): string {
  if (!updatedAtString || privacyOnline === 'none') return 'был(а) недавно';
  
  try {
    const lastSeen = new Date(updatedAtString);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 1000 / 60);

    // 🎯 ШАГ 1: Если активность была меньше минуты назад — пользователь железно в сети!
    if (diffMins < 1) return 'в сети';

    // Если выставлена приватность "Только контакты", а логики проверки связи здесь нет,
    // можно вернуть базовый расчет, но если юзер скрыл онлайн полностью, отсечка сработает выше.
    if (diffMins < 60) {
      // Склонение минут
      const minsWord = diffMins % 10 === 1 && diffMins % 100 !== 11 
        ? 'минуту' 
        : [2, 3, 4].includes(diffMins % 10) && ![12, 13, 14].includes(diffMins % 100)
        ? 'минуты' 
        : 'минут';
      return `был(а) в сети ${diffMins} ${minsWord} назад`;
    }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24 && lastSeen.getDate() === now.getDate()) {
      const hoursStr = String(lastSeen.getHours()).padStart(2, '0');
      const minsStr = String(lastSeen.getMinutes()).padStart(2, '0');
      return `был(а) в сети сегодня в ${hoursStr}:${minsStr}`;
    }

    // Если был вчера
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (lastSeen.getDate() === yesterday.getDate() && lastSeen.getMonth() === yesterday.getMonth() && lastSeen.getFullYear() === yesterday.getFullYear()) {
      const hoursStr = String(lastSeen.getHours()).padStart(2, '0');
      const minsStr = String(lastSeen.getMinutes()).padStart(2, '0');
      return `был(а) в сети вчера в ${hoursStr}:${minsStr}`;
    }

    // Более старый визит
    return `был(а) в сети ${lastSeen.toLocaleDateString('ru-RU')} в ${String(lastSeen.getHours()).padStart(2, '0')}:${String(lastSeen.getMinutes()).padStart(2, '0')}`;
  } catch (e) {
    return 'был(а) недавно ZZZ';
  }
}
