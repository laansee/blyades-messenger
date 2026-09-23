// import React from 'react';
import mainStyle from '../../components/css/main.module.css';
import useMessengerContext, { MessengerProvider } from '../../context/messengerContext';
import NavSidebar from '../channels/nav-sidebar';
import ChatsSidebar from '../channels/chats-sidebar'; 
import ChatWindow from './chat-window';
// import ProfileModal from '../../components/profile-modal';
// import { ToastNotification, ConfirmModal } from '../../components/GlobalUI';

function ChatContent() {
  const ctx = useMessengerContext();
  if (!ctx.currentUser) return <div>Загрузка профиля мессенджера...</div>;

  return (
    <div className={`${mainStyle['messenger-container']} ${ctx.activeChatId ? mainStyle['chat-opened'] : ''}`}>
      <NavSidebar />
      <ChatsSidebar />
      <ChatWindow />
    </div>
  );
}

export default function ChatLayout() {
  return (
    <MessengerProvider>
      <ChatContent />
    </MessengerProvider>
  );
}
