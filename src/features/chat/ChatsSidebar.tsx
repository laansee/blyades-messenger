import { useState, useEffect, useMemo, useRef } from 'react';
import styles from '../../components/css/sidebar.module.css';
import { Search, Menu, X, ChevronDown, User, Calendar, Users, Megaphone } from 'lucide-react';
import useMessengerContext from '../../context/messengerContext';
import { renderUserStatusBadge } from '../../utils/statusBadge';
import { searchService } from '../../services/searchService';
import SmartAvatar from '../../components/common/SmartAvatar';
import { supabase } from '../../services/supabaseClient';

import { ChatCard } from './sidebar/ChatCard';
import { UserSearchPopover } from './sidebar/UserSearchPopover';
import { CalendarSearchPopover } from './sidebar/CalendarSearchPopover';

export default function ChatsSidebar() {
  const ctx = useMessengerContext();
  const currentUserIdStr = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'groups'>('all');

  // Поиск сообщений
  const [searchScope, setSearchScope] = useState<'current' | 'all'>('current');
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);
  const [dbFoundMessages, setDbFoundMessages] = useState<any[]>([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);

  // Фильтр по автору
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [userFilterQuery, setUserFilterQuery] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<any | null>(null);
  const [chatMembersList, setChatMembersList] = useState<any[]>([]);

  // Фильтр по дате
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | null>(null);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());

  // Контекстное меню чата
  const openChatContextMenu = (e: React.MouseEvent, chat: any) => {
    e.preventDefault();
    e.stopPropagation();

    const isGroup = Boolean(chat.isGroup || chat.type === 'group' || String(chat.id).startsWith('group_'));
    const isChannel = Boolean(chat.isChannel || chat.type === 'channel');
    const isPinned = Boolean(chat.isPinned);
    const isArchived = Boolean(chat.isArchived);
    const unreadCount = Number(chat.unreadCount ?? 0);
    const numericChatId = Number(chat.internalChatId || chat.chatId || chat.id);

    const items: any[] = [
      {
        label: 'Показать профиль',
        icon: '👤',
        onClick: () => ctx.setShowUserModal(String(chat.partnerId || chat.uuid || chat.id))
      },
      { isDivider: true },
      {
        label: isPinned ? 'Открепить' : 'Закрепить',
        icon: isPinned ? '📌' : '📍',
        onClick: async () => {
          if (ctx.handleTogglePinChat) {
            await ctx.handleTogglePinChat(chat.id, !isPinned);
          } else {
            ctx.setChats?.((prev: any[]) =>
              prev.map(c => String(c.id) === String(chat.id) ? { ...c, isPinned: !isPinned } : c)
            );
          }
        }
      },
      {
        label: unreadCount > 0 ? 'Пометить как прочитанное' : 'Пометить как непрочитанное',
        icon: unreadCount > 0 ? '✉️' : '📫',
        onClick: async () => {
          const nextCount = unreadCount > 0 ? 0 : 1;
          ctx.setChats?.((prev: any[]) =>
            prev.map(c => String(c.id) === String(chat.id) ? { ...c, unreadCount: nextCount } : c)
          );

          if (unreadCount > 0) {
            ctx.setAllMessages?.((prev: any[]) =>
              prev.map(m => (String(m.chatId) === String(chat.id) && String(m.senderId) !== currentUserIdStr) ? { ...m, status: 'read' } : m)
            );

            if (!isNaN(numericChatId)) {
              await supabase.from('messages').update({ status: 'read' }).eq('chatId', numericChatId).neq('senderId', currentUserIdStr).neq('status', 'read');
            }
          }
        }
      },
      {
        label: isArchived ? 'Разархивировать' : 'В архив',
        icon: isArchived ? '📤' : '📦',
        disabled: true,
        title: 'Уведомления в разработке',
        onClick: () => {}
      },
      {
        label: 'Без звука',
        icon: '🔕',
        disabled: true,
        title: 'Уведомления в разработке',
        onClick: () => {}
      },
      { isDivider: true },
      {
        label: 'Очистить историю',
        icon: '🧹',
        isDanger: true,
        onClick: () => {
          ctx.showConfirm('Очистка истории', `Очистить переписку с «${chat.name || 'этим чатом'}»?`, async () => {
            if (!isNaN(numericChatId)) await supabase.from('messages').delete().eq('chatId', numericChatId);
            ctx.setAllMessages?.((prev: any[]) => prev.filter(m => String(m.chatId) !== String(chat.id)));
            ctx.showToast('История сообщений очищена', 'success');
          }, true);
        }
      },
      {
        label: isGroup ? 'Покинуть беседу' : isChannel ? 'Покинуть канал' : 'Удалить чат',
        icon: '🗑️',
        isDanger: true,
        onClick: () => {
          ctx.showConfirm(isGroup ? 'Выход из беседы' : 'Удаление чата', `Удалить «${chat.name || 'чат'}»? Действие нельзя отменить.`, async () => {
            if (ctx.handleLeaveOrDeleteGroup && (isGroup || isChannel)) {
              await ctx.handleLeaveOrDeleteGroup(String(chat.id), chat.ownerId);
            } else {
              ctx.setChats?.((prev: any[]) => prev.filter(c => String(c.id) !== String(chat.id)));
              if (String(ctx.activeChatId) === String(chat.id)) ctx.setActiveChatId(null);
            }
            ctx.showToast('Чат удален', 'success');
          }, true);
        }
      }
    ];

    ctx.setCtxMenu({ show: true, x: e.clientX, y: e.clientY, items });
  };

  useEffect(() => {
    if (ctx.showMsgSearch) {
      setSearchScope('current');
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [ctx.showMsgSearch]);

  const activeChatObj = useMemo(() => {
    if (!ctx.activeChatId) return null;
    return (ctx.chats || []).find((c: any) => String(c.id) === String(ctx.activeChatId));
  }, [ctx.chats, ctx.activeChatId]);

  const isScopeSearchMode = Boolean(ctx.showMsgSearch);
  const isSearchActive = Boolean((ctx.searchQuery || '').trim()) || Boolean(selectedUserFilter) || Boolean(selectedDateFilter);

  useEffect(() => {
    if (!showUserPopover) return;
    const loadMembers = async () => {
      try {
        if (searchScope === 'current' && ctx.activeChatId) {
          const numChatId = Number(ctx.activeChatId);
          if (isNaN(numChatId)) return;
          const { data: memberRows } = await supabase.from('chat_members').select('userId').eq('chatId', numChatId);
          if (memberRows && memberRows.length > 0) {
            const { data: userData } = await supabase.from('users').select('*').in('uuid', memberRows.map((m: any) => String(m.userId)));
            if (userData) setChatMembersList(userData);
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

  const resolveMessageSender = (senderId: string | number) => {
    const senderIdStr = String(senderId);
    if (senderIdStr === currentUserIdStr) {
      return { name: 'Вы', avatarUrl: ctx.currentUser?.avatarUrl, avatarColor: ctx.currentUser?.avatarColor || '#007aff', isMe: true };
    }
    const contact = (ctx.contacts || []).find((c: any) => String(c.contactId || c.partnerId || c.uuid || c.id) === senderIdStr);
    const contactFullName = `${contact?.firstName && contact?.firstName !== 'EMPTY' ? contact.firstName : ''} ${contact?.lastName && contact?.lastName !== 'EMPTY' ? contact.lastName : ''}`.trim();
    const globalUser = (ctx.users || []).find((u: any) => String(u.uuid || u.id) === senderIdStr) || (ctx.chats || []).find((c: any) => String(c.uuid || c.partnerId) === senderIdStr);
    const userFullName = `${globalUser?.firstName || ''} ${globalUser?.lastName || ''}`.trim();
    const privacyFormat = globalUser?.privacyNameFormat || 'username';

    const displayName = contactFullName || (((privacyFormat === 'full_name' || privacyFormat === 'name') && userFullName) ? userFullName : (globalUser?.username || userFullName || globalUser?.name || 'Участник'));
    return { name: displayName, avatarUrl: contact?.avatarUrl || globalUser?.avatarUrl || null, avatarColor: contact?.avatarColor || globalUser?.avatarColor || '#5865F2', isMe: false };
  };

  useEffect(() => {
    const q = (ctx.searchQuery || '').trim();
    if (!isScopeSearchMode || (!q && !selectedUserFilter && !selectedDateFilter)) {
      setDbFoundMessages([]);
      setIsSearchingMessages(false);
      return;
    }
    setIsSearchingMessages(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const myChatNumericIds = (ctx.chats || []).map((c: any) => Number(c.internalChatId || c.chatId || c.id)).filter((id: number) => !isNaN(id) && id > 0);
        const res = await searchService.searchMessagesByScope({
          query: q,
          chatId: searchScope === 'current' ? ctx.activeChatId : null,
          myChatIds: searchScope === 'all' ? myChatNumericIds : undefined,
          senderId: selectedUserFilter ? String(selectedUserFilter.uuid || selectedUserFilter.id) : null,
          date: selectedDateFilter ? selectedDateFilter.toISOString().split('T')[0] : null,
          limit: 60
        });
        setDbFoundMessages(res);
      } catch (err) {
        console.error('Ошибка поиска сообщений:', err);
      } finally {
        setIsSearchingMessages(false);
      }
    }, 250);
    return () => clearTimeout(debounceTimer);
  }, [ctx.searchQuery, isScopeSearchMode, searchScope, ctx.activeChatId, ctx.chats, selectedUserFilter, selectedDateFilter]);

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

  function formatMessageTimeOrDate(isoString: string | undefined): string {
    if (!isoString) return '';
    try {
      const msgDate = new Date(isoString);
      const today = new Date();
      if (msgDate.toDateString() === today.toDateString()) {
        return `${String(msgDate.getHours()).padStart(2, '0')}:${String(msgDate.getMinutes()).padStart(2, '0')}`;
      }
      return `${String(msgDate.getDate()).padStart(2, '0')}.${String(msgDate.getMonth() + 1).padStart(2, '0')}`;
    } catch {
      return '';
    }
  }

  function formatSidebarMessageText(rawText: string | undefined): string {
    if (!rawText) return 'Нет сообщений';
    let cleanText = rawText.replace(/<\/?[^>]+(>|$)/g, '').trim();
    if (!cleanText.includes('{{user:') && !cleanText.includes('{{chat:')) return cleanText;

    cleanText = cleanText.replace(/\{\{chat:([a-zA-Z0-9_-]+)\}\}/g, (_, chatId) => {
      const foundChat = (ctx.chats || []).find((c: any) => String(c.id) === String(chatId));
      return foundChat?.name ? `«${foundChat.name}»` : 'беседу';
    });

    cleanText = cleanText.replace(/\{\{user:([a-zA-Z0-9_-]+)\}\}/g, (_, userUuid) => {
      if (userUuid === currentUserIdStr) return 'Вы';
      const contact = (ctx.contacts || []).find((c: any) => String(c.contactId || c.partnerId || c.uuid || c.id) === userUuid);
      if (contact && (contact.firstName || contact.lastName)) return `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
      const foundUser = (ctx.users || []).find((u: any) => String(u.uuid || u.id) === userUuid);
      return foundUser?.username || foundUser?.name || 'Пользователь';
    });

    return cleanText;
  }

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showUserPopover) return setShowUserPopover(false);
      if (showCalendarPopover) return setShowCalendarPopover(false);
      if (showScopeDropdown) return setShowScopeDropdown(false);
      if (ctx.ctxMenu?.show) return ctx.closeContextMenu?.();
      if (ctx.activeChatId) { e.preventDefault(); return ctx.setActiveChatId(null); }
      if ((ctx.searchQuery || '').trim() || selectedUserFilter || selectedDateFilter) {
        e.preventDefault();
        ctx.setSearchQuery('');
        setSelectedUserFilter(null);
        setSelectedDateFilter(null);
        return;
      }
      if (ctx.showMsgSearch) {
        e.preventDefault();
        ctx.setShowMsgSearch?.(false);
        setSearchScope('current');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [ctx.activeChatId, ctx.searchQuery, ctx.showMsgSearch, ctx.ctxMenu, showScopeDropdown, showUserPopover, showCalendarPopover, selectedUserFilter, selectedDateFilter]);

  const visibleChats = useMemo(() => {
    const query = ctx.searchQuery.trim().toLowerCase();
    const getLastTime = (c: any) => Number.isFinite(Date.parse(c.lastMessageAt)) ? Date.parse(c.lastMessageAt) : 0;

    return (ctx.chats || [])
      .filter((c: any) => {
        if (String(c.id) === '1') return true;
        if (c.isArchived) return false;
        if (!String(c.name ?? '').toLowerCase().includes(query)) return false;
        if (activeTab === 'unread' && Number(c.unreadCount ?? 0) <= 0) return false;
        if (activeTab === 'groups' && c.type !== 'group' && !c.isGroup) return false;
        return true;
      })
      .sort((a: any, b: any) => {
        if (String(a.id) === '1') return -1;
        if (String(b.id) === '1') return 1;
        return (Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned))) || (getLastTime(b) - getLastTime(a));
      });
  }, [ctx.chats, ctx.searchQuery, activeTab]);

  return (
    <section className={styles['chats-sidebar']} style={{ position: 'relative' }}>
      <div className={styles['sidebar-header']}>
        <div className={styles['header-search-row']}>
          <button type="button" className={styles['menu-toggle-btn']} onClick={() => ctx.setIsNavOpen?.(true)} title="Открыть меню">
            <Menu size={22} />
          </button>
        
          <div style={{ position: 'relative', width: '100%' }} className={styles['search-input-wrapper']}>
            <Search size={18} className={styles['sidebar-search-icon']} />
            <input 
              ref={searchInputRef}
              type="text" 
              id="chat-search"
              placeholder="Поиск" 
              className={styles['chat-search']} 
              value={ctx.searchQuery} 
              onChange={e => ctx.setSearchQuery(e.target.value)} 
              autoComplete="off"
            />

            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isScopeSearchMode && (
                <>
                  <button type="button" title="Показать сообщения от" onClick={() => { setShowUserPopover(p => !p); setShowCalendarPopover(false); setShowScopeDropdown(false); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                    <User size={16} color={selectedUserFilter ? '#8774e1' : '#8e8e93'} />
                  </button>
                  <button type="button" title="Поиск по дате" onClick={() => { setShowCalendarPopover(p => !p); setShowUserPopover(false); setShowScopeDropdown(false); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                    <Calendar size={16} color={selectedDateFilter ? '#8774e1' : '#8e8e93'} />
                  </button>
                </>
              )}
              {ctx.searchQuery && (
                <button type="button" onClick={() => ctx.setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ПЛАШКА ВЫБОРА ОБЛАСТИ ПОИСКА */}
        {isScopeSearchMode && (
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
                onClick={() => {
                  ctx.setShowMsgSearch?.(false);
                  ctx.setSearchQuery('');
                  setSelectedUserFilter(null);
                  setSelectedDateFilter(null);
                  setSearchScope('current');
                  setShowScopeDropdown(false);
                  setShowUserPopover(false);
                  setShowCalendarPopover(false);
                }}
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

      {!isSearchActive && !isScopeSearchMode && (
        <div className={styles['sidebar-tabs']}>
          <div className={`${styles['sidebar-tab-item']} ${activeTab === 'all' ? styles.active : ''}`} onClick={() => setActiveTab('all')} style={{ cursor: 'pointer' }}>
            <p>Все</p>
          </div>
          <div className={`${styles['sidebar-tab-item']} ${activeTab === 'unread' ? styles.active : ''}`} onClick={() => setActiveTab('unread')} style={{ cursor: 'pointer' }}>
            <p>Непрочитанные</p>
          </div>
          <div className={`${styles['sidebar-tab-item']} ${activeTab === 'groups' ? styles.active : ''}`} onClick={() => setActiveTab('groups')} style={{ cursor: 'pointer' }}>
            <p>Группы</p>
          </div>
        </div>
      )}

      <div className={styles['chats-list']}>
        {isScopeSearchMode ? (
          !isSearchActive ? (
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
                    <div key={`msg-${isCur ? 'cur' : 'all'}-${msg.id}`} className={styles['chat-preview-card']} onClick={() => handleScrollToMessage(msg.chatId, msg.id)} style={{ cursor: 'pointer' }}>
                      <div className={styles['avatar-wrapper']}>
                        <SmartAvatar size={42} avatarUrl={isCur ? author.avatarUrl : parentChat?.avatarUrl} avatarColor={isCur ? author.avatarColor : (parentChat?.avatarColor || '#007aff')} name={title} isChannel={!isCur && (parentChat?.isChannel || parentChat?.type === 'channel')} />
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
          )
        ) : isSearchActive ? (
          <div className={styles['search-results-container']}>
            {visibleChats.map((chat: any) => {
              const isGroupItem = Boolean(chat.isGroup || chat.type === 'group' || String(chat.id).startsWith('group_'));
              const isChannelItem = Boolean(chat.isChannel || chat.type === 'channel');

              return (
                <div key={`search-res-${chat.id}`} className={styles['chat-preview-card']} onClick={() => { ctx.setActiveChatId(String(chat.id)); ctx.setSearchQuery(''); }}>
                  <div className={styles['avatar-wrapper']}>
                    <SmartAvatar size={46} avatarUrl={chat.avatarUrl} avatarColor={chat.avatarColor} name={chat.name} isChannel={isChannelItem} />
                  </div>
                  <div className={styles['chat-info']}>
                    <span className={styles['chat-name']} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {isChannelItem && <Megaphone size={14} color="#8e8e93" style={{ flexShrink: 0, opacity: 0.85 }} />}
                      {!isChannelItem && isGroupItem && <Users size={14} color="#8e8e93" style={{ flexShrink: 0, opacity: 0.85 }} />}
                      {renderUserStatusBadge(chat)}
                      <span>{chat.name}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : visibleChats.length === 0 ? (
          <div style={{ color: '#636366', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>Чаты не найдены</div>
        ) : (
          visibleChats.map((chat: any) => (
            <ChatCard
              key={chat.id}
              chat={chat}
              isSelected={String(ctx.activeChatId) === String(chat.id)}
              currentUserIdStr={currentUserIdStr}
              isUserOnline={ctx.isUserOnline ? ctx.isUserOnline(chat) : false}
              onSelect={() => ctx.setActiveChatId(String(chat.id))}
              onContextMenu={(e) => openChatContextMenu(e, chat)}
              resolveSenderName={(senderId) => resolveMessageSender(senderId).name}
              formatText={formatSidebarMessageText}
              formatTime={formatMessageTimeOrDate}
            />
          ))
        )}
      </div>
    </section>
  );
}