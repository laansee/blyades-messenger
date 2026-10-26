import { useEffect } from 'react';
import mainStyle from '../../components/css/main.module.css';
import useMessengerContext from '../../context/messengerContext';
import NavSidebar from '../navigation/NavSidebar';
import ContactsSidebar from './ContactsSidebar';
import ChatWindow from '../chat/ChatWindow';

export default function ContactsPage() {
  const ctx = useMessengerContext();
  if (!ctx.currentUser) return null;
    
  useEffect(() => {
    document.title = 'Контакты | Blyades';
  }, []);

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
