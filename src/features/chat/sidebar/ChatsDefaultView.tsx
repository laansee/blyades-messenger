import React, { useState, useMemo } from 'react';
import styles from '../../../components/css/sidebar.module.css';
import useMessengerContext from '../../../context/messengerContext';
import { ChatCard } from './ChatCard';

interface ChatsDefaultViewProps {
  currentUserIdStr: string;
  onOpenContextMenu: (e: React.MouseEvent, chat: any) => void;
  resolveSenderName: (senderId: string) => string | null;
  formatSidebarMessageText: (rawText: string | undefined) => string;
  formatMessageTimeOrDate: (isoString: string | undefined) => string;
}

export const ChatsDefaultView: React.FC<ChatsDefaultViewProps> = ({
  currentUserIdStr,
  onOpenContextMenu,
  resolveSenderName,
  formatSidebarMessageText,
  formatMessageTimeOrDate
}) => {
  const ctx = useMessengerContext();
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'groups'>('all');

  const visibleChats = useMemo(() => {
    const getLastTime = (c: any) => Number.isFinite(Date.parse(c.lastMessageAt)) ? Date.parse(c.lastMessageAt) : 0;

    return (ctx.chats || [])
      .filter((c: any) => {
        if (String(c.id) === '1') return true;
        if (c.isArchived) return false;
        if (activeTab === 'unread' && Number(c.unreadCount ?? 0) <= 0) return false;
        if (activeTab === 'groups' && c.type !== 'group' && !c.isGroup) return false;
        return true;
      })
      .sort((a: any, b: any) => {
        if (String(a.id) === '1') return -1;
        if (String(b.id) === '1') return 1;
        return (Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))) || (getLastTime(b) - getLastTime(a));
      });
  }, [ctx.chats, activeTab]);

  // Проверяем флаг загрузки из контекста (если у вас он называется иначе, например, ctx.loading, подставьте его)
  const isLoading = ctx.chatsLoading || ctx.loading;

  return (
    <>
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
        {isLoading ? (
          <div style={{ color: '#636366', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>
            Загрузка...
          </div>
        ) : visibleChats.length === 0 ? (
          <div style={{ color: '#636366', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>
            Чаты не найдены
          </div>
        ) : (
          visibleChats.map((chat: any) => (
            <ChatCard
              key={chat.id}
              chat={chat}
              isSelected={String(ctx.activeChatId) === String(chat.id)}
              currentUserIdStr={currentUserIdStr}
              isUserOnline={ctx.isUserOnline ? ctx.isUserOnline(chat) : false}
              onSelect={() => ctx.setActiveChatId(String(chat.id))}
              onContextMenu={(e) => onOpenContextMenu(e, chat)}
              resolveSenderName={resolveSenderName}
              formatText={formatSidebarMessageText}
              formatTime={formatMessageTimeOrDate}
            />
          ))
        )}
      </div>
    </>
  );
};