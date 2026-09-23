import React from 'react';
import mainStyle from '../../components/css/main.module.css';
import useMessengerContext from '../../context/messengerContext';
import NavSidebar from '../channels/nav-sidebar';
import SettingsLayout from './settingsLayout';

export default function SettingsPage() {
  const ctx = useMessengerContext();
  if (!ctx.currentUser) return null;

  return (
    <div className={mainStyle['messenger-container']}>
      {/* Левая панель навигации */}
      <NavSidebar />
      
      {/* 🚀 Твои оригинальные ТГ-настройки разворачиваются на всю оставшуюся ширину экрана */}
      <SettingsLayout />
    </div>
  );
}
