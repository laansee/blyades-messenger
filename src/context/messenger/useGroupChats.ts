import { supabase } from '../../services/supabaseClient';

export function useGroupChats(
  currentUser: any,
  showToast: any,
  setActiveChatId: any,
  setActiveTab: any,
  fetchAndMatchChats?: () => Promise<void>
) {
  const handleCreateGroupChat = async (groupName: string, selectedUserIds: string[]) => {
    if (!currentUser || !groupName.trim()) return;

    const myUuid = String(currentUser.uuid || currentUser.id);
    const nowIso = new Date().toISOString();
    
    const avatarColors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245'];
    const randomAvatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    try {
      showToast('Создание беседы...', 'info');

      // 1. Создаём запись беседы в таблице chats
      const { data: newChat, error: groupError } = await supabase
        .from('chats')
        .insert([{
          name: groupName.trim(),
          type: 'group',
          avatarColor: randomAvatarColor,
          createdBy: myUuid,
          uniqueId: `group_${Date.now()}`,
          lastMessageType: 'text',
          lastMessageSenderUUID: '00000000-0000-0000-0000-000000000000',
          createdAt: nowIso,
          updatedAt: nowIso
        }])
        .select()
        .single();

      if (groupError || !newChat) throw groupError || new Error('Не удалось создать беседу');

      const newChatNumericId = newChat.id;

      // 2. Добавляем участников в chat_members
      const allMemberUuids = Array.from(new Set([myUuid, ...selectedUserIds.map(String)]));
      const membersToInsert = allMemberUuids.map(uid => ({
        chatId: newChatNumericId,
        userId: uid,
        role: uid === myUuid ? 'owner' : 'member',
        joinedAt: nowIso
      }));

      const { error: membersError } = await supabase
        .from('chat_members')
        .insert(membersToInsert);

      if (membersError) throw membersError;

      // 3. Формируем шаблонные системные сообщения
      const creationText = `{{user:${myUuid}}} создал беседу {{chat:${newChatNumericId}}}`;
      const messagesToInsert: any[] = [
        {
          chatId: newChatNumericId,
          senderId: '00000000-0000-0000-0000-000000000000',
          text: creationText,
          status: 'send',
          createdAt: nowIso
        }
      ];

      // Добавляем сообщения приглашения для каждого выбранного пользователя
      selectedUserIds.forEach((targetUuid, idx) => {
        messagesToInsert.push({
          chatId: newChatNumericId,
          senderId: '00000000-0000-0000-0000-000000000000',
          text: `{{user:${myUuid}}} пригласил(а) {{user:${targetUuid}}} в беседу`,
          status: 'send',
          // Добавляем небольшое смещение во времени, чтобы сохранить хронологию
          createdAt: new Date(Date.now() + (idx + 1) * 10).toISOString()
        });
      });

      await supabase.from('messages').insert(messagesToInsert);

      // 4. Обновляем lastMessageText в самой беседе для сайдбара
      const lastMessageText = messagesToInsert[messagesToInsert.length - 1].text;
      await supabase
        .from('chats')
        .update({
          lastMessageText: lastMessageText,
          lastMessageAt: new Date().toISOString()
        })
        .eq('id', newChatNumericId);

      if (fetchAndMatchChats) {
        await fetchAndMatchChats();
      }

      setActiveChatId(String(newChatNumericId));
      setActiveTab('chats');
      showToast(`Беседа "${groupName.trim()}" успешно создана! 🎉`, 'success');

    } catch (err: any) {
      console.error('Ошибка создания группы:', err);
      showToast(`Не удалось создать группу: ${err.message}`, 'error');
    }
  };

  return { handleCreateGroupChat };
}
