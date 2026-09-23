// import React from 'react';
import styles from '../../components/css/sidebar.module.css';
import { Check, CheckCheck, Search } from 'lucide-react';
import useMessengerContext from '../../context/messengerContext';

export default function ChatsSidebar() {
  const ctx = useMessengerContext();
  const currentUserIdStr = String(ctx.currentUser?.id);

  function formatMessageTimeOrDate(isoString: string | undefined): string {
    if (!isoString) return '';
    
    try {
      const msgDate = new Date(isoString);
      const today = new Date();
    
      const isToday = msgDate.getDate() === today.getDate() &&
                      msgDate.getMonth() === today.getMonth() &&
                      msgDate.getFullYear() === today.getFullYear();
                      
      if (isToday) {
        // Если сообщение отправлено сегодня, выводим локальное ЧЧ:ММ
        const hours = String(msgDate.getHours()).padStart(2, '0');
        const minutes = String(msgDate.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      } else {
        // Если это прошлый день или позже — выводим ДД.ММ
        const day = String(msgDate.getDate()).padStart(2, '0');
        const month = String(msgDate.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}`;
      }
    } catch (e) {
      return '';
    }
  }


  return (
    <section className={styles['chats-sidebar']}>
      <div className={styles['sidebar-header']}>
        <h2>Чаты</h2>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} className={styles['sidebar-search-icon']}/>
          <input 
            type="search" placeholder="Поиск по чатам..." className={styles['chat-search']} 
            value={ctx.searchQuery} onChange={e => ctx.setSearchQuery(e.target.value)} 
          />
        </div>
      </div>
      {/* <div className={styles['chats-list']}>
        {ctx.chats
          .filter((chat: any) => {
            // 1. Фильтр по поисковой строке
            const matchesSearch = chat.name.toLowerCase().includes(ctx.searchQuery.toLowerCase());
            
            // 2. Вычисляем ID общей комнаты для проверки наличия сообщений
            const chatIdStr = String(chat.id);
            const currentJoinedRoom = Number(currentUserIdStr) < Number(chatIdStr) 
              ? `${currentUserIdStr}_${chatIdStr}` 
              : `${chatIdStr}_${currentUserIdStr}`;
            
            // Проверяем, есть ли хотя бы одно сообщение в этом чате
            const hasMessages = ctx.allMessages.some((m: any) => m.chatId === currentJoinedRoom);

            // Карточка проходит дальше, только если совпал поиск И есть сообщения
            return matchesSearch && hasMessages;
          })
          .map((chat: any) => {
            const chatIdStr = String(chat.id);
            const currentJoinedRoom = Number(currentUserIdStr) < Number(chatIdStr) ? `${currentUserIdStr}_${chatIdStr}` : `${chatIdStr}_${currentUserIdStr}`;
            
            const chatMsgs = ctx.allMessages.filter((m: any) => m.chatId === currentJoinedRoom);
            const lastMessage = chatMsgs[chatMsgs.length - 1];
            const isMyLast = lastMessage && String(lastMessage.senderId) === currentUserIdStr;

            return (
              <div 
                key={chat.id} className={`${styles['chat-preview-card']} ${ctx.activeChatId === chat.id ? styles.active : ''}`} 
                onClick={() => ctx.setActiveChatId(chat.id)}
              >
                <div className={styles['avatar-wrapper']}>
                  <div className={styles['chat-avatar']} style={{ backgroundColor: chat.avatarColor }}>
                    {chat.name.substring(0, 1).toUpperCase()}
                  </div>
                </div>
                <div className={styles['chat-info']}>
                  <div className={styles['chat-meta']}>
                    <span className={styles['chat-name']}>{chat.name}</span>
                    <span className={styles['chat-time']}>{lastMessage?.time || ''}</span>
                  </div>
                  <div className={styles['chat-last-message']}>
                    <p>
                      {isMyLast && <span style={{ color: '#007aff', fontWeight: 'bold' }}>Вы: </span>}
                      {lastMessage ? lastMessage.text : 'Нет сообщений'}
                    </p>
                    {isMyLast && lastMessage && (
                      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                        {lastMessage.status === 'read' ? <CheckCheck size={16} style={{ color: '#007aff' }} /> : <Check size={16} style={{ color: '#9ca3af' }} />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div> */}

      <div className={styles['chats-list']}>
        {ctx.chats
          .filter((chat: any) => {
            const matchesSearch = chat.name.toLowerCase().includes(ctx.searchQuery.toLowerCase());
            const chatIdStr = String(chat.id);
            const currentJoinedRoom = Number(currentUserIdStr) < Number(chatIdStr) 
              ? `${currentUserIdStr}_${chatIdStr}` 
              : `${chatIdStr}_${currentUserIdStr}`;
            
            const hasMessages = ctx.allMessages.some((m: any) => m.chatId === currentJoinedRoom);
            return matchesSearch && hasMessages;
          })
          // 🚀 СОРТИРОВКА ПО ВРЕМЕНИ ПОСЛЕДНЕГО СООБЩЕНИЯ:
          .sort((a: any, b: any) => {
            const aRoom = Number(currentUserIdStr) < Number(a.id) ? `${currentUserIdStr}_${a.id}` : `${a.id}_${currentUserIdStr}`;
            const bRoom = Number(currentUserIdStr) < Number(b.id) ? `${currentUserIdStr}_${b.id}` : `${b.id}_${currentUserIdStr}`;

            const aMsgs = ctx.allMessages.filter((m: any) => m.chatId === aRoom);
            const bMsgs = ctx.allMessages.filter((m: any) => m.chatId === bRoom);

            const aLast = aMsgs[aMsgs.length - 1];
            const bLast = bMsgs[bMsgs.length - 1];

            // Если у обоих чатов есть сообщения, сравниваем их даты создания (самые новые — наверх)
            const aTime = aLast ? Date.parse(aLast.createdAt) : 0;
            const bTime = bLast ? Date.parse(bLast.createdAt) : 0;

            return bTime - aTime;
          })
          .map((chat: any) => {
            const chatIdStr = String(chat.id);
            const currentJoinedRoom = Number(currentUserIdStr) < Number(chatIdStr) ? `${currentUserIdStr}_${chatIdStr}` : `${chatIdStr}_${currentUserIdStr}`;
            
            const chatMsgs = ctx.allMessages.filter((m: any) => m.chatId === currentJoinedRoom);
            const lastMessage = chatMsgs[chatMsgs.length - 1];
            const isMyLast = lastMessage && String(lastMessage.senderId) === currentUserIdStr;

            return (
              <div 
                key={chat.id} className={`${styles['chat-preview-card']} ${ctx.activeChatId === chat.id ? styles.active : ''}`} 
                onClick={() => ctx.setActiveChatId(chat.id)}
              >
                {/* Весь остальной твой неизмененный код карточки */}
                <div className={styles['avatar-wrapper']}>
                  <div className={styles['chat-avatar']} style={{ backgroundColor: chat.avatarColor }}>
                    {chat.name.substring(0, 1).toUpperCase()}
                  </div>
                </div>
                <div className={styles['chat-info']}>
                  <div className={styles['chat-meta']}>
                    <span className={styles['chat-name']}>{chat.name}</span>
                    <span className={styles['chat-time']}>
                      {formatMessageTimeOrDate(lastMessage?.createdAt)}
                    </span>
                  </div>
                  <div className={styles['chat-last-message']}>
                    <p>
                      {isMyLast && <span style={{ color: '#007aff', fontWeight: 'bold' }}>Вы: </span>}
                      {lastMessage ? lastMessage.text : 'Нет сообщений'}
                    </p>
                    {isMyLast && lastMessage && (
                      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                        {lastMessage.status === 'read' ? <CheckCheck size={16} style={{ color: '#007aff' }} /> : <Check size={16} style={{ color: '#9ca3af' }} />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>


    </section>
  );
}
