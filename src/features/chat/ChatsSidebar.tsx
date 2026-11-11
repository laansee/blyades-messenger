import { useState, useEffect, useRef } from 'react';
import styles from '../../components/css/sidebar.module.css';
import { Search, Menu, X, User, Calendar } from 'lucide-react';
import useMessengerContext from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';

import { ChatsDefaultView } from './sidebar/ChatsDefaultView';
import { GlobalSearchView } from './sidebar/GlobalSearchView';
import { ChatMessageSearchView } from './sidebar/ChatMessageSearchView';

export default function ChatsSidebar() {
  const ctx = useMessengerContext();
  const currentUserIdStr = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Стейты режимов
  const [isGlobalSearchActive, setIsGlobalSearchActive] = useState(false);

  // Стейты фильтров поиска по сообщениям
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);
  const [selectedUserFilter, setSelectedUserFilter] = useState<any | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | null>(null);

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

  // Автофокус при включении поиска по сообщениям
  useEffect(() => {
    if (ctx.showMsgSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [ctx.showMsgSearch]);

  // Закрытие поиска по сообщениям
  const handleCloseMessageSearch = () => {
    ctx.setShowMsgSearch?.(false);
    ctx.setSearchQuery('');
    setSelectedUserFilter(null);
    setSelectedDateFilter(null);
    setShowUserPopover(false);
    setShowCalendarPopover(false);
    searchInputRef.current?.blur();
  };

  // Закрытие глобального поиска
  const handleCloseGlobalSearch = () => {
    setIsGlobalSearchActive(false);
    ctx.setSearchQuery('');
    searchInputRef.current?.blur();
  };

  // Поочередный Escape
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      // 1. Всплывающие окна фильтров поиска
      if (showUserPopover) {
        e.preventDefault();
        setShowUserPopover(false);
        return;
      }
      if (showCalendarPopover) {
        e.preventDefault();
        setShowCalendarPopover(false);
        return;
      }

      // 2. Активные плашки фильтров (по юзеру / дате)
      if (selectedUserFilter || selectedDateFilter) {
        e.preventDefault();
        setSelectedUserFilter(null);
        setSelectedDateFilter(null);
        return;
      }

      // 3. Открытое контекстное меню
      if (ctx.ctxMenu?.show) {
        e.preventDefault();
        return ctx.closeContextMenu?.();
      }

      // 4. Режим поиска по сообщениям чата
      if (ctx.showMsgSearch) {
        e.preventDefault();
        handleCloseMessageSearch();
        return;
      }

      // 5. Режим глобального поиска
      if (isGlobalSearchActive) {
        e.preventDefault();
        handleCloseGlobalSearch();
        return;
      }

      // 6. Сброс режима редактирования сообщения (если правили текст)
      if (ctx.editingMessage) {
        e.preventDefault();
        ctx.setEditingMessage(null);
        ctx.setMessageText('');
        return;
      }

      // 🎯 7. ЗАКРЫТИЕ АКТИВНОГО ЧАТА
      if (ctx.activeChatId) {
        e.preventDefault();
        ctx.setActiveChatId(null);
        if (ctx.setEditingMessage) ctx.setEditingMessage(null);
        if (ctx.setMessageText) ctx.setMessageText('');
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    showUserPopover,
    showCalendarPopover,
    selectedUserFilter,
    selectedDateFilter,
    ctx.showMsgSearch,
    isGlobalSearchActive,
    ctx.ctxMenu,
    ctx.editingMessage,
    ctx.activeChatId
  ]);

  const isMessageSearchMode = Boolean(ctx.showMsgSearch);
  const showGlobal = !isMessageSearchMode && (isGlobalSearchActive || Boolean((ctx.searchQuery || '').trim()));

  // 🎯 Бургер схлопывается, а инпут растягивается в ОБОИХ режимах поиска
  const isSearchInputExpanded = isMessageSearchMode || showGlobal;

  return (
    <section className={styles['chats-sidebar']} style={{ position: 'relative' }}>
      {/* 🎯 Единая строка поиска с плавной анимацией ширины */}
      <div className={styles['sidebar-header']}>
        <div className={styles['header-search-row']}>
          <button 
            type="button" 
            className={`${styles['menu-toggle-btn']} ${isSearchInputExpanded ? styles.collapsed : ''}`} 
            onClick={() => ctx.setIsNavOpen?.(true)} 
            title="Открыть меню"
          >
            <Menu size={22} />
          </button>
        
          <div className={styles['search-input-wrapper']}>
            <Search size={18} className={styles['sidebar-search-icon']} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Поиск" 
              className={styles['chat-search']} 
              value={ctx.searchQuery} 
              onFocus={() => {
                if (!isMessageSearchMode) setIsGlobalSearchActive(true);
              }}
              onClick={() => {
                if (!isMessageSearchMode) setIsGlobalSearchActive(true);
              }}
              onChange={e => {
                ctx.setSearchQuery(e.target.value);
                if (!isMessageSearchMode && !isGlobalSearchActive) setIsGlobalSearchActive(true);
              }} 
              autoComplete="off"
            />

            {/* 🎯 1. В режиме поиска по сообщениям: иконки 👤, 📅 и ✖ */}
            {isMessageSearchMode ? (
              <div className={styles['search-actions-group']}>
                <button 
                  type="button" 
                  title="Показать сообщения от" 
                  onClick={(e) => { 
                    e.stopPropagation();
                    setShowUserPopover(p => !p); 
                    setShowCalendarPopover(false); 
                  }} 
                  className={styles['search-action-icon-btn']}
                >
                  <User size={16} color={selectedUserFilter ? '#8774e1' : '#8e8e93'} />
                </button>
                <button 
                  type="button" 
                  title="Поиск по дате" 
                  onClick={(e) => { 
                    e.stopPropagation();
                    setShowCalendarPopover(p => !p); 
                    setShowUserPopover(false); 
                  }} 
                  className={styles['search-action-icon-btn']}
                >
                  <Calendar size={16} color={selectedDateFilter ? '#8774e1' : '#8e8e93'} />
                </button>
                <button 
                  type="button" 
                  onClick={handleCloseMessageSearch} 
                  className={styles['search-action-icon-btn']}
                  title="Закрыть поиск сообщений"
                >
                  <X size={16} />
                </button>
              </div>
            ) : showGlobal ? (
              /* 🎯 2. В режиме глобального поиска: крестик закрытия */
              <button 
                type="button" 
                className={styles['search-clear-exit-btn']}
                onClick={handleCloseGlobalSearch}
                title="Выйти из поиска"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {isMessageSearchMode ? (
        <ChatMessageSearchView
          showUserPopover={showUserPopover}
          setShowUserPopover={setShowUserPopover}
          showCalendarPopover={showCalendarPopover}
          setShowCalendarPopover={setShowCalendarPopover}
          selectedUserFilter={selectedUserFilter}
          setSelectedUserFilter={setSelectedUserFilter}
          selectedDateFilter={selectedDateFilter}
          setSelectedDateFilter={setSelectedDateFilter}
          onCloseSearch={handleCloseMessageSearch}
          resolveMessageSender={resolveMessageSender}
          formatMessageTimeOrDate={formatMessageTimeOrDate}
        />
      ) : showGlobal ? (
        <GlobalSearchView
          onClose={handleCloseGlobalSearch}
          resolveMessageSender={resolveMessageSender}
          formatMessageTimeOrDate={formatMessageTimeOrDate}
        />
      ) : (
        <ChatsDefaultView
          currentUserIdStr={currentUserIdStr}
          onOpenContextMenu={openChatContextMenu}
          resolveSenderName={(senderId) => resolveMessageSender(senderId).name}
          formatSidebarMessageText={formatSidebarMessageText}
          formatMessageTimeOrDate={formatMessageTimeOrDate}
        />
      )}
    </section>
  );
}