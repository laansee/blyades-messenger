import { supabase } from '../../services/supabaseClient';

export function useGroupChats(currentUser: any, showToast: any, setActiveChatId: any, setActiveTab: any) {
  const handleCreateGroupChat = async (groupName: string, selectedUserIds: string[]) => {
    if (!currentUser || !groupName.trim()) return;

    const myIdStr = String(currentUser.id);
    const groupRoomId = `group_${Date.now()}`;
    
    const discordColors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245'];
    const randomAvatarColor = discordColors[Math.floor(Math.random() * discordColors.length)];

    try {
      showToast('Создание беседы...', 'info');

      // 1. Записываем метаданные о беседе в таблицу group_chats
      const { error: groupError } = await supabase
        .from('group_chats')
        .insert([{
          id: groupRoomId,
          name: groupName.trim(),
          ownerId: myIdStr,
          avatarColor: randomAvatarColor
        }]);

      if (groupError) throw groupError;

      // 2. Связываем участников в таблице group_members
      const allMembersToInsert = Array.from(new Set([myIdStr, ...selectedUserIds])).map(uid => ({
        chatId: groupRoomId,
        userId: String(uid).trim()
      }));

      const { error: membersError } = await supabase
        .from('group_members')
        .insert(allMembersToInsert);

      if (membersError) throw membersError;

      // 3. Отправляем стартовое системное сообщение
      await supabase
        .from('messages')
        .insert([{
          chatId: groupRoomId,
          senderId: 'system',
          text: `Пользователь <b>${currentUser.username}</b> создал беседу <b>${groupName.trim()}</b>`,
          status: 'send'
        }]);

      setActiveChatId(groupRoomId);
      setActiveTab('chats');
      showToast(`Беседа "${groupName}" успешно создана! 🎉`, 'success');

    } catch (err: any) {
      console.error('Ошибка создания группы:', err);
      showToast(`Не удалось создать группу: ${err.message}`, 'error');
    }
  };

  return { handleCreateGroupChat };
}
