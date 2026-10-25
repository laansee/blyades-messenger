import { useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';

export function useRealtimeSubscription(
  currentUser: any,
  setMessages: React.Dispatch<React.SetStateAction<any[]>>,
  activeChatId: string | null,
  setChats: React.Dispatch<React.SetStateAction<any[]>>
) {
  const activeChatIdRef = useRef(activeChatId);
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    const myId = String(currentUser?.uuid || currentUser?.id || localStorage.getItem('blyades_user_id') || '');
    if (!myId) return;

    const channelName = 'messages-global-live';

    const messageChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          const changedMessage: any = payload.eventType === 'DELETE' ? payload.old : payload.new;
          const changedChatId = String(changedMessage?.chatId);
          const currentActiveId = activeChatIdRef.current;

          setChats((prevChats) => {
            const chatIndex = prevChats.findIndex((c) => String(c.id) === changedChatId);
            if (chatIndex === -1) return prevChats;

            const targetChat = { ...prevChats[chatIndex] };

            if (payload.eventType === 'INSERT') {
              targetChat.lastMessageId = payload.new.id;
              targetChat.lastMessageText = payload.new.text;
              targetChat.lastMessageAt = payload.new.createdAt;
              targetChat.lastMessageSenderId = payload.new.senderId;

              if (String(currentActiveId) !== changedChatId && String(payload.new.senderId) !== myId) {
                targetChat.unreadCount = (Number(targetChat.unreadCount) || 0) + 1;
              }

              const updatedList = [...prevChats];
              updatedList.splice(chatIndex, 1);
              return [targetChat, ...updatedList];
            }

            if (payload.eventType === 'UPDATE') {
              if (String(targetChat.lastMessageId) === String(payload.new.id)) {
                targetChat.lastMessageText = payload.new.text;
              }
              const updatedList = [...prevChats];
              updatedList[chatIndex] = targetChat;
              return updatedList;
            }

            if (payload.eventType === 'DELETE') {
              if (String(targetChat.lastMessageId) === String(payload.old.id)) {
                targetChat.lastMessageText = 'Сообщение удалено';
              }
              const updatedList = [...prevChats];
              updatedList[chatIndex] = targetChat;
              return updatedList;
            }

            return prevChats;
          });

          if (!currentActiveId || String(changedChatId) !== String(currentActiveId)) {
            return;
          }

          if (payload.eventType === 'INSERT') {
            setMessages((previousMessages) => {
              const tempIndex = previousMessages.findIndex(
                (m) =>
                  String(m.id).startsWith('temp-') &&
                  m.text === payload.new.text &&
                  String(m.senderId) === String(payload.new.senderId)
              );

              if (tempIndex !== -1) {
                const updated = [...previousMessages];
                updated[tempIndex] = payload.new;
                return updated;
              }

              if (previousMessages.some((m) => String(m.id) === String(payload.new.id))) {
                return previousMessages;
              }

              return [...previousMessages, payload.new];
            });
            return;
          }
          
          if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m) => (String(m.id) === String(payload.new.id) ? payload.new : m))
            );
            return;
          }

          if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => String(m.id) !== String(payload.old.id)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [currentUser?.uuid, setMessages, setChats]);
}