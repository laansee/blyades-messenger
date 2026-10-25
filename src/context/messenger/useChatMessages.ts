import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { supabase } from '../../services/supabaseClient';

const PAGE_SIZE = 50;

type Message = any;

type UseChatMessagesResult = {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  messagesLoading: boolean;
  olderMessagesLoading: boolean;
  messagesError: string | null;
  hasMoreMessages: boolean;
  loadOlderMessages: () => Promise<void>;
};

export function useChatMessages(
  chatId: string | null
): UseChatMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [olderMessagesLoading, setOlderMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Нужен, чтобы старый запрос не перезаписал сообщения нового чата
  const requestNumberRef = useRef(0);

  const loadMessages = useCallback(async (roomId: string) => {
    const requestNumber = ++requestNumberRef.current;

    setMessages([]);
    setMessagesLoading(true);
    setMessagesError(null);
    setHasMoreMessages(true);

    // 🎯 ГАРАНТИРУЕМ ЧИСТЫЙ СТРОКОВЫЙ ID (например, "direct_179029..." или "group_179031...")
    const cleanRoomId = String(roomId).trim();

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chatId', cleanRoomId) // 🎯 Поиск строго по строковому uniqueId
      .order('id', { ascending: false })
      .limit(PAGE_SIZE);

    if (requestNumber !== requestNumberRef.current) {
      return;
    }

    if (error) {
      console.error('Ошибка загрузки сообщений:', error);
      setMessagesError(error.message);
      setMessagesLoading(false);
      return;
    }

    const loadedMessages = [...(data ?? [])].reverse();

    setMessages(loadedMessages);
    setHasMoreMessages((data ?? []).length === PAGE_SIZE);
    setMessagesLoading(false);
  }, []);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setMessagesError(null);
      setHasMoreMessages(true);
      return;
    }

    loadMessages(chatId);
  }, [chatId, loadMessages]);

  const loadOlderMessages = useCallback(async () => {
    if (!chatId || messages.length === 0 || olderMessagesLoading || !hasMoreMessages) {
      return;
    }

    const currentChatId = String(chatId).trim();
    const oldestMessage = messages[0];
    if (!oldestMessage?.id) return;

    setOlderMessagesLoading(true);

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chatId', currentChatId)
      .lt('id', oldestMessage.id)
      .order('id', { ascending: false })
      .limit(PAGE_SIZE);

    if (String(chatId).trim() !== currentChatId) {
      setOlderMessagesLoading(false);
      return;
    }

    if (error) {
      console.error('Ошибка загрузки старых сообщений:', error);
      setMessagesError(error.message);
      setOlderMessagesLoading(false);
      return;
    }

    const olderMessages = [...(data ?? [])].reverse();
    setMessages((currentMessages) => [...olderMessages, ...currentMessages]);
    setHasMoreMessages((data ?? []).length === PAGE_SIZE);
    setOlderMessagesLoading(false);
  }, [chatId, messages, olderMessagesLoading, hasMoreMessages]);

  return {
    messages,
    setMessages,
    messagesLoading,
    olderMessagesLoading,
    messagesError,
    hasMoreMessages,
    loadOlderMessages,
  };
}
