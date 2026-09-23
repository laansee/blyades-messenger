import React from 'react';
import mainStyle from '../../components/CSS/main.module.css';
import useMessengerContext from '../../context/messengerContext';
import NavSidebar from '../channels/nav-sidebar';
import ContactsSidebar from './contacts-sidebar';
import ChatWindow from '../chat/chat-window';

export default function ContactsPage() {
  const ctx = useMessengerContext();
  if (!ctx.currentUser) return null;

  return (
    <div className={`${mainStyle['messenger-container']} ${ctx.activeChatId ? mainStyle['chat-opened'] : ''}`}>
      {/* 1. Общая левая Discord-панель навигации */}
      <NavSidebar />
      
      {/* 2. Наш новый сайдбар со списками друзей и глобальным поиском */}
      <ContactsSidebar />
      
      {/* 3. Готовое реактивное окно переписки */}
      <ChatWindow />
    </div>
  );
}
