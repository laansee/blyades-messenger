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
    <aside className={styles.navSidebar}>
      <div className={styles.navLogo}>
        💬
        <p>Blyades</p>
      </div>
      <nav className={styles.navMenu}>
        <NavLink 
          to="/chat" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`} 
          onClick={() => ctx.setActiveTab('chats')} 
          title="Чаты"
          tabIndex={10}
        >
          <User strokeWidth="2" color='#aaa8a8' size={30}/>
          <p>Чаты</p>
        </NavLink>
        <NavLink 
          to="/contacts" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`} 
          onClick={() => {
            ctx.setActiveTab('contacts');
            ctx.setActiveChatId(null);
            ctx.setSearchQuery('');
          }} 
          title="Контакты"
          tabIndex={10}
        >
          <Users strokeWidth="2" color='#aaa8a8' size={30}/>
          <p>Контакты</p>
        </NavLink>
        <NavLink 
          to="/calls" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`} 
          onClick={() => {
            ctx.setActiveTab('calls');
            ctx.setActiveChatId(null);
          }} 
          title='Звонки'
          tabIndex={10}
        >
          <Phone strokeWidth="2" color='#aaa8a8' size={30}/>
          <p>Звонки</p>
        </NavLink>
        {ctx.currentUser?.isAdmin && (
          <NavLink 
            to="/admin" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`} 
            onClick={() => ctx.setActiveTab('admin')}
            title="Панель администратора"
            tabIndex={10}
          >
            <ShieldAlert strokeWidth="2" color='#ffcc00' size={30}/>
          <p>Админ панель</p>
          </NavLink>
        )}
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`} 
          onClick={() => ctx.setActiveTab('settings')}
          title="Настройки"
          tabIndex={10}
        >
          <Settings strokeWidth="2" color='#aaa8a8' size={30}/>
          <p>Настройки</p>
        </NavLink>
      </nav>
      <div 
        ref={profileMenuRef} 
        className={styles.avatarContainer}
        onClick={() => ctx.setShowProfileMenu(!ctx.showProfileMenu)}
        tabIndex={11}
      >
        {ctx.showProfileMenu && (
          <div className={styles.profilePopup}>
            {ctx.currentUser.avatarUrl ? (
              <img
                src={ctx.currentUser.avatarUrl}
                alt="Avatar"
                style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
              />
            ) : (
              <div className={styles.profilePopupAvatar} style={{ backgroundColor: ctx.currentUser?.avatarColor || '#2b2d31' }}>
                {ctx.currentUser ? myAccountDisplayName.substring(0, 1).toUpperCase() : ''}
              </div>
            )}
            <div className={styles.profilePopupName}>{myAccountDisplayName}</div>
            <div className={styles.profilePopupDivider}></div>
            <button className={styles.profileLogoutBtn} onClick={ctx.handleLogout}>
              <LogOut size={14}/>
              Выйти
            </button>
          </div>
        )}
        {ctx.currentUser.avatarUrl ? (
          <img
            src={ctx.currentUser.avatarUrl}
            alt="Avatar"
            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          />
        ) : (
          <div 
            className={styles.navAvatar} 
            style={{ backgroundColor: ctx.currentUser?.avatarColor || '#2b2d31' }} 
          >
            {ctx.currentUser ? myAccountDisplayName.substring(0, 1).toUpperCase() : ''}
          </div>
        )}
        <p>{myAccountDisplayName}</p>
      </div>
    </aside>
  );
}
