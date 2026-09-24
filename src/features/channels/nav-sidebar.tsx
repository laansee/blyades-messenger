import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import styles from '../../components/css/nav-sidebar.module.css';
import { User, Phone, Users, Settings } from 'lucide-react';
import useMessengerContext from '../../context/messengerContext';

export default function NavSidebar() {
  const ctx = useMessengerContext();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (ctx.showProfileMenu && profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        ctx.setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [ctx.showProfileMenu]);

  const myAccountDisplayName = ctx.currentUser?.username || 'User';

  return (
    <aside className={styles['nav-sidebar']}>
      <div className={styles['nav-logo']}>💬</div>
      <nav className={styles['nav-menu']}>
        <NavLink 
          to="/chat" 
          className={({ isActive }) => `${styles['nav-item']} ${isActive ? styles.active : ''}`} 
          onClick={() => ctx.setActiveTab('chats')} 
          title="Чаты"
        >
          <User strokeWidth="2" color='#aaa8a8' size={30}/>
        </NavLink>
        <NavLink 
          to="/calls" 
          className={({ isActive }) => `${styles['nav-item']} ${isActive ? styles.active : ''}`} 
          onClick={() => {
            ctx.setActiveTab('calls');
            ctx.setActiveChatId(null);
          }} 
          title='Звонки'
        >
          <Phone strokeWidth="2" color='#aaa8a8' size={30}/>
        </NavLink>
        <NavLink 
          to="/contacts" 
          className={({ isActive }) => `${styles['nav-item']} ${isActive ? styles.active : ''}`} 
          onClick={() => {
            ctx.setActiveTab('contacts');
            ctx.setActiveChatId(null);
            ctx.setSearchQuery('');
          }} 
          title="Контакты"
        >
          <Users strokeWidth="2" color='#aaa8a8' size={30}/>
        </NavLink>
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `${styles['nav-item']} ${isActive ? styles.active : ''}`} 
          onClick={() => ctx.setActiveTab('settings')}
          title="Настройки"
        >
          <Settings strokeWidth="2" color='#aaa8a8' size={30}/>
        </NavLink>
      </nav>
      <div ref={profileMenuRef} className={styles['avatar-container']}>
        {ctx.showProfileMenu && (
          <div className={styles['profile-popup']}>
            <div className={styles['profile-popup-avatar']} style={{ backgroundColor: ctx.currentUser?.avatarColor || '#ef4444' }}>
              {myAccountDisplayName.substring(0, 1).toUpperCase()}
            </div>
            <div className={styles['profile-popup-name']}>{myAccountDisplayName}</div>
            <div className={styles['profile-popup-divider']}></div>
            <button className={styles['profile-logout-btn']} onClick={ctx.handleLogout}>🚪 Выйти</button>
          </div>
        )}
        <div className={styles['nav-avatar']} style={{ backgroundColor: ctx.currentUser?.avatarColor || '#ef4444' }} onClick={() => ctx.setShowProfileMenu(!ctx.showProfileMenu)}>
          {myAccountDisplayName.substring(0, 1).toUpperCase()}
        </div>
      </div>
    </aside>
  );
}
