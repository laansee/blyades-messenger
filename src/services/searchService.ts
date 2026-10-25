import { supabase } from './supabaseClient';

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

  // 2. Глобальный поиск: публичные каналы/беседы и пользователи (с учетом privacySearch)
  async searchGlobal(query: string, currentUserId: string): Promise<GlobalSearchResult> {
    const cleanTag = query.replace('@', '').trim();
    if (!cleanTag) {
      return { users: [], publicChats: [] };
    }

    try {
      const [chatsRes, usersRes] = await Promise.all([
        // Поиск публичных каналов и групп
        supabase
          .from('chats')
          .select('*')
          .eq('accessType', 'public')
          .or(`name.ilike.%${cleanTag}%,publicId.ilike.%${cleanTag}%`)
          .limit(10),

        // Поиск пользователей, не скрывших профиль из глобального поиска
        supabase
          .from('users')
          .select('*')
          .neq('uuid', currentUserId)
          .or(`uniqueId.ilike.%${cleanTag}%,username.ilike.%${cleanTag}%`)
          .limit(10)
      ]);

      const publicChats = (chatsRes.data || []).map((chat: any) => ({
        ...chat,
        isChannel: chat.type === 'channel',
        isGroup: chat.type === 'group',
        isGlobal: true
      }));

      // Фильтруем пользователей по privacySearch === 'none'
      const users = (usersRes.data || [])
        .filter((u: any) => u.privacySearch !== 'none')
        .map((u: any) => ({
          ...u,
          isGlobal: true,
          isUser: true
        }));

      return { publicChats, users };
    } catch (err) {
      console.error('Ошибка searchGlobal:', err);
      return { users: [], publicChats: [] };
    }
  }
};