import { supabase } from './supabaseClient';
import { normalizeUser, getUserPrivacy } from './userService';

export interface GlobalSearchResult {
  users: any[];
  publicChats: any[];
}

export const searchService = {
  // 1. Поиск сообщений по тексту внутри доступных пользователю комнат
  async searchMessagesInMyChats(chatIds: number[], query: string, limit = 15) {
    const cleanQuery = query.trim();
    if (!cleanQuery || chatIds.length === 0) return [];

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .in('chatId', chatIds)
        .ilike('text', `%${cleanQuery}%`)
        .order('createdAt', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Ошибка поиска сообщений:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Ошибка searchMessagesInMyChats:', err);
      return [];
    }
  },

  // 2. Глобальный поиск: публичные каналы/беседы и пользователи (с учетом privacy.search)
  async searchGlobal(query: string, currentUserId: string): Promise<GlobalSearchResult> {
    const cleanTag = query.replace(/^@/, '').replace(/[,()]/g, '').trim();
    if (!cleanTag) {
      return { users: [], publicChats: [] };
    }

    try {
      const [chatsRes, usersRes] = await Promise.all([
        supabase
          .from('chats')
          .select('*')
          .eq('accessType', 'public')
          .or(`name.ilike.%${cleanTag}%,publicId.ilike.%${cleanTag}%`)
          .limit(10),

        supabase
          .from('users')
          .select('*')
          .neq('uuid', currentUserId)
          .is('bannedAt', null)
          .or(`publicId.ilike.%${cleanTag}%,username.ilike.%${cleanTag}%`)
          .limit(10)
      ]);

      const publicChats = (chatsRes.data || []).map((chat: any) => ({
        ...chat,
        avatarColor: chat.appearance?.avatarColor || '#5865F2',
        isChannel: chat.type === 'channel',
        isGroup: chat.type === 'group',
        isGlobal: true
      }));

      const users = (usersRes.data || [])
        .map(normalizeUser)
        .filter(u => getUserPrivacy(u).search !== 'none')
        .map(u => ({
          ...u,
          isGlobal: true,
          isUser: true
        }));

      return { publicChats, users };
    } catch (err) {
      console.error('Ошибка searchGlobal:', err);
      return { users: [], publicChats: [] };
    }
  },

  async searchMessagesByScope(params: {
    query?: string;
    chatId?: string | number | null;
    myChatIds?: (string | number)[];
    senderId?: string | null;
    date?: string | null;
    limit?: number;
  }) {
    const { query = '', chatId, myChatIds, senderId, date, limit = 60 } = params;
    const cleanQuery = query.trim();

    if (!cleanQuery && !senderId && !date) return [];

    try {
      let q = supabase
        .from('messages')
        .select('*')
        .neq('senderId', '00000000-0000-0000-0000-000000000000')
        .order('createdAt', { ascending: false })
        .limit(limit);

      if (cleanQuery) {
        q = q.ilike('text', `%${cleanQuery}%`);
      }

      if (chatId != null && chatId !== '') {
        const numId = Number(chatId);
        q = !isNaN(numId) ? q.eq('chatId', numId) : q.eq('chatId', String(chatId));
      } else if (myChatIds && myChatIds.length > 0) {
        const numericIds = myChatIds.map(Number).filter(n => !isNaN(n));
        if (numericIds.length > 0) q = q.in('chatId', numericIds);
      }

      if (senderId) {
        q = q.eq('senderId', String(senderId));
      }

      if (date) {
        const startOfDay = `${date}T00:00:00.000Z`;
        const endOfDay = `${date}T23:59:59.999Z`;
        q = q.gte('createdAt', startOfDay).lte('createdAt', endOfDay);
      }

      const { data, error } = await q;
      if (error) {
        console.error('Ошибка выполнения поиска в базе:', error);
        return [];
      }

      return (data || []).filter((m: any) =>
        m.senderId !== 'system' &&
        String(m.senderId) !== '00000000-0000-0000-0000-000000000000' &&
        !String(m.text || '').startsWith('{{user:')
      );
    } catch (err) {
      console.error('Исключение при поиске:', err);
      return [];
    }
  }
};