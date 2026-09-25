import { useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

let isMessagesGlobalChannelInitialized = false;

export function useRealtimeSubscription(currentUser: any, setAllMessages: React.Dispatch<React.SetStateAction<any[]>>) {
  useEffect(() => {
    const myId = currentUser ? String(currentUser.id) : localStorage.getItem('blyades_user_id');
    if (!myId) return;

    const channelName = 'global-messages-live';
    
    if (isMessagesGlobalChannelInitialized) {
      return;
    }

    isMessagesGlobalChannelInitialized = true; 
    const msgChannel = supabase.channel(channelName);

    msgChannel
      // А. Стрим сообщений
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('[Messages_Realtime] Поймали событие базы данных Сообщений:', payload.eventType, payload);

          if (payload.eventType === 'INSERT') {
            setAllMessages((prev) => {
              const tempMatchIndex = prev.findIndex(m => 
                String(m.id).startsWith('temp-') && 
                m.text === payload.new.text && 
                String(m.senderId) === String(payload.new.senderId)
              );

              if (tempMatchIndex !== -1) {
                const updated = [...prev];
                updated[tempMatchIndex] = payload.new;
                return updated;
              }

              const isAlreadyExist = prev.some(m => m.id === payload.new.id);
              return isAlreadyExist ? prev : [...prev, payload.new];
            });
          }
          if (payload.eventType === 'UPDATE') {
            setAllMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
          }
          if (payload.eventType === 'DELETE') {
            setAllMessages((prev) => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      // Б. Стрим добавления в группы
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_members' },
        (payload) => {
          if (String(payload.new.userId) === String(myId)) {
            console.log('[Groups_Realtime] Нас добавили в группу через сокеты!');
            setAllMessages((prev) => [...prev]); 
          }
        }
      )
      // В. Стрим изменения метаданных групп
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_chats' },
        () => {
          setAllMessages((prev) => [...prev]);
        }
      )
      .subscribe();

    return () => {};
  }, [currentUser, setAllMessages]);
}
