import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from "@vercel/speed-insights/react"
import AuthPage from './features/auth/AuthPage';
import ChatLayout from './features/chat/ChatLayout';
import SettingsPage from './features/settings/SettingsPage';
// import ContactsPage from './features/contacts/ContactsPage';
// import CallsPage from './features/calls/CallsPage';
import AdminDashboard from './features/admin/AdminDashboard';
import LandingPage from './components/LandingPage';
import useMessengerContext, { MessengerProvider } from './context/messengerContext';
import InputContextMenu from './components/common/InputContextMenu';
import ProfileModal from './components/profile/profileModal';
import GlobalContextMenu from './components/common/GlobalContextMenu';
import CallOverlay from './features/calls/CallOverlay';
import CallsHistoryModal from './features/calls/CallsHistoryModal';

function RouteChangeWatcher() {
  const location = useLocation();
  const ctx = useMessengerContext();

  useEffect(() => {
    // 🎯 Если ушли со страницы /chat (например, на /admin или /settings)
    if (!location.pathname.startsWith('/chat')) {
      if (ctx.setActiveChatId) ctx.setActiveChatId(null);
      if (ctx.setEditingMessage) ctx.setEditingMessage(null);
      if (ctx.setMessageText) ctx.setMessageText('');
      if (ctx.setShowMsgSearch) ctx.setShowMsgSearch(false);
      if (ctx.setSearchQuery) ctx.setSearchQuery('');
    }
  }, [location.pathname]);

  return null;
}

function ProtectedRoute() {
  const { currentUser } = useMessengerContext();
  return currentUser ? <Outlet /> : <Navigate to="/auth" replace />;
}

function AppContent() {
  const { currentUser, authLoading } = useMessengerContext();

  useEffect(() => {
    document.title = "Blyades Messenger";

    const disableMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener('contextmenu', disableMenu);
    return () => window.removeEventListener('contextmenu', disableMenu);
  }, []);

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
      <RouteChangeWatcher />
      <Routes>
        {/* Публичные страницы */}
        <Route path="/" element={<LandingPage />} />

        {/* Страница авторизации: если залогинен — редиректим в чат, если нет — показываем форму */}
        <Route path="/auth" element={!currentUser ? <AuthPage /> : <Navigate to="/chat" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/chat" element={<ChatLayout />} />
          {/* <Route path="/archive" element={<ChatLayout />} /> */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to={currentUser ? "/chat" : "/auth"} replace />} />
     </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <MessengerProvider>
      <AppContent />
      <Analytics />
      <SpeedInsights/>
      <InputContextMenu />
      <ProfileModal />
      <GlobalContextMenu />
      <CallOverlay />
      <GlobalCallsHistoryModal />
    </MessengerProvider>
  );
}

function GlobalCallsHistoryModal() {
  const ctx = useMessengerContext();
  return (
    <CallsHistoryModal 
      show={Boolean(ctx.showCallsHistoryModal)} 
      onClose={() => ctx.setShowCallsHistoryModal(false)} 
    />
  );
}