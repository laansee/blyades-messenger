import React, { useState } from 'react';
import styles from '../css/sidebar.module.css';
import { Search } from 'lucide-react'; 

export default function ContactsSidebar({
  searchQuery,
  setSearchQuery,
  chats, // Это наш массив contacts из родительского компонента contacts.jsx
  setChats,
  currentUser,
  allMessages,
  activeChatId,
  setActiveChatId, 
  loadChatHistory,
  globalSearchQuery,
  setGlobalSearchQuery,
  allUsers,
  fetchContacts
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContactTag, setNewContactTag] = useState('');
  const [error, setError] = useState('');

  // 🔥 1. АВТОНОМНАЯ ФУНКЦИЯ ДОБАВЛЕНИЯ: Подстроена строго под твои стейты и переменные!
  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newContactTag || !newContactTag.trim()) return;

    setError('');

    try {
      const currentHost = window.location.hostname;

      // Шлём чистый односторонний POST-запрос на бэкенд
      const response = await fetch(`http://${currentHost}:5000/api/contacts/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          myId: currentUser.id,
          partnerUniqueId: newContactTag.trim()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {

        // 🚀 КЛЮЧЕВОЙ МОМЕНТ: Мгновенно обновляем записную книжку на экране без перезагрузок!
        if (typeof fetchContacts === 'function') {
          await fetchContacts(); 
        }

        // Очищаем инпут и закрываем модалку
        setNewContactTag('');
        setShowAddModal(false); 
      } else {
        setError(data.error || 'Не удалось добавить пользователя в контакты.');
      }
    } catch (err) {
      console.error("🔴 Ошибка сокетов/fetch при добавлении контакта внутри сайдбара:", err);
      setError('Ошибка соединения с сервером.');
    }
  };

  return (
    <section className={styles['chats-sidebar']}>
      <>
        <div className={styles['sidebar-header']}>
          <h2>Контакты</h2>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} className={styles['sidebar-search-icon']}/>
              <input 
                type="search" 
                placeholder="Найти человека по логину..." 
                className={styles['chat-search']} 
                value={globalSearchQuery} 
                onChange={e => setGlobalSearchQuery(e.target.value)} 
              />
            </div>
          {/* <input 
            type="search" 
            placeholder="Найти человека по логину..." 
            className={styles['chat-search']} 
            value={globalSearchQuery} 
            onChange={e => setGlobalSearchQuery(e.target.value)} 
          /> */}
        </div>
        
        <div className={styles['chats-list']}>
          {globalSearchQuery.trim() === '' ? (
            chats.map(contact => {
              const displayName = contact.name || contact.username || 'Пользователь';


              return (
                <div 
                  key={contact.id} 
                  className={`${styles['chat-preview-card']} ${String(activeChatId) === String(contact.id) ? styles.active : ''}`} 
                  onClick={() => {
                    setActiveChatId(contact.id);
                    if (typeof loadChatHistory === 'function') {
                      loadChatHistory(contact.id); // 🚀 Триггерит выкачку истории переписки из MySQL
                    }
                  }}
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
            allUsers
              .filter(u => u.uniqueId && u.uniqueId.toLowerCase().includes(globalSearchQuery.toLowerCase()))
              .map(user => {
                const isAlreadyFriend = chats.some(c => String(c.id) === String(user.id));
                return (
                  <div key={user.id} className={styles['chat-preview-card']} style={{ cursor: 'default' }}>
                    <div className={styles['avatar-wrapper']}>
                      <div className={styles['chat-avatar']} style={{ backgroundColor: user.avatarColor }}>
                        {(user.username || 'U').substring(0, 1).toUpperCase()}
                      </div>
                    </div>
                    <div className={styles['chat-info']} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                      <span className={styles['chat-name']}>{user.username}</span>
                      {isAlreadyFriend ? (
                        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af' }}>В контактах</span>
                      ) : (
                        <button
                          onClick={() => {
                            const tempNewUser = {
                              id: String(user.id),
                              username: user.username,
                              uniqueId: user.uniqueId || user.username,
                              name: user.username,
                              avatarColor: user.avatarColor,
                              isNewContactMode: true
                            };
                            const event = new CustomEvent('open_add_contact_modal', { detail: tempNewUser });
                            window.dispatchEvent(event);
                          }}
                          style={{ marginLeft: 'auto', padding: '6px 12px', backgroundColor: '#007aff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
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

        {/* 🔥 КНОПКА ДОБАВЛЕНИЯ В САМОМ НИЗУ САЙДБАР Контактов */}
        {/* <div style={{ padding: '16px', borderTop: '1px solid #383842', marginTop: 'auto' }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{width: '100%', padding: '12px', backgroundColor: '#007aff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', transition: 'background-color 0.2s'}}
          >
            ➕ Добавить контакт
          </button>
        </div> */}

        {/* ВСПЛЫВАЮЩЕЕ ОКНО (МОДАЛКА) */}
        {/* {showAddModal && (
          <div 
            style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', zIndex: 10000 }}
            onClick={() => setShowAddModal(false)}
          >
            <div 
              style={{background: '#1e1e24', border: '1px solid #383842', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '320px', display: 'flex',
                      flexDirection: 'column', gap: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'}}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Новый контакт</h3>
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                
              

                {error && (
                  <div style={{ color: '#ff3b30', fontSize: '13px', fontWeight: '500', animation: 'fadeIn 0.2s' }}>
                    ⚠️ {error}
                  </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#9ca3af' }}>Уникальный логин пользователя:</label>
                  <input  
                    type="text" 
                    placeholder="ivan_cool"
                    value={newContactTag}
                    onChange={e => {
                      setNewContactTag(e.target.value);
                      if (error) setError('');
                    }}
                    style={{padding: '10px', borderRadius: '6px', border: '1px solid #383842', backgroundColor: '#121216', color: '#fff', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box'}}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button 
                    type="button"
                    onClick={() => { setShowAddModal(false); setNewContactTag(''); }}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '14px' }}
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit"
                    style={{padding: '8px 16px', backgroundColor: '#007aff', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '14px'}}
                  >
                    Добавить
                  </button>
                </div>
              </form>
            </div>
          </div>
        )} */}
      </>
    </section>
  );
}
