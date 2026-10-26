import { useState, useEffect, useMemo, useRef } from 'react';
import styles from '../../components/css/sidebar.module.css';
import { 
  Check, CheckCheck, Clock, Search, Pin, Menu, X, 
  ChevronDown, ChevronUp, User, Calendar 
} from 'lucide-react';
import useMessengerContext, { formatUserOnlineStatus } from '../../context/messengerContext';
import { renderUserStatusBadge } from '../../utils/statusBadge';
import { searchService } from '../../services/searchService';
import SmartAvatar from '../../components/common/SmartAvatar';
import { supabase } from '../../services/supabaseClient';

export default function ChatsSidebar() {
  const ctx = useMessengerContext();
  const currentUserIdStr = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'groups'>('all');

  // 🎯 Поиск сообщений и режимы
  const [searchScope, setSearchScope] = useState<'current' | 'all'>('current');
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);
  const [dbFoundMessages, setDbFoundMessages] = useState<any[]>([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);

  // 👤 Фильтр по автору
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [userFilterQuery, setUserFilterQuery] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<any | null>(null);
  const [chatMembersList, setChatMembersList] = useState<any[]>([]);

  // 📅 Фильтр по дате
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | null>(null);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());

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
        onClick: () => {
          // Открываем модалку профиля этого чата/пользователя
          ctx.setShowUserModal(String(chat.partnerId || chat.uuid || chat.id));
        }
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
        // 🎯 ПОЛНОЦЕННАЯ СИНХРОНИЗАЦИЯ ПРОЧТЕНИЯ С БАЗОЙ ДАННЫХ
        label: unreadCount > 0 ? 'Пометить как прочитанное' : 'Пометить как непрочитанное',
        icon: unreadCount > 0 ? '✉️' : '📫',
        onClick: async () => {
          const nextCount = unreadCount > 0 ? 0 : 1;

          // 1. Моментальный оптимистичный апдейт локального сайдбара
          ctx.setChats?.((prev: any[]) =>
            prev.map(c => String(c.id) === String(chat.id) ? { ...c, unreadCount: nextCount } : c)
          );

          if (unreadCount > 0) {
            // 2. Локально меняем статусы сообщений у себя в стейте
            ctx.setAllMessages?.((prev: any[]) =>
              prev.map(m => {
                if (String(m.chatId) === String(chat.id) && String(m.senderId) !== currentUserIdStr) {
                  return { ...m, status: 'read' };
                }
                return m;
              })
            );

            // 3. Отправляем UPDATE в Supabase, чтобы у собеседника загорелась вторая галочка
            if (!isNaN(numericChatId)) {
              await supabase
                .from('messages')
                .update({ status: 'read' })
                .eq('chatId', numericChatId)
                .neq('senderId', currentUserIdStr)
                .neq('status', 'read');
            }
          }
        }
      },
      {
        // 📦 АРХИВИРОВАНИЕ / РАЗАРХИВИРОВАНИЕ
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
          ctx.showConfirm(
            'Очистка истории',
            `Вы действительно хотите очистить переписку с «${chat.name || 'этим чатом'}»?`,
            async () => {
              if (!isNaN(numericChatId)) {
                await supabase.from('messages').delete().eq('chatId', numericChatId);
              }
              ctx.setAllMessages?.((prev: any[]) => prev.filter(m => String(m.chatId) !== String(chat.id)));
              ctx.showToast('История сообщений очищена', 'success');
            },
            true
          );
        }
      },
      {
        label: isGroup ? 'Покинуть беседу' : isChannel ? 'Покинуть канал' : 'Удалить чат',
        icon: '🗑️',
        isDanger: true,
        onClick: () => {
          ctx.showConfirm(
            isGroup ? 'Выход из беседы' : 'Удаление чата',
            `Удалить «${chat.name || 'чат'}»? Действие нельзя отменить.`,
            async () => {
              if (ctx.handleLeaveOrDeleteGroup && (isGroup || isChannel)) {
                await ctx.handleLeaveOrDeleteGroup(String(chat.id), chat.ownerId);
              } else {
                ctx.setChats?.((prev: any[]) => prev.filter(c => String(c.id) !== String(chat.id)));
                if (String(ctx.activeChatId) === String(chat.id)) {
                  ctx.setActiveChatId(null);
                }
              }
              ctx.showToast('Чат удален', 'success');
            },
            true
          );
        }
      }
    ];

    ctx.setCtxMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      items
    });
  };

  // Синхронизация с кликом по лупе в шапке чата
  useEffect(() => {
    if (ctx.showMsgSearch) {
      setSearchScope('current');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [ctx.showMsgSearch]);

  const activeChatObj = useMemo(() => {
    if (!ctx.activeChatId) return null;
    return (ctx.chats || []).find((c: any) => String(c.id) === String(ctx.activeChatId));
  }, [ctx.chats, ctx.activeChatId]);

  const isScopeSearchMode = Boolean(ctx.showMsgSearch);
  const isSearchActive = Boolean((ctx.searchQuery || '').trim()) || Boolean(selectedUserFilter) || Boolean(selectedDateFilter);

  // 🎯 Загрузка участников при открытии поповера пользователей
  useEffect(() => {
    if (!showUserPopover) return;

    const loadMembers = async () => {
      try {
        if (searchScope === 'current' && ctx.activeChatId) {
          const numChatId = Number(ctx.activeChatId);
          if (isNaN(numChatId)) return;

          const { data: memberRows } = await supabase
            .from('chat_members')
            .select('userId')
            .eq('chatId', numChatId);

          if (memberRows && memberRows.length > 0) {
            const userUuids = memberRows.map((m: any) => String(m.userId));
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .in('uuid', userUuids);

            if (userData) {
              setChatMembersList(userData);
            }
          }
        } else {
          // В режиме «Мои чаты» выводим всех доступных контактов и собеседников
          const allUsers = ctx.users || [];
          setChatMembersList(allUsers);
        }
      } catch (err) {
        console.error('Ошибка загрузки участников для фильтра:', err);
      }
    };

    loadMembers();
  }, [showUserPopover, searchScope, ctx.activeChatId, ctx.users]);

  // 🎯 Фильтрация списка участников в поповере по строке поиска
  const filteredPopoverUsers = useMemo(() => {
    const q = userFilterQuery.trim().toLowerCase();
    return chatMembersList.filter((u: any) => {
      const contact = (ctx.contacts || []).find((c: any) => 
        String(c.contactId || c.partnerId || c.uuid || c.id) === String(u.uuid || u.id)
      );
      const fullName = contact && (contact.firstName || contact.lastName)
        ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
        : `${u.firstName || ''} ${u.lastName || ''}`.trim();
      const uname = u.username || '';

      if (!q) return true;
      return fullName.toLowerCase().includes(q) || uname.toLowerCase().includes(q);
    });
  }, [chatMembersList, userFilterQuery, ctx.contacts]);

  // 🎯 Хелпер: вычисление отображаемого имени и аватарки автора сообщения
  const resolveMessageSender = (senderId: string | number) => {
    const senderIdStr = String(senderId);
    const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');

    if (senderIdStr === myUuid) {
      return {
        name: 'Вы',
        avatarUrl: ctx.currentUser?.avatarUrl,
        avatarColor: ctx.currentUser?.avatarColor || '#007aff',
        isMe: true
      };
    }

    const contact = (ctx.contacts || []).find((c: any) => 
      String(c.contactId || c.partnerId || c.uuid || c.id) === senderIdStr
    );

    const fName = contact?.firstName && contact?.firstName !== 'EMPTY' ? contact.firstName : '';
    const lName = contact?.lastName && contact?.lastName !== 'EMPTY' ? contact.lastName : '';
    const contactFullName = `${fName} ${lName}`.trim();

    const globalUser = (ctx.users || []).find((u: any) => String(u.uuid || u.id) === senderIdStr) ||
                       (ctx.chats || []).find((c: any) => String(c.uuid || c.partnerId) === senderIdStr);

    const userFullName = `${globalUser?.firstName || ''} ${globalUser?.lastName || ''}`.trim();
    const privacyFormat = globalUser?.privacyNameFormat || 'username';

    const displayName = contactFullName
      ? contactFullName
      : ((privacyFormat === 'full_name' || privacyFormat === 'name') && userFullName)
      ? userFullName
      : (globalUser?.username || userFullName || globalUser?.name || 'Участник');
    const avatarUrl = contact?.avatarUrl || globalUser?.avatarUrl || null;
    const avatarColor = contact?.avatarColor || globalUser?.avatarColor || '#5865F2';

    return {
      name: displayName,
      avatarUrl,
      avatarColor,
      isMe: false
    };
  };

  // 🎯 Поиск сообщений в Supabase с учетом текста, автора и даты
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
        const myChatNumericIds = (ctx.chats || [])
          .map((c: any) => Number(c.internalChatId || c.chatId || c.id))
          .filter((id: number) => !isNaN(id) && id > 0);

        const dateStr = selectedDateFilter
          ? selectedDateFilter.toISOString().split('T')[0]
          : null;

        const res = await searchService.searchMessagesByScope({
          query: q,
          chatId: searchScope === 'current' ? ctx.activeChatId : null,
          myChatIds: searchScope === 'all' ? myChatNumericIds : undefined,
          senderId: selectedUserFilter ? String(selectedUserFilter.uuid || selectedUserFilter.id) : null,
          date: dateStr,
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
  }, [
    ctx.searchQuery, 
    isScopeSearchMode, 
    searchScope, 
    ctx.activeChatId, 
    ctx.chats, 
    selectedUserFilter, 
    selectedDateFilter
  ]);

  // 🎯 Скролл к сообщению
  const handleScrollToMessage = (chatId: string | number, messageId: string | number) => {
    const targetChatIdStr = String(chatId);
    if (String(ctx.activeChatId) !== targetChatIdStr) {
      ctx.setActiveChatId(targetChatIdStr);
    }

    setTimeout(() => {
      const el = document.getElementById(`message-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'background-color 0.3s ease';
        el.style.backgroundColor = 'rgba(157, 123, 246, 0.25)';
        setTimeout(() => {
          el.style.backgroundColor = 'transparent';
        }, 1200);
      }
    }, 150);
  };

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
    } catch {
      return '';
    }
  }

  function formatSidebarMessageText(rawText: string | undefined): string {
    if (!rawText) return 'Нет сообщений';
    let cleanText = rawText.replace(/<\/?[^>]+(>|$)/g, '').trim();
    if (!cleanText.includes('{{user:') && !cleanText.includes('{{chat:')) {
      return cleanText;
    }

    const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');

    cleanText = cleanText.replace(/\{\{chat:([a-zA-Z0-9_-]+)\}\}/g, (_, chatId) => {
      const foundChat = (ctx.chats || []).find((c: any) => String(c.id) === String(chatId));
      return foundChat?.name ? `«${foundChat.name}»` : 'беседу';
    });

    cleanText = cleanText.replace(/\{\{user:([a-zA-Z0-9_-]+)\}\}/g, (_, userUuid) => {
      if (userUuid === myUuid) return 'Вы';
      const contact = (ctx.contacts || []).find((c: any) => 
        String(c.contactId || c.partnerId || c.uuid || c.id) === userUuid
      );
      if (contact && (contact.firstName || contact.lastName)) {
        return `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
      }
      const foundUser = (ctx.users || []).find((u: any) => String(u.uuid || u.id) === userUuid);
      if (foundUser?.username || foundUser?.name) {
        return foundUser.username || foundUser.name;
      }
      const directChat = (ctx.chats || []).find((c: any) => 
        String(c.partnerId || c.uuid) === userUuid
      );
      if (directChat?.name) return directChat.name;
      return 'Пользователь';
    });

    return cleanText;
  }

  // 🎯 КАСКАДНАЯ ОБРАБОТКА ESC
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      // 0. Закрытие поповеров и меню
      if (showUserPopover) {
        setShowUserPopover(false);
        return;
      }
      if (showCalendarPopover) {
        setShowCalendarPopover(false);
        return;
      }
      if (showScopeDropdown) {
        setShowScopeDropdown(false);
        return;
      }
      if (ctx.ctxMenu?.show) {
        ctx.closeContextMenu?.();
        return;
      }

      // 1. Первый ESC: если открыт чат — закрываем чат
      if (ctx.activeChatId) {
        e.preventDefault();
        ctx.setActiveChatId(null);
        return;
      }

      // 2. Второй ESC: очищаем текст и сбрасываем фильтры
      if ((ctx.searchQuery || '').trim() || selectedUserFilter || selectedDateFilter) {
        e.preventDefault();
        ctx.setSearchQuery('');
        setSelectedUserFilter(null);
        setSelectedDateFilter(null);
        return;
      }

      // 3. Третий ESC: выключаем режим поиска сообщений
      if (ctx.showMsgSearch) {
        e.preventDefault();
        if (ctx.setShowMsgSearch) ctx.setShowMsgSearch(false);
        setSearchScope('current');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    ctx.activeChatId, 
    ctx.searchQuery, 
    ctx.showMsgSearch, 
    ctx.ctxMenu, 
    showScopeDropdown, 
    showUserPopover, 
    showCalendarPopover,
    selectedUserFilter,
    selectedDateFilter
  ]);

  const visibleChats = useMemo(() => {
    const query = ctx.searchQuery.trim().toLowerCase();

    const getLastMessageTime = (chat: any) => {
      const value = chat.lastMessageAt ? Date.parse(chat.lastMessageAt) : 0;
      return Number.isFinite(value) ? value : 0;
    };

    return (ctx.chats || [])
      .filter((chat: any) => {
        if (String(chat.id) === '1') return true;
        if (chat.isArchived) return false;

        const matchesSearch = String(chat.name ?? '').toLowerCase().includes(query);
        if (!matchesSearch) return false;

        if (activeTab === 'unread' && Number(chat.unreadCount ?? 0) <= 0) {
          return false;
        }

        if (activeTab === 'groups' && chat.type !== 'group' && !chat.isGroup) {
          return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        if (String(a.id) === '1') return -1;
        if (String(b.id) === '1') return 1;

        const pinnedDifference = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
        return pinnedDifference || (getLastMessageTime(b) - getLastMessageTime(a));
      });
  }, [ctx.chats, ctx.searchQuery, activeTab]);

  // Дни для календаря
  const calendarDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // День недели первого дня (0 - воскресенье, переводим на пн=0)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Array<{ date: Date; currentMonth: boolean }> = [];

    // Дни предыдущего месяца
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        currentMonth: false
      });
    }

    // Дни текущего месяца
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        currentMonth: true
      });
    }

    // Дни следующего месяца добиваем до полной сетки
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        currentMonth: false
      });
    }

    return days;
  }, [calendarViewDate]);

  const monthNamesRu = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  return (
    <section className={styles['chats-sidebar']} style={{ position: 'relative' }}>
      <div className={styles['sidebar-header']}>
        <div className={styles['header-search-row']}>
          <button 
            type="button" 
            className={styles['menu-toggle-btn']} 
            onClick={() => ctx.setIsNavOpen?.(true)}
            title="Открыть меню"
          >
            <Menu size={22} />
          </button>
        
          <div style={{ position: 'relative', width: '100%' }} className={styles['search-input-wrapper']}>
            <Search size={18} className={styles['sidebar-search-icon']}/>
            <input 
              ref={searchInputRef}
              type="text" 
              id='chat-search'
              placeholder="Поиск" 
              className={styles['chat-search']} 
              value={ctx.searchQuery} 
              onChange={e => ctx.setSearchQuery(e.target.value)} 
              autoComplete="off"
            />

            {/* Иконки быстрого фильтра и крестик очистки */}
            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isScopeSearchMode && (
                <>
                  <button
                    type="button"
                    title="Показать сообщения от"
                    onClick={() => {
                      setShowUserPopover(prev => !prev);
                      setShowCalendarPopover(false);
                      setShowScopeDropdown(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <User 
                      size={16} 
                      color={selectedUserFilter ? "#8774e1" : "#8e8e93"} 
                    />
                  </button>

                  <button
                    type="button"
                    title="Поиск по дате"
                    onClick={() => {
                      setShowCalendarPopover(prev => !prev);
                      setShowUserPopover(false);
                      setShowScopeDropdown(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Calendar 
                      size={16} 
                      color={selectedDateFilter ? "#8774e1" : "#8e8e93"} 
                    />
                  </button>
                </>
              )}
              {ctx.searchQuery && (
                <button
                  type="button"
                  onClick={() => ctx.setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 📌 ПЛАШКА: «Поиск в чате: [Эта группа / Мои чаты]» */}
        {isScopeSearchMode && (
          <div style={{ padding: '8px 12px 6px 12px', position: 'relative', borderBottom: '1px solid #232428' }}>
            <span style={{ fontSize: '12px', color: '#8e8e93', display: 'block', marginBottom: '6px' }}>
              Поиск в чате:
            </span>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div 
                onClick={() => {
                  setShowScopeDropdown(prev => !prev);
                  setShowUserPopover(false);
                  setShowCalendarPopover(false);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                  backgroundColor: '#1e1f26', padding: '5px 10px', borderRadius: '8px', border: '1px solid #2d2e38'
                }}
              >
                {searchScope === 'current' && activeChatObj ? (
                  <>
                    <SmartAvatar size={20} avatarUrl={activeChatObj.avatarUrl} avatarColor={activeChatObj.avatarColor} name={activeChatObj.name} />
                    <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>
                      {activeChatObj.isGroup ? 'Эта группа' : 'Этот чат'}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>💬 Мои чаты</span>
                )}
                <ChevronDown size={14} color="#8e8e93" />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (ctx.setShowMsgSearch) ctx.setShowMsgSearch(false);
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

            {/* Выпадающее меню выбора области */}
            {showScopeDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: '12px', zIndex: 1000,
                backgroundColor: '#1c1c24', border: '1px solid #2b2d31', borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)', overflow: 'hidden', minWidth: '170px', marginTop: '4px'
              }}>
                {activeChatObj && (
                  <div
                    onClick={() => { 
                      setSearchScope('current'); 
                      setShowScopeDropdown(false); 
                    }}
                    style={{ 
                      padding: '10px 12px', fontSize: '13px', color: '#fff', cursor: 'pointer', 
                      display: 'flex', alignItems: 'center', gap: '8px', 
                      backgroundColor: searchScope === 'current' ? '#252532' : 'transparent' 
                    }}
                  >
                    <SmartAvatar size={18} avatarUrl={activeChatObj.avatarUrl} avatarColor={activeChatObj.avatarColor} name={activeChatObj.name} />
                    <span>{activeChatObj.isGroup ? 'Эта группа' : 'Этот чат'}</span>
                  </div>
                )}
                <div
                  onClick={() => { 
                    setSearchScope('all'); 
                    setShowScopeDropdown(false); 
                  }}
                  style={{ 
                    padding: '10px 12px', fontSize: '13px', color: '#fff', cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', gap: '8px', 
                    backgroundColor: searchScope === 'all' ? '#252532' : 'transparent' 
                  }}
                >
                  <span>💬 Мои чаты</span>
                </div>
              </div>
            )}

            {/* 🏷️ АКТИВНЫЕ ЧИПЫ ФИЛЬТРОВ */}
            {(selectedUserFilter || selectedDateFilter) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                {selectedUserFilter && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#21202e',
                    border: '1px solid #3c3958', borderRadius: '14px', padding: '2px 8px', fontSize: '12px', color: '#cfcfcf'
                  }}>
                    <SmartAvatar size={16} avatarUrl={selectedUserFilter.avatarUrl} avatarColor={selectedUserFilter.avatarColor} name={selectedUserFilter.name || selectedUserFilter.username} />
                    <span>От: <b>{selectedUserFilter.name || selectedUserFilter.username}</b></span>
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedUserFilter(null)} />
                  </div>
                )}

                {selectedDateFilter && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#21202e',
                    border: '1px solid #3c3958', borderRadius: '14px', padding: '2px 8px', fontSize: '12px', color: '#cfcfcf'
                  }}>
                    <span>📅 <b>{selectedDateFilter.toLocaleDateString('ru-RU')}</b></span>
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => setSelectedDateFilter(null)} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 👤 ПОПОВЕР: «ПОКАЗАТЬ СООБЩЕНИЯ ОТ» (TELEGRAM STYLE СКРИНШОТ 1)             */}
      {/* ========================================================================= */}
      {showUserPopover && (
        <div style={{
          position: 'absolute', top: '56px', left: '16px', right: '16px', zIndex: 1200,
          backgroundColor: '#21212b', border: '1px solid #2f2f3d', borderRadius: '12px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.65)', display: 'flex', flexDirection: 'column',
          maxHeight: '460px', overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 16px 10px 16px', fontSize: '16px', fontWeight: 600, color: '#fff' }}>
            Показать сообщения от
          </div>

          <div style={{ padding: '0 16px 10px 16px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '26px', top: '10px', color: '#8e8e93' }} />
            <input
              type="text"
              placeholder="Поиск"
              value={userFilterQuery}
              onChange={e => setUserFilterQuery(e.target.value)}
              style={{
                width: '100%', backgroundColor: '#181820', border: '1px solid #2c2c38',
                borderRadius: '8px', padding: '8px 12px 8px 34px', color: '#fff', fontSize: '14px', outline: 'none'
              }}
              autoFocus
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '0 8px' }}>
            {filteredPopoverUsers.map((u: any) => {
              const senderData = resolveMessageSender(u.uuid || u.id);
              const status = formatUserOnlineStatus(u.updatedAt, u.privacyOnline);

              return (
                <div
                  key={u.uuid || u.id}
                  onClick={() => {
                    const targetUuid = String(u.uuid || u.id || u.partnerId);
                    setSelectedUserFilter({
                      uuid: targetUuid,
                      name: senderData.name,
                      avatarUrl: senderData.avatarUrl,
                      avatarColor: senderData.avatarColor
                    });
                    setShowUserPopover(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 10px',
                    borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2c2c3a'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <SmartAvatar size={40} avatarUrl={senderData.avatarUrl} avatarColor={senderData.avatarColor} name={senderData.name} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>{senderData.name}</span>
                    <span style={{ fontSize: '12px', color: status.isOnline ? '#007aff' : '#8e8e93' }}>
                      {status.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #2b2b38' }}>
            <button
              type="button"
              onClick={() => setShowUserPopover(false)}
              style={{ background: 'none', border: 'none', color: '#8774e1', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📅 ПОПОВЕР: КАЛЕНДАРЬ ВЫБОРА ДАТЫ (TELEGRAM STYLE СКРИНШОТ 2)              */}
      {/* ========================================================================= */}
      {showCalendarPopover && (
        <div style={{
          position: 'absolute', top: '56px', right: '16px', zIndex: 1200,
          backgroundColor: '#21212b', border: '1px solid #2f2f3d', borderRadius: '12px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.65)', width: '280px', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '12px', userSelect: 'none'
        }}>
          {/* Шапка календаря */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '15px', color: '#fff', fontWeight: 600 }}>
              {monthNamesRu[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()} г.
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', padding: '2px', display: 'flex' }}
              >
                <ChevronUp size={18} />
              </button>
              <button
                type="button"
                onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', padding: '2px', display: 'flex' }}
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Заголовки дней недели */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '12px', color: '#8e8e93', marginBottom: '2px' }}>
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <span key={d}>{d}</span>)}
          </div>

          {/* Сетка чисел */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
            {calendarDays.map((item, idx) => {
              const isSelected = selectedDateFilter &&
                selectedDateFilter.getDate() === item.date.getDate() &&
                selectedDateFilter.getMonth() === item.date.getMonth() &&
                selectedDateFilter.getFullYear() === item.date.getFullYear();

              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setSelectedDateFilter(item.date);
                    setShowCalendarPopover(false);
                  }}
                  style={{
                    height: '32px', borderRadius: '50%', border: 'none',
                    backgroundColor: isSelected ? '#8774e1' : 'transparent',
                    color: isSelected ? '#fff' : item.currentMonth ? '#fff' : '#555562',
                    fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', transition: 'background-color 0.15s'
                  }}
                >
                  {item.date.getDate()}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button
              type="button"
              onClick={() => setShowCalendarPopover(false)}
              style={{ background: 'none', border: 'none', color: '#8774e1', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

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
        {/* ========================================================= */}
        {/* 🔍 РЕЖИМ ПОИСКА СООБЩЕНИЙ В ЧАТАХ                         */}
        {/* ========================================================= */}
        {isScopeSearchMode ? (
          !isSearchActive ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#636366', gap: '12px', userSelect: 'none' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#1a1b22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={32} color="#525462" />
              </div>
              <span style={{ fontSize: '14px', color: '#8e8e98' }}>Поиск по сообщениям</span>
            </div>
          ) : isSearchingMessages ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#8e8e98', fontSize: '13px' }}>
              Поиск сообщений...
            </div>
          ) : (
            <div>
              <div style={{ padding: '10px 16px', fontSize: '13px', color: '#8e8e98', borderBottom: '1px solid #232428' }}>
                {searchScope === 'current'
                  ? `Найдено ${dbFoundMessages.length} сообщений`
                  : `Найдено ${dbFoundMessages.length} сообщений в чатах`}
              </div>

              {dbFoundMessages.length === 0 ? (
                <div style={{ padding: '30px 16px', textAlign: 'center', color: '#636366', fontSize: '14px' }}>
                  Сообщения не найдены
                </div>
              ) : (
                dbFoundMessages.map((msg: any) => {
                  const author = resolveMessageSender(msg.senderId);
                  const parentChat = (ctx.chats || []).find((c: any) => String(c.id) === String(msg.chatId));

                  if (searchScope === 'current') {
                    return (
                      <div
                        key={`msg-current-${msg.id}`}
                        className={styles['chat-preview-card']}
                        onClick={() => handleScrollToMessage(msg.chatId, msg.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className={styles['avatar-wrapper']}>
                          <SmartAvatar
                            size={42}
                            avatarUrl={author.avatarUrl}
                            avatarColor={author.avatarColor}
                            name={author.name}
                          />
                        </div>
                        <div className={styles['chat-info']}>
                          <div className={styles['chat-meta']}>
                            <span className={styles['chat-name']}>{author.name}</span>
                            <span className={styles['chat-time']}>{formatMessageTimeOrDate(msg.createdAt)}</span>
                          </div>
                          <div className={styles['chat-last-message']}>
                            <p style={{ color: '#cfcfcf' }}>{msg.text}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const chatTitle = parentChat?.name || `Чат #${msg.chatId}`;

                  return (
                    <div
                      key={`msg-all-${msg.id}`}
                      className={styles['chat-preview-card']}
                      onClick={() => handleScrollToMessage(msg.chatId, msg.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={styles['avatar-wrapper']}>
                        <SmartAvatar
                          size={42}
                          avatarUrl={parentChat?.avatarUrl}
                          avatarColor={parentChat?.avatarColor || '#007aff'}
                          name={chatTitle}
                          isChannel={parentChat?.isChannel || parentChat?.type === 'channel'}
                        />
                      </div>
                      <div className={styles['chat-info']}>
                        <div className={styles['chat-meta']}>
                          <span className={styles['chat-name']}>{chatTitle}</span>
                          <span className={styles['chat-time']}>{formatMessageTimeOrDate(msg.createdAt)}</span>
                        </div>
                        <div className={styles['chat-last-message']}>
                          <p style={{ color: '#cfcfcf' }}>
                            <span style={{ color: '#9d7bf6', fontWeight: 600 }}>{author.name}: </span>
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
            {visibleChats.map((chat: any) => (
              <div
                key={`search-res-${chat.id}`}
                className={styles['chat-preview-card']}
                onClick={() => {
                  ctx.setActiveChatId(String(chat.id));
                  ctx.setSearchQuery('');
                }}
              >
                <div className={styles['avatar-wrapper']}>
                  <SmartAvatar size={46} avatarUrl={chat.avatarUrl} avatarColor={chat.avatarColor} name={chat.name} />
                </div>
                <div className={styles['chat-info']}>
                  <span className={styles['chat-name']}>{chat.name}</span>
                </div>
              </div>
            ))}
          </div>
        ) : visibleChats.length === 0 ? (
          <div style={{ color: '#636366', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>
            Чаты не найдены
          </div>
        ) : (
          /* ========================================================= */
          /* 📋 СТАНДАРТНЫЙ СПИСОК ЧАТОВ                               */
          /* ========================================================= */
          visibleChats.map((chat: any) => {
            const hasLastMessage = chat.lastMessageId != null || chat.lastMessageAt != null;
            const lastMessage = hasLastMessage
              ? {
                  id: chat.lastMessageId,
                  text: chat.lastMessageText ?? '',
                  senderId: chat.lastMessageSenderUUID || chat.lastMessageSenderId,
                  createdAt: chat.lastMessageAt,
                }
              : null;
            
            const isMyLast = lastMessage?.senderId != null && String(lastMessage.senderId) === currentUserIdStr;
            const unreadCount = Number(chat.unreadCount ?? 0);
            const isSelected = String(ctx.activeChatId) === String(chat.id);
            const isGroup = Boolean(chat.isGroup || chat.type === 'group' || String(chat.id).startsWith('group_'));
            const senderIdStr = String(lastMessage?.senderId || '');

            // Вычисляем имя автора для беседы, если написал не я
            const otherSenderName = (!isMyLast && isGroup && senderIdStr)
              ? resolveMessageSender(senderIdStr).name
              : null;

            return (
              <div 
                key={chat.id} 
                className={`${styles['chat-preview-card']} ${isSelected ? styles.active : ''}`} 
                onClick={() => ctx.setActiveChatId(String(chat.id))}
                onContextMenu={(e) => openChatContextMenu(e, chat)}
              >
                <div className={styles['avatar-wrapper']}>
                  <SmartAvatar
                    size={48}
                    avatarUrl={chat.avatarUrl}
                    avatarColor={chat.avatarColor}
                    name={chat.name || chat.username}
                    isChannel={chat.isChannel}
                    showOnline={ctx.isUserOnline ? ctx.isUserOnline(chat) : false}
                  />
                </div>
                <div className={styles['chat-info']}>
                  <div className={styles['chat-meta']}>
                    <span className={styles['chat-name']}>
                      {renderUserStatusBadge(chat)}
                      {chat.name}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      {/* 🎯 ГАЛОЧКИ ДЛЯ ИСХОДЯЩИХ */}
                      {isMyLast && (
                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                          {chat.lastMessageStatus === 'sending' ? (
                            <Clock size={12} style={{ color: '#8e8e93' }} />
                          ) : chat.lastMessageStatus === 'read' ? (
                            <CheckCheck size={14} style={{ color: '#8e8e93' }} />
                          ) : (
                            <Check size={14} style={{ color: '#8e8e93' }} />
                          )}
                        </span>
                      )}

                      <span className={styles['chat-time']}>
                        {formatMessageTimeOrDate(lastMessage?.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles['chat-last-message']}>
                    <p style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: unreadCount > 0 ? '75%' : '85%' }}>
                      {isMyLast ? (
                        <span style={{ color: '#007aff', fontWeight: 'bold' }}>Вы: </span>
                      ) : otherSenderName ? (
                        <span style={{ color: '#8e8e93', fontWeight: 500 }}>{otherSenderName}: </span>
                      ) : null}
                      {formatSidebarMessageText(lastMessage?.text)}
                    </p>
                    
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {unreadCount > 0 ? (
                        <div style={{
                          minWidth: '18px', height: '18px', borderRadius: '10px',
                          backgroundColor: '#007aff', color: '#fff', fontSize: '11px', fontWeight: 'bold',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px'
                        }}>
                          {unreadCount}
                        </div>
                      ) : chat.isPinned && String(chat.id) !== '1' && (
                        <Pin size={13} style={{ color: '#8e8e93', transform: 'rotate(45deg)' }} />
                      )}
                    </div>
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