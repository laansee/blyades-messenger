import { useState, useEffect } from 'react';
import mainStyle from '../../components/css/main.module.css';
import useMessengerContext from '../../context/messengerContext';
import NavSidebar from '../navigation/NavSidebar';
import ChatsSidebar from './ChatsSidebar'; 
import ChatWindow from './ChatWindow';
import CreateGroupModal from '../../components/modals/add/CreateGroupModal';
import CreateChannelModal from '../../components/modals/add/CreateChannelModal';
import WelcomeModal from '../../components/modals/common/WelcomeModal';

export default function ChatLayout() {
  const ctx = useMessengerContext();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  
  useEffect(() => {
    document.title = 'Чаты | Blyades';
  }, []);

  useEffect(() => {
    if (ctx.currentUser) {
      const settings = ctx.currentUser.settings || {};
      // Если в настройках пользователя еще нет флага welcomed, показываем окно
      if (!settings.welcomed) {
        setShowWelcome(true);
      }
    }
  }, [ctx.currentUser]);

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
      <WelcomeModal show={showWelcome} onClose={() => setShowWelcome(false)} />
    </div>
  );
}