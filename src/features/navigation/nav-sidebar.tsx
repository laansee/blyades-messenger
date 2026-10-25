import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router';
import styles from '../../components/css/nav-sidebar.module.css';
import { 
  Archive,
  CircleUser, 
  Users, 
  Megaphone, 
  User, 
  Phone,
  Bookmark,
  Settings, 
  Moon, 
  Ghost, 
  Plus, 
  ChevronDown, 
  ChevronUp,
  ShieldAlert,
  LogOut
} from 'lucide-react';
import useMessengerContext from '../../context/messengerContext';
import SmartAvatar from '../../components/common/SmartAvatar';

export default function NavSidebar({
  onOpenCreateGroup,
  onOpenCreateChannel,
  onOpenContactsModal,
  onOpenCallsModal
}: {
  onOpenCreateGroup?: () => void;
  onOpenCreateChannel?: () => void;
  onOpenContactsModal?: () => void;
  onOpenCallsModal?: () => void;
}) {
  const ctx = useMessengerContext();
  const isOpen = Boolean(ctx.isNavOpen);

  // Стейты меню
  const [showAccountsList, setShowAccountsList] = useState(false);

  const closeNav = () => {
    if (ctx.setIsNavOpen) ctx.setIsNavOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeNav();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const mySettingsFullName = `${ctx.currentUser?.firstName || ''} ${ctx.currentUser?.lastName || ''}`.trim();
  const myAccountDisplayName = ctx.currentUser?.privacyNameFormat === 'full_name' && mySettingsFullName
    ? mySettingsFullName
    : (ctx.currentUser?.username && ctx.currentUser.username.trim() !== '' ? ctx.currentUser.username : 'Пользователь');

  return (
    <>
      {/* Затемняющий фон при открытии */}
      <div 
        className={`${styles.drawerOverlay} ${isOpen ? styles.open : ''}`} 
        onClick={closeNav}
      />

      <aside className={`${styles.drawerContainer} ${isOpen ? styles.open : ''}`}>
        
        {/* ======================================================== */}
        {/* 1. ВЕРХНЯЯ ШАПКА: АВАТАР И СЕЛЕКТОР АККАУНТОВ            */}
        {/* ======================================================== */}
        <div className={styles.headerProfile}>
          <div 
            className={styles.avatarMain}
            onClick={() => {
              closeNav();
              ctx.setShowUserModal(true);
            }}
          >
            <SmartAvatar
              size={56}
              avatarUrl={ctx.currentUser?.avatarUrl}
              avatarColor={ctx.currentUser?.avatarColor}
              name={myAccountDisplayName}
              isChannel={false}
            />
          </div>

          <div className={styles.headerMetaRow}>
            <div className={styles.headerText}>
              <span className={styles.displayName}>{myAccountDisplayName}</span>
              {/* <span className={styles.subText}>Настройки Blyades</span> */}
            </div>

            <button 
              type="button"
              className={styles.accordionBtn}
              onClick={() => setShowAccountsList(!showAccountsList)}
              title="Переключить аккаунт"
            >
              {showAccountsList ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>

        {/* Выпадающий список нескольких аккаунтов (AyuGram style) */}
        {showAccountsList && (
          <div className={styles.accountsDropdown}>
            {/* Текущий активный аккаунт */}
            <div className={`${styles.accountRow} ${styles.accountActive}`}>
              <SmartAvatar
                size={34}
                avatarUrl={ctx.currentUser?.avatarUrl}
                avatarColor={ctx.currentUser?.avatarColor}
                name={myAccountDisplayName}
                isChannel={false}
              />
              <span className={styles.accountRowName}>{myAccountDisplayName}</span>
              <span className={styles.accountBadge}>active</span>
            </div>

            {/* Заглушка мультиаккаунта */}
            <div 
              className={`${styles.accountRow} ${styles.disabledItem}`}
              title="Мульти-аккаунты в разработке"
            >
              <div className={styles.addAccountCircle}>
                <Plus size={18} />
              </div>
              <span className={styles.accountRowName}>Добавить аккаунт</span>
            </div>

            <div className={styles.menuDivider} />
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. ОСНОВНОЙ СПИСОК ПУНКТОВ МЕНЮ                         */}
        {/* ======================================================== */}
        <div className={styles.menuList}>
          
          {/* Архив (не реализован) */}
          <button 
            type="button" 
            className={`${styles.menuItem} ${styles.disabledItem}`}
            disabled
            title="Архив чатов в разработке"
          >
            <Archive size={20} className={styles.itemIcon} />
            <span className={styles.itemText}>Архив</span>
            <span className={styles.unreadPill}>0</span>
          </button>

          {/* Мой профиль */}
          <button 
            type="button" 
            className={styles.menuItem}
            onClick={() => {
              closeNav();
              ctx.setShowUserModal(ctx.currentUser?.uuid || true);
            }}
          >
            <CircleUser size={20} className={styles.itemIcon} />
            <span className={styles.itemText}>Мой профиль</span>
          </button>

          {/* Создать группу */}
          <button 
            type="button" 
            className={styles.menuItem}
            onClick={() => {
              closeNav();
              onOpenCreateGroup?.();
            }}
          >
            <Users size={20} className={styles.itemIcon} />
            <span className={styles.itemText}>Создать группу</span>
          </button>

          {/* Создать канал */}
          <button 
            type="button" 
            className={styles.menuItem}
            onClick={() => {
              closeNav();
              onOpenCreateChannel?.();
            }}
          >
            <Megaphone size={20} className={styles.itemIcon} />
            <span className={styles.itemText}>Создать канал</span>
          </button>

          {/* Контакты (модалка или переход) */}
          <button 
            type="button" 
            className={`${styles.menuItem} ${styles.disabledItem}`}
            disabled
            title="Окно контактов в разработке"
          >
            <User size={20} className={styles.itemIcon} />
            <span className={styles.itemText}>Контакты</span>
          </button>

          {/* Звонки (модалка или переход) */}
          <button 
            type="button" 
            className={`${styles.menuItem} ${styles.disabledItem}`}
            disabled
            title="Звонки в разработке"
          >
            <Phone size={20} className={styles.itemIcon} />
            <span className={styles.itemText}>Звонки</span>
          </button>

          {/* Избранное (не реализовано) */}
          <button 
            type="button" 
            className={`${styles.menuItem} ${styles.disabledItem}`}
            disabled
            title="Избранные сообщения в разработке"
          >
            <Bookmark size={20} className={styles.itemIcon} />
            <span className={styles.itemText}>Избранное</span>
          </button>

          {/* Настройки */}
          <NavLink 
            to="/settings" 
            className={({ isActive }) => `${styles.menuItem} ${isActive ? styles.active : ''}`}
            onClick={() => {
              ctx.setActiveTab('settings');
              closeNav();
            }}
          >
            <Settings size={20} className={styles.itemIcon} />
            <span className={styles.itemText}>Настройки</span>
          </NavLink>

          {/* Админ панель (если администратор) */}
          {ctx.currentUser?.userStatus === 'administrator' && (
            <NavLink 
              to="/admin" 
              className={({ isActive }) => `${styles.menuItem} ${isActive ? styles.active : ''}`}
              onClick={() => {
                ctx.setActiveTab('admin');
                closeNav();
              }}
            >
              <ShieldAlert size={20} color="#ffcc00" className={styles.itemIcon} />
              <span className={styles.itemText} style={{ color: '#ffcc00' }}>Админ панель</span>
            </NavLink>
          )}

          <div className={styles.menuDivider} />

          {/* ======================================================== */}
          {/* 3. ПЕРЕКЛЮЧАТЕЛИ (НОЧНОЙ РЕЖИМ И РЕЖИМ ПРИЗРАКА)        */}
          {/* ======================================================== */}
          {/* <div 
            className={styles.switchRow}
            onClick={() => setNightMode(!nightMode)}
          >
            <div className={styles.switchLeft}>
              <Moon size={20} className={styles.itemIcon} />
              <span>Ночной режим</span>
            </div>
            <div className={`${styles.switchTrack} ${nightMode ? styles.switchOn : ''}`}>
              <div className={styles.switchThumb} />
            </div>
          </div>

          <div 
            className={styles.switchRow}
            onClick={() => setGhostMode(!ghostMode)}
          >
            <div className={styles.switchLeft}>
              <Ghost size={20} className={styles.itemIcon} />
              <span>Режим призрака</span>
            </div>
            <div className={`${styles.switchTrack} ${ghostMode ? styles.switchOn : ''}`}>
              <div className={styles.switchThumb} />
            </div>
          </div>

          <div className={styles.menuDivider} /> */}

          {/* Выход из профиля */}
          <button 
            type="button" 
            className={`${styles.menuItem} ${styles.dangerItem}`}
            onClick={() => {
              closeNav();
              ctx.handleLogout();
            }}
          >
            <LogOut size={20} className={styles.itemIcon} />
            <span className={styles.itemText}>Выйти</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* 4. ФУТЕР ВЕРСИИ (КАК В AYUGRAM DESKTOP)                  */}
        {/* ======================================================== */}
        <div className={styles.drawerFooter}>
          <p className={styles.footerAppTitle}>Blyades Messanger</p>
          {/* <p className={styles.footerAppTitle}>Blyades Desktop</p>
          <p className={styles.footerVersion}>Версия 1.48.8 x64 – О программе</p> */}
          <p className={styles.footerVersion}>Версия 1.48.8</p>
        </div>

      </aside>
    </>
  );
}