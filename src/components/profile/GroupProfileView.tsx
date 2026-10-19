import React, { useState, useEffect } from 'react';
import styles from '../css/profile.module.css';
import { supabase } from '../../services/supabaseClient';
import { Search, UserPlus, Users } from 'lucide-react';
import { renderUserStatusBadge } from '../../utils/statusBadge';
import { AddParticipantsModal } from '../GlobalUI';

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
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // 🎯 СТЕЙТЫ ДЛЯ РАБОТЫ ЖИВОГО ПОИСКА УЧАСТНИКОВ
  const [searchQuery, setSeachQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [existingUsers, setExistingUsers] = useState<string[]>([]);

  // 🚀 ЖИВАЯ ФИЛЬТРАЦИЯ: На лету фильтруем массив по имени или юзернейму
  const filteredMembers = groupMembers.filter((member) => {
    const name = (member.name || '').toLowerCase();
    const username = (member.username || '').toLowerCase();
    const uniqueId = (member.uniqueId || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    return name.includes(query) || username.includes(query) || uniqueId.includes(query);
  });

  // 🎯 2. ФУНКЦИЯ КЛИКА НА ИКОНКУ ПЛЮСА (Полная адаптация твоего кода!)
  const handleOpenAddModal = async () => {
    try {
      // Прямо отсюда запрашиваем из базы список тех, кто УЖЕ в этой группе
      const { data, error } = await supabase
        .from('group_members')
        .select('userId')
        .eq('chatId', currentChatUser.id); // Везём ID текущей комнаты

      if (!error && data) {
        setExistingUsers(data.map(m => String(m.userId)));
      }
      
      // Открываем локальное окно добавления поверх текущего инфо-окна
      setShowAddModal(true);
    } catch (err) {
      console.error('Ошибка при получении участников группы:', err);
    }
  };

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
            .select('id, username, uniqueId, firstName, lastName, avatarColor, avatarUrl, privacyNameFormat, privacyFullName, userStatus')
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

      <div style={{ padding: '24px'}}>
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

        <div className={styles['info-divider']}></div>

        <div className={styles['info-users']}>
          <div className={styles['info-users-header']}>
            <span>
              <Users size={20} />
            </span>
            <span>Участники группы ({groupMembers.length})</span>
            <span>
              {/* 🔍 Иконка Поиска (Лупа) */}
              <div 
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  if (isSearchOpen) setSeachQuery(''); // Очищаем строку при закрытии поиска
                }} 
                style={{ cursor: 'pointer', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#9d7bf6'}
                onMouseLeave={e => e.currentTarget.style.color = '#8e8e93'}
              >
                <Search size={20} />
              </div>

              {/* ➕ Иконка Добавления (UserPlus) */}
              <div 
                onClick={handleOpenAddModal} 
                style={{ cursor: 'pointer', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#9d7bf6'}
                onMouseLeave={e => e.currentTarget.style.color = '#8e8e93'}
              >
                <UserPlus size={20} />
              </div>
            </span>
          </div>

          {/* 🔍 ВЫЕЗЖАЮЩИЙ СТИЛЬНЫЙ ИНПУТ ЖИВОГО ПОИСКА */}
          {isSearchOpen && (
            <div style={{ width: '100%', marginBottom: '12px', position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSeachQuery(e.target.value)}
                placeholder="Поиск участников по имени или @id..."
                style={{
                  width: '100%', padding: '8px 12px', backgroundColor: '#18181e',
                  border: '1px solid #383842', borderRadius: '8px', color: '#fff',
                  fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                }}
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSeachQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#636366', cursor: 'pointer', fontSize: '14px' }}
                >
                  ×
                </button>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 🚀 ВЫВОД ФИЛЬТРОВАННОГО СПИСКА УЧАСТНИКОВ               */}
          {/* ======================================================== */}
          {loadingMembers ? (
            <span style={{ color: '#636366', fontSize: '13px' }}>Синхронизация участников...</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredMembers.length === 0 ? (
                <span style={{ color: '#636366', fontSize: '13px', textAlign: 'center', padding: '10px 0' }}>Никого не найдено</span>
              ) : (
                // 🎯 ВМЕСТО groupMembers.map запускаем filteredMembers.map!
                filteredMembers.map((member) => {
                  const isOwner = String(member.id) === String(currentChatUser.ownerId);
                  const isMe = String(member.id) === String(ctx?.currentUser?.id);
                  const amIOwner = String(currentChatUser.ownerId) === String(ctx?.currentUser?.id);
                  const useFullNameMode = member.privacyNameFormat === 'full_name' && shouldShowMemberFullName(member);
                  
                  const displayName = useFullNameMode && (member.firstName || member.lastName)
                    ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                    : member.username;

                  return (
                  <div 
                    key={member.id} 
                    className={styles['info-users-item']} 
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} className={styles['info-users-meta']} >
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt="Avatar"
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                        />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: member.avatarColor || '#007aff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
                          {displayName.substring(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                          {renderUserStatusBadge(member)}                          
                          {displayName}
                        </span>
                        <span style={{ color: '#636366', fontSize: '12px' }}>
                          @{member.uniqueId || member.username}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className={styles['info-users-stat']} >
                      {isOwner ? (
                        <span style={{ fontSize: '10px', backgroundColor: 'rgba(255,204,0,0.1)', color: '#ffcc00', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>владелец</span>
                      ) : (
                        amIOwner && !isMe && (
                          <button
                            type="button"
                            onClick={() => {
                              ctx.showConfirm(
                                'Исключение из беседы',
                                `Вы действительно хотите исключить пользователя ${displayName} из беседы "${currentChatUser.name}"?`,
                                async () => {
                                  if (ctx.handleKickUserFromGroup) {
                                    await ctx.handleKickUserFromGroup(currentChatUser.id, member.id);
                                    // Локально вырезаем юзера из текущего стейта списка на экране для моментального отклика
                                    setGroupMembers(prev => prev.filter(m => m.id !== member.id));
                                    ctx.setConfirm((prev: any) => ({ ...prev, show: false }));
                                  }
                                },
                                true
                              );
                            }}
                            style={{
                              background: 'none', border: 'none', color: '#ff453a', 
                              fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                              padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(255, 69, 58, 0.05)',
                              transition: 'all 0.15s ease', fontFamily: 'sans-serif'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.12)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 69, 58, 0.05)'}
                          >
                            Исключить
                          </button>
                        )
                      )}
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
        onAdd={async (selectedIds) => {
          // Вызываем метод массового инсерта из глобального контекста ядра
          if (ctx.handleAddUsersToGroup) {
            await ctx.handleAddUsersToGroup(currentChatUser.id, selectedIds);
            
            // После успешного добавления запрашиваем из базы обновленный список участников,
            // чтобы они мгновенно дорендерились в списке на экране без перезагрузки модалки!
            const { data } = await supabase
              .from('group_members')
              .select('userId')
              .eq('chatId', currentChatUser.id);
              
            if (data && ctx.fetchAndMatchChats) {
              // Перезапрашиваем профили участников для живого обновления стейта groupMembers
              // (или пушим вызов обновления участников, который у тебя написан в useEffect модалки)
              ctx.showToast('Пользователи успешно приглашены!', 'success');
            }
          }
        }}
      />
    </div>
  );
}
