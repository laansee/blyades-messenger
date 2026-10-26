import { useState, useEffect } from 'react';
import styles from '../../components/css/sidebar.module.css';
import useMessengerContext from '../../context/messengerContext';
import { userService, type AppUser } from '../../services/userService';
import { renderUserStatusBadge } from '../../utils/statusBadge';
import { Search } from 'lucide-react';

export default function ContactsSidebar() {
  const ctx = useMessengerContext();
  const [globalSearchUsers, setGlobalSearchUsers] = useState<AppUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');
  const contactsList = (ctx.chats || []).filter((c: any) => c.isContact === true);

  // 🚀 ГЛОБАЛЬНЫЙ ПОИСК ПО БАЗЕ SUPABASE
  useEffect(() => {
    const query = ctx.searchQuery?.trim();
    if (!query) {
      setGlobalSearchUsers([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await userService.searchUsers(query, myUuid);
        setGlobalSearchUsers(found);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [ctx.searchQuery, myUuid]);

  return (
    <section className={styles['chats-sidebar']}>
      <div className={styles['sidebar-header']}>
        <h2>Контакты</h2>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} className={styles['sidebar-search-icon']} />
          <input 
            type="search" 
            id='contacts-search'
            placeholder="Поиск по логину или имени..." 
            className={styles['chat-search']} 
            value={ctx.searchQuery} 
            onChange={e => ctx.setSearchQuery(e.target.value)} 
            autoComplete="off"
          />
        </div>
      </div>
      
      <div className={styles['chats-list']}>
        {ctx.searchQuery.trim() === '' ? (
          /* ======================================================== */
          /* РЕЖИМ 1: СПИСОК ВАШИХ КОНТАКТОВ                         */
          /* ======================================================== */
          contactsList.length === 0 ? (
            <div style={{ color: '#636366', fontSize: '13px', textAlign: 'center', padding: '30px 16px' }}>
              У вас пока нет сохранённых контактов
            </div>
          ) : (
            contactsList.map((contact: any) => {
              const displayName = contact.name || contact.username || 'Пользователь';
              const isActive = String(ctx.activeChatId) === String(contact.id);
              // 🎯 Статус онлайна через единую функцию контекста с проверкой приватности
              const isOnline = ctx.isUserOnline ? ctx.isUserOnline(contact) : false;

              return (
                <div 
                  key={contact.id} 
                  className={`${styles['chat-preview-card']} ${isActive ? styles.active : ''}`} 
                  onClick={() => ctx.setActiveChatId(contact.id)}
                >
                  <div className={styles['avatar-wrapper']}>
                    {contact.avatarUrl ? (
                      <img
                        src={contact.avatarUrl}
                        alt="Avatar"
                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className={styles['chat-avatar']} style={{ backgroundColor: contact.avatarColor || '#007aff' }}>
                        {displayName.substring(0, 1).toUpperCase()}
                      </div>
                    )}
                    {isOnline && <span className={styles['online-badge']} />}
                  </div>
                  <div className={styles['chat-info']}>
                    <span className={styles['chat-name']}>
                      {renderUserStatusBadge(contact)} 
                      {displayName}
                    </span>
                    <span style={{ fontSize: '12px', color: isOnline ? '#2ec761' : '#9ca3af' }}>
                      {isOnline ? 'в сети' : 'офлайн'}
                    </span>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* ======================================================== */
          /* РЕЖИМ 2: РЕЗУЛЬТАТЫ ГЛОБАЛЬНОГО ПОИСКА                   */
          /* ======================================================== */
          isSearching ? (
            <div style={{ color: '#8e8e93', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
              Поиск...
            </div>
          ) : globalSearchUsers.length === 0 ? (
            <div style={{ color: '#636366', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
              Ничего не найдено
            </div>
          ) : (
            globalSearchUsers.map((user: AppUser) => {
              // Проверяем, существует ли уже контакт или чат с этим пользователем
              const existingChat = (ctx.chats || []).find((c: any) => 
                String(c.partnerId) === user.uuid || 
                String(c.uuid) === user.uuid
              );
              const isAlreadyFriend = existingChat?.isContact === true;

              return (
                <div 
                  key={user.uuid} 
                  className={`${styles['chat-preview-card']} ${existingChat && String(ctx.activeChatId) === String(existingChat.id) ? styles.active : ''}`}
                  onClick={() => {
                    if (existingChat) {
                      ctx.setActiveChatId(String(existingChat.id));
                    } else {
                      // Открываем профиль незнакомца для просмотра и добавления
                      ctx.setShowUserModal(user.uuid);
                    }
                  }}
                >
                  <div className={styles['avatar-wrapper']}>
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="Avatar"
                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className={styles['chat-avatar']} style={{ backgroundColor: user.avatarColor || '#007aff' }}>
                        {(user.username || 'U').substring(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className={styles['chat-info']} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className={styles['chat-name']}>
                        {renderUserStatusBadge(user)}
                        {userService.getDisplayNameAsStranger(user)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#8e8e93' }}>
                        @{user.uniqueId || user.username}
                      </span>
                    </div>

                    {isAlreadyFriend ? (
                      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>
                        В контактах
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          ctx.setShowUserModal(user.uuid);
                        }}
                        style={{ marginLeft: 'auto', padding: '6px 14px', backgroundColor: '#007aff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Добавить
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )
        )}
      </div> 
    </section>
  );
}
