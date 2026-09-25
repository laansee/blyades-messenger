import React, { useState, useEffect } from 'react';
import styles from '../css/chat-window.module.css';
import { supabase } from '../../services/supabaseClient';

interface GroupProfileViewProps {
  currentChatUser: any;
  baseName: string;
  onEditToggle: () => void;
  onClose: () => void;
  ctx: any;
}

export default function GroupProfileView({ currentChatUser, baseName, onEditToggle, onClose, ctx }: GroupProfileViewProps) {
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    const fetchGroupMembers = async () => {
      setLoadingMembers(true);
      try {
        // 1. Вытягиваем список ID участников
        const { data: membersData, error: mError } = await supabase
          .from('group_members')
          .select('userId')
          .eq('chatId', currentChatUser.id);

        if (!mError && membersData) {
          const userIds = membersData.map(m => String(m.userId));
          
          // 🚀 ИСПРАВЛЕНИЕ: Выкачиваем ВСЕ поля приватности и правильный uniqueId из таблицы users!
          const { data: usersData, error: uError } = await supabase
            .from('users')
            .select('id, username, uniqueId, firstName, lastName, avatarColor, privacyNameFormat, privacyFullName')
            .in('id', userIds);

          if (!uError && usersData) {
            setGroupMembers(usersData);
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки участников группы:', err);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchGroupMembers();
  }, [currentChatUser.id]);

  // 🔒 Умная функция проверки приватности внутри списка участников
  const shouldShowMemberFullName = (member: any) => {
    // Если это мы сами — имя скрывать от себя не нужно
    if (String(member.id) === String(ctx?.currentUser?.id)) return true;
    // Если разрешено всем — показываем
    if (!member.privacyFullName || member.privacyFullName === 'all') return true;
    // Временная заглушка (пока не проверим связи контактов внутри модалки)
    return false;
  };

  // 🚀 НАХОДИМ ИМЯ СОЗДАТЕЛЯ БЕСЕДЫ ПО ЕГО ownerId
  const ownerObject = groupMembers.find(m => String(m.id) === String(currentChatUser.ownerId));
  const ownerNameText = ownerObject 
    ? (ownerObject.privacyNameFormat === 'full_name' && (ownerObject.firstName || ownerObject.lastName)
        ? `${ownerObject.firstName || ''} ${ownerObject.lastName || ''}`.trim()
        : ownerObject.username)
    : `Пользователь #${currentChatUser.ownerId}`;

  return (
    <div className={styles['view-mode']}>
      <div className={styles['profile-avatar-wrapper']}>
        <div className={styles['profile-avatar']} style={{ backgroundColor: currentChatUser.avatarColor || '#5865F2' }}>
          {baseName.substring(0, 1).toUpperCase()}
        </div>
      </div>

      <h2 className={styles['profile-name']}>{baseName}</h2>
      <span className={styles['profile-status']}>группа беседы</span>

      <div className={styles['action-buttons-row']}>
        <button 
          type="button" 
          className={styles['action-btn']} 
          onClick={() => { ctx.setActiveChatId(currentChatUser.id); onClose(); }}
        >
          <span className={styles['btn-icon']}>💬</span>
          <span className={styles['btn-text']}>Чат</span>
        </button>
        <button type="button" className={styles['action-btn']}>
          <span className={styles['btn-icon']}>🔔</span>
          <span className={styles['btn-text']}>Звук</span>
        </button>
        <button type="button" className={styles['action-btn']} onClick={onEditToggle}>
          <span className={styles['btn-icon']}>⚙️</span>
          <span className={styles['btn-text']}>Настройки</span>
        </button>
      </div>

      <div className={styles['info-section']}>
        <div className={styles['info-item']}>
          <span className={styles['info-value']}>Групповая беседа</span>
          <span className={styles['info-label']}>Тип чата</span>
        </div>
        <div className={styles['info-item']}>
          <span className={styles['info-value']}>#{currentChatUser.id}</span>
          <span className={styles['info-label']}>Идентификатор комнаты</span>
        </div>
        <div className={styles['info-item']}>
          {/* 🚀 ИСПРАВЛЕНИЕ ШАПКИ: Выводим реальное имя создателя вместо сухого номера ID! */}
          <span className={styles['info-value']}>{ownerNameText}</span>
          <span className={styles['info-label']}>Создатель беседы</span>
        </div>

        <div style={{ marginTop: '20px', borderTop: '1px solid #2b2d31', paddingTop: '16px' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
            Участники группы ({groupMembers.length})
          </span>
          
          {loadingMembers ? (
            <span style={{ color: '#636366', fontSize: '13px' }}>Синхронизация участников...</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {groupMembers.map((member) => {
                const isOwner = String(member.id) === String(currentChatUser.ownerId);
                
                // Вычисляем, как отобразить имя участника по его правилам конфиденциальности
                const useFullNameMode = member.privacyNameFormat === 'full_name' && shouldShowMemberFullName(member);
                
                const displayName = useFullNameMode && (member.firstName || member.lastName)
                  ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                  : member.username;

                return (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: member.avatarColor || '#007aff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
                      {displayName.substring(0, 1).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Настоящее отображаемое имя */}
                      <span style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>{displayName}</span>
                      {/* 🚀 ИСПРАВЛЕНИЕ: Выводим СТРОГО уникальный тег uniqueId с собачкой! */}
                      <span style={{ color: '#636366', fontSize: '12px' }}>
                        @{member.uniqueId || member.username}
                      </span>
                    </div>
                    {isOwner && (
                      <span style={{ marginLeft: 'auto', fontSize: '10px', backgroundColor: 'rgba(255,204,0,0.1)', color: '#ffcc00', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>владелец</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
