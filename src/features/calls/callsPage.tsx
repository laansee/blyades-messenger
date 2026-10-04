import React, { useEffect, useState } from 'react';
import mainStyle from '../../components/css/main.module.css';
import useMessengerContext from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';
import NavSidebar from '../channels/nav-sidebar';
import CallsSidebar from './callsSidebar';
import CallsWindow from './callsWindow';

export default function CallsPage() {
  const ctx = useMessengerContext();
  const [callsHistory, setCallsHistory] = useState<any[]>([]);

  const myIdStr = String(ctx.currentUser?.id);

  const loadHistory = async () => {
    if (!ctx.currentUser) return;
    const { data } = await supabase
      .from('calls')
      .select('*')
      .or(`callerId.eq.${myIdStr},receiverId.eq.${myIdStr}`)
      .order('createdAt', { ascending: false });
    
    if (data) setCallsHistory(data);
  };
      
  useEffect(() => {
    document.title = 'Звонки | Blyades';
  }, []);

  useEffect(() => {
    ctx.setActiveTab('calls');
    loadHistory();

    const channel = supabase
      .channel('calls-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => {
        loadHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ctx.currentUser]);

  if (!ctx.currentUser) return null;

  return (
    <div className={mainStyle['messenger-container']}>
      <NavSidebar />
      <CallsSidebar callsHistory={callsHistory} />
      <CallsWindow />
    </div>
  );
}
