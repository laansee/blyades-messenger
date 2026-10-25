import { useState, useEffect } from 'react';
import styles from '../css/profile.module.css';
import useMessengerContext from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';
import { userService } from '../../services/userService';
import { X } from 'lucide-react';

import UserProfileView from './UserProfileView';
import GroupProfileView from './GroupProfileView';
import ChannelProfileView from './ChannelProfileView';
import MyProfileView from './MyProfileView';
import EditMode from './edit';

export default function ProfileModal() {
  const ctx = useMessengerContext();
  const [isAnimateClose, setIsAnimateClose] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fetchedExternalUser, setFetchedExternalUser] = useState<any | null>(null);

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAvatarColor, setEditAvatarColor] = useState('#5865F2');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  const targetIdentifier = ctx?.showUserModal === true 
    ? String(ctx?.activeChatId || '').trim() 
    : String(ctx?.showUserModal || '').trim();

  // 1. Сначала ищем чат в общем массиве активных диалогов (по id чата или partnerId/uuid)
  const cachedChatUser = (ctx?.chats || []).find((c: any) => 
    String(c.id).trim() === targetIdentifier ||
    String(c.partnerId).trim() === targetIdentifier ||
    String(c.uuid).trim() === targetIdentifier
  );

  // 2. Если в chats не найдено (пользователь открыт из поиска/беседы), подтягиваем через userService
  useEffect(() => {
    let isMounted = true;

    const loadMissingUser = async () => {
      if (!ctx.showUserModal || cachedChatUser || !targetIdentifier) {
        setFetchedExternalUser(null);
        return;
      }

      try {
        const user = await userService.getUserByUuid(targetIdentifier);
        if (isMounted && user) {
          setFetchedExternalUser({
            ...user,
            id: user.uuid,
            partnerId: user.uuid,
            name: userService.resolveDisplayName(user),
            isContact: false
          });
        }
      } catch (err) {
        console.error('Ошибка загрузки внешнего профиля:', err);
      }
    };

    loadMissingUser();

    return () => {
      isMounted = false;
    };
  }, [ctx.showUserModal, targetIdentifier, cachedChatUser]);

  const currentChatUser = cachedChatUser || fetchedExternalUser;

  useEffect(() => {
    if (isEditing && currentChatUser) {
      const isGroupOrChannel = currentChatUser.isGroup || currentChatUser.isChannel || currentChatUser.type === 'channel' || currentChatUser.type === 'group';
      
      if (isGroupOrChannel) {
        setEditFirstName(currentChatUser.name || '');
        setEditDescription(currentChatUser.aboutMe || currentChatUser.description || '');
        setEditAvatarColor(currentChatUser.avatarColor || '#5865F2');
        setEditAvatarUrl(currentChatUser.avatarUrl || '');
      } else {
        if (currentChatUser.isContact) {
          setEditFirstName(currentChatUser.contactFirstName ?? '');
          setEditLastName(currentChatUser.contactLastName ?? '');
          setEditNote(currentChatUser.note ?? '');
        } else {
          const isNameVisible = currentChatUser.privacyFullName === 'all';
          setEditFirstName(currentChatUser.firstName || currentChatUser.username || '');
          setEditLastName(isNameVisible ? (currentChatUser.lastName || '') : '');
          setEditNote('');
        }
      }
    }
  }, [isEditing, currentChatUser]);

  useEffect(() => {
    setIsEditing(false);
  }, [ctx?.showUserModal]);

  if (!ctx || !ctx.showUserModal || !currentChatUser) return null;

  const baseName = currentChatUser.isContact && (currentChatUser.contactFirstName || currentChatUser.contactLastName)
    ? `${currentChatUser.contactFirstName || ''} ${currentChatUser.contactLastName || ''}`.trim()
    : currentChatUser.name || currentChatUser.username || 'Пользователь';

  const handleCloseModalSmooth = () => {
    setIsAnimateClose(true);
    setTimeout(() => {
      ctx.setShowUserModal(false);
      setIsAnimateClose(false);
      setIsEditing(false);
      setFetchedExternalUser(null);
    }, 200);
  };

  const shouldShowField = (privacySetting: string | undefined, isMeInHisContacts: boolean) => {
    if (!privacySetting || privacySetting === 'all') return true;
    if (privacySetting === 'contacts') return Boolean(isMeInHisContacts);
    return false;
  };

  const handleSaveContactOrGroup = async () => {
    const isGroupOrChannel = currentChatUser.isGroup || currentChatUser.isChannel || currentChatUser.type === 'channel' || currentChatUser.type === 'group';
    const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');

    if (isGroupOrChannel) {
      const numericChatId = Number(currentChatUser.internalChatId || currentChatUser.id);
      const updatedChatFields = {
        name: editFirstName.trim(),
        description: editDescription.trim() || null,
        avatarColor: editAvatarColor,
        avatarUrl: editAvatarUrl.trim() || null,
        updatedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('chats')
        .update(updatedChatFields)
        .eq('id', numericChatId);

      if (error) {
        console.error('Ошибка обновления беседы/канала:', error);
        ctx.showToast('Не удалось сохранить изменения', 'error');
        return;
      }

      ctx.setChats((prev: any[]) =>
        prev.map((c) =>
          String(c.id) === String(currentChatUser.id)
            ? {
                ...c,
                name: editFirstName.trim(),
                aboutMe: editDescription.trim(),
                description: editDescription.trim(),
                avatarColor: editAvatarColor,
                avatarUrl: editAvatarUrl.trim() || null,
              }
            : c
        )
      );
    } else {
      // Сохранение контакта пользователя с привязкой по UUID
      const targetUserUuid = String(currentChatUser.partnerId || currentChatUser.uuid || currentChatUser.id);
      
      const updatedFields = {
        userId: myUuid,
        contactId: targetUserUuid,
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        note: editNote.trim(),
        updatedAt: new Date().toISOString()
      };

      // 1. Сначала пробуем обновить существующий контакт
      const { data: updatedRows, error: updateError } = await supabase
        .from('contacts')
        .update({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          note: editNote.trim(),
          updatedAt: new Date().toISOString()
        })
        .eq('userId', myUuid)
        .eq('contactId', targetUserUuid)
        .select();

      if (updateError) {
        console.error('Ошибка update контакта:', updateError);
        ctx.showToast(`Ошибка сохранения: ${updateError.message}`, 'error');
        return;
      }

      // 2. Если такой записи ещё не было в таблице — делаем обычный insert
      if (!updatedRows || updatedRows.length === 0) {
        const { error: insertError } = await supabase
          .from('contacts')
          .insert(updatedFields);

        if (insertError) {
          console.error('Ошибка insert контакта:', insertError);
          ctx.showToast(`Ошибка добавления контакта: ${insertError.message}`, 'error');
          return;
        }
      }

      // 🎯 3. Обновляем локальный стейт ctx.contacts
      if (ctx.setContacts) {
        ctx.setContacts((prev: any[]) => {
          const exists = prev.some(c => String(c.partnerId || c.uuid || c.contactId || c.id) === targetUserUuid);
          if (exists) {
            return prev.map(c => 
              String(c.partnerId || c.uuid || c.contactId || c.id) === targetUserUuid
                ? {
                    ...c,
                    contactFirstName: editFirstName.trim(),
                    contactLastName: editLastName.trim(),
                    firstName: editFirstName.trim(),
                    lastName: editLastName.trim(),
                    note: editNote.trim(),
                    isContact: true
                  }
                : c
            );
          }
          return [
            ...prev,
            {
              ...currentChatUser,
              partnerId: targetUserUuid,
              uuid: targetUserUuid,
              contactFirstName: editFirstName.trim(),
              contactLastName: editLastName.trim(),
              note: editNote.trim(),
              isContact: true
            }
          ];
        });
      }

      // 🎯 4. Обновляем стейт чатов ctx.chats
      ctx.setChats((prev: any[]) => prev.map(c => {
        const isTarget = String(c.partnerId) === targetUserUuid || String(c.id) === targetUserUuid || String(c.uuid) === targetUserUuid;
        if (!isTarget) return c;
        return {
          ...c,
          isContact: true,
          contactFirstName: editFirstName.trim(),
          contactLastName: editLastName.trim(),
          name: `${editFirstName} ${editLastName}`.trim() || c.username,
          note: editNote.trim()
        };
      }));

      // 🎯 5. Обновляем локальный стейт открытого профиля
      if (fetchedExternalUser) {
        setFetchedExternalUser((prev: any) => ({
          ...prev,
          isContact: true,
          contactFirstName: editFirstName.trim(),
          contactLastName: editLastName.trim(),
          name: `${editFirstName} ${editLastName}`.trim() || prev.username,
          note: editNote.trim()
        }));
      }
    }

    setIsEditing(false);
    ctx.showToast('Изменения успешно сохранены!', 'success');
  };

  const handleDeleteContact = () => {
    const targetUserUuid = String(currentChatUser.partnerId || currentChatUser.uuid || currentChatUser.id);
    const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');

    ctx.showConfirm(
      'Удаление контакта', 
      `Удалить ${currentChatUser.username || baseName} из списка контактов?`, 
      async () => {
        await supabase
          .from('contacts')
          .delete()
          .eq('contactId', targetUserUuid)
          .eq('userId', myUuid);

        ctx.setChats((prev: any[]) => prev.map(c => {
          const isTarget = String(c.partnerId) === targetUserUuid || String(c.id) === targetUserUuid;
          if (!isTarget) return c;
          return {
            ...c, 
            isContact: false, 
            name: c.username, 
            contactFirstName: '', 
            contactLastName: '', 
            note: ''
          };
        }));
        
        handleCloseModalSmooth();
        ctx.showToast('Контакт удален', 'success');
      }, 
      true
    );
  };

  return (
    <div 
      className={`${styles['modal-overlay']} ${isAnimateClose ? styles.closing : ''}`} 
      onClick={handleCloseModalSmooth}
      style={{
        opacity: ctx.showUserModal && !isAnimateClose ? 1 : 0,
        pointerEvents: ctx.showUserModal ? 'auto' : 'none',
        display: 'flex',
        zIndex: 10000,
        transition: 'opacity 0.25s ease'
      }}
    >
      <div 
        className={styles['profile-modal-card']} 
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: ctx.showUserModal && !isAnimateClose ? 'scale(1)' : 'scale(0.85)',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          maxHeight: '85vh',
          overflowY: 'auto'
        }}
      >

        {isEditing ? (
          <EditMode 
            currentChatUser={currentChatUser} 
            editFirstName={editFirstName} setEditFirstName={setEditFirstName}
            editLastName={editLastName} setEditLastName={setEditLastName} 
            editNote={editNote} setEditNote={setEditNote}
            editDescription={editDescription} setEditDescription={setEditDescription}
            editAvatarColor={editAvatarColor} setEditAvatarColor={setEditAvatarColor}
            editAvatarUrl={editAvatarUrl} setEditAvatarUrl={setEditAvatarUrl}
            onCancel={() => setIsEditing(false)} 
            onSave={handleSaveContactOrGroup} 
            onDeleteContact={handleDeleteContact}
          />
        ) : (String(currentChatUser?.uuid) === String(ctx.currentUser?.uuid) || String(currentChatUser?.id) === String(ctx.currentUser?.uuid)) ? (
          /* 🎯 ОТРИСОВКА НАШЕГО СОБСТВЕННОГО ПРОФИЛЯ */
          <MyProfileView
            currentUser={ctx.currentUser}
            onEditToggle={() => setIsEditing(true)}
            onClose={handleCloseModalSmooth}
            ctx={ctx}
          />
        ) : currentChatUser.isChannel || currentChatUser.type === 'channel' ? (
          <ChannelProfileView
            currentChatUser={currentChatUser}
            baseName={baseName}
            onClose={handleCloseModalSmooth}
            onEditToggle={() => setIsEditing(true)}
            ctx={ctx}
          />
        ) : currentChatUser.isGroup || currentChatUser.type === 'group' ? (
          <GroupProfileView 
            currentChatUser={currentChatUser} 
            baseName={baseName} 
            onEditToggle={() => setIsEditing(true)} 
            onClose={handleCloseModalSmooth} 
            ctx={ctx} 
          />
        ) : (
          <UserProfileView 
            currentChatUser={currentChatUser} 
            baseName={baseName} 
            shouldShowField={shouldShowField}
            onStartCall={() => ctx.handleStartAudioCall(currentChatUser.partnerId || currentChatUser.id)} 
            onEditToggle={() => setIsEditing(true)} 
            onClose={handleCloseModalSmooth} 
            ctx={ctx} 
          />
        )}
      </div>
    </div>
  );
}