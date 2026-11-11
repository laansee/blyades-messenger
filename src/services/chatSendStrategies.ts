import { supabase } from './supabaseClient';

export interface SendMessageContext {
  chatId: string | number;
  myId: string;
  text: string;
  nowIso: string;
}

export interface ChannelSendOptions extends SendMessageContext {
  sendAsType: 'user' | 'channel';
  isSignModeActive: boolean;
  isShowAuthorProfilesActive: boolean;
  authorSignature: string;
}

export const chatSendStrategies = {
  async sendDirect({ chatId, myId, text, nowIso }: SendMessageContext) {
    const numericRoomId = Number(chatId);
    const targetRoomId = isNaN(numericRoomId) ? chatId : numericRoomId;

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        chatId: targetRoomId,
        senderId: myId,
        senderType: 'user',
        text,
        status: 'send',
        createdAt: nowIso
      }])
      .select()
      .single();

    if (error) throw error;

    if (!isNaN(numericRoomId)) {
      await supabase
        .from('chats')
        .update({
          lastMessageText: text,
          lastMessageAt: nowIso,
          lastMessageSenderUUID: myId
        })
        .eq('id', numericRoomId);
    }

    return data;
  },

  async sendSaved({ chatId, myId, text, nowIso }: SendMessageContext) {
    const numericRoomId = Number(chatId);
    const targetRoomId = isNaN(numericRoomId) ? chatId : numericRoomId;

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        chatId: targetRoomId,
        senderId: myId,
        senderType: 'user',
        text,
        status: 'send',
        createdAt: nowIso
      }])
      .select()
      .single();

    if (error) throw error;

    if (!isNaN(numericRoomId)) {
      await supabase
        .from('chats')
        .update({
          lastMessageText: text,
          lastMessageAt: nowIso,
          lastMessageSenderUUID: myId
        })
        .eq('id', numericRoomId);
    }

    return data;
  },

  async sendGroup({ chatId, myId, text, nowIso }: SendMessageContext) {
    const numericRoomId = Number(chatId);
    const targetRoomId = isNaN(numericRoomId) ? chatId : numericRoomId;

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        chatId: targetRoomId,
        senderId: myId,
        senderType: 'user',
        text,
        status: 'send',
        createdAt: nowIso
      }])
      .select()
      .single();

    if (error) throw error;

    if (!isNaN(numericRoomId)) {
      await supabase
        .from('chats')
        .update({
          lastMessageText: text,
          lastMessageAt: nowIso,
          lastMessageSenderUUID: myId
        })
        .eq('id', numericRoomId);
    }

    return data;
  },

  /**
   * 📢 Отправка в канал:
   * Фиксирует senderType: 'user' ТОЛЬКО если showAuthorProfiles: true и автор не выбрал отправку от имени канала.
   * authorSignature сохраняется всегда, если включен signMessages.
   */
  async sendChannel({ 
    chatId, 
    myId, 
    text, 
    nowIso, 
    sendAsType, 
    isSignModeActive, 
    isShowAuthorProfilesActive, 
    authorSignature 
  }: ChannelSendOptions) {
    const numericRoomId = Number(chatId);
    const targetRoomId = isNaN(numericRoomId) ? chatId : numericRoomId;

    // senderType становится 'user' только при явном включении showAuthorProfiles и отправке от своего аккаунта
    const senderType: 'user' | 'channel' = 
      (isShowAuthorProfilesActive && sendAsType !== 'channel') ? 'user' : 'channel';

    // Подпись автора в метаданных сообщения
    const payloadSignature = (isSignModeActive && sendAsType !== 'channel')
      ? authorSignature
      : null;

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        chatId: targetRoomId,
        senderId: myId,
        senderType,
        authorId: myId,
        authorSignature: payloadSignature,
        text,
        status: 'send',
        createdAt: nowIso
      }])
      .select()
      .single();

    if (error) throw error;

    if (!isNaN(numericRoomId)) {
      await supabase
        .from('chats')
        .update({
          lastMessageText: text,
          lastMessageAt: nowIso,
          lastMessageSenderUUID: myId
        })
        .eq('id', numericRoomId);
    }

    return data;
  }
};