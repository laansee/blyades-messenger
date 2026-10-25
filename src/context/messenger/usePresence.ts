import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

export function usePresence(currentUser: any) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const myUuid = currentUser?.uuid || currentUser?.id;

  useEffect(() => {
    if (!myUuid) return;
    const cleanId = String(myUuid);

    supabase
      .from('users')
      .update({ updatedAt: new Date().toISOString() })
      .eq('uuid', cleanId)
      .then();

    const presenceChannel = supabase.channel('online-presence-room', {
      config: { presence: { key: cleanId } },
    });

    const updatePresenceState = () => {
      const state = presenceChannel.presenceState();
      setOnlineUserIds(new Set<string>(Object.keys(state)));
    };

    presenceChannel
      .on('presence', { event: 'sync' }, updatePresenceState)
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUserIds((prev) => new Set([...prev, String(key)]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.delete(String(key));
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() });
          updatePresenceState();
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [myUuid]);

  return { onlineUserIds };
}