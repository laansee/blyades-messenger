import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { ToastNotification, ConfirmModal } from '../components/GlobalUI'; 
import ProfileModal from '../components/profile-modal'; 
import CallModal from '../components/call-overlay'; 

// Импортируем наши изолированные хуки логики
import { useCallsLogic } from './messenger/useCallsLogic';
import { useGroupChats } from './messenger/useGroupChats';
import { useRealtimeSubscription } from './messenger/useRealtimeSubscription';

const MessengerContext = createContext<any>(null);

export function MessengerProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState('chats');
  const [theme, setTheme] = useState('dark');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
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

  // 1. АВТОРИЗАЦИЯ: Холодный старт профиля из сессии
  useEffect(() => {
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
  }, []);

  // Накатываем холодную выгрузку всей истории сообщений для прогрева кэша
  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase.from('messages').select('*').order('id', { ascending: true });
      if (data) setAllMessages(data);
    };
    fetchHistory();
  }, []);

  // 👥 2 & 4. МОНОЛИТНАЯ И БЕЗОШИБОЧНАЯ СБОРКА САЙДБАРА (ЛИЧНЫЕ ЧАТЫ + БЕСЕДЫ)
  useEffect(() => {
    if (!currentUser) return;

    const fetchAndMatchChats = async () => {
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
              avatarColor: u.avatarColor || '#007aff',
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
          // 🎯 ИСПРАВЛЕНИЕ: Чат-комната группы — это строго её собственный g.id!
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
      }
    };

    fetchAndMatchChats();
  }, [currentUser, allMessages]);

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
      status: 'sent'
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
        closeContextMenu,
        toast, setToast,
        confirm, setConfirm,
        messagesEndRef,
        showToast, showConfirm,
        handleCopyMessageText, handleSendMessage,
        handleKeyDown, handleLogout,
        currentCall: calls.currentCall,
        setCurrentCall: calls.setCurrentCall,
        incomingCallData: calls.incomingCallData,
        setIncomingCallData: calls.setIncomingCallData,
        handleStartAudioCall: calls.handleStartAudioCall,
        handleAcceptCall: calls.handleAcceptCall,
        handleHangUp: calls.handleHangUp,
        handleCreateGroupChat: groups.handleCreateGroupChat
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
