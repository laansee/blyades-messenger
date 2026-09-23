import React, { useState, useEffect } from 'react';
import styles from '../../components/CSS/sidebar.module.css';
import useMessengerContext from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';
import { Search } from 'lucide-react';

export default function ContactsSidebar() {
  const ctx = useMessengerContext();
  const [globalSearchUsers, setGlobalSearchUsers] = useState<any[]>([]);

  const myId = String(ctx.currentUser?.id);
  const contactsList = ctx.chats.filter((c: any) => c.isContact === true);

  // 🚀 ГЛОБАЛЬНЫЙ ПОИСК ПО БАЗЕ SUPABASE
  useEffect(() => {
    const searchGlobalUsers = async () => {
      if (!ctx.searchQuery || !ctx.searchQuery.trim()) {
        setGlobalSearchUsers([]);
        return;
      }

      // Ищем пользователей по uniqueId или username
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .neq('id', myId) // Отсекаем самого себя из результатов поиска
        .or(`uniqueId.ilike.%${ctx.searchQuery}%,username.ilike.%${ctx.searchQuery}%`);

      if (!error && users) {
        // 🔒 ФИЛЬТР КОНФИДЕНЦИАЛЬНОСТИ: Исключаем тех, кто выбрал privacySearch === 'none'
        const visibleUsers = users.filter(u => u.privacySearch !== 'none');
        setGlobalSearchUsers(visibleUsers);
      }
    };

    const timer = setTimeout(() => {
      searchGlobalUsers();
    }, 150); // Легкий дебаунс, чтобы не спамить базу при каждой букве

    return () => clearTimeout(timer);
  }, [ctx.searchQuery, myId]);

  return (
    <section className={styles['chats-sidebar']}>
      <div className={styles['sidebar-header']}>
        <h2>Контакты</h2>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} className={styles['sidebar-search-icon']} />
          <input 
            type="search" 
            placeholder="Найти человека по логину..." 
            className={styles['chat-search']} 
            value={ctx.searchQuery} 
            onChange={e => ctx.setSearchQuery(e.target.value)} 
          />
        </div>
      </div>
      
      <div className={styles['chats-list']}>
        {ctx.searchQuery.trim() === '' ? (
          /* ======================================================== */
          /* РЕЖИМ 1: ВЫВОД СПИСКА СОХРАНЕННЫХ КОНТАКТОВ              */
          /* ======================================================== */
          contactsList.map((contact: any) => {
            const displayName = contact.name || contact.username || 'Пользователь';
            const isActive = String(ctx.activeChatId) === String(contact.id);

            return (
              <div 
                key={contact.id} 
                className={`${styles['chat-preview-card']} ${isActive ? styles.active : ''}`} 
                onClick={() => ctx.setActiveChatId(contact.id)}
              >
                <div className={styles['avatar-wrapper']}>
                  <div className={styles['chat-avatar']} style={{ backgroundColor: contact.avatarColor }}>
                    {displayName.substring(0, 1).toUpperCase()}
                  </div>
                  {contact.online && <span className={styles['online-badge']} />}
                </div>
                <div className={styles['chat-info']}>
                  <span className={styles['chat-name']}>{displayName}</span>
                  <span style={{ fontSize: '12px', color: contact.online ? '#2ec761' : '#9ca3af' }}>
                    {contact.online ? 'в сети' : 'офлайн'}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          /* ======================================================== */
          /* РЕЖИМ 2: ВЫВОД РЕЗУЛЬТАТОВ ГЛОБАЛЬНОГО ПОИСКА            */
          /* ======================================================== */
          globalSearchUsers.map((user: any) => {
            // Проверяем, есть ли этот найденный юзер у нас в контактах
            const localContact = ctx.chats.find((c: any) => String(c.id) === String(user.id));
            const isAlreadyFriend = localContact?.isContact === true;

            return (
              <div 
                key={user.id} 
                className={`${styles['chat-preview-card']} ${String(ctx.activeChatId) === String(user.id) ? styles.active : ''}`}
                onClick={() => ctx.setActiveChatId(String(user.id))}
              >
                <div className={styles['avatar-wrapper']}>
                  <div className={styles['chat-avatar']} style={{ backgroundColor: user.avatarColor }}>
                    {(user.username || 'U').substring(0, 1).toUpperCase()}
                  </div>
                </div>
                <div className={styles['chat-info']} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className={styles['chat-name']}>{user.username}</span>
                    <span style={{ fontSize: '11px', color: '#8e8e93' }}>@{user.uniqueId || 'id' + user.id}</span>
                  </div>
                  {isAlreadyFriend ? (
                    <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>В контактах</span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Защита: клик по кнопке не должен сбивать выбор чата
                        ctx.setShowUserModal(String(user.id)); // Открываем нашу умную модалку добавления!
                      }}
                      style={{ marginLeft: 'auto', padding: '6px 14px', backgroundColor: 'var(--accent, #007aff)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Добавить
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div> 
    </section>
  );
}
