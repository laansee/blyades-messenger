import { useState, useEffect } from 'react';
import mainStyle from '../../components/css/main.module.css';
import useMessengerContext from '../../context/messengerContext';
import NavSidebar from '../navigation/NavSidebar';
import ChatsSidebar from './ChatsSidebar'; 
import ChatWindow from './ChatWindow';
import CreateGroupModal from '../../components/modals/CreateGroupModal';
import CreateChannelModal from '../../components/modals/CreateChannelModal';

export default function ChatLayout() {
  const ctx = useMessengerContext();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  
  useEffect(() => {
    document.title = 'Чаты | Blyades';
  }, []);

  return (
    <div className={`${mainStyle['messenger-container']} ${ctx.activeChatId ? mainStyle['chat-opened'] : ''}`}>
      <NavSidebar 
        onOpenCreateGroup={() => setShowGroupModal(true)} 
        onOpenCreateChannel={() => setShowChannelModal(true)}
      />
      <ChatsSidebar />
      <ChatWindow />
      
      <CreateGroupModal show={showGroupModal} onClose={() => setShowGroupModal(false)} />
      <CreateChannelModal show={showChannelModal} onClose={() => setShowChannelModal(false)} />
    </div>
  );
}