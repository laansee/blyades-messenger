import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { ToastNotification, ConfirmModal } from '../components/GlobalUI';
import ProfileModal from '../components/profile-modal';
import { Room } from 'livekit-client';
import CallOverlay from '../components/call-overlay';
import * as jose from 'jose'; 
import IncomingCallModal from '../components/incoming-call-modal';

const MessengerContext = createContext<any>(null);

export function MessengerProvider({ children }: { children: React.ReactNode }) {

  const [currentCall, setCurrentCall] = useState<{ roomName: string; token: string } | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<any | null>(null);

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
  const [dropdown, setDropdown] = useState({ 
    show: false, x: 0, y: 0, items: [] as any[] });


  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [confirm, setConfirm] = useState({ show: false, title: '', text: '', onConfirm: () => {}, isDanger: false });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // const channelRef = useRef<any>(null); // 🚀 ТЕПЕРЬ ОН ЖИВЕТ ЗДЕСЬ!

  const [ctxMenu, setCtxMenu] = useState({ show: false, x: 0, y: 0, items: [] as any[] });
  const closeContextMenu = () => setCtxMenu(prev => ({ ...prev, show: false }));

  // Подгружаем профиль вошедшего юзера
  useEffect(() => {
    const myId = localStorage.getItem('blyades_user_id');
    if (myId) {
      supabase.from('users').select('*').eq('id', myId).single().then(({ data }) => {
        if (data) setCurrentUser(data);
      });
    }
  }, []);

  // 🚀 ПОДГРУЖАЕМ СПИСОК КОНТАКТОВ ИЗ ТВОЕЙ ТАБЛИЦЫ contacts
  useEffect(() => {
    if (!currentUser) return;

    const fetchMyContacts = async () => {
      // 1. Берем все контакты текущего авторизованного пользователя
      const { data: myContacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('userId', String(currentUser.id));

      if (contactsError) {
        console.error('Ошибка загрузки контактов:', contactsError.message);
        return;
      }

      // 2. Берем вообще всех пользователей из таблицы users для мэтчинга данных
      const { data: allUsers } = await supabase.from('users').select('*');

      if (allUsers) {
        const formattedChats = allUsers.map(u => {
          // Ищем, есть ли этот пользователь у нас в контактах (чтобы подтянуть кастомные Имя/Фамилию/Заметку)
          const contactMeta = myContacts?.find(c => {
            // Принудительно приводим оба ID к строке, отрезаем лишние пробелы и сравниваем значения
            return String(c.contactId).trim() === String(u.id).trim();
          });
          const isContact = !!contactMeta;

          // 🚀 ЛОГИКА ПРИВАТНОСТИ ИМЕНИ ДЛЯ НЕ-КОНТАКТОВ:
          let calculatedName = u.username;

          if (isContact) {
            // Сценарий A: Пользователь в контактах — берем наше кастомное имя из записной книжки
            calculatedName = `${contactMeta.firstName || ''} ${contactMeta.lastName || ''}`.trim() || u.username;
          } else {
            // Сценарий B: Пользователя НЕТ в контактах — подчиняемся ЕГО настройкам приватности из базы
            if (u.privacyNameFormat === 'full_name' && (u.firstName || u.lastName)) {
              calculatedName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
            } else {
              calculatedName = u.username;
            }
          }

          return {
            id: String(u.id),
            username: u.username,
            uniqueId: u.uniqueId,
            name: calculatedName,
            
            // Данные профиля из таблицы users
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            email: u.email || '',
            phone: u.phone || '',
            avatarColor: u.avatarColor || '#007aff',
            
            // Настройки приватности конкретного пользователя
            privacyPhone: u.privacyPhone || 'all',
            privacyEmail: u.privacyEmail || 'all',
            privacyFullName: u.privacyFullName || 'all',
            privacyNameFormat: u.privacyNameFormat || 'username',
            privacySearch: u.privacySearch || 'all', 

            // Кастомные метаданные из нашей записной книжки (contacts)
            isContact: isContact, 
            contactFirstName: contactMeta?.firstName || '',
            contactLastName: contactMeta?.lastName || '',
            note: contactMeta?.note || '',

            online: false,
            lastMessage: 'Нет сообщений',
            lastMessageTime: '',
            unreadCount: 0
          };
        });

        setChats(formattedChats);
      }
    };

    fetchMyContacts();
  }, [currentUser]);
  
  // 🚀 2. ЕДИНСТВЕННЫЙ И НЕУБИВАЕМЫЙ СТРИМ СООБЩЕНИЙ В СИСТЕМЕ (ЗАМЕНЯЕМ ВСЁ ОСТАЛЬНОЕ)
  useEffect(() => {
    // Сначала загружаем историю из базы данных с маленькой буквы
    supabase.from('messages').select('*').then(({ data }) => {
      if (data) setAllMessages(data);
    });

    // 2. Создаем уникальное имя канала для каждого рендера, чтобы они не сталкивались в памяти сокетов
    const uniqueChannelName = `messages-stream-${Math.floor(Math.random() * 100000)}`;

    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'messages' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAllMessages(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            // Заменяем старое сообщение на измененное (с новыми text и isEdited)
            setAllMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
          } else if (payload.eventType === 'DELETE') {
            setAllMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      );

    channel.subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  

  const handleSendMessage = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !currentUser || !activeChatId) return;

    const myId = String(currentUser.id);
    const partnerId = String(activeChatId);
    const currentJoinedRoom = Number(myId) < Number(partnerId) ? `${myId}_${partnerId}` : `${partnerId}_${myId}`;

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (editingMessage) {
      await supabase
        .from('messages')
        .update({ 
          text: messageText, 
          isEdited: true,
          status: editingMessage.status
        })
        .eq('id', editingMessage.id);
      setEditingMessage(null);
    } else {
      await supabase.from('messages').insert([{
        chatId: currentJoinedRoom,
        senderId: myId,
        text: messageText,
        status: 'sent'
      }]);
    }
    setMessageText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleCopyMessageText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Текст скопирован!', 'success');
  };

  const showToast = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const showConfirm = (
    title: string, text: string, onConfirm: () => void, isDanger = false
  ) => {setConfirm({ show: true, title, text, onConfirm, isDanger });};

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  // Фильтр сообщений для окна чата с учетом поискового запроса
  const filteredMessages = allMessages.filter(m => {
    if (!showMsgSearch || !messageSearchQuery.trim()) return true;
    return m.text.toLowerCase().includes(messageSearchQuery.toLowerCase());
  });

  // 🚀 НАДЕЖНЫЙ СТАРТ ЗВОНКА НА СВЕРХЛЕГКОМ ДВИЖКЕ JOSE
  const handleStartAudioCall = async (targetPartnerId: string) => {
    if (!currentUser) return;
    
    const myIdStr = String(currentUser.id);
    const partnerIdStr = String(targetPartnerId);
    const roomName = Number(myIdStr) < Number(partnerIdStr) 
      ? `call_${myIdStr}_${partnerIdStr}` 
      : `call_${partnerIdStr}_${myIdStr}`;

    showToast('Инициализация защищенного WebRTC канала...', 'info');

    try {
      // 🎯 ВСТАВЛЯЕМ КЛЮЧИ НАПРЯМУЮ, ЧТОБЫ ВИТЕ ИХ НЕ СКРЫЛ ПРИ СБОРКЕ ДЛЯ БРАУЗЕРА:
      const apiKey = "APIdub3CsA3TNJE";
      const apiSecret = "CptL3A3BQjVaaFzG9f0hbtz23YfQvVuB0cerptM1UbyA";

      // 1. Переводим строку секретного ключа в бинарный буфер для криптографии SHA-256
      const secretBuffer = new TextEncoder().encode(apiSecret);

      // 2. Собираем и подписываем JWT токен строго по официальному протоколу LiveKit
      const validToken = await new jose.SignJWT({
        video: { roomJoin: true, room: roomName, audio: true, video: false },
        name: currentUser.username,
      })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuer(apiKey)
        .setSubject(currentUser.username)
        .setExpirationTime('1h') // Срок жизни токена — 1 час
        .sign(secretBuffer);

      // 3. Запускаем оверлей звонка — токен теперь на 100% валидный!
      setCurrentCall({ roomName, token: validToken });

      // 🚀 ПУБЛИКУЕМ ЗВЕНО ВЫЗОВА В БАЗУ ДАННЫХ ДЛЯ СОБЕСЕДНИКА
      await supabase.from('calls').insert([{
        roomName,
        token: validToken,
        callerId: myIdStr,
        receiverId: partnerIdStr,
        status: 'ringing'
      }]);

      // 🚀 REALTIME-ПОТОК ДЛЯ ПЕРЕХВАТА ВХОДЯЩИХ ЗВOНКOВ
      useEffect(() => {
        if (!currentUser) return;

        const myIdStr = String(currentUser.id);

        const callsChannel = supabase
          .channel('global-calls-stream')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'calls' },
            (payload) => {
              const call = payload.new as any;
              const oldCall = payload.old as any;

              // 📞 СЦЕНАРИЙ 1: Нам кто-то звонит (INSERT)
              if (payload.eventType === 'INSERT' && String(call.receiverId) === myIdStr && call.status === 'ringing') {
                // Ищем данные звонящего, чтобы показать его имя на экране
                const callerUser = chats.find(c => String(c.id) === String(call.callerId));
                setIncomingCallData({ ...call, callerName: callerUser?.name || 'Неизвестный контакт' });
              }

              // ❌ СЦЕНАРИЙ 2: Звонящий сбросил вызов до того, как мы взяли трубку (UPDATE на rejected/ended или DELETE)
              if (payload.eventType === 'UPDATE' && String(call.receiverId) === myIdStr && (call.status === 'rejected' || call.status === 'ended')) {
                setIncomingCallData(null);
              }
              if (payload.eventType === 'DELETE') {
                setIncomingCallData(null);
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(callsChannel);
        };
      }, [currentUser, chats]);


    } catch (err) {
      console.error('🔴 Критическая ошибка WebRTC соединения jose:', err);
      showToast('Не удалось запустить аудиодвижок', 'error');
    }
  };

  return (
    <>
      <MessengerContext.Provider value={{
        activeTab, setActiveTab, theme, setTheme, currentUser, setCurrentUser, chats, setChats,
        allMessages, setAllMessages, activeChatId, setActiveChatId, searchQuery, setSearchQuery,
        messageSearchQuery, setMessageSearchQuery, showMsgSearch, setShowMsgSearch,
        messageText, setMessageText, editingMessage, setEditingMessage, showUserModal, setShowUserModal,
        showProfileMenu, setShowProfileMenu, typingUser, toast, setToast, confirm, setConfirm,
        messagesEndRef, ctxMenu, setCtxMenu, closeContextMenu, handleSendMessage, handleKeyDown,
        handleCopyMessageText, showToast, showConfirm, handleLogout,
        currentCall, setCurrentCall, handleStartAudioCall, incomingCallData, setIncomingCallData,
        dropdown, setDropdown, closeDropdown: () => setDropdown(prev => ({ ...prev, show: false }))
      }}>
        {children}
        <ToastNotification toast={toast} />
        <ConfirmModal confirm={confirm} setConfirm={setConfirm} />
        <ProfileModal /> 
        <CallOverlay />
        <IncomingCallModal />
      </MessengerContext.Provider>
    </>
  );
}

export default function useMessengerContext() {
  return useContext(MessengerContext);
}
