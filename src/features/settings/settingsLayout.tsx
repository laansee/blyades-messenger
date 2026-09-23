import React, { useState, useEffect } from 'react';
import styles from '../../components/css/settings.module.css';
import useMessengerContext from '../../context/messengerContext';
import EditProfile from './edit-profile';
import PrivacySettings from './privacy-settings';

export default function SettingsLayout() {
  const ctx = useMessengerContext();
  const [activeSettingsTab, setActiveSettingsTab] = useState('menu');

  useEffect(() => {
    document.title = 'Настройки';
  }, []);

  const currentUser = ctx.currentUser;

  const mySettingsFullName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim();
  const mySettingsDisplayName = currentUser?.privacyNameFormat === 'full_name' && mySettingsFullName
    ? mySettingsFullName
    : (currentUser?.username || 'Аккаунт');

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.settingsCardWrapper}>

        {/* ======================================================== */}
        {/* 👁️ ЭКРАН 1: ГЛАВНЫЙ СПИСОК МЕНЮ НАСТРОЕК                  */}
        {/* ======================================================== */}
        {activeSettingsTab === 'menu' && (
          <div className={styles.settingsInputField} style={{ gap: '20px' }}>
            <div className={styles.settingsHeaderBlock}>
              <h1 className={styles.settingsTitle}>Настройки</h1>
            </div>

            {/* Карточка профиля в стиле Telegram */}
            <div className={styles.tgProfileHeaderBlock}>
              <div 
                className={styles.tgProfileHugeAvatar} 
                style={{ backgroundColor: currentUser?.avatarColor || '#8b1cca' }}
              >
                {mySettingsDisplayName.substring(0, 1).toUpperCase()}
              </div>
              <div className={styles.tgUserMetaWrapper}>
                <h2 className={styles.tgUserMetaName}>
                  {mySettingsDisplayName}
                </h2>
                <p className={styles.tgUserMetaPhone}>
                  {currentUser?.phone || 'Номер не указан'}
                </p>
                <p className={styles.tgUserMetaUsername}>
                  {currentUser?.uniqueId ? `@${currentUser.uniqueId}` : `@id${currentUser?.id || '?'}`}
                </p>
              </div>
            </div>

            {/* Вертикальное ТГ-меню кликабельных вкладок */}
            <div className={styles.tgMenuListBlock}>
              <div className={styles.tgMenuSectionTitle}>Основное</div>

              <button type="button" onClick={() => setActiveSettingsTab('profile')} className={styles.tgMenuItemRow}>
                <span className={styles.tgMenuRowIcon}>👤</span> Мой аккаунт
              </button>

              <button type="button" onClick={() => setActiveSettingsTab('privacy')} className={styles.tgMenuItemRow}>
                <span className={styles.tgMenuRowIcon}>🔒</span> Конфиденциальность
              </button>

              <button 
                type="button"
                className={`${styles.tgMenuItemRow} ${styles.tgMenuLogoutBtn}`}
                disabled style={{ cursor: 'not-allowed', opacity: 0.5 }}
                title='НЕ РАБОТАЕТ'
              >
                <span className={styles.tgMenuRowIcon}>💬</span> Настройки чатов
              </button>

              <div className={styles.settingsLineDivider}></div>

              <button 
                type="button"
                onClick={ctx.handleLogout} 
                className={`${styles.tgMenuItemRow} ${styles.tgMenuLogoutBtn}`}
              >
                <span className={styles.tgMenuRowIcon}>🚪</span> Выйти из аккаунта
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ВКЛАДКИ РЕДАКТИРОВАНИЯ И КОНФИДЕНЦИАЛЬНОСТИ               */}
        {/* ======================================================== */}
        {activeSettingsTab === 'profile' && (
          <EditProfile onBack={() => setActiveSettingsTab('menu')} />
        )}

        {activeSettingsTab === 'privacy' && (
          <PrivacySettings onBack={() => setActiveSettingsTab('menu')} />
        )}

      </div>
    </div>
  );
}
