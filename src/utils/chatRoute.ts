// src/utils/chatRoute.ts

/**
 * Генерирует красивый идентификатор для URL в зависимости от типа чата
 */
export function getChatRouteId(chat: any, currentUserId?: string): string {
  if (!chat) return '';
  
  // 1. Публичный ID или username
  if (chat.publicId) return chat.publicId;
  if (chat.username) return chat.username;

  // 2. Избранное (Saved Messages)
  const isSaved = chat.type === 'saved' || chat.isSaved || String(chat.partnerId) === currentUserId || String(chat.uuid) === currentUserId || String(chat.id) === 'saved';
  if (isSaved) {
    return currentUserId ? currentUserId : String(chat.id);
  }

  const isGroup = Boolean(chat.isGroup || chat.type === 'group' || String(chat.id).startsWith('group_'));
  const isChannel = Boolean(chat.isChannel || chat.type === 'channel');
  const rawId = chat.id;

  // 3. Канал без publicId -> c{chats.id}
  if (isChannel) return `c${rawId}`;

  // 4. Беседа/группа без publicId -> g{chats.id}
  if (isGroup) return `g${rawId}`;
  
  // 5. Личный чат (ЛС) без publicId -> d{userId}
  const partnerId = chat.partnerId || chat.uuid || rawId;
  return `d${partnerId}`;
}

/**
 * Ищет чат в уже загруженном массиве по строке из URL
 */
export function resolveChatFromRoute(chats: any[], rawIdParam: string) {
  if (!rawIdParam || !chats || chats.length === 0) return null;
  
  const idParam = rawIdParam.replace(/^@/, ''); // Убираем случайную собачку

  // ШАГ 1: Ищем по публичному тегу (publicId или username)
  let foundChat = chats.find((c: any) => 
    c.publicId === idParam || c.username === idParam
  );

  if (foundChat) return foundChat;

  // ШАГ 2: Разбираем префиксы
  if (idParam.startsWith('g')) {
    const realId = idParam.slice(1);
    return chats.find((c: any) => String(c.id) === realId || String(c.id) === `group_${realId}`) || null;
  } 
  if (idParam.startsWith('c')) {
    const realId = idParam.slice(1);
    return chats.find((c: any) => String(c.id) === realId) || null;
  } 
  if (idParam.startsWith('d')) {
    const targetUserId = idParam.slice(1);
    return chats.find((c: any) => 
      String(c.partnerId) === targetUserId || 
      String(c.uuid) === targetUserId || 
      String(c.id) === targetUserId
    ) || null;
  }

  // Фолбек на чистый id
  return chats.find((c: any) => String(c.id) === idParam) || null;
}