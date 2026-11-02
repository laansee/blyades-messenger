import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styles from '../../css/profile.module.css';
import useMessengerContext from '../../../context/messengerContext';
import { userService } from '../../../services/userService';

import UserProfileView from './UserProfileView';
import GroupProfileView from './GroupProfileView';
import ChannelProfileView from './ChannelProfileView';
import MyProfileView from './MyProfileView';
import EditContactModal from '../edit/EditContactModal';
import AddContactModal from '../add/AddContactModal';

export default function ProfileModal() {
  const ctx = useMessengerContext();
  const [isAnimateClose, setIsAnimateClose] = useState(false);
  const [showEditContact, setShowEditContact] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [fetchedExternalUser, setFetchedExternalUser] = useState<any | null>(null);

  useEffect(() => {
    if (!ctx.showUserModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        ctx.setShowUserModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ctx.showUserModal]);

  const myUserUuid = String(ctx?.currentUser?.uuid || '').trim();
  const myNumericId = String(ctx?.currentUser?.id || '').trim();

  const targetIdentifier = useMemo(() => {
    if (ctx?.showUserModal === true) {
      return ctx?.activeChatId ? String(ctx.activeChatId).trim() : (myUserUuid || myNumericId);
    }
    return String(ctx?.showUserModal || '').trim();
  }, [ctx?.showUserModal, ctx?.activeChatId, myUserUuid, myNumericId]);

  const cachedChat = useMemo(() => {
    if (!targetIdentifier) return null;
    return (ctx?.chats || []).find((c: any) => 
      String(c.id).trim() === targetIdentifier ||
      String(c.internalChatId).trim() === targetIdentifier
    );
  }, [ctx?.chats, targetIdentifier]);

  const isMe = Boolean(
    !cachedChat && (
      targetIdentifier === 'me' ||
      (myUserUuid && targetIdentifier === myUserUuid) ||
      (!ctx?.activeChatId && ctx?.showUserModal === true)
    )
  );

  const cachedChatUser = useMemo(() => {
    if (isMe) return ctx.currentUser;
    if (cachedChat) return cachedChat;

    return (ctx?.chats || []).find((c: any) => 
      String(c.partnerId).trim() === targetIdentifier ||
      String(c.uuid).trim() === targetIdentifier
    );
  }, [ctx?.chats, targetIdentifier, isMe, cachedChat, ctx.currentUser]);

  useEffect(() => {
    let isMounted = true;

    const loadMissingUser = async () => {
      if (!ctx.showUserModal || cachedChatUser || !targetIdentifier || isMe) {
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
  }, [ctx.showUserModal, targetIdentifier, cachedChatUser, isMe]);

  const currentChatUser = isMe ? ctx.currentUser : (cachedChatUser || fetchedExternalUser);

  if (!ctx || !ctx.showUserModal || !currentChatUser) return null;

  const baseName = currentChatUser.isContact && (currentChatUser.contactFirstName || currentChatUser.contactLastName)
    ? `${currentChatUser.contactFirstName || ''} ${currentChatUser.contactLastName || ''}`.trim()
    : currentChatUser.name || currentChatUser.username || 'Пользователь';

  const handleCloseModalSmooth = () => {
    if (isAnimateClose) return;
    setIsAnimateClose(true);
    setTimeout(() => {
      ctx.setShowUserModal(false);
      setIsAnimateClose(false);
      setFetchedExternalUser(null);
    }, 200);
  };

  const shouldShowField = (privacySetting: string | undefined, isMeInHisContacts: boolean) => {
    if (!privacySetting || privacySetting === 'all') return true;
    if (privacySetting === 'contacts') return Boolean(isMeInHisContacts);
    return false;
  };

  return createPortal(
    <>
      <div 
        className={`${styles['modal-overlay']} ${isAnimateClose ? styles.closing : ''}`} 
        onClick={handleCloseModalSmooth}
        style={{
          animation: `${isAnimateClose ? 'modalFadeOut' : 'modalFadeIn'} 0.2s ease forwards`
        }}
      >
        <div 
          className={styles['profile-modal-card']} 
          onClick={(e) => e.stopPropagation()}
          style={{
            zIndex: 1000000,
            overflowY: 'auto',
            transform: isAnimateClose ? 'scale(0.95)' : 'scale(1)',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            animation: `${isAnimateClose ? 'modalScaleOut' : 'modalScaleIn'} 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards`
          }}
        >
          {isMe ? (
            <MyProfileView
              currentUser={ctx.currentUser}
              onEditToggle={() => {
                ctx.setShowUserModal(false);
                window.location.href = '/settings?tab=account';
              }}
              onClose={handleCloseModalSmooth}
              ctx={ctx}
            />
          ) : currentChatUser.isChannel || currentChatUser.type === 'channel' ? (
            <ChannelProfileView
              currentChatUser={currentChatUser}
              baseName={baseName}
              onClose={handleCloseModalSmooth}
              ctx={ctx}
            />
          ) : currentChatUser.isGroup || currentChatUser.type === 'group' ? (
            <GroupProfileView 
              currentChatUser={currentChatUser} 
              baseName={baseName} 
              onClose={handleCloseModalSmooth} 
              ctx={ctx} 
            />
          ) : (
            <UserProfileView 
              currentChatUser={currentChatUser} 
              baseName={baseName} 
              shouldShowField={shouldShowField}
              onStartCall={() => ctx.handleStartAudioCall(currentChatUser.partnerId || currentChatUser.id)} 
              onEditToggle={() => {
                if (currentChatUser.isContact) {
                  setShowEditContact(true);
                } else {
                  setShowAddContact(true);
                }
              }} 
              onClose={handleCloseModalSmooth} 
              ctx={ctx} 
            />
          )}
        </div>
      </div>

      {/* Модалка изменения контакта */}
      <EditContactModal 
        show={showEditContact} 
        contact={currentChatUser} 
        onClose={() => setShowEditContact(false)} 
      />

      {/* Модалка добавления в контакты */}
      <AddContactModal 
        show={showAddContact} 
        onClose={() => setShowAddContact(false)} 
      />
    </>,
    document.body
  );
}