import React, { useState } from 'react';
import styles from '../../components/css/sidebar.module.css';
import { Check, CheckCheck, Search, SquarePen, Users, Megaphone, PhoneCall } from 'lucide-react';
import useMessengerContext from '../../context/messengerContext';
import DropdownMenu from '../../components/dropdown-menu'; 

export default function ChatsSidebar({ onOpenCreateGroup }: { onOpenCreateGroup: () => void }) {
  const ctx = useMessengerContext();
  const currentUserIdStr = String(ctx.currentUser?.id);

  // 🚀 ЛОКАЛЬНЫЕ СТЕЙТЫ: Для меню карандаша и для активного таба фильтрации
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'groups'>('all');

  function formatMessageTimeOrDate(isoString: string | undefined): string {
    if (!isoString) return '';
    
    try {
      const msgDate = new Date(isoString);
      const today = new Date();
    
      const isToday = msgDate.getDate() === today.getDate() &&
                      msgDate.getMonth() === today.getMonth() &&
                      msgDate.getFullYear() === today.getFullYear();
                      
      if (isToday) {
        const hours = String(msgDate.getHours()).padStart(2, '0');
        const minutes = String(msgDate.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      } else {
        const day = String(msgDate.getDate()).padStart(2, '0');
        const month = String(msgDate.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}`;
      }
    } catch (e) {
      return '';
    }
  }

    // 🚀 ИСПРАВЛЕННЫЙ И БЕЗОШИБОЧНЫЙ ФИКС: Убрали chatIdStr, заменив на chat.id
  const visibleChats = React.useMemo(() => {
    return ctx.chats
      .filter((chat: any) => {
        // 1. Проверяем поисковую строку
        const matchesSearch = chat.name.toLowerCase().includes(ctx.searchQuery.toLowerCase());
        
        // 2. Вычисляем правильное имя комнаты
        const currentJoinedRoom = chat.isGroup 
          ? chat.id // Для беседы имя комнаты — это напрямую её group_id!
          : (Number(currentUserIdStr) < Number(chat.id) 
              ? `${currentUserIdStr}_${chat.id}` // 🎯 ИСПРАВЛЕНИЕ: Заменили chatIdStr на chat.id
              : `${chat.id}_${currentUserIdStr}`);
        
        // 3. Проверяем, есть ли сообщения в этой комнате
        const hasMessages = ctx.allMessages.some((m: any) => m.chatId === currentJoinedRoom);
        return matchesSearch && hasMessages;
      })
      .sort((a: any, b: any) => {
        // Вычисляем комнаты для правильной сортировки (свежие наверх)
        const aRoom = a.isGroup ? a.id : (Number(currentUserIdStr) < Number(a.id) ? `${currentUserIdStr}_${a.id}` : `${a.id}_${currentUserIdStr}`);
        const bRoom = b.isGroup ? b.id : (Number(currentUserIdStr) < Number(b.id) ? `${currentUserIdStr}_${b.id}` : `${b.id}_${currentUserIdStr}`);

        const aMsgs = ctx.allMessages.filter((m: any) => m.chatId === aRoom);
        const bMsgs = ctx.allMessages.filter((m: any) => m.chatId === bRoom);

        const aLast = aMsgs[aMsgs.length - 1];
        const bLast = bMsgs[bMsgs.length - 1];

        const aTime = aLast ? Date.parse(aLast.createdAt) : 0;
        const bTime = bLast ? Date.parse(bLast.createdAt) : 0;

        return bTime - aTime; // 🎯 Сортируем: новые переписки летят наверх списка
      });
  }, [ctx.chats, ctx.allMessages, ctx.searchQuery, currentUserIdStr]);


  return (
    <section className={styles['chats-sidebar']}>
      <div className={styles['sidebar-header']}>
        <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', position: 'relative' }}>
          <h2>Чаты</h2>
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="dropdown-trigger-btn">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateMenu((prev) => !prev);
              }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Начать общение"
            >
              <SquarePen color='#aaa8a8'/>
            </button>

            <DropdownMenu 
              show={showCreateMenu} 
              onClose={() => setShowCreateMenu(false)} 
              x={0} 
              y={0} 
              items={[
                { 
                  id: 'create-group', 
                  text: 'Создать чат', 
                  icon: Users, 
                  onClick: () => {
                    setShowCreateMenu(false);
                    onOpenCreateGroup(); 
                  } 
                },
                { 
                  id: 'create-channel', 
                  text: 'Создать канал', 
                  icon: Megaphone, 
                  onClick: () => {
                    ctx.showToast('Функция создания каналов в разработке', 'info');
                    setShowCreateMenu(false);
                  } 
                },
                { 
                  id: 'write-by-phone', 
                  text: 'Написать по номеру', 
                  icon: PhoneCall, 
                  onClick: () => {
                    ctx.showToast('Поиск по номеру телефона в разработке', 'info');
                    setShowCreateMenu(false);
                  } 
                }
              ]} 
            />
          </div>
        </section>
        
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} className={styles['sidebar-search-icon']}/>
          <input 
            type="search" 
            id='chat-search'
            placeholder="Поиск по чатам..." 
            className={styles['chat-search']} 
            value={ctx.searchQuery} 
            onChange={e => ctx.setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      {/* 🚀 ОЖИВИЛИ ВКЛАДКИ ФИЛЬТРАЦИИ С УЧЁТОМ ТВОЕГО КЛАССА АКТИВНОСТИ .active */}
      <div className={styles['sidebar-tabs']}>
        <div 
          className={`${styles['sidebar-tab-item']} ${activeTab === 'all' ? styles.active : ''}`}
          onClick={() => setActiveTab('all')}
          style={{ cursor: 'pointer' }}
        >
          <p>Все</p>
        </div>
        <div 
          className={`${styles['sidebar-tab-item']} ${activeTab === 'unread' ? styles.active : ''}`}
          onClick={() => setActiveTab('unread')}
          style={{ cursor: 'pointer' }}
        >
          <p>Непрочитанные</p>
        </div>
        <div 
          className={`${styles['sidebar-tab-item']} ${activeTab === 'groups' ? styles.active : ''}`}
          onClick={() => setActiveTab('groups')}
          style={{ cursor: 'pointer' }}
        >
          <p>Группы</p>
        </div>
      </div>

      <div className={styles['chats-list']}>
        {visibleChats.length === 0 ? (
          <div style={{ color: '#636366', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>
            {activeTab === 'all' && 'Чаты не найдены'}
            {activeTab === 'unread' && 'Нет непрочитанных сообщений'}
            {activeTab === 'groups' && 'У вас пока нет групповых чатов'}
          </div>
        ) : (
          visibleChats.map((chat: any) => {
            const chatIdStr = String(chat.id);
            const currentJoinedRoom = chat.isGroup 
              ? chat.id 
              : (Number(currentUserIdStr) < Number(chatIdStr) ? `${currentUserIdStr}_${chatIdStr}` : `${chatIdStr}_${currentUserIdStr}`);
            
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
                    <span className={styles['chat-time']}>
                      {formatMessageTimeOrDate(lastMessage?.createdAt)}
                    </span>
                  </div>
                  <div className={styles['chat-last-message']}>
                    <p style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%' }}>
                      {isMyLast && <span style={{ color: '#007aff', fontWeight: 'bold' }}>Вы: </span>}
                      
                      {/* 🚀 ПУНКТ 2.2: Если это группа и последнее сообщение писали не мы — подставляем имя автора! */}
                      {chat.isGroup && !isMyLast && lastMessage && lastMessage.senderId !== 'system' && (() => {
                        const senderUserObj = ctx.chats.find((c: any) => String(c.id) === String(lastMessage.senderId));
                        return <span style={{ color: '#a2a2b5', fontWeight: '600' }}>{senderUserObj ? senderUserObj.name : 'Участник'}: </span>;
                      })()}

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
          })
        )}
      </div>
    </section>
  );
}
