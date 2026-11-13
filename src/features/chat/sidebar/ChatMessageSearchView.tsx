import React, { useState, useEffect, useMemo } from 'react';
import styles from '../../../components/css/sidebar.module.css';
import { ChevronDown, X, Search } from 'lucide-react';
import useMessengerContext from '../../../context/messengerContext';
import SmartAvatar from '../../../components/common/SmartAvatar';
import { searchService } from '../../../services/searchService';
import { supabase } from '../../../services/supabaseClient';
import { UserSearchPopover } from './UserSearchPopover';
import { CalendarSearchPopover } from './CalendarSearchPopover';
import { userService } from '../../../services/userService';

interface ChatMessageSearchViewProps {
  showUserPopover: boolean;
  setShowUserPopover: React.Dispatch<React.SetStateAction<boolean>>;
  showCalendarPopover: boolean;
  setShowCalendarPopover: React.Dispatch<React.SetStateAction<boolean>>;
  selectedUserFilter: any | null;
  setSelectedUserFilter: React.Dispatch<React.SetStateAction<any | null>>;
  selectedDateFilter: Date | null;
  setSelectedDateFilter: React.Dispatch<React.SetStateAction<Date | null>>;
  onCloseSearch: () => void;
  resolveMessageSender: (senderId: string | number) => any;
  formatMessageTimeOrDate: (isoString: string | undefined) => string;
}

function formatLocalDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const ChatMessageSearchView: React.FC<ChatMessageSearchViewProps> = ({
  showUserPopover,
  setShowUserPopover,
  showCalendarPopover,
  setShowCalendarPopover,
  selectedUserFilter,
  setSelectedUserFilter,
  selectedDateFilter,
  setSelectedDateFilter,
  onCloseSearch,
  resolveMessageSender,
  formatMessageTimeOrDate
}) => {
  const ctx = useMessengerContext();

  const [searchScope, setSearchScope] = useState<'current' | 'all'>('current');
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);
  const [dbFoundMessages, setDbFoundMessages] = useState<any[]>([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);

  // Фильтр авторов
  const [userFilterQuery, setUserFilterQuery] = useState('');
  const [chatMembersList, setChatMembersList] = useState<any[]>([]);

  // Фильтр даты
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());

  const activeChatObj = useMemo(() => {
    if (!ctx.activeChatId) return null;
    return (ctx.chats || []).find((c: any) => String(c.id) === String(ctx.activeChatId));
  }, [ctx.chats, ctx.activeChatId]);

  useEffect(() => {
    if (!showUserPopover) return;
    const loadMembers = async () => {
      try {
        if (searchScope === 'current' && ctx.activeChatId) {
          const numChatId = Number(ctx.activeChatId);
          if (isNaN(numChatId)) return;
          const { data: memberRows } = await supabase.from('chat_members').select('userId').eq('chatId', numChatId);
          if (memberRows && memberRows.length > 0) {
            const normalizedMembers = await userService.getUsersByUuids(
              memberRows.map((m: any) => String(m.userId))
            );
            setChatMembersList(normalizedMembers);
          }
        } else {
          setChatMembersList(ctx.users || []);
        }
      } catch (err) {
        console.error('Ошибка загрузки участников для фильтра:', err);
      }
    };
    loadMembers();
  }, [showUserPopover, searchScope, ctx.activeChatId, ctx.users]);

  const filteredPopoverUsers = useMemo(() => {
    const q = userFilterQuery.trim().toLowerCase();
    return chatMembersList.filter((u: any) => {
      const contact = (ctx.contacts || []).find((c: any) => String(c.contactId || c.partnerId || c.uuid || c.id) === String(u.uuid || u.id));
      const fullName = contact && (contact.firstName || contact.lastName)
        ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
        : `${u.firstName || ''} ${u.lastName || ''}`.trim();
      return !q || fullName.toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q);
    });
  }, [chatMembersList, userFilterQuery, ctx.contacts]);

  // Запрос поиска сообщений
  useEffect(() => {
    const q = (ctx.searchQuery || '').trim();
    if (!q && !selectedUserFilter && !selectedDateFilter) {
      setDbFoundMessages([]);
      setIsSearchingMessages(false);
      return;
    }
    setIsSearchingMessages(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const myChatNumericIds = (ctx.chats || [])
          .map((c: any) => Number(c.internalChatId || c.chatId || c.id))
          .filter((id: number) => !isNaN(id) && id > 0);

        const dateStr = selectedDateFilter ? formatLocalDateToYMD(selectedDateFilter) : null;

        const res = await searchService.searchMessagesByScope({
          query: q,
          chatId: searchScope === 'current' ? ctx.activeChatId : null,
          myChatIds: searchScope === 'all' ? myChatNumericIds : undefined,
          senderId: selectedUserFilter ? String(selectedUserFilter.uuid || selectedUserFilter.id) : null,
          date: dateStr,
          limit: 60
        });
        setDbFoundMessages(res || []);
      } catch (err) {
        console.error('Ошибка поиска сообщений:', err);
      } finally {
        setIsSearchingMessages(false);
      }
    }, 250);
    return () => clearTimeout(debounceTimer);
  }, [ctx.searchQuery, searchScope, ctx.activeChatId, ctx.chats, selectedUserFilter, selectedDateFilter]);

  const handleScrollToMessage = (chatId: string | number, messageId: string | number) => {
    if (String(ctx.activeChatId) !== String(chatId)) ctx.setActiveChatId(String(chatId));
    setTimeout(() => {
      const el = document.getElementById(`message-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.backgroundColor = 'rgba(157, 123, 246, 0.25)';
        setTimeout(() => (el.style.backgroundColor = 'transparent'), 1200);
      }
    }, 150);
  };

  const isSearchActive = Boolean((ctx.searchQuery || '').trim()) || Boolean(selectedUserFilter) || Boolean(selectedDateFilter);

  return (
    <>
      {/* ПЛАШКА ВЫБОРА ОБЛАСТИ ПОИСКА И ТЕГИ ФИЛЬТРОВ */}
      <div style={{ padding: '8px 12px 6px 12px', position: 'relative', borderBottom: '1px solid #232428' }}>
        <span style={{ fontSize: '12px', color: '#8e8e93', display: 'block', marginBottom: '6px' }}>Поиск в чате:</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div 
            onClick={() => { setShowScopeDropdown(p => !p); setShowUserPopover(false); setShowCalendarPopover(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', backgroundColor: '#1e1f26', padding: '5px 10px', borderRadius: '8px', border: '1px solid #2d2e38' }}
          >
            {searchScope === 'current' && activeChatObj ? (
              <>
                <SmartAvatar size={20} avatarUrl={activeChatObj.avatarUrl} avatarColor={activeChatObj.avatarColor} name={activeChatObj.name} />
                <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>{activeChatObj.isGroup ? 'Эта группа' : 'Этот чат'}</span>
              </>
            ) : (
              <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>💬 Мои чаты</span>
            )}
            <ChevronDown size={14} color="#8e8e93" />
          </div>

          <button
            type="button"
            onClick={onCloseSearch}
            style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', padding: '4px' }}
            title="Закрыть поиск по сообщениям"
          >
            <X size={18} />
          </button>
        </div>

        {showScopeDropdown && (
          <div style={{ position: 'absolute', top: '100%', left: '12px', zIndex: 1000, backgroundColor: '#1c1c24', border: '1px solid #2b2d31', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', overflow: 'hidden', minWidth: '170px', marginTop: '4px' }}>
            {activeChatObj && (
              <div onClick={() => { setSearchScope('current'); setShowScopeDropdown(false); }} style={{ padding: '10px 12px', fontSize: '13px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: searchScope === 'current' ? '#252532' : 'transparent' }}>
                <SmartAvatar size={18} avatarUrl={activeChatObj.avatarUrl} avatarColor={activeChatObj.avatarColor} name={activeChatObj.name} />
                <span>{activeChatObj.isGroup ? 'Эта группа' : 'Этот чат'}</span>
              </div>
            )}
            <div onClick={() => { setSearchScope('all'); setShowScopeDropdown(false); }} style={{ padding: '10px 12px', fontSize: '13px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: searchScope === 'all' ? '#252532' : 'transparent' }}>
              <span>💬 Мои чаты</span>
            </div>
          </div>
        )}

        {(selectedUserFilter || selectedDateFilter) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {selectedUserFilter && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#21202e', border: '1px solid #3c3958', borderRadius: '14px', padding: '2px 8px', fontSize: '12px', color: '#cfcfcf' }}>
                <SmartAvatar size={16} avatarUrl={selectedUserFilter.avatarUrl} avatarColor={selectedUserFilter.avatarColor} name={selectedUserFilter.name || selectedUserFilter.username} />
                <span>От: <b>{selectedUserFilter.name || selectedUserFilter.username}</b></span>
                <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedUserFilter(null)} />
              </div>
            )}
            {selectedDateFilter && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#21202e', border: '1px solid #3c3958', borderRadius: '14px', padding: '2px 8px', fontSize: '12px', color: '#cfcfcf' }}>
                <span>📅 <b>{selectedDateFilter.toLocaleDateString('ru-RU')}</b></span>
                <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedDateFilter(null)} />
              </div>
            )}
          </div>
        )}
      </div>

      <UserSearchPopover
        show={showUserPopover}
        searchQuery={userFilterQuery}
        onSearchChange={setUserFilterQuery}
        usersList={filteredPopoverUsers}
        resolveSender={resolveMessageSender}
        onSelectUser={(u) => {
          const senderData = resolveMessageSender(u.uuid || u.id);
          setSelectedUserFilter({ uuid: String(u.uuid || u.id || u.partnerId), name: senderData.name, avatarUrl: senderData.avatarUrl, avatarColor: senderData.avatarColor });
          setShowUserPopover(false);
        }}
        onClose={() => setShowUserPopover(false)}
      />

      <CalendarSearchPopover
        show={showCalendarPopover}
        calendarViewDate={calendarViewDate}
        selectedDate={selectedDateFilter}
        onMonthChange={setCalendarViewDate}
        onSelectDate={(d) => { setSelectedDateFilter(d); setShowCalendarPopover(false); }}
        onClose={() => setShowCalendarPopover(false)}
      />

      <div className={styles['chats-list']} style={{ overflowY: 'auto' }}>
        {!isSearchActive ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#636366', gap: '12px', userSelect: 'none' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#1a1b22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={32} color="#525462" />
            </div>
            <span style={{ fontSize: '14px', color: '#8e8e98' }}>Поиск по сообщениям</span>
          </div>
        ) : isSearchingMessages ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#8e8e98', fontSize: '13px' }}>Поиск сообщений...</div>
        ) : (
          <div>
            <div style={{ padding: '10px 16px', fontSize: '13px', color: '#8e8e98', borderBottom: '1px solid #232428' }}>
              {searchScope === 'current' ? `Найдено ${dbFoundMessages.length} сообщений` : `Найдено ${dbFoundMessages.length} сообщений в чатах`}
            </div>
            {dbFoundMessages.length === 0 ? (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: '#636366', fontSize: '14px' }}>Сообщения не найдены</div>
            ) : (
              dbFoundMessages.map((msg: any) => {
                const author = resolveMessageSender(msg.senderId);
                const parentChat = (ctx.chats || []).find((c: any) => String(c.id) === String(msg.chatId));
                const isCur = searchScope === 'current';
                const title = isCur ? author.name : (parentChat?.name || `Чат #${msg.chatId}`);

                return (
                  <div 
                    key={`msg-${isCur ? 'cur' : 'all'}-${msg.id}`} 
                    className={styles['chat-preview-card']} 
                    onClick={() => handleScrollToMessage(msg.chatId, msg.id)} 
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles['avatar-wrapper']}>
                      <SmartAvatar 
                        size={42} 
                        avatarUrl={isCur ? author.avatarUrl : parentChat?.avatarUrl} 
                        avatarColor={isCur ? author.avatarColor : (parentChat?.avatarColor || '#007aff')} 
                        name={title} 
                        isChannel={!isCur && (parentChat?.isChannel || parentChat?.type === 'channel')} 
                      />
                    </div>
                    <div className={styles['chat-info']}>
                      <div className={styles['chat-meta']}>
                        <span className={styles['chat-name']}>{title}</span>
                        <span className={styles['chat-time']}>{formatMessageTimeOrDate(msg.createdAt)}</span>
                      </div>
                      <div className={styles['chat-last-message']}>
                        <p style={{ color: '#cfcfcf' }}>
                          {!isCur && <span style={{ color: '#9d7bf6', fontWeight: 600 }}>{author.name}: </span>}
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
};