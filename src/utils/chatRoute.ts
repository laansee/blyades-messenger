// src/utils/chatRoute.ts

export function getChatRouteId(chat: any, currentUserId?: string): string {
  if (!chat) return '';
  if (chat.publicId) return chat.publicId;
  if (chat.username) return chat.username;

  const myId = String(currentUserId || '');
  const isSaved = chat.type === 'saved' || chat.isSaved || String(chat.partnerId) === myId || String(chat.uuid) === myId || String(chat.id) === 'saved';
  if (isSaved) {
    return myId ? `d${myId}` : String(chat.id);
  }

  const isGroup = Boolean(chat.isGroup || chat.type === 'group' || String(chat.id).startsWith('group_'));
  const isChannel = Boolean(chat.isChannel || chat.type === 'channel');
  const rawId = String(chat.id || '').replace(/^(group_|channel_|chat_|d_)/, '');

  if (isChannel) return `c${rawId}`;
  if (isGroup) return `g${rawId}`;
  
  const partnerId = chat.partnerId || chat.uuid || chat.userId || rawId;
  return `d${partnerId}`;
}

export function resolveChatFromRoute(chats: any[], rawIdParam: string) {
  // console.log('🔍 [resolveChatFromRoute] Старт поиска. rawIdParam:', rawIdParam, '| Всего чатов в стейте:', chats?.length);

  if (!rawIdParam || !chats || chats.length === 0) {
    // console.log('⚠️ [resolveChatFromRoute] Прерывание: нет idParam или пустой массив чатов.');
    return null;
  }
  
  const idParam = rawIdParam.replace(/^@/, '');

  let foundChat = chats.find((c: any) => 
    c.publicId === idParam || c.username === idParam
  );

  if (foundChat) {
    // console.log('✅ [resolveChatFromRoute] Найден по publicId/username:', foundChat.name, '| id:', foundChat.id);
    return foundChat;
  }

  if (idParam.startsWith('g') || idParam.startsWith('c')) {
    const realId = idParam.slice(1);
    // console.log('📦 [resolveChatFromRoute] Ищем группу/канал по realId:', realId);
    foundChat = chats.find((c: any) => {
      const cleanChatId = String(c.id || '').replace(/^(group_|channel_|chat_|d_)/, '');
      return cleanChatId === realId || String(c.id) === realId || String(c.internalChatId) === realId;
    });
    // console.log('📦 [resolveChatFromRoute] Результат поиска g/c:', foundChat ? { id: foundChat.id, name: foundChat.name } : 'НЕ НАЙДЕНО');
    return foundChat || null;
  }
  
  if (idParam.startsWith('d')) {
    const targetUserId = idParam.slice(1);
    // console.log('👤 [resolveChatFromRoute] Ищем ЛС по targetUserId:', targetUserId);
    foundChat = chats.find((c: any) => 
      String(c.partnerId) === targetUserId || 
      String(c.uuid) === targetUserId || 
      String(c.userId) === targetUserId ||
      String(c.id) === targetUserId ||
      String(c.id).replace(/^d_/, '') === targetUserId
    );
    // console.log('👤 [resolveChatFromRoute] Результат поиска ЛС (d):', foundChat ? { id: foundChat.id, name: foundChat.name } : 'НЕ НАЙДЕНО');
    return foundChat || null;
  }

  // console.log('🔎 [resolveChatFromRoute] Запуск фолбек-поиска по id:', idParam);
  foundChat = chats.find((c: any) => {
    const cleanChatId = String(c.id || '').replace(/^(group_|channel_|chat_|d_)/, '');
    return cleanChatId === idParam || String(c.id) === idParam;
  });
  // console.log('🔎 [resolveChatFromRoute] Результат фолбека:', foundChat ? { id: foundChat.id, name: foundChat.name } : 'НЕ НАЙДЕНО');
  return foundChat || null;
}