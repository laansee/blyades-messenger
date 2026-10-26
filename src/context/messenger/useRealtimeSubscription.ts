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
        async (payload) => {
          const changedMessage: any = payload.eventType === 'DELETE' ? payload.old : payload.new;
          const changedChatId = String(changedMessage?.chatId);
          const currentActiveId = activeChatIdRef.current;

          // -------------------------------------------------------------
          // 1. ОБРАБОТКА INSERT (Новое сообщение)
          // -------------------------------------------------------------
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new;
            const isFromMe = String(newMsg.senderId) === myId;

            setChats((prevChats) => {
              const chatIndex = prevChats.findIndex((c) => String(c.id) === changedChatId);
              if (chatIndex === -1) return prevChats;

              const targetChat = { ...prevChats[chatIndex] };

              targetChat.lastMessageId = newMsg.id;
              targetChat.lastMessageText = newMsg.text;
              targetChat.lastMessageAt = newMsg.createdAt;
              targetChat.lastMessageSenderId = newMsg.senderId;
              // 🎯 Фикс залипания «Вы: »: синхронно обновляем UUID отправителя!
              targetChat.lastMessageSenderUUID = newMsg.senderId;
              targetChat.lastMessageStatus = isFromMe ? (newMsg.status || 'send') : null;

              if (String(currentActiveId) !== changedChatId && !isFromMe) {
                targetChat.unreadCount = (Number(targetChat.unreadCount) || 0) + 1;
              }

              const updatedList = [...prevChats];
              updatedList.splice(chatIndex, 1);
              return [targetChat, ...updatedList];
            });
          }

          // -------------------------------------------------------------
          // 2. ОБРАБОТКА UPDATE (Редактирование сообщения)
          // -------------------------------------------------------------
          if (payload.eventType === 'UPDATE') {
            setChats((prevChats) => {
              const chatIndex = prevChats.findIndex((c) => String(c.id) === changedChatId);
              if (chatIndex === -1) return prevChats;

              const targetChat = { ...prevChats[chatIndex] };
              if (String(targetChat.lastMessageId) === String(payload.new.id)) {
                targetChat.lastMessageText = payload.new.text;
              }
              const updatedList = [...prevChats];
              updatedList[chatIndex] = targetChat;
              return updatedList;
            });
          }

          // -------------------------------------------------------------
          // 3. ОБРАБОТКА DELETE (Удаление сообщения -> откат на предыдущее)
          // -------------------------------------------------------------
          if (payload.eventType === 'DELETE') {
            const deletedId = String(payload.old.id);

            // Ищем актуальное последнее оставшееся сообщение в базе для этого чата
            const numChatId = Number(changedChatId);
            const { data: prevMsgs } = await supabase
              .from('messages')
              .select('*')
              .eq('chatId', !isNaN(numChatId) ? numChatId : changedChatId)
              .neq('id', deletedId)
              .order('createdAt', { ascending: false })
              .limit(1);

            const prevMsg = prevMsgs && prevMsgs.length > 0 ? prevMsgs[0] : null;

            setChats((prevChats) => {
              const chatIndex = prevChats.findIndex((c) => String(c.id) === changedChatId);
              if (chatIndex === -1) return prevChats;

              const targetChat = { ...prevChats[chatIndex] };

              // Если удалили именно то сообщение, что висело в превью сайдбара
              if (String(targetChat.lastMessageId) === deletedId) {
                if (prevMsg) {
                  targetChat.lastMessageId = prevMsg.id;
                  targetChat.lastMessageText = prevMsg.text;
                  targetChat.lastMessageAt = prevMsg.createdAt;
                  targetChat.lastMessageSenderId = prevMsg.senderId;
                  targetChat.lastMessageSenderUUID = prevMsg.senderId;
                  targetChat.lastMessageStatus = String(prevMsg.senderId) === myId ? prevMsg.status : null;
                } else {
                  targetChat.lastMessageId = null;
                  targetChat.lastMessageText = 'Нет сообщений';
                  targetChat.lastMessageAt = null;
                  targetChat.lastMessageSenderId = null;
                  targetChat.lastMessageSenderUUID = null;
                  targetChat.lastMessageStatus = null;
                }
              }

              const updatedList = [...prevChats];
              updatedList[chatIndex] = targetChat;
              return updatedList;
            });
          }
          
          // -------------------------------------------------------------
          // 4. ОБНОВЛЕНИЕ МАССИВА СООБЩЕНИЙ ВНУТРИ АКТИВНОГО ОКНА ЧАТА
          // -------------------------------------------------------------
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
  }, [currentUser?.uuid, currentUser?.id, setMessages, setChats]);
}