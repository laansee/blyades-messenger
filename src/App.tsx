import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import { type User } from '@supabase/supabase-js';
import AuthPage from './features/auth/AuthPage';
import ChatLayout from './features/chat/chatLayout';
import SettingsPage from './features/settings/settingsPage';
import ContactsPage from './features/contacts/contactsPage';
import CallsPage from './features/calls/callsPage';
import AdminDashboard from './features/admin/admin-dashboard';
import LandingPage from './components/LandingPage';
import useMessengerContext, { MessengerProvider } from './context/messengerContext';

function ProtectedRoute({ element }: { element: React.ReactElement }) {
  const { currentUser } = useMessengerContext();
  // Если юзер авторизован — пускаем на страницу, если нет — плавно отправляем на авторизацию
  return currentUser ? element : <Navigate to="/auth" replace />;
}

function AppContent() {
  const ctx = useMessengerContext();
  const { currentUser, authLoading } = useMessengerContext();

  useEffect(() => {
    document.title = "Blyades Messenger";
  }, []);

  // 🎯 МЕГА-ФИКС №1: Если контекст ещё проверяет ключи в Supabase — 
  // роутер МОРТАЛЬНО застывает на красивом лоадере, сохраняя текущий URL в строке браузера!
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0e0f11', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#8e8e93', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Синхронизация ключей Blyades...
          </span>
          {/* Твой кастомный лоадер или простая анимация */}
          <div style={{ width: '24px', height: '24px', border: '2.5px solid #2b2d31', borderTopColor: '#9d7bf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Публичные страницы */}
        <Route path="/" element={<LandingPage />} />

        {/* Страница авторизации: если залогинен — редиректим в чат, если нет — показываем форму */}
        <Route path="/auth" element={!currentUser ? <AuthPage /> : <Navigate to="/chat" replace />} />

        {/* 🎯 МЕГА-ФИКС №2: Все приватные роуты объявлены ВСЕГДА! 
            Они больше не исчезают из DOM при F5, а защищаются через ProtectedRoute! */}
        <Route path="/chat" element={<ProtectedRoute element={<ChatLayout />} />} />
        <Route path="/contacts" element={<ProtectedRoute element={<ContactsPage />} />} />
        <Route path="/calls" element={<ProtectedRoute element={<CallsPage />} />} />
        <Route path="/settings" element={<ProtectedRoute element={<SettingsPage />} />} />
        <Route path="/admin" element={<ProtectedRoute element={<AdminDashboard />} />} />

        {/* Глобальный фоллбэк: если ввели несуществующий URL */}
        <Route path="*" element={<Navigate to={currentUser ? "/chat" : "/auth"} replace />} />
     </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <MessengerProvider>
      <AppContent />
    </MessengerProvider>
  );
}
