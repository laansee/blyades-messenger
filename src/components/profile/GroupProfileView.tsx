import React, { useState, useEffect, useMemo } from 'react';
import styles from '../css/profile.module.css';
import { supabase } from '../../services/supabaseClient';
import { userService, type AppUser } from '../../services/userService';
import { Search, UserPlus, Users, X, Pencil, Copy, Hash } from 'lucide-react';
import { renderUserStatusBadge } from '../../utils/statusBadge';
import { formatUserOnlineStatus } from '../../context/messengerContext';
import { AddParticipantsModal } from '../common/GlobalUI';
import SmartAvatar from '../common/SmartAvatar';

interface GroupProfileViewProps {
  currentChatUser: any;
  baseName: string;
  onEditToggle: () => void;
  onClose: () => void;
  ctx: any;
}

export default function GroupProfileView({ 
  currentChatUser,
  baseName,
  onEditToggle,
  onClose,
  ctx
}: GroupProfileViewProps) {
  const [groupMembers, setGroupMembers] = useState<AppUser[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Стейты поиска участников
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [existingUsers, setExistingUsers] = useState<string[]>([]);

  const chatIdNumeric = Number(currentChatUser.internalChatId || currentChatUser.id);
  const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    ctx.showToast?.(`${label} скопирован в буфер`, 'success');
  };

  // 🚀 Загрузка участников группы через единый userService
  const fetchGroupMembers = async () => {
    if (!chatIdNumeric) return;
    setLoadingMembers(true);
    try {
      const { data: membersData, error: mError } = await supabase
        .from('chat_members')
        .select('userId')
        .eq('chatId', chatIdNumeric);

      if (!mError && membersData) {
        const userUuids = membersData.map((m: any) => String(m.userId));
        const users = await userService.getUsersByUuids(userUuids);
        setGroupMembers(users);
      }
    } catch (err) {
      console.error('Ошибка загрузки участников группы:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchGroupMembers();
  }, [chatIdNumeric]);

  // 🎯 Открытие окна добавления участников
  const handleOpenAddModal = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_members')
        .select('userId')
        .eq('chatId', chatIdNumeric);

      if (!error && data) {
        setExistingUsers(data.map((m: any) => String(m.userId)));
      }
      setShowAddModal(true);
    } catch (err) {
      console.error('Ошибка при получении участников группы:', err);
    }
  };

  // 🔍 Фильтрация участников по запросу
  const filteredMembers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return groupMembers;

    return groupMembers.filter((member) => {
      const name = (member.username || '').toLowerCase();
      const uniqueId = (member.uniqueId || '').toLowerCase();
      const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();

      return name.includes(query) || uniqueId.includes(query) || fullName.includes(query);
    });
  }, [groupMembers, searchQuery]);

  // 👑 Имя создателя беседы
  const ownerUser = groupMembers.find(m => m.uuid === String(currentChatUser.ownerId));
  const ownerNameText = ownerUser 
    ? userService.resolveDisplayName(ownerUser)
    : `Пользователь #${String(currentChatUser.ownerId).slice(0, 8)}`;

  function formatMembersCountUpper(count: number): string {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${count} УЧАСТНИКОВ`;
    if (mod10 === 1) return `${count} УЧАСТНИК`;
    if (mod10 >= 2 && mod10 <= 4) return `${count} УЧАСТНИКА`;
    return `${count} УЧАСТНИКОВ`;
  }

  return (
    <div className={styles['view-mode']}> 
      {/* 🔮 ВЕРХНЯЯ ШАПКА В ЕДИНОМ СТИЛЕ */}
      <div className={styles['profile-header-gradient']}>
        <div className={styles['profile-header-actions']}>
          <button
            type="button"
            onClick={onClose}
            title="Закрыть"
            className={styles['close-modal-btn']}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles['profile-avatar-wrapper']}>
          <SmartAvatar
            size={84}
            avatarUrl={currentChatUser.avatarUrl}
            avatarColor={currentChatUser.avatarColor || '#5865F2'}
            name={baseName}
            isChannel={false}
          />
        </div>

        <h2 className={styles['profile-name']}>{baseName}</h2>
        <span className={styles['profile-status']}>
          {groupMembers.length} {groupMembers.length === 1 ? 'участник' : (groupMembers.length >= 2 && groupMembers.length <= 4) ? 'участника' : 'участников'}
        </span>

        <div className={styles['action-buttons-row']}>
          <button 
            type="button" 
            className={styles['action-btn']} 
            onClick={() => { ctx.setActiveChatId(String(currentChatUser.id)); onClose(); }}
          >
            <span className={styles['btn-icon']}>💬</span>
            <span className={styles['btn-text']}>Чат</span>
          </button>

          <button 
            type="button" 
            className={styles['action-btn']}
            onClick={() => ctx.showToast('Настройки уведомлений в разработке', 'info')}
          >
            <span className={styles['btn-icon']}>🔔</span>
            <span className={styles['btn-text']}>Звук</span>
          </button>

          <button type="button" className={styles['action-btn']} onClick={onEditToggle}>
            <span className={styles['btn-icon']}>⚙️</span>
            <span className={styles['btn-text']}>Настройки</span>
          </button>
        </div>
      </div>

      {/* 📋 СЕКЦИЯ ИНФОРМАЦИИ */}
      <div className={styles['info-section']}>
        {/* Описание группы (если заполнено) */}
        {(currentChatUser.aboutMe || currentChatUser.description) && (
          <div className={styles['info-item']} style={{ cursor: 'default' }}>
            <div className={styles['info-item-content']}>
              <span className={`${styles['info-value']} ${styles['multiline']}`}>
                {currentChatUser.aboutMe || currentChatUser.description}
              </span>
              <span className={styles['info-label']}>Описание группы</span>
            </div>
          </div>
        )}

        <div className={styles['info-item']} style={{ cursor: 'default' }}>
          <div className={styles['info-item-content']}>
            <span className={styles['info-value']}>Групповая беседа</span>
            <span className={styles['info-label']}>Тип чата</span>
          </div>
        </div>
        
        {/* Создатель беседы */}
        <div 
          onClick={() => handleCopy(ownerNameText, 'Создатель')}
          className={styles['info-item']}
        >
          <div className={styles['info-item-content']}>
            <span className={`${styles['info-value']} ${styles['accent']}`}>{ownerNameText}</span>
            <span className={styles['info-label']}>Создатель беседы</span>
          </div>
          <Copy size={16} className={styles['info-icon']} />
        </div>

        {/* Идентификатор комнаты */}
        <div 
          onClick={() => handleCopy(String(chatIdNumeric), 'ID комнаты')}
          className={styles['info-item']}
        >
          <div className={styles['info-item-content']}>
            <span className={`${styles['info-value']} ${styles['mono']}`}>#{chatIdNumeric}</span>
            <span className={styles['info-label']}>Идентификатор комнаты</span>
          </div>
          <Hash size={16} className={styles['info-icon']} />
        </div>

        <div className={styles['info-divider']} />

        {/* 👥 СПИСОК УЧАСТНИКОВ */}
        <div className={styles['info-users']}>
          
          {/* ШАПКА СПИСКА */}
          <div className={styles['info-users-header']}>
            <div className={styles['info-users-header-icon']}>
              <Users size={22} />
            </div>

            <span className={styles['info-users-title']}>
              {formatMembersCountUpper(groupMembers.length)}
            </span>
            
            <div className={styles['info-users-header-actions']}>
              <button
                type="button"
                className={styles['info-users-action-btn']}
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  if (isSearchOpen) setSearchQuery('');
                }}
                title="Поиск участников"
              >
                <Search size={20} />
              </button>

              <button
                type="button"
                className={styles['info-users-action-btn']}
                onClick={handleOpenAddModal}
                title="Добавить участников"
              >
                <UserPlus size={20} />
              </button>
            </div>
          </div>

          {/* Инпут поиска по участникам */}
          {isSearchOpen && (
            <div style={{ width: '100%', marginBottom: '10px', position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по участникам..."
                style={{
                  width: '100%', padding: '8px 12px', backgroundColor: '#18181e',
                  border: '1px solid #383842', borderRadius: '8px', color: '#fff',
                  fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                }}
                autoComplete="off"
                autoFocus
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#636366', cursor: 'pointer', fontSize: '14px' }}
                >
                  <X size={20} />
                </button>
              )}
            </div>
          )}

          {/* Список участников */}
          {loadingMembers ? (
            <span style={{ color: '#636366', fontSize: '13px', padding: '8px 0' }}>
              Синхронизация участников...
            </span>
          ) : (
            <div className={styles['info-users-list']}>
              {filteredMembers.length === 0 ? (
                <span style={{ color: '#636366', fontSize: '13px', textAlign: 'center', padding: '14px 0' }}>
                  Никого не найдено
                </span>
              ) : (
                filteredMembers.map((member) => {
                  const isOwner = member.uuid === String(currentChatUser.ownerId);
                  const isMe = member.uuid === myUuid;
                  const amIOwner = String(currentChatUser.ownerId) === myUuid;
                  const displayName = userService.resolveDisplayName(member);

                  const isOnline = ctx.isUserOnline ? ctx.isUserOnline(member) : false;
                  const statusInfo = formatUserOnlineStatus(member.updatedAt, member.privacyOnline);

                  return (
                    <div 
                      key={member.uuid} 
                      className={styles['info-users-item']}
                      onClick={() => ctx.setShowUserModal(member.uuid)}
                    >
                      {/* Колонка 1: Аватар (ровно 42px) */}
                      <div className={styles['info-users-avatar-col']}>
                        <SmartAvatar
                          size={42}
                          avatarUrl={member.avatarUrl}
                          avatarColor={member.avatarColor}
                          name={displayName}
                        />
                      </div>

                      {/* Колонка 2: Имя и статус (на одной линии с 19 УЧАСТНИКОВ) */}
                      <div className={styles['info-users-text-col']}>
                        <span className={styles['info-users-name']}>
                          {renderUserStatusBadge(member)}
                          {displayName}
                        </span>
                        <span className={`${styles['info-users-status']} ${isOnline ? styles['online'] : ''}`}>
                          {isOnline ? 'в сети' : statusInfo.text}
                        </span>
                      </div>
                      
                      <div className={styles['info-users-badge-col']}>
                        {isOwner ? (
                          <span className={styles['role-badge-owner']}>
                            владелец
                          </span>
                        ) : (member.userStatus === 'administrator' || member.userStatus === 'moderator') ? (
                          <span className={styles['role-badge-admin']}>
                            админ
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      <AddParticipantsModal
        show={showAddModal}
        existingUserIds={existingUsers}
        onClose={() => setShowAddModal(false)}
        onAdd={async (selectedUuids) => {
          if (ctx.handleAddUsersToGroup) {
            await ctx.handleAddUsersToGroup(currentChatUser.id, selectedUuids);
            await fetchGroupMembers();
            ctx.showToast('Пользователи успешно приглашены!', 'success');
          }
        }}
      />
    </div>
  );
}