import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import { supabase } from './services/supabaseClient';
import { type User } from '@supabase/supabase-js';
import { PageLoader } from './components/PageLoader';
import AuthPage from './features/auth/AuthPage';
import ChatLayout from './features/chat/chatLayout';
import SettingsPage from './features/settings/settingsPage';
import ContactsPage from './features/contacts/contactsPage';
import useMessengerContext, { MessengerProvider } from './context/messengerContext';
import ContextMenu from './components/context-menu';
import ProfileModal from './components/profile-modal';
import DropdownMenu from './components/dropdown-menu';

function AppContent() {
  const ctx = useMessengerContext();
  const [session, setSession] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUserId = localStorage.getItem('blyades_user_id');
    const savedUniqueId = localStorage.getItem('blyades_unique_id');
    if (savedUserId && savedUniqueId) 
      setSession({ id: savedUserId, email: savedUniqueId } as any);
    else setSession(null);
    
    setLoading(false);
  }, []);

  if (loading) return <PageLoader />;

  return (
    <Router>
      <Routes>
        {!ctx.currentUser ? (
          <>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </>
        ) : (
          <>
            <Route path="/chat" element={<ChatLayout />} />
            <Route path="/calls" element={<ChatLayout />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/settings" element={<SettingsPage />} /> 
            
            <Route path="/auth" element={<Navigate to="/chat" replace />} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </>
        )}
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
