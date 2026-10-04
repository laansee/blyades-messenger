import React, { useState, useEffect } from 'react';
import mainStyle from '../../components/css/main.module.css';
import useMessengerContext, { MessengerProvider } from '../../context/messengerContext';
import NavSidebar from '../channels/nav-sidebar';
import ChatsSidebar from './chats-sidebar'; 
import ChatWindow from './chat-window';
import CreateGroupModal from '../../components/create-group-modal';
// import { CreateGroupModal } from '../../components/GlobalUI'

function ChatContent() {
  const ctx = useMessengerContext();
  const [showGroupModal, setShowGroupModal] = useState(false);
  
  useEffect(() => {
    document.title = 'Чаты | Blyades';
  }, []);

  return (
    <div className={`${mainStyle['messenger-container']} ${ctx.activeChatId ? mainStyle['chat-opened'] : ''}`}>
      <NavSidebar />
      <ChatsSidebar onOpenCreateGroup={() => setShowGroupModal(true)} />
      <ChatWindow />
      <CreateGroupModal show={showGroupModal} onClose={() => setShowGroupModal(false)} />
    </div>
  );
}

export default function ChatLayout() {
  return <ChatContent />;
}
