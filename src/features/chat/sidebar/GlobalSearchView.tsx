import React, { useState, useMemo, useRef, useEffect } from 'react';
import styles from '../../../components/css/sidebar.module.css';
import { Search, ArrowLeft, X, Check, Users, Megaphone } from 'lucide-react';
import useMessengerContext from '../../../context/messengerContext';
import SmartAvatar from '../../../components/common/SmartAvatar';
import { renderUserStatusBadge } from '../../../utils/statusBadge';
import { searchService } from '../../../services/searchService';

interface GlobalSearchViewProps {
  onClose: () => void;
  resolveMessageSender: (senderId: string | number) => any;
  formatMessageTimeOrDate: (isoString: string | undefined) => string;
}

const SEARCH_TABS = [
  { id: 'chats', title: 'Чаты', disabled: false },
  { id: 'channels', title: 'Каналы', disabled: false },
  { id: 'apps', title: 'Приложения', disabled: true },
  { id: 'posts', title: 'Посты', disabled: true },
  { id: 'photos', title: 'Фото', disabled: true },
  { id: 'videos', title: 'Видео', disabled: true },
  { id: 'downloads', title: 'Загрузки', disabled: true },
  { id: 'links', title: 'Ссылки', disabled: true },
  { id: 'files', title: 'Файлы', disabled: true },
  { id: 'music', title: 'Музыка', disabled: true },
  { id: 'voice', title: 'Голосовые', disabled: true },
];

type ScopeType = 'all' | 'archive' | 'direct' | 'groups' | 'channels';

const SCOPE_OPTIONS: Array<{ id: ScopeType; title: string }> = [
  { id: 'archive', title: 'Из архива' },
  { id: 'all', title: 'Все чаты' },
  { id: 'direct', title: 'Личные чаты' },
  { id: 'groups', title: 'Группы' },
  { id: 'channels', title: 'Каналы' },
];

function pluralizeMessages(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${count} сообщений`;
  if (mod10 === 1) return `${count} сообщение`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} сообщения`;
  return `${count} сообщений`;
}

const RECENT_SEARCH_STORAGE_KEY = 'blyades_recent_search_chat_ids';

