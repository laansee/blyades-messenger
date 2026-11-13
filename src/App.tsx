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
      // console.log('🌐 [RouteChangeWatcher] Сработал effect. search:', location.search, '| activeChatId в стейте:', ctx.activeChatId);

      if (!location.pathname.startsWith('/chat')) {
        if (ctx.activeChatId && ctx.setActiveChatId) {
          ctx.setActiveChatId(null);
        }
        return;
      }

      const params = new URLSearchParams(location.search);
      const idParam = params.get('id');

      if (!idParam) {
        // console.log('🌐 [RouteChangeWatcher] idParam отсутствует в URL. Закрываем активный чат.');
        if (ctx.activeChatId && ctx.setActiveChatId) {
          ctx.setActiveChatId(null);
        }
        return;
      }

      if (!ctx.chats || ctx.chats.length === 0) {
        // console.log('⏳ [RouteChangeWatcher] Список чатов пуст, ждем загрузки данных...');
        return;
      }

      const foundChat = resolveChatFromRoute(ctx.chats, idParam);

      if (foundChat) {
        if (String(ctx.activeChatId) === String(foundChat.id)) {
          // console.log('✨ [RouteChangeWatcher] Чат уже открыт и равен activeChatId:', foundChat.id);
          return;
        }
        // console.log('🚀 [RouteChangeWatcher] Переключаем activeChatId на:', foundChat.id, foundChat.name);
        ctx.setActiveChatId(String(foundChat.id));
      } else if (idParam.startsWith('d')) {
        // console.log('🛠 [RouteChangeWatcher] ЛС не найдена в списке, пробуем открыть/создать для userId:', idParam.slice(1));
        const targetUserId = idParam.slice(1);
        try {
          if (ctx.openOrCreateDirectChat) {
            await ctx.openOrCreateDirectChat({ uuid: targetUserId, id: targetUserId });
          }
        } catch (err: unknown) {
          // console.error('❌ [RouteChangeWatcher] Не удалось открыть ЛС по ссылке:', err);
        }
      } else {
        // console.warn('⚠️ [RouteChangeWatcher] Чат не найден по idParam:', idParam);
      }
    };

    handleUrlSync();
  }, [location.search, ctx.chats, ctx.activeChatId]);

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