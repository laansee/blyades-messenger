import React, { useState, useEffect } from 'react';
import styles from './css/chat-window.module.css'; 
import useMessengerContext from '../context/messengerContext';
import { supabase } from '../services/supabaseClient';
import { X } from 'lucide-react';

// ИМПОРТИРУЕМ НАШИ НОВЫЕ ПОД-ФАЙЛЫ
import UserProfileView from './profile/UserProfileView';
import GroupProfileView from './profile/GroupProfileView';
import ContactEditMode from './profile/ContactEditMode';

export default function ProfileModal() {
  const ctx = useMessengerContext();
  const [isAnimateClose, setIsAnimateClose] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editNote, setEditNote] = useState('');

  const targetUserId = ctx?.showUserModal === true 
    ? String(ctx?.activeChatId).trim() 
    : String(ctx?.showUserModal).trim();

  const currentChatUser = ctx?.chats?.find((c: any) => String(c.id).trim() === targetUserId);
  useEffect(() => {
    if (isEditing && currentChatUser) {
      const isNameVisible = currentChatUser.privacyFullName === 'all' || currentChatUser.isContact;
      
      if (currentChatUser.isGroup) {
        setEditFirstName(currentChatUser.name || '');
      } else {
        setEditFirstName(currentChatUser.contactFirstName || (isNameVisible && currentChatUser.firstName) || currentChatUser.username || '');
        setEditLastName(currentChatUser.contactLastName || (isNameVisible && currentChatUser.lastName) || '');
        setEditNote(currentChatUser.note || '');
      }
    }
  }, [isEditing, currentChatUser]);

  useEffect(() => {
    setIsEditing(false);
  }, [ctx?.showUserModal]);

  if (!ctx || !ctx.showUserModal || !currentChatUser) return null;

  const getProfileDisplayName = () => {
    if (currentChatUser.isContact && (currentChatUser.contactFirstName || currentChatUser.contactLastName)) {
      return `${currentChatUser.contactFirstName || ''} ${currentChatUser.contactLastName || ''}`.trim();
    }
    if (currentChatUser.privacyNameFormat === 'full_name' && (currentChatUser.firstName || currentChatUser.lastName)) {
      return `${currentChatUser.firstName || ''} ${currentChatUser.lastName || ''}`.trim();
    }
    return currentChatUser.name || currentChatUser.username || 'Пользователь';
  };

  const baseName = getProfileDisplayName();

  const handleCloseModalSmooth = () => {
    setIsAnimateClose(true);
    setTimeout(() => {
      ctx.setShowUserModal(false);
      setIsAnimateClose(false);
      setIsEditing(false);
    }, 200);
  };

  const shouldShowField = (privacySetting: string | undefined, isPartnerContact: boolean) => {
    if (!privacySetting || privacySetting === 'all') return true;
    if (privacySetting === 'contacts') return !!isPartnerContact;
    return false;
  };

  const handleSaveContactOrGroup = async () => {
    if (currentChatUser.isGroup) {
      // Логика обновления имени группы
      await supabase.from('group_chats').update({ name: editFirstName }).eq('id', currentChatUser.id);
      ctx.setChats((prev: any[]) => prev.map(c => c.id === currentChatUser.id ? { ...c, name: editFirstName } : c));
    } else {
      // Логика сохранения контакта
      const updatedFields = {
        userId: String(ctx.currentUser.id),
        contactId: currentChatUser.id,
        firstName: editFirstName,
        lastName: editLastName,
        note: editNote,
        updatedAt: new Date().toISOString()
      };
      await supabase.from('contacts').upsert(updatedFields);
      ctx.setChats((prev: any[]) => prev.map(c => c.id === currentChatUser.id ? {
        ...c,
        isContact: true,
        contactFirstName: editFirstName,
        contactLastName: editLastName,
        name: `${editFirstName} ${editLastName}`.trim() || c.username,
        note: editNote
      } : c));
    }
    setIsEditing(false);
    ctx.showToast('Изменения успешно сохранены!', 'success');
  };

  const handleDeleteContact = () => {
    ctx.showConfirm('Удаление контакта', `Удалить ${currentChatUser.username} из списка контактов?`, async () => {
      await supabase.from('contacts').delete().eq('contactId', currentChatUser.id).eq('userId', String(ctx.currentUser.id));
      ctx.setChats((prev: any[]) => prev.map(c => c.id === currentChatUser.id ? {
        ...c, isContact: false, name: c.username, contactFirstName: '', contactLastName: '', note: ''
      } : c));
      handleCloseModalSmooth();
      ctx.showToast('Контакт удален', 'success');
    }, true);
  };

  return (
    <div 
      className={styles['modal-overlay']} 
      onClick={handleCloseModalSmooth}
      style={{
        opacity: ctx.showUserModal ? 1 : 0,
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
          transform: ctx.showUserModal ? 'scale(1)' : 'scale(0.85)',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          maxHeight: '85vh',
          overflowY: 'auto'
        }}
      >
        <button type="button" onClick={handleCloseModalSmooth} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', zIndex: 10 }}><X size={20} /></button>

        {/* 🎯 ДИСПЕТЧЕР ЭКРАНОВ */}
        {isEditing ? (
          <ContactEditMode 
            currentChatUser={currentChatUser} editFirstName={editFirstName} setEditFirstName={setEditFirstName}
            editLastName={editLastName} setEditLastName={setEditLastName} editNote={editNote} setEditNote={setEditNote}
            onCancel={() => setIsEditing(false)} onSave={handleSaveContactOrGroup} onDeleteContact={handleDeleteContact}
          />
        ) : currentChatUser.isGroup ? (
          <GroupProfileView currentChatUser={currentChatUser} baseName={baseName} onEditToggle={() => setIsEditing(true)} onClose={handleCloseModalSmooth} ctx={ctx} />
        ) : (
          <UserProfileView currentChatUser={currentChatUser} baseName={baseName} shouldShowField={shouldShowField} onStartCall={() => ctx.handleStartAudioCall(currentChatUser.id)} onEditToggle={() => setIsEditing(true)} onClose={handleCloseModalSmooth} ctx={ctx} />
        )}
      </div>
    </div>
  );
}
