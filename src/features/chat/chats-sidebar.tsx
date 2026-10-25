import { useState, useEffect, useMemo } from 'react';
import styles from '../../components/css/sidebar.module.css';
import { Check, CheckCheck, Clock, Search, Pin, Menu } from 'lucide-react';
import useMessengerContext from '../../context/messengerContext';
import { renderUserStatusBadge } from '../../utils/statusBadge';
import { searchService, type GlobalSearchResult } from '../../services/searchService';
import SmartAvatar from '../../components/common/SmartAvatar';

export default function ChatsSidebar() {
  const ctx = useMessengerContext();
  const currentUserIdStr = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'groups'>('all');

  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [globalResults, setGlobalResults] = useState<GlobalSearchResult>({ users: [], publicChats: [] });
  const [matchedMessages, setMatchedMessages] = useState<any[]>([]);

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

  // 🎯 Парсер шаблонов {{user:...}} и {{chat:...}} в понятный чистый текст для сайдбара
  function formatSidebarMessageText(rawText: string | undefined): string {
    if (!rawText) return 'Нет сообщений';

    // 1. Очищаем от HTML-тегов, если они были в старых сообщениях
    let cleanText = rawText.replace(/<\/?[^>]+(>|$)/g, '').trim();

    // 2. Если в сообщении нет токенов, сразу возвращаем текст
    if (!cleanText.includes('{{user:') && !cleanText.includes('{{chat:')) {
      return cleanText;
    }

    const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');

    // 3. Заменяем токены бесед: {{chat:ID}}
    cleanText = cleanText.replace(/\{\{chat:([a-zA-Z0-9_-]+)\}\}/g, (_, chatId) => {
      const foundChat = (ctx.chats || []).find((c: any) => String(c.id) === String(chatId));
      return foundChat?.name ? `«${foundChat.name}»` : 'беседу';
    });

    // 4. Заменяем токены пользователей: {{user:UUID}}
    cleanText = cleanText.replace(/\{\{user:([a-zA-Z0-9_-]+)\}\}/g, (_, userUuid) => {
      if (userUuid === myUuid) return 'Вы';

      // Проверяем в контактах
      const contact = (ctx.contacts || []).find((c: any) => 
        String(c.contactId || c.partnerId || c.uuid || c.id) === userUuid
      );
      if (contact && (contact.firstName || contact.lastName)) {
        return `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
      }

      // Ищем в пользователях или чатах
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

  const isSearchActive = Boolean((ctx.searchQuery || '').trim());
  const queryLower = (ctx.searchQuery || '').trim().toLowerCase();

  // Локальные чаты, контакты и диалоги, подходящие под запрос
  const matchedLocalChats = useMemo(() => {
    if (!isSearchActive) return [];

    const results: any[] = [];
    const addedUuids = new Set<string>();

    // 1. Поиск по существующим чатам (группы, каналы, существующие диалоги)
    (ctx.chats || []).forEach((chat: any) => {
      const nameMatch = (chat.name || '').toLowerCase().includes(queryLower);
      const usernameMatch = (chat.username || chat.uniqueId || '').toLowerCase().includes(queryLower);
      const noteMatch = (chat.note || '').toLowerCase().includes(queryLower);

      if (nameMatch || usernameMatch || noteMatch) {
        results.push(chat);
        const targetUuid = String(chat.partnerId || chat.uuid || '');
        if (targetUuid) addedUuids.add(targetUuid);
      }
    });

    // 2. Поиск по списку контактов (если с контактом еще нет начатого личного чата)
    (ctx.contacts || []).forEach((contact: any) => {
      const contactUuid = String(contact.contactId || contact.partnerId || contact.uuid || '');
      if (addedUuids.has(contactUuid)) return;

      const fName = contact.firstName && contact.firstName !== 'EMPTY' ? contact.firstName : '';
      const lName = contact.lastName && contact.lastName !== 'EMPTY' ? contact.lastName : '';
      const fullName = `${fName} ${lName}`.trim();
      const note = contact.note && contact.note !== 'EMPTY' ? contact.note : '';

      // Находим глобальные данные этого юзера из ctx.users для проверки uniqueId
      const globalUser = (ctx.users || []).find((u: any) => String(u.uuid || u.id) === contactUuid);
      const uniqueId = globalUser?.uniqueId || '';
      const username = globalUser?.username || '';

      const match = fullName.toLowerCase().includes(queryLower) ||
                    note.toLowerCase().includes(queryLower) ||
                    uniqueId.toLowerCase().includes(queryLower) ||
                    username.toLowerCase().includes(queryLower);

      if (match) {
        results.push({
          ...(globalUser || {}),
          id: `contact_${contactUuid}`,
          uuid: contactUuid,
          partnerId: contactUuid,
          name: fullName || username || uniqueId || 'Контакт',
          username: username || uniqueId,
          uniqueId: uniqueId,
          isContact: true,
          contactFirstName: fName,
          contactLastName: lName,
          note: note,
          avatarUrl: globalUser?.avatarUrl,
          avatarColor: globalUser?.avatarColor || '#5865F2'
        });
        addedUuids.add(contactUuid);
      }
    });

    return results;
  }, [ctx.chats, ctx.contacts, ctx.users, queryLower, isSearchActive]);

  useEffect(() => {
    const q = (ctx.searchQuery || '').trim();
    if (!q) {
      setGlobalResults({ users: [], publicChats: [] });
      setMatchedMessages([]);
      setIsSearchingGlobal(false);
      return;
    }

    setIsSearchingGlobal(true);
    const timer = setTimeout(async () => {
      try {
        const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');
        const myChatNumericIds = (ctx.chats || [])
          .map((c: any) => Number(c.internalChatId || c.chatId || c.id))
          .filter((id: number) => !isNaN(id));

        const [globalData, messagesData] = await Promise.all([
          searchService.searchGlobal(q, myUuid),
          searchService.searchMessagesInMyChats(myChatNumericIds, q, 10)
        ]);

        setGlobalResults(globalData);
        setMatchedMessages(messagesData);
      } catch (err) {
        console.error('Ошибка выполнения поиска:', err);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [ctx.searchQuery, ctx.currentUser, ctx.chats]);

  return (
    <section className={styles['chats-sidebar']}>
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
            type="search" 
            id='chat-search'
            placeholder="Поиск по чатам..." 
            className={styles['chat-search']} 
            value={ctx.searchQuery} 
            onChange={e => ctx.setSearchQuery(e.target.value)} 
            autoComplete="off"
          />
          </div>
        </div>
      </div>

      {!isSearchActive && (
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
      )}

      <div className={styles['chats-list']}>
        {ctx.chatsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={`skeleton-${i}`} className={styles['chat-preview-card']} style={{ pointerEvents: 'none', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '12px', padding: '10px' }}>
              <div className={styles['avatar-wrapper']}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#2b2d31' }} />
              </div>
              <div className={styles['chat-info']} style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ width: '40%', height: '14px', backgroundColor: '#2b2d31', borderRadius: '4px' }} />
                <div style={{ width: '75%', height: '11px', backgroundColor: '#1e1f22', borderRadius: '4px' }} />
              </div>
            </div>
          ))
        ) : isSearchActive ? (
          /* ========================================================= */
          /* 🔍 РЕЖИМ ПОИСКА: ДВУХУРОВНЕВАЯ ВЫДАЧА (TELEGRAM STYLE)    */
          /* ========================================================= */
          <div className={styles['search-results-container']}>
            {/* 📂 БЛОК 1: ЛОКАЛЬНЫЕ ЧАТЫ И КОНТАКТЫ */}
            {matchedLocalChats.length > 0 && (
              <div>
                <div className={styles['search-section-header']}>Чаты и контакты</div>
                {matchedLocalChats.map((chat: any) => (
                  <div
                    key={`local-search-${chat.id}`}
                    className={`${styles['chat-preview-card']} ${String(ctx.activeChatId) === String(chat.id) ? styles.active : ''}`}
                    onClick={() => {
                      ctx.setActiveChatId(String(chat.id));
                      ctx.setSearchQuery('');
                    }}
                  >
                    <div className={styles['avatar-wrapper']}>
                      <SmartAvatar
                        size={46}
                        avatarUrl={chat.avatarUrl}
                        avatarColor={chat.avatarColor}
                        name={chat.name || chat.username}
                        isChannel={chat.isChannel}
                      />
                    </div>
                    <div className={styles['chat-info']}>
                      <div className={styles['chat-meta']}>
                        <span className={styles['chat-name']}>
                          {renderUserStatusBadge(chat)}
                          {chat.name}
                        </span>
                      </div>
                      <div className={styles['chat-last-message']}>
                        <p style={{ color: '#8e8e98' }}>
                          {chat.isChannel ? 'Канал' : chat.isGroup ? 'Беседа' : `@${chat.uniqueId || chat.username || 'user'}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 💬 НАЙДЕННЫЕ СООБЩЕНИЯ ИЗ ТВОИХ ЧАТОВ */}
            {matchedMessages.length > 0 && (
              <div>
                <div className={styles['search-section-header']}>Сообщения</div>
                {matchedMessages.map((msg: any) => {
                  const parentChat = (ctx.chats || []).find((c: any) => Number(c.id) === Number(msg.chatId));
                  return (
                    <div
                      key={`msg-search-${msg.id}`}
                      className={styles['search-item-global']}
                      onClick={() => {
                        ctx.setActiveChatId(String(msg.chatId));
                        ctx.setSearchQuery('');
                      }}
                    >
                      <SmartAvatar
                        size={40}
                        avatarUrl={parentChat?.avatarUrl}
                        avatarColor={parentChat?.avatarColor || '#8b5cf6'}
                        name={parentChat?.name || 'Чат'}
                      />
                      <div className={styles['search-item-info']}>
                        <div className={styles['search-item-title']}>
                          <span>{parentChat?.name || 'Чат'}</span>
                          <span style={{ fontSize: '11px', color: '#8e8e98', marginLeft: 'auto' }}>
                            {formatMessageTimeOrDate(msg.createdAt)}
                          </span>
                        </div>
                        <div className={styles['search-item-subtitle']}>
                          {msg.text.replace(/<\/?[^>]+(>|$)/g, "")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 🌐 БЛОК 2: РЕЗУЛЬТАТЫ ОБЩЕГО ПОИСКА СНИЗУ */}
            {(globalResults.publicChats.length > 0 || globalResults.users.length > 0) && (
              <div>
                <div className={styles['search-section-header']}>Результаты общего поиска</div>

                {/* Публичные каналы и группы */}
                {globalResults.publicChats.map((chat: any) => (
                  <div
                    key={`global-chat-${chat.id}`}
                    className={styles['search-item-global']}
                    onClick={() => {
                      ctx.setShowUserModal(String(chat.id));
                      ctx.setSearchQuery('');
                    }}
                  >
                    <SmartAvatar
                      size={42}
                      avatarUrl={chat.avatarUrl}
                      avatarColor={chat.avatarColor || '#5865F2'}
                      name={chat.name}
                      isChannel={chat.type === 'channel'}
                    />
                    <div className={styles['search-item-info']}>
                      <div className={styles['search-item-title']}>
                        <span>{chat.name}</span>
                        <span className={styles['search-item-badge']}>
                          {chat.type === 'channel' ? 'канал' : 'беседа'}
                        </span>
                      </div>
                      <div className={styles['search-item-subtitle']}>
                        @{chat.publicId || `id${chat.id}`}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Пользователи платформы */}
                {globalResults.users
                  .filter((user: any) => {
                    const userUuid = String(user.uuid || user.id);
                    const isAlreadyContact = (ctx.contacts || []).some(
                      (c: any) => String(c.contactId || c.partnerId) === userUuid
                    );
                    return !isAlreadyContact;
                  })
                  .map((user: any) => (
                    <div
                      key={`global-user-${user.uuid || user.id}`}
                      className={styles['search-item-global']}
                      onClick={() => {
                        if (ctx.openOrCreateDirectChat) {
                          ctx.openOrCreateDirectChat(user);
                        }
                      }}
                    >
                      <SmartAvatar
                        size={42}
                        avatarUrl={user.avatarUrl}
                        avatarColor={user.avatarColor || '#8b5cf6'}
                        name={user.username}
                      />
                      <div className={styles['search-item-info']}>
                        <div className={styles['search-item-title']}>
                          <span>{user.username}</span>
                        </div>
                        <div className={styles['search-item-subtitle']}>
                          @{user.uniqueId || user.username}
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            )}

            {/* Пустое состояние */}
            {!isSearchingGlobal &&
              matchedLocalChats.length === 0 &&
              matchedMessages.length === 0 &&
              globalResults.publicChats.length === 0 &&
              globalResults.users.length === 0 && (
                <div className={styles['search-empty-state']}>
                  Ничего не найдено
                </div>
              )}
          </div>
        ) : ctx.chats.length === 0 ? (
          /* ========================================================= */
          /* 📋 СТАНДАРТНЫЙ СПИСОК ЧАТОВ (КОГДА ПОИСК ПУСТ)            */
          /* ========================================================= */
          <div style={{ color: '#636366', textAlign: 'center', marginTop: '60px', padding: '0 20px', fontSize: '14px', lineHeight: 1.5 }}>
            <p style={{ fontSize: '24px', margin: '0 0 10px 0' }}>🤷‍♂️</p>
            <strong>У вас пока нет активных чатов</strong>
          </div>
        ) : visibleChats.length === 0 ? (
          <div style={{ color: '#636366', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>
            {activeTab === 'all' && 'Чаты не найдены'}
            {activeTab === 'unread' && 'Нет непрочитанных сообщений'}
            {activeTab === 'groups' && 'У вас пока нет групповых чатов'}
          </div>
        ) : (
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
            const isChannel = Boolean(chat.isChannel || chat.type === 'channel');

            return (
              <div 
                key={chat.id} 
                className={`${styles['chat-preview-card']} ${isSelected ? styles.active : ''}`} 
                onClick={() => ctx.setActiveChatId(String(chat.id))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const menuItems: any[] = [
                    {
                      label: 'Открыть в новом окне',
                      icon: '🪟',
                      disabled: true,
                      title: 'В разработке',
                      onClick: () => {}
                    },
                    {
                      label: chat.isPinned ? 'Открепить' : 'Закрепить',
                      icon: '📌',
                      onClick: () => {
                        if (ctx.handleTogglePinChat) {
                          ctx.handleTogglePinChat(chat.id);
                        } else if (ctx.setChats) {
                          ctx.setChats((prev: any[]) =>
                            prev.map((c: any) =>
                              String(c.id) === String(chat.id) ? { ...c, isPinned: !c.isPinned } : c
                            )
                          );
                          ctx.showToast?.(chat.isPinned ? 'Чат откреплен' : 'Чат закреплен', 'info');
                        }
                      }
                    },
                    {
                      label: 'Выключить звук',
                      icon: '🔕',
                      disabled: true,
                      title: 'Уведомления в разработке',
                      onClick: () => {}
                    },
                    {
                      label: 'В архив',
                      icon: '📁',
                      disabled: true,
                      title: 'Архивация чатов в разработке',
                      onClick: () => {}
                    },
                    {
                      label: isChannel ? 'О канале' : isGroup ? 'О группе' : 'Профиль пользователя',
                      icon: '👤',
                      onClick: () => {
                        // 🎯 Открываем модалку профиля, НЕ меняя ctx.activeChatId!
                        ctx.setShowUserModal(chat.uuid || chat.id || true);
                      }
                    },
                    { isDivider: true },
                    {
                      label: isGroup || isChannel ? 'Покинуть' : 'Удалить чат',
                      icon: '🗑️',
                      isDanger: true,
                      onClick: () => {
                        ctx.showConfirm(
                          isGroup || isChannel ? 'Выход' : 'Удаление чата',
                          `Вы действительно хотите ${isGroup || isChannel ? 'покинуть' : 'удалить'} "${chat.name || 'чат'}"?`,
                          async () => {
                            if (ctx.handleLeaveOrDeleteGroup && (isGroup || isChannel)) {
                              await ctx.handleLeaveOrDeleteGroup(String(chat.id), chat.ownerId);
                            } else {
                              if (ctx.setChats) {
                                ctx.setChats((prev: any[]) => prev.filter((c: any) => String(c.id) !== String(chat.id)));
                              }
                              if (String(ctx.activeChatId) === String(chat.id)) {
                                ctx.setActiveChatId(null);
                              }
                              ctx.showToast?.('Чат удален', 'success');
                            }
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
                    items: menuItems
                  });
                }}
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
                      {chat.isPinned && String(chat.id) !== '1' && chat.uniqueId !== 'news' && (
                        <Pin size={13} style={{ color: '#8e8e93', transform: 'rotate(45deg)' }} />
                      )}

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
                      {isMyLast && <span style={{ color: '#007aff', fontWeight: 'bold' }}>Вы: </span>}
                      {formatSidebarMessageText(lastMessage?.text)}
                    </p>
                    
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {unreadCount > 0 && (
                        <div style={{
                          minWidth: '18px', height: '18px', borderRadius: '10px',
                          backgroundColor: '#007aff', color: '#fff', fontSize: '11px', fontWeight: 'bold',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                          boxShadow: '0 2px 6px rgba(0, 122, 255, 0.3)'
                        }}>
                          {unreadCount}
                        </div>
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
