import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { ToastNotification, ConfirmModal } from '../components/GlobalUI';
import ProfileModal from '../components/profile-modal';
import CallOverlay from '../components/call-overlay';
import * as jose from 'jose'; 
import IncomingCallModal from '../components/incoming-call-modal';

// import { SpeedInsights } from "@vercel/speed-insights/next"
// import { Analytics } from "@vercel/analytics/next"

// 🚀 ГЛОБАЛЬНЫЙ ЗАМОК ДЛЯ ИСХОДЯЩИХ ЗВОНКОВ: Защищает контекст от двойного монтажа React Strict Mode!
let isOutboundChannelInitialized = false;
// 🚀 ГЛОБАЛЬНЫЙ ЗАМОК ДЛЯ СООБЩЕНИЙ: Защищает стрим переписок от двойного монтажа Strict Mode!
let isMessagesChannelInitialized = false;


const MessengerContext = createContext<any>(null);

export function MessengerProvider({ children }: { children: React.ReactNode }) {
  const [currentCall, setCurrentCall] = useState<{ roomName: string; token: string } | null>(null);
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
  const [ctxMenu, setCtxMenu] = useState({ show: false, x: 0, y: 0, items: [] as any[] });
  const closeContextMenu = () => setCtxMenu((prev: any) => ({ ...prev, show: false }));

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
      const { data: myContacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('userId', String(currentUser.id));

      const { data: allUsers } = await supabase.from('users').select('*');

      if (allUsers) {
        const formattedChats = allUsers
          .filter((u: any) => String(u.id).trim() !== String(currentUser.id).trim()) // Исключаем себя из списка чатов
          .map((u: any) => {
            const contactMeta = myContacts?.find((c: any) => String(c.contactId).trim() === String(u.id).trim());
            const isContact = !!contactMeta;

            let calculatedName = u.username;
            if (isContact) {
              calculatedName = `${contactMeta.firstName || ''} ${contactMeta.lastName || ''}`.trim() || u.username;
            } else if (u.privacyNameFormat === 'full_name' && (u.firstName || u.lastName)) {
              calculatedName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
            }

            return {
              id: String(u.id),
              username: u.username,
              uniqueId: u.uniqueId,
              name: calculatedName,
              firstName: u.firstName || '',
              lastName: u.lastName || '',
              email: u.email || '',
              phone: u.phone || '',
              avatarColor: u.avatarColor || '#007aff',
              isContact: isContact, 
              note: contactMeta?.note || '',
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

    // 3. 🚀 ПОДГРУЖАЕМ ВСЕ СООБЩЕНИЯ И ВКЛЮЧАЕМ REALTIME ДЛЯ ЧАТОВ
  useEffect(() => {
    if (!currentUser) return;

    const fetchAllMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('createdAt', { ascending: true });

      if (data) {
        setAllMessages(data);
      }
    };

    fetchAllMessages();

    if (isMessagesChannelInitialized) {
      console.log('[WebRTC_Call] Блокировка дубликата Strict Mode для канала сообщений.');
      return;
    }

    console.log('[WebRTC_Call] Создаем ОДИН чистый канал Realtime-сообщений: global-messages-live');
    isMessagesChannelInitialized = true; // Запираем замок сообщений!

    const msgChannel = supabase
      .channel('global-messages-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setAllMessages((prev) => [...prev, payload.new]);
        }
        if (payload.eventType === 'UPDATE') {
          setAllMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
        }
        if (payload.eventType === 'DELETE') {
          setAllMessages((prev) => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      // Оставляем инстанс активным при быстром перезапуске Strict Mode, чтобы сокет не падал
    };
  }, [currentUser]);


  // 4. 🚀 МЭТЧИМ ПОСЛЕДНИЕ СООБЩЕНИЯ В САЙДБАРЕ КОМНАТ
  useEffect(() => {
    if (chats.length === 0 || allMessages.length === 0) return;

    const myId = String(currentUser?.id);

    const updatedChats = chats.map(chat => {
      const partnerId = String(chat.id);
      const roomName = Number(myId) < Number(partnerId) ? `${myId}_${partnerId}` : `${partnerId}_${myId}`;

      const roomMessages = allMessages.filter(m => m.chatId === roomName);
      const lastMsg = roomMessages[roomMessages.length - 1];

      return {
        ...chat,
        lastMessage: lastMsg ? lastMsg.text : 'Нет сообщений',
        lastMessageTime: lastMsg 
          ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          : ''
      };
    });

    if (JSON.stringify(chats) !== JSON.stringify(updatedChats)) {
      setChats(updatedChats);
    }
  }, [allMessages, chats, currentUser]);

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
    setTimeout(() => setToast((prev: any) => ({ ...prev, show: false })), 3000);
  };

  const showConfirm = (
    title: string, text: string, onConfirm: () => void, isDanger = false
  ) => {setConfirm({ show: true, title, text, onConfirm, isDanger });};

  const handleLogout = () => {   
    if (globalOutboundCallChannelInstance) {
      supabase.removeChannel(globalOutboundCallChannelInstance);
      globalOutboundCallChannelInstance = null;
    } 
    localStorage.clear();
    window.location.reload();
  };

  const filteredMessages = allMessages.filter((m: { chatId: string }) => {
    if (!currentUser || !activeChatId) return false;
    const myId = String(currentUser.id);
    const partnerId = String(activeChatId);
    const currentJoinedRoom = Number(myId) < Number(partnerId) ? `${myId}_${partnerId}` : `${partnerId}_${myId}`;
    return m.chatId === currentJoinedRoom;
  });

// ========================================================
// 🎙️ ОЖИВЛЯЕМ ЗВОНКИ И НАСТРАИВАЕМ РЕФ-ЗАМОК
// ========================================================
  const callsChannelRef = useRef<any>(null);

  // 🚀 НАДEЖНЫЙ СТАРТ ЗВOНКA НА ДВИЖКЕ JOSE
  const handleStartAudioCall = async (targetPartnerId: string) => {
    if (!currentUser) return;
    
    const myIdStr = String(currentUser.id);
    const partnerIdStr = String(targetPartnerId);
    const roomName = Number(myIdStr) < Number(partnerIdStr) 
      ? `call_${myIdStr}_${partnerIdStr}` 
      : `call_${partnerIdStr}_${myIdStr}`;

    showToast('Инициализация защищенного WebRTC канала...', 'info');

    try {
      const apiKey = "APIdub3CsA3TNJE";
      const apiSecret = "CptL3A3BQjVaaFzG9f0hbtz23YfQvVuB0cerptM1UbyA";

      const secretBuffer = new TextEncoder().encode(apiSecret);

      const validToken = await new jose.SignJWT({
        video: { roomJoin: true, room: roomName, audio: true, video: false },
        name: currentUser.username,
      })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuer(apiKey)
        .setSubject(currentUser.username)
        .setExpirationTime('1h')
        .sign(secretBuffer);

      console.log('[WebRTC_Call] Токен создан. Очищаем старые зависшие звонки в базе...');

      await supabase
        .from('calls')
        .delete()
        .or(`and(callerId.eq.${myIdStr},receiverId.eq.${partnerIdStr}),and(callerId.eq.${partnerIdStr},receiverId.eq.${myIdStr})`);

      const { data: newCallRow, error: insertError } = await supabase
        .from('calls')
        .insert([{
          roomName,
          token: validToken,
          callerId: myIdStr,
          receiverId: partnerIdStr,
          status: 'ringing'
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Ошибка записи вызова в Supabase:', insertError.message);
        showToast('Не удалось отправить вызов собеседнику', 'error');
        return;
      }

      console.log('[WebRTC_Call] Строка вызова успешно опубликована. ID вызова:', newCallRow.id);

      setCurrentCall({ 
        id: newCallRow.id, 
        roomName, 
        token: validToken 
      });

    } catch (err) {
      console.error('🔴 Критическая ошибка WebRTC соединения jose:', err);
      showToast('Не удалось запустить аудиодвижок', 'error');
    }
  };

  // 🚀 ГЛОБАЛЬНАЯ ФУНКЦИЯ СБРОСА И ПОЛНОГО ЗАВЕРШЕНИЯ ЗВOНКA
  const handleEndCall = async () => {
    // Если в стейте нет активного звонка — просто выходим
    if (!currentCall) return;

    console.log('[WebRTC_Call] Кнопка отбоя нажата. Завершаем звонок для всех...');

    try {
      if (currentCall.id) {
        // 1. Ставим в базе статус 'ended', чтобы Realtime-хук на втором ПК моментально поймал это и закрыл окно!
        await supabase
          .from('calls')
          .update({ status: 'ended' })
          .eq('id', currentCall.id);
          
        // 2. Спустя секунду бережно удаляем эту строку, чтобы не засорять таблицу в Supabase
        setTimeout(async () => {
          await supabase.from('calls').delete().eq('id', currentCall.id);
        }, 1200);
      }
    } catch (err) {
      console.error('Ошибка при отправке статуса отбоя в Supabase:', err);
    } finally {
      // 3. В любом случае мгновенно тушим оверлей звонка у себя на экране
      setCurrentCall(null);
      setIncomingCallData(null);
      showToast('Звонок завершен', 'info');
    }
  };

  // 🚀 ГАРАНТИРОВАННО СТАБИЛЬНЫЙ ПЕРЕХВАТ ОТВЕТА ДЛЯ ЗВОНЯЩЕГО
  useEffect(() => {
    const myIdStr = currentUser?.id ? String(currentUser.id).trim() : null;
    if (!myIdStr) return;

    const channelName = `outbound_status_stream_${myIdStr}`;

    // 🛑 МЕГА-ФИКС: Переменная на уровне файла никогда не сбросится повторным рендером!
    if (isOutboundChannelInitialized) {
      console.log(`[WebRTC_Call] Блокировка дубликата Strict Mode в контексте для канала: ${channelName}`);
      return;
    }

    console.log(`[WebRTC_Call] Создаем ОДИН чистый канал перехвата ответа: ${channelName}`);
    isOutboundChannelInitialized = true; // Запираем замок!

    const outboundCallChannel = supabase.channel(channelName);

    outboundCallChannel
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'calls' },
        (payload) => {
          const callRow = payload.new as any;

          if (String(callRow.callerId) === myIdStr && callRow.status === 'accepted') {
            console.log('[WebRTC_Call] Собеседник принял наш вызов! Переключаем оверлей.');
            setCurrentCall((prev: any) => prev ? { ...prev, status: 'accepted' } : prev);
          }

          if (String(callRow.callerId) === myIdStr && (callRow.status === 'rejected' || callRow.status === 'ended')) {
            setCurrentCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      // Специально оставляем флаг true, чтобы Strict Mode при двойном монтаже не плодил ошибки подписок
    };
  }, [currentUser?.id]);


  return (
    <>
      <MessengerContext.Provider value={{
        activeTab, setActiveTab, theme, setTheme, currentUser, setCurrentUser, chats, setChats,
        allMessages, setAllMessages, activeChatId, setActiveChatId, searchQuery, setSearchQuery,
        messageSearchQuery, setMessageSearchQuery, showMsgSearch, setShowMsgSearch,
        messageText, setMessageText, editingMessage, setEditingMessage, showUserModal, setShowUserModal,
        showProfileMenu, setShowProfileMenu, typingUser, toast, setToast, confirm, setConfirm,
        messagesEndRef, ctxMenu, setCtxMenu, closeContextMenu, handleSendMessage, handleKeyDown,
        handleCopyMessageText, showToast, showConfirm, handleLogout, handleEndCall, filteredMessages,
        currentCall, setCurrentCall, handleStartAudioCall, incomingCallData, setIncomingCallData,
        dropdown, setDropdown, closeDropdown: () => setDropdown((prev: any) => ({ ...prev, show: false }))
      }}>
        {children}
        <ToastNotification toast={toast} />
        <ConfirmModal confirm={confirm} setConfirm={setConfirm} />
        <ProfileModal /> 
        <CallOverlay />
        <IncomingCallModal />


        {/* <SpeedInsights/>
        <Analytics/> */}


      </MessengerContext.Provider>
    </>
  );
}

export default function useMessengerContext() {
  return useContext(MessengerContext);
}
