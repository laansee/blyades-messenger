import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import styles from '../../components/css/nav-sidebar.module.css';
import { User, Phone, Users, Settings, LogOut, ShieldAlert } from 'lucide-react';
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

  const mySettingsFullName = `${ctx.currentUser?.firstName || ''} ${ctx.currentUser?.lastName || ''}`.trim();
  
  const myAccountDisplayName = ctx.currentUser?.privacyNameFormat === 'full_name' && mySettingsFullName
    ? mySettingsFullName
    : (ctx.currentUser?.username && ctx.currentUser.username.trim() !== '' ? ctx.currentUser.username : 'Пользователь');


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
        {ctx.currentUser?.isAdmin && (
          <NavLink 
            to="/admin" 
            className={({ isActive }) => `${styles['nav-item']} ${isActive ? styles.active : ''}`} 
            onClick={() => ctx.setActiveTab('admin')}
            title="Панель администратора"
          >
            <ShieldAlert strokeWidth="2" color='#ffcc00' size={30}/>
          </NavLink>
        )}
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
            <div className={styles['profile-popup-avatar']} style={{ backgroundColor: ctx.currentUser?.avatarColor || '#2b2d31' }}>
              {ctx.currentUser ? myAccountDisplayName.substring(0, 1).toUpperCase() : ''}
            </div>
            <div className={styles['profile-popup-name']}>{myAccountDisplayName}</div>
            <div className={styles['profile-popup-divider']}></div>
            <button className={styles['profile-logout-btn']} onClick={ctx.handleLogout}>
              <LogOut size={14}/>
              Выйти
            </button>
          </div>
        )}
        <div 
          className={styles['nav-avatar']} 
          style={{ backgroundColor: ctx.currentUser?.avatarColor || '#2b2d31' }} 
          onClick={() => ctx.setShowProfileMenu(!ctx.showProfileMenu)}
        >
          {ctx.currentUser ? myAccountDisplayName.substring(0, 1).toUpperCase() : ''}
        </div>
      </div>
    </aside>
  );
}
