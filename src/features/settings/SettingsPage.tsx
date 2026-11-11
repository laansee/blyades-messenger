import { useState, useEffect } from 'react';
import mainStyle from '../../components/css/main.module.css';
import style from '../../components/css/settings.module.css';
import sidebarStyles from '../../components/css/sidebar.module.css';
import useMessengerContext from '../../context/messengerContext';
import NavSidebar from '../navigation/NavSidebar';

import EditProfile from './EditProfile';
import PrivacySettings from './PrivacySettings';
import { Lock, User, Menu, ArrowLeft, LogOut, MessageSquare, Bell } from 'lucide-react';

type SettingsTab = 'profile' | 'privacy' | 'chats' | 'notifications' | null;

const TAB_MAP: Record<string, Exclude<SettingsTab, null>> = {
  account: 'profile',
  profile: 'profile',
  privacy: 'privacy',
  chats: 'chats',
  notifications: 'notifications',
};

export default function SettingsPage() {
  const ctx = useMessengerContext();
  const currentUser = ctx.currentUser;

  const getTabFromUrl = (): SettingsTab => {
    const params = new URLSearchParams(window.location.search);
    const queryTab = params.get('tab')?.toLowerCase() || '';
    return TAB_MAP[queryTab] || null;
  };

  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>(getTabFromUrl);
  const [mobileScreen, setMobileScreen] = useState<'menu' | 'content'>(() => (getTabFromUrl() ? 'content' : 'menu'));

  // 3. Слушаем внешние переходы (если URL поменялся без перезагрузки страницы)
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromUrl();
      if (tab) {
        setActiveSettingsTab(tab);
        setMobileScreen('content');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Универсальный обработчик переключения таба
  const handleSelectTab = (tab: Exclude<SettingsTab, null>) => {
    setActiveSettingsTab(tab);
    setMobileScreen('content');

    // Находим ключ для красивого URL (для profile отдаем account)
    const urlParamKey = Object.keys(TAB_MAP).find(k => TAB_MAP[k] === tab) || tab;
    window.history.replaceState(null, '', `/settings?tab=${urlParamKey}`);
  };

  // 🚀 ОБЩИЕ СТЕЙТЫ ДАННЫХ ПРОФИЛЯ
  const [uniqueId, setUniqueId] = useState(currentUser?.uniqueId || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [aboutMe, setAboutMe] = useState(currentUser?.aboutMe || '');
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || '#007aff');
  const [nameColor, setNameColor] = useState(currentUser?.nameColor || '#5eaddf');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || null);
  const [profileColor, setProfileColor] = useState(currentUser?.profileColor || '#312b3a');

  // 🚀 ОБЩИЕ СТЕЙТЫ НАСТРОЕК КОНФИДЕНЦИАЛЬНОСТИ
  const [privacyPhone, setPrivacyPhone] = useState(currentUser?.privacyPhone || 'all');
  const [privacyEmail, setPrivacyEmail] = useState(currentUser?.privacyEmail || 'all');
  const [privacyOnline, setPrivacyOnline] = useState(currentUser?.privacyOnline || 'all');
  const [privacyNameFormat, setPrivacyNameFormat] = useState(currentUser?.privacyNameFormat || 'username');
  const [privacyFullName, setPrivacyFullName] = useState(currentUser?.privacyFullName || 'all');
  const [privacySearch, setPrivacySearch] = useState(currentUser?.privacySearch || 'all');

  useEffect(() => {
    if (currentUser) {
      setUniqueId(currentUser.uniqueId || '');
      setUsername(currentUser.username || '');
      setFirstName(currentUser.firstName || '');
      setLastName(currentUser.lastName || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setAboutMe(currentUser.aboutMe || '');
      setAvatarColor(currentUser.avatarColor || '#007aff');
      setNameColor(currentUser.nameColor || '#5eaddf');
      setAvatarUrl(currentUser.avatarUrl || null);
      setProfileColor(currentUser.profileColor || '#312b3a');
      setPrivacyPhone(currentUser.privacyPhone || 'all');
      setPrivacyEmail(currentUser.privacyEmail || 'all');
      setPrivacyOnline(currentUser.privacyOnline || 'all');
      setPrivacyNameFormat(currentUser.privacyNameFormat || 'username');
      setPrivacyFullName(currentUser.privacyFullName || 'all');
      setPrivacySearch(currentUser.privacySearch || 'all');
    }
  }, [currentUser]);

  useEffect(() => {
    document.title = 'Настройки | Blyades';
  }, []);

  return (
    <div className={`${mainStyle['messenger-container']} ${mobileScreen === 'menu' ? style.viewMenu : style.viewContent}`}>
      <NavSidebar />

      {/* 🧭 САЙДБАР НАСТРОЕК (ЕДИНЫЕ КЛАССЫ С САЙДБАРОМ ЧАТОВ) */}
      <section className={`${sidebarStyles['chats-sidebar']} ${style.setSidebar}`}>
        {/* Шапка сайдбара */}
        <div 
          className={sidebarStyles['sidebar-header']} 
          style={{ flexDirection: 'row', alignItems: 'center', gap: '12px' }}
        >
          <button 
            type="button" 
            onClick={() => ctx.setIsNavOpen?.(true)}
            title="Открыть меню"
            className={sidebarStyles['menu-toggle-btn']}
          >
            <Menu size={22} />
          </button>
          <h2 className={sidebarStyles['sidebar-title']}>Настройки</h2>
        </div>

        {/* Список пунктов настроек */}
        <div className={sidebarStyles['chats-list']}>
          <div 
            className={`${sidebarStyles['sidebar-item']} ${activeSettingsTab === 'profile' ? sidebarStyles.active : ''}`} 
            onClick={() => handleSelectTab('profile')} 
          >
            <User size={20} />
            <span>Аккаунт</span>
          </div>

          <div className={sidebarStyles['sidebar-item']} aria-disabled="true" title="В разработке">
            <Bell size={20} />
            <span>Уведомления</span>
          </div>

          <div 
            className={`${sidebarStyles['sidebar-item']} ${activeSettingsTab === 'privacy' ? sidebarStyles.active : ''}`} 
            onClick={() => handleSelectTab('privacy')} 
          >
            <Lock size={20} />
            <span>Конфиденциальность</span>
          </div>

          <div className={sidebarStyles['sidebar-item']} aria-disabled="true" title="В разработке">
            <MessageSquare size={20} />
            <span>Чаты</span>
          </div>

          <div className={sidebarStyles['sidebar-item']} aria-disabled="true" title="В разработке">
            <MessageSquare size={20} />
            <span>Папки с чатами</span>
          </div>

          <div className={sidebarStyles['sidebar-divider']} />
          
          <div 
            className={sidebarStyles['sidebar-item']} 
            onClick={ctx.handleLogout}
            data-exit
          >
            <LogOut size={20} />
            <span>Выйти</span>
          </div>
        </div>
      </section>

      {!activeSettingsTab ? (
        /* 🎯 Заглушка по центру (как на втором скриншоте) */
        <div 
          className={style.settingsContainer} 
          style={{ 
            justifyContent: activeSettingsTab ? 'flex-start' : 'center',
            background: '#121216'
          }}
        >
          <div className={style.settingsPlaceholder}>
            <div className={style.settingsPlaceholderIcon}>
              <Menu size={38} color="#585966" />
            </div>
            <p>Выберите раздел настроек</p>
          </div>
        </div>
      ) : (
        <div 
          className={style.settingsContainer} 
          style={{ 
            overflowY: 'auto', 
          }}
        >
          {/* Верхняя панель заголовка вкладки в SettingsPage */}
          <div className={style.settingsHeader}>
            <button 
              type="button"
              onClick={() => {
                setMobileScreen('menu');
                setActiveSettingsTab(null);
                window.history.replaceState(null, '', '/settings');
              }}
              title="Назад к разделам"
              style={{
                background: 'none',
                border: 'none',
                color: '#8e8e93',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#8e8e93';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <ArrowLeft size={20} />
            </button>

            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '18px' }}>
              {activeSettingsTab === 'profile' && 'Аккаунт'}
              {activeSettingsTab === 'privacy' && 'Конфиденциальность'}
              {activeSettingsTab === 'chats' && 'Чаты'}
              {activeSettingsTab === 'notifications' && 'Уведомления'}
            </span>
          </div>
          
          {activeSettingsTab === 'profile' && (
            <EditProfile 
              onBack={() => {
                setMobileScreen('menu');
                setActiveSettingsTab(null);
                window.history.replaceState(null, '', '/settings');
              }}
              state={{ uniqueId, username, firstName, lastName, email, phone, aboutMe, avatarColor, avatarUrl, nameColor, profileColor }}
              setters={{ setUniqueId, setUsername, setFirstName, setLastName, setEmail, setPhone, setAboutMe, setAvatarColor, setAvatarUrl, setNameColor, setProfileColor }}
            />
          )}

          {activeSettingsTab === 'privacy' && (
            <PrivacySettings 
              onBack={() => setMobileScreen('menu')}
              state={{ privacyPhone, privacyEmail, privacyOnline, privacyNameFormat, privacyFullName, privacySearch }}
              setters={{ setPrivacyPhone, setPrivacyEmail, setPrivacyOnline, setPrivacyNameFormat, setPrivacyFullName, setPrivacySearch }}
            />
          )}
        </div>
      )}
    </div>
  );
}
