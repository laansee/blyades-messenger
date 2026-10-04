import React, { useState, useEffect } from 'react';
import mainStyle from '../../components/css/main.module.css';
import style from '../../components/css/settings.module.css';
import chatStyles from '../../components/css/chat-window.module.css'; 
import useMessengerContext from '../../context/messengerContext';
import NavSidebar from '../channels/nav-sidebar';

import EditProfile from './edit-profile';
import PrivacySettings from './privacy-settings';

export default function SettingsPage() {
  const ctx = useMessengerContext();
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'privacy' | 'chats'>('profile');

  useEffect(() => {
    document.title = 'Настройки | Blyades';
  }, []);

  const handleTabChangeSafe = (targetTab: 'profile' | 'privacy' | 'chats') => {
    if (targetTab === activeSettingsTab) return;
    
    // Временный пропуск проверки изменений, так как стейты теперь инкапсулированы внутри дочерних модалок
    setActiveSettingsTab(targetTab);
    document.title = targetTab === 'profile' ? 'Аккаунт | Blyades' : 'Конфиденциальность | Blyades';
  };

  return (
    <div className={mainStyle['messenger-container']}>
      <NavSidebar />

      <section className={style.setSidebar}>
        <div className={style.setSidebarHeader}>
          <h2>Настройки</h2>
        </div>

        <div className={style.setSidebarList}>
          <div 
            className={`${style.setSidebarItem} ${activeSettingsTab === 'profile' ? style.active : ''}`}
            onClick={() => handleTabChangeSafe('profile')}
            style={{ cursor: 'pointer' }}
          >
            <span className={style.tgMenuRowIcon}>👤</span>Аккаунт
          </div>
          <div 
            className={`${style.setSidebarItem} ${activeSettingsTab === 'privacy' ? style.active : ''}`}
            onClick={() => handleTabChangeSafe('privacy')}
            style={{ cursor: 'pointer' }}
          >
            <span className={style.tgMenuRowIcon}>🔒</span> Приватность
          </div>
          <div 
            className={style.setSidebarItem} 
            title="В разработке"
            aria-disabled
          >
            <span className={style.tgMenuRowIcon}>💬</span> Чаты
          </div>
          <div 
            className={style.setSidebarItem} 
            title="В разработке"
            aria-disabled
          >
            <span className={style.tgMenuRowIcon}>🔔</span> Уведомления
          </div>

          <div className={style.settingsLineDivider}></div>
          
          <div 
            className={style.setSidebarItem} 
            onClick={ctx.handleLogout}
            aria-exit
          >
            <span className={style.tgMenuRowIcon}>🚪</span> Выйти
          </div>
        </div>
      </section>

      <div style={{ flex: 1, backgroundColor: '#13131a', overflow: 'hidden', display: "grid", gridAutoFlow: "column", gridTemplateColumns: "1fr 540px" }}>
        {activeSettingsTab === 'profile' && (
          <EditProfile onBack={() => handleTabChangeSafe('profile')} />
        )}

        {activeSettingsTab === 'privacy' && (
          <PrivacySettings onBack={() => handleTabChangeSafe('privacy')} />
        )}

        {activeSettingsTab === 'chats' && (
          <div style={{ color: '#636366', padding: '40px', textAlign: 'center', width: '100%', fontFamily: 'sans-serif' }}>
            <h2>💬 Внешний вид чатов</h2>
            <p style={{ color: '#48484a', fontSize: '14px' }}>Кастомизация тем оформления, фонов и кастомных стилей сайта появится в следующем апдейте.</p>
          </div>
        )}
      </div>

      
      {/* Здесь можно будет развернуть вкладку чатов, когда допишем */}
      {activeSettingsTab === 'chats' && (
        <div style={{ color: '#636366', padding: '24px', textAlign: 'center' }}>
          Настройки отображения чатов появятся в следующем обновлении.
        </div>
      )}
    </div>
  );
}