export const GlobalSearchView: React.FC<GlobalSearchViewProps> = ({
  onClose,
  resolveMessageSender,
  formatMessageTimeOrDate,
}) => {
  const ctx = useMessengerContext();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState('chats');
  const [selectedScope, setSelectedScope] = useState<ScopeType>('all');
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);

  // 🎯 Загружаем список недавних чатов, открытых именно из поиска
  const [recentChatIds, setRecentChatIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [dbMessages, setDbMessages] = useState<any[]>([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  useEffect(() => {
    if (!showScopeDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowScopeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showScopeDropdown]);

  // 🎯 Добавление чата в список недавних поиска
  const addChatToRecent = (chatId: string | number) => {
    const idStr = String(chatId);
    setRecentChatIds(prev => {
      const updated = [idStr, ...prev.filter(id => id !== idStr)].slice(0, 20);
      try {
        localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Ошибка записи недавних чатов поиска:', err);
      }
      return updated;
    });
  };

  // Очистка недавних
  const handleClearRecent = () => {
    setRecentChatIds([]);
    try {
      localStorage.removeItem(RECENT_SEARCH_STORAGE_KEY);
    } catch (err) {
      console.error(err);
    }
  };

  const query = (ctx.searchQuery || '').trim();
  const isQueryEmpty = !query;

  // 1. Частые контакты (первые чаты пользователя)
  const frequentContacts = useMemo(() => {
    return (ctx.chats || [])
      .filter((c: any) => {
        if (c.isArchived) return false;
        if (activeTab === 'channels') {
          return c.isChannel || c.type === 'channel';
        }
        return true;
      })
      .slice(0, 10);
  }, [ctx.chats, activeTab]);

  // 2. 🎯 Недавние: ТОЛЬКО те чаты, которые были выбраны/открыты в режиме поиска
  const recentChats = useMemo(() => {
    if (recentChatIds.length === 0) return [];

    return recentChatIds
      .map(id => (ctx.chats || []).find((c: any) => String(c.id) === String(id)))
      .filter((c: any) => {
        if (!c || c.isArchived) return false;
        if (activeTab === 'channels') {
          return c.isChannel || c.type === 'channel';
        }
        return true;
      });
  }, [recentChatIds, ctx.chats, activeTab]);

  // 3. Совпадения среди чатов и каналов по тексту запроса
  const matchedChats = useMemo(() => {
    if (isQueryEmpty) return [];
    const q = query.toLowerCase();
    return (ctx.chats || []).filter((c: any) => {
      if (activeTab === 'channels' && !c.isChannel && c.type !== 'channel') {
        return false;
      }
      const name = String(c.name || c.username || '').toLowerCase();
      const login = String(c.uniqueId || '').toLowerCase();
      return name.includes(q) || login.includes(q);
    });
  }, [ctx.chats, query, isQueryEmpty, activeTab]);

  // 4. Поиск сообщений в базе данных
  useEffect(() => {
    if (isQueryEmpty) {
      setDbMessages([]);
      setIsSearchingMessages(false);
      return;
    }

    setIsSearchingMessages(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const myChatNumericIds = (ctx.chats || [])
          .map((c: any) => Number(c.internalChatId || c.chatId || c.id))
          .filter((id: number) => !isNaN(id) && id > 0);

        const res = await searchService.searchMessagesByScope({
          query,
          chatId: null,
          myChatIds: myChatNumericIds,
          limit: 100,
        });
        setDbMessages(res || []);
      } catch (err) {
        console.error('Ошибка глобального поиска сообщений:', err);
      } finally {
        setIsSearchingMessages(false);
      }
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [query, isQueryEmpty, ctx.chats]);

  const filteredMessages = useMemo(() => {
    return dbMessages.filter((msg: any) => {
      const parentChat = (ctx.chats || []).find((c: any) => String(c.id) === String(msg.chatId));
      if (!parentChat && selectedScope !== 'all') return false;

      if (activeTab === 'channels') {
        return Boolean(parentChat?.isChannel || parentChat?.type === 'channel');
      }

      if (selectedScope === 'archive') return Boolean(parentChat?.isArchived);
      if (parentChat?.isArchived) return false;

      if (selectedScope === 'direct') {
        return parentChat?.type === 'direct' || (!parentChat?.isGroup && !parentChat?.isChannel);
      }
      if (selectedScope === 'groups') {
        return Boolean(parentChat?.isGroup || parentChat?.type === 'group');
      }
      if (selectedScope === 'channels') {
        return Boolean(parentChat?.isChannel || parentChat?.type === 'channel');
      }
      return true;
    });
  }, [dbMessages, selectedScope, activeTab, ctx.chats]);

  // 🎯 При выборе чата — фиксируем его в недавние
  const handleSelectChat = (chatId: string | number) => {
    addChatToRecent(chatId);
    ctx.setActiveChatId(String(chatId));
    onClose();
  };

  // 🎯 При переходе к сообщению — родительский чат также фиксируем в недавние
  const handleScrollToMessage = (chatId: string | number, messageId: string | number) => {
    addChatToRecent(chatId);
    if (String(ctx.activeChatId) !== String(chatId)) {
      ctx.setActiveChatId(String(chatId));
    }
    onClose();
    setTimeout(() => {
      const el = document.getElementById(`message-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.backgroundColor = 'rgba(157, 123, 246, 0.25)';
        setTimeout(() => (el.style.backgroundColor = 'transparent'), 1200);
      }
    }, 150);
  };

  const selectedScopeTitle = SCOPE_OPTIONS.find((o) => o.id === selectedScope)?.title || 'Все чаты';

  return (
    <>
      <div 
        ref={tabsScrollRef}
        className={styles['global-search-tabs']}
        onWheel={handleTabsWheel}
      >
        {SEARCH_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <div 
              key={tab.id}
              className={`${styles['global-search-tab-item']} ${isActive ? styles.active : ''} ${tab.disabled ? styles.disabled : ''}`}
              onClick={() => {
                if (!tab.disabled) {
                  setActiveTab(tab.id);
                }
              }}
              title={tab.disabled ? 'Раздел в разработке' : undefined}
            >
              {tab.title}
            </div>
          );
        })}
      </div>

      <div className={styles['chats-list']} style={{ overflowY: 'auto' }}>
        {isQueryEmpty ? (
          <div className={styles['a']}>
            {frequentContacts.length > 0 && (
              <div>
                <div className={styles['search-section-header']}>
                  <span>{activeTab === 'channels' ? 'Частые каналы' : 'Частые контакты'}</span>
                  <button type="button" className={styles['search-section-action']}>Все</button>
                </div>

                <div className={styles['top-contacts-scroll']}>
                  {frequentContacts.map((contact: any) => (
                    <div 
                      key={`freq-${contact.id}`} 
                      className={styles['top-contact-card']}
                      onClick={() => handleSelectChat(contact.id)}
                    >
                      <SmartAvatar
                        size={50}
                        avatarUrl={contact.avatarUrl}
                        avatarColor={contact.avatarColor}
                        name={contact.name || contact.username}
                        isChannel={contact.isChannel || contact.type === 'channel'}
                        showOnline={ctx.isUserOnline ? ctx.isUserOnline(contact) : false}
                      />
                      <span className={styles['top-contact-name']}>
                        {(contact.name || contact.username || 'Чат').split(' ')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 🎯 Раздел «Недавние»: показывается только если есть чаты, открытые из поиска */}
            {recentChats.length > 0 && (
              <div>
                <div className={styles['search-section-header']}>
                  <span>Недавние</span>
                  <button 
                    type="button" 
                    className={styles['search-section-action']}
                    onClick={handleClearRecent}
                  >
                    Очистить
                  </button>
                </div>

                {recentChats.map((chat: any) => {
                  const isGroupItem = Boolean(chat.isGroup || chat.type === 'group' || String(chat.id).startsWith('group_'));
                  const isChannelItem = Boolean(chat.isChannel || chat.type === 'channel');
                  const isOnline = !isGroupItem && !isChannelItem && ctx.isUserOnline && ctx.isUserOnline(chat);

                  return (
                    <div 
                      key={`recent-${chat.id}`}
                      className={styles['chat-preview-card']}
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <div className={styles['avatar-wrapper']}>
                        <SmartAvatar
                          size={46}
                          avatarUrl={chat.avatarUrl}
                          avatarColor={chat.avatarColor}
                          name={chat.name || chat.username}
                          isChannel={isChannelItem}
                          showOnline={isOnline}
                        />
                      </div>
                      <div className={styles['chat-info']}>
                        <span className={styles['chat-name']}>
                          {renderUserStatusBadge(chat)}
                          {chat.name}
                        </span>
                        <div className={styles['chat-last-message']}>
                          <p style={{ color: isOnline ? '#2ec761' : '#8e8e93' }}>
                            {isChannelItem 
                              ? (chat.memberCount ? `${chat.memberCount} подписчиков` : 'канал')
                              : isGroupItem 
                              ? (chat.memberCount ? `${chat.memberCount} участников` : 'группа')
                              : isOnline ? 'в сети' : 'был(а) недавно'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            {matchedChats.length > 0 && (
              <div>
                {matchedChats.map((chat: any) => {
                  const isGroupItem = Boolean(chat.isGroup || chat.type === 'group' || String(chat.id).startsWith('group_'));
                  const isChannelItem = Boolean(chat.isChannel || chat.type === 'channel');

                  return (
                    <div 
                      key={`matched-chat-${chat.id}`}
                      className={styles['chat-preview-card']}
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <div className={styles['avatar-wrapper']}>
                        <SmartAvatar
                          size={46}
                          avatarUrl={chat.avatarUrl}
                          avatarColor={chat.avatarColor}
                          name={chat.name || chat.username}
                          isChannel={isChannelItem}
                        />
                      </div>
                      <div className={styles['chat-info']}>
                        <div className={styles['chat-meta']}>
                          <span className={styles['chat-name']} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {isChannelItem && <Megaphone size={14} color="#8e8e93" style={{ flexShrink: 0 }} />}
                            {!isChannelItem && isGroupItem && <Users size={14} color="#8e8e93" style={{ flexShrink: 0 }} />}
                            {renderUserStatusBadge(chat)}
                            <span>{chat.name}</span>
                          </span>
                          <span className={styles['chat-time']}>
                            {formatMessageTimeOrDate(chat.lastMessageAt)}
                          </span>
                        </div>
                        <div className={styles['chat-last-message']}>
                          <p style={{ color: '#8e8e93' }}>
                            {chat.lastMessageText || 'Нет сообщений'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={styles['messages-divider-bar']}>
              <span className={styles['messages-count-text']}>
                {isSearchingMessages 
                  ? 'Поиск сообщений...' 
                  : `Найдено ${pluralizeMessages(filteredMessages.length)}`}
              </span>

              <button 
                type="button" 
                className={styles['messages-scope-btn']}
                onClick={() => setShowScopeDropdown((prev) => !prev)}
              >
                {selectedScopeTitle}
              </button>

              {showScopeDropdown && (
                <div ref={dropdownRef} className={styles['scope-menu-dropdown']}>
                  {SCOPE_OPTIONS.map((opt) => {
                    const isSelected = selectedScope === opt.id;
                    return (
                      <div 
                        key={opt.id}
                        className={`${styles['scope-menu-item']} ${isSelected ? styles.active : ''}`}
                        onClick={() => {
                          setSelectedScope(opt.id);
                          setShowScopeDropdown(false);
                        }}
                      >
                        <span>{opt.title}</span>
                        {isSelected && <Check size={16} color="#9d7bf6" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {filteredMessages.length === 0 && !isSearchingMessages ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#636366', fontSize: '13px' }}>
                Сообщения не найдены
              </div>
            ) : (
              filteredMessages.map((msg: any) => {
                const author = resolveMessageSender(msg.senderId);
                const parentChat = (ctx.chats || []).find((c: any) => String(c.id) === String(msg.chatId));
                const isGroupChat = parentChat?.isGroup || parentChat?.type === 'group';
                const isChannelChat = parentChat?.isChannel || parentChat?.type === 'channel';

                return (
                  <div 
                    key={`search-msg-${msg.id}`}
                    className={styles['chat-preview-card']}
                    onClick={() => handleScrollToMessage(msg.chatId, msg.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles['avatar-wrapper']}>
                      <SmartAvatar
                        size={44}
                        avatarUrl={parentChat?.avatarUrl || author.avatarUrl}
                        avatarColor={parentChat?.avatarColor || author.avatarColor || '#007aff'}
                        name={parentChat?.name || author.name}
                        isChannel={isChannelChat}
                      />
                    </div>
                    <div className={styles['chat-info']}>
                      <div className={styles['chat-meta']}>
                        <span className={styles['chat-name']} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          {isChannelChat && <Megaphone size={14} color="#8e8e93" />}
                          {isGroupChat && <Users size={14} color="#8e8e93" />}
                          <span>{parentChat?.name || author.name}</span>
                        </span>
                        <span className={styles['chat-time']}>
                          {formatMessageTimeOrDate(msg.createdAt)}
                        </span>
                      </div>
                      <div className={styles['chat-last-message']}>
                        <p style={{ color: '#cfcfcf' }}>
                          {isGroupChat && (
                            <span style={{ color: '#9d7bf6', fontWeight: 600 }}>{author.name}: </span>
                          )}
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