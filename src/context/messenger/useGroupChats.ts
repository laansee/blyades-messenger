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
    const startText = 'Беседа создана';
    
    const avatarColors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245'];
    const randomAvatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    try {
      showToast('Создание беседы...', 'info');

      // 1. Записываем метаданные о беседе в таблицу group_chats
      const { data: newChat, error: groupError } = await supabase
        .from('chats')
        .insert([{
          name: groupName.trim(),
          type: 'group',
          avatarColor: randomAvatarColor,
          createdBy: myUuid,
          uniqueId: `group_${Date.now()}`,
          lastMessageText: startText,
          lastMessageAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso
        }])
        .select()
        .single();

      if (groupError || !newChat) throw groupError || new Error('Не удалось создать беседу');

      const newChatNumericId = newChat.id;

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

      // 3. Отправляем стартовое системное сообщение в messages
      await supabase
        .from('messages')
        .insert([{
          chatId: newChatNumericId,
          senderId: '00000000-0000-0000-0000-000000000000',
          text: `Пользователь <b>${currentUser.username || 'Пользователь'}</b> создал(а) беседу <b>${groupName.trim()}</b>`,
          status: 'send',
          createdAt: nowIso
        }]);

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
