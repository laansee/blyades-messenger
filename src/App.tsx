import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router';
import { Analytics }      from '@vercel/analytics/react';
import { SpeedInsights }  from "@vercel/speed-insights/react"

import AuthPage       from './features/auth/AuthPage';
import ChatLayout     from './features/chat/ChatLayout';
import SettingsPage   from './features/settings/SettingsPage';
import AdminDashboard from './features/admin/AdminDashboard';
import LandingPage    from './components/LandingPage';
import { resolveChatFromRoute } from './utils/chatRoute';

import useMessengerContext, { MessengerProvider } from './context/messengerContext';
import InputContextMenu   from './components/common/InputContextMenu';
import ProfileModal       from './components/modals/view/ProfileModal';
import ContactsModal      from './components/modals/view/ContactsModal';
import GlobalContextMenu  from './components/common/GlobalContextMenu';
import CallOverlay        from './features/calls/CallOverlay';
import CallsHistoryModal  from './features/calls/CallsHistoryModal';

function RouteChangeWatcher() {
  const location = useLocation();
  const ctx = useMessengerContext();

  useEffect(() => {
    const handleUrlSync = async () => {
      // Проверяем, что мы находимся в разделе чатов
      if (location.pathname.startsWith('/chat')) {
        const params = new URLSearchParams(location.search);
        const idParam = params.get('id');

        if (!idParam) {
          // Если параметр пропал из URL, а чат был открыт — закрываем
          if (ctx.activeChatId && ctx.setActiveChatId) {
            ctx.setActiveChatId(null);
          }
          return;
        }

      // Если чаты еще не догрузились из базы, ждем
        if (!ctx.chats || ctx.chats.length === 0) return;

        const foundChat = resolveChatFromRoute(ctx.chats, idParam);

        if (foundChat && String(ctx.activeChatId) !== String(foundChat.id)) {
          ctx.setActiveChatId(String(foundChat.id));
        } else if (!foundChat && idParam.startsWith('d') && ctx.handleStartDirectChat) {
          // Автоматическое создание/открытие ЛС, если чата еще не было в списке
          const targetUserId = idParam.slice(1);
          try {
            const newChatId = await ctx.handleStartDirectChat(targetUserId);
            if (newChatId && String(ctx.activeChatId) !== String(newChatId)) {
              ctx.setActiveChatId(String(newChatId));
            }
          } catch (err: unknown) {
            console.error('Не удалось открыть ЛС по ссылке:', err);
          }
        }
      } else {
        // Если ушли со страницы /chat — сбрасываем активный чат
        if (ctx.setActiveChatId) ctx.setActiveChatId(null);
        if (ctx.setEditingMessage) ctx.setEditingMessage(null);
        if (ctx.setMessageText) ctx.setMessageText('');
        if (ctx.setShowMsgSearch) ctx.setShowMsgSearch(false);
        if (ctx.setSearchQuery) ctx.setSearchQuery('');
      }
    };

    handleUrlSync();
  }, [location.pathname, location.search, ctx.chats]);

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
            Запрос данных...
          </span>
          <div style={{ width: '24px', height: '24px', border: '2.5px solid #2b2d31', borderTopColor: '#9d7bf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <RouteChangeWatcher />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={!currentUser ? <AuthPage /> : <Navigate to="/chat" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/chat" element={<ChatLayout />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* <Route path="*" element={<Navigate to={currentUser ? "/chat" : "/auth"} replace />} /> */}
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <MessengerProvider>
        <AppContent />
        <Analytics />
        <SpeedInsights />
        <InputContextMenu />
        <ProfileModal />
        <GlobalContextMenu />
        <CallOverlay />
        <GlobalCallsHistoryModal />
        <GlobalContactsModal />
      </MessengerProvider>
    </Router>
  );
}

function GlobalContactsModal() {
  const ctx = useMessengerContext();
  return (
    <ContactsModal 
      show={Boolean(ctx.showContactsModal)} 
      onClose={() => ctx.setShowContactsModal(false)} 
    />
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