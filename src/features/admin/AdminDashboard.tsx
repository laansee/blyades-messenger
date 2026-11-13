import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import useMessengerContext, { formatUserOnlineStatus } from '../../context/messengerContext';
import { normalizeUser, getUserPrivacy, type AppUser } from '../../services/userService';
import { renderUserStatusBadge } from '../../utils/_statusBadge';
import { getProfileGradient } from '../../utils/themeColors';
import { Navigate } from 'react-router';
import { Menu, Shield, User, ShieldCheck, MessageSquare, Clock, Search, Copy, Hash, Lock, Bug, ArrowLeft } from 'lucide-react';
import AdminDebugPanel from './AdminDebugPanel';
import NavSidebar from '../navigation/NavSidebar';
import SmartAvatar from '../../components/common/SmartAvatar';
import styles from '../../components/css/admin.module.css';
import profileStyles from '../../components/css/profile.module.css';

export default function AdminDashboard() {
  const ctx = useMessengerContext();
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [userRooms, setUserRooms] = useState<string[]>([]);
  const [spyGroupsCache, setSpyGroupsCache] = useState<any[]>([]);
  const [activeSpyRoom, setActiveSpyRoom] = useState<string>('');
  const [spyMessages, setSpyMessages] = useState<any[]>([]);
  const [loadingSpy, setLoadingSpy] = useState(false);

  const [spyMobileTab, setSpyMobileTab] = useState<'chat' | 'profile' | 'privacy'>('chat');

  if (!ctx.currentUser || ctx.currentUser.userStatus !== 'administrator') {
    return <Navigate to="/chat" replace />;
  }

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    ctx.showToast?.(`${label} скопирован в буфер`, 'success');
  };

  const filteredUsersList = React.useMemo(() => {
    const query = adminSearchQuery.trim().toLowerCase().replace(/^[@#]/, '');
    if (!query) return usersList;

    return usersList.filter((user: any) => {
      const matchTag = String(user.publicId || '').toLowerCase().includes(query);
      const matchNumericId = String(user.id || '').toLowerCase().includes(query);
      const matchUuid = String(user.uuid || '').toLowerCase().includes(query);
      const matchUsername = String(user.username || '').toLowerCase().includes(query);
      const matchFullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(query);

      return matchTag || matchNumericId || matchUuid || matchUsername || matchFullName;
    });
  }, [usersList, adminSearchQuery]);

  const fetchAllUsersForAdmin = async () => {
    setLoading(true);
    try {
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('*');

      if (!error && allUsers) {
        const roleWeights: Record<string, number> = {
          administrator: 4,
          moderator: 3,
          test: 2,
          default: 1
        };

        const realUsers = allUsers
          .filter((u: any) =>
            String(u.uuid) !== '00000000-0000-0000-0000-000000000000' &&
            String(u.id) !== '00000000-0000-0000-0000-000000000000' &&
            u.username?.toLowerCase() !== 'system' &&
            u.userStatus !== 'system'
          )
          .map(normalizeUser);

        const sortedUsers = realUsers.sort((a, b) => {
          const weightA = roleWeights[a.userStatus] || 1;
          const weightB = roleWeights[b.userStatus] || 1;
          if (weightB !== weightA) return weightB - weightA;
          return (a.username || '').localeCompare(b.username || '');
        });

        setUsersList(sortedUsers);
      }
    } catch (err) {
      console.error('Ошибка загрузки пользователей админки:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Панель администратора';
    fetchAllUsersForAdmin();
  }, []);

  const handleSelectUserSpy = async (targetUser: AppUser) => {
    const userUuid = String(targetUser.uuid || (targetUser as any).id);
    const matchedContact = (ctx.chats || []).find(
      (c: any) => (String(c.partnerId) === userUuid || String(c.uuid) === userUuid) && !c.isGroup
    );

    if (matchedContact) {
      setSelectedUser({
        ...targetUser,
        isContact: true,
        contactFirstName: matchedContact.contactFirstName,
        contactLastName: matchedContact.contactLastName,
        note: matchedContact.note
      });
    } else {
      setSelectedUser({ ...targetUser, isContact: false, note: '' });
    }

    setSpyMessages([]);
    setActiveSpyRoom('');
    setLoadingSpy(true);
    setSpyMobileTab('chat');

    try {
      const { data: currentMemberships } = await supabase
        .from('chat_members')
        .select('chatId')
        .eq('userId', userUuid);

      const activeChatIds = currentMemberships
        ? currentMemberships.map((m: any) => String(m.chatId).trim())
        : [];

      const { data: msgs, error } = await supabase
        .from('messages')
        .select('chatId')
        .eq('senderId', userUuid);

      if (!error && msgs) {
        const allUniqueRooms = Array.from(
          new Set([...activeChatIds, ...msgs.map((m: any) => String(m.chatId).trim())])
        );

        setUserRooms(allUniqueRooms);

        if (allUniqueRooms.length > 0) {
          const numericRoomIds = allUniqueRooms.map(Number).filter(n => !isNaN(n));
          if (numericRoomIds.length > 0) {
            const { data: chatsData } = await supabase
              .from('chats')
              .select('id, name, type')
              .in('id', numericRoomIds);

            if (chatsData) setSpyGroupsCache(chatsData);
          }
          handleLoadSpyRoomMessages(allUniqueRooms[0]);
        }
      }
    } catch (err) {
      console.error('Ошибка шпионского фильтра комнат:', err);
    } finally {
      setLoadingSpy(false);
    }
  };

  const handleLoadSpyRoomMessages = async (roomId: string) => {
    if (!roomId) return;
    setActiveSpyRoom(roomId);
    setLoadingSpy(true);

    const numericChatId = Number(roomId);
    const query = isNaN(numericChatId)
      ? supabase.from('messages').select('*').eq('chatId', roomId)
      : supabase.from('messages').select('*').eq('chatId', numericChatId);

    const { data: msgs, error } = await query.order('id', { ascending: true });

    if (!error && msgs) {
      setSpyMessages(msgs);
    }
    setLoadingSpy(false);
  };

  const getPartnerNameInRoom = (roomStr: string, currentTargetUser: any) => {
    if (!roomStr) return '';
    const roomStrClean = String(roomStr).trim();

    const cachedGroup = spyGroupsCache.find(g => String(g.id) === roomStrClean);
    if (cachedGroup?.name) {
      return `${cachedGroup.type === 'channel' ? '📢 Канал' : '👥 Беседа'}: "${cachedGroup.name}"`;
    }

    const matchedChat = (ctx.chats || []).find((c: any) => String(c.id).trim() === roomStrClean);
    if (matchedChat?.name) {
      return `${matchedChat.isGroup ? '👥' : '💬'} ${matchedChat.name}`;
    }

    if (roomStrClean.includes('_')) {
      const parts = roomStrClean.split('_');
      const partnerUuid = parts.find(id => String(id) !== String(currentTargetUser.uuid));
      const partnerObj = usersList.find(u => u.uuid === partnerUuid);
      if (partnerObj) {
        return `👤 ЛС: ${partnerObj.username} [@${partnerObj.publicId || partnerObj.username}]`;
      }
    }

    return `💬 Комната #${roomStrClean}`;
  };

  const renderSystemMessageContent = (text: string) => {
    const entityTokenRegex = /\{\{(user|chat):([a-zA-Z0-9_-]+)\}\}/g;

    if (!text.includes('{{user:') && !text.includes('{{chat:')) {
      return <span dangerouslySetInnerHTML={{ __html: text }} />;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = entityTokenRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      const entityType = match[1];
      const entityId = match[2];

      if (matchIndex > lastIndex) {
        elements.push(text.slice(lastIndex, matchIndex));
      }

      if (entityType === 'chat') {
        const foundChat = (ctx.chats || []).find((c: any) => String(c.id) === String(entityId));
        const chatTitle = foundChat?.name || 'Беседа';

        elements.push(
          <strong key={`chat-${entityId}-${matchIndex}`}>
            «{chatTitle}»
          </strong>
        );
      } else {
        let resolvedName = 'Пользователь';
        const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');

        if (entityId === myUuid) {
          resolvedName = 'Вы';
        } else {
          const contact = (ctx.contacts || []).find((c: any) => 
            String(c.contactId || c.partnerId || c.uuid || c.id) === entityId
          );

          if (contact && (contact.firstName || contact.lastName)) {
            resolvedName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
          } else {
            const user = (ctx.users || []).find((u: any) => String(u.uuid || u.id) === entityId);
            if (user) {
              resolvedName = user.username || user.name || 'Пользователь';
            }
          }
        }

        elements.push(
          <strong
            key={`user-${entityId}-${matchIndex}`}
            onClick={(e) => {
              e.stopPropagation();
              if (entityId !== myUuid) {
                ctx.setShowUserModal(entityId);
              }
            }}
            style={{ 
              cursor: entityId !== myUuid ? 'pointer' : 'default'
            }}
          >
            {resolvedName}
          </strong>
        );
      }

      lastIndex = entityTokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      elements.push(text.slice(lastIndex));
    }

    return <>{elements}</>;
  };

  const renderSpyPanel = () => {
    if (!selectedUser) return null;

    const realFullName = `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim();

    const privacy = getUserPrivacy(selectedUser);
    const isFullNameDisplay = privacy.privacyNameFormat === 'full_name';

    const displayName = (isFullNameDisplay && realFullName)
      ? realFullName
      : (selectedUser?.username || realFullName || 'Пользователь');
    
    const myIdDisplay = selectedUser.id ? `#${selectedUser.id}` : selectedUser.uuid;

    const isOnline = ctx.isUserOnline ? ctx.isUserOnline(selectedUser) : false;
    const statusInfo = formatUserOnlineStatus(selectedUser?.updatedAt, privacy.online);

    return (
      <div className={styles['spy-container']}>
        <NavSidebar />
        
        <div className={styles['spy-topbar']}>
          <button 
            type="button"
            onClick={() => setSelectedUser(null)}
            className={styles['btn-back-table']}
            title="Назад к таблице"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 8px' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div className={styles['topbar-divider']} />
          <span className={styles['spy-target-title']}>
            Объект: {selectedUser.username}
          </span>
        </div>

        <div className={styles['spy-mobile-tabs']}>
          <button
            type="button"
            className={`${styles['spy-mobile-tab-btn']} ${spyMobileTab === 'chat' ? styles.active : ''}`}
            onClick={() => setSpyMobileTab('chat')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <MessageSquare size={14} /> Переписка
          </button>
          <button
            type="button"
            className={`${styles['spy-mobile-tab-btn']} ${spyMobileTab === 'profile' ? styles.active : ''}`}
            onClick={() => setSpyMobileTab('profile')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <User size={14} /> Профиль
          </button>
          <button
            type="button"
            className={`${styles['spy-mobile-tab-btn']} ${spyMobileTab === 'privacy' ? styles.active : ''}`}
            onClick={() => setSpyMobileTab('privacy')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Lock size={14} /> Приватность
          </button>
        </div>

        <div className={styles['spy-grid']}>
          
          {/* ПАНЕЛЬ 1: ПРОФИЛЬ ОБЪЕКТА (В ФОРМАТЕ МОДАЛОК ПРОФИЛЕЙ) */}
          <div className={`${styles['panel-profile']} ${spyMobileTab === 'profile' ? styles['active-mobile-panel'] : ''}`}>
            <div className={styles['panel-header-red']}>
              <div className={styles['panel-header-title']}>
                <User size={16} /> Карточка профиля объекта
              </div>
            </div>
            
            {/* 🎯 Динамический градиентный задник по аналогии с MyProfileView / UserProfileView */}
            <div 
              className={styles['spy-profile-header']}
              style={{ background: getProfileGradient(selectedUser?.profileColor) }}
            >
              <div className={profileStyles['profile-avatar-wrapper']}>
                <SmartAvatar
                  size={84}
                  avatarUrl={selectedUser.avatarUrl}
                  avatarColor={selectedUser.avatarColor}
                  name={displayName}
                  isChannel={false}
                />
              </div>

              <div className={styles['spy-profile-titles']}>
                <h2 className={profileStyles['profile-name']}>
                  {selectedUser.statusBadge && (
                    <span title={selectedUser.statusBadge.title} style={{ cursor: 'help', userSelect: 'none' }}>
                      {selectedUser.statusBadge.icon}
                    </span>
                  )}
                  {displayName}
                </h2>
                <span className={`${profileStyles['profile-status']} ${isOnline ? profileStyles['online'] : ''}`}>
                  {isOnline ? 'в сети' : statusInfo.text}
                </span>
              </div>
            </div>

            <div className={styles['spy-profile-scroll-body']}>
              {(selectedUser.firstName || selectedUser.lastName) && (
                <div 
                  onClick={() => handleCopy(realFullName, 'Имя и Фамилия')}
                  className={profileStyles['info-item']}
                >
                  <div className={profileStyles['info-item-content']}>
                    <span className={profileStyles['info-value']}>
                      {realFullName}
                    </span>
                    <span className={profileStyles['info-label']}>Настоящие Имя и Фамилия</span>
                  </div>
                  <Copy size={16} className={profileStyles['info-icon']} />
                </div>
              )}

              <div 
                onClick={() => handleCopy(`@${selectedUser.publicId || selectedUser.username}`, 'Тег пользователя')}
                className={profileStyles['info-item']}
              >
                <div className={profileStyles['info-item-content']}>
                  <span className={`${profileStyles['info-value']} ${profileStyles['accent']}`}>
                    @{selectedUser.publicId || selectedUser.username}
                  </span>
                  <span className={profileStyles['info-label']}>Публичный тег</span>
                </div>
                <Copy size={16} className={profileStyles['info-icon']} />
              </div>

              {selectedUser.phone && (
                <div 
                  onClick={() => handleCopy(selectedUser.phone, 'Телефон')}
                  className={profileStyles['info-item']}
                >
                  <div className={profileStyles['info-item-content']}>
                    <span className={profileStyles['info-value']}>
                      {selectedUser.phone}
                    </span>
                    <span className={profileStyles['info-label']}>Номер телефона</span>
                  </div>
                  <Copy size={16} className={profileStyles['info-icon']} />
                </div>
              )}
              
              {selectedUser.email && (
                <div 
                  onClick={() => handleCopy(selectedUser.email, 'Электронная почта')}
                  className={profileStyles['info-item']}
                >
                  <div className={profileStyles['info-item-content']}>
                    <span className={profileStyles['info-value']}>
                      {selectedUser.email}
                    </span>
                    <span className={profileStyles['info-label']}>Электронная почта</span>
                  </div>
                  <Copy size={16} className={profileStyles['info-icon']} />
                </div>
              )}

              {selectedUser.aboutMe && selectedUser.aboutMe.trim() !== '' && (
                <div className={profileStyles['info-item']} style={{ cursor: 'default' }}>
                  <div className={profileStyles['info-item-content']}>
                    <span className={`${profileStyles['info-value']} ${profileStyles['multiline']}`}>
                      {selectedUser.aboutMe}
                    </span>
                    <span className={profileStyles['info-label']}>О себе</span>
                  </div>
                </div>
              )}

              {selectedUser.note && (
                <div className={profileStyles['info-item']} style={{ cursor: 'default' }}>
                  <div className={profileStyles['info-item-content']}>
                    <span className={profileStyles['info-value']}>
                      {selectedUser.note}
                    </span>
                    <span className={profileStyles['info-label']}>Ваша заметка</span>
                  </div>
                </div>
              )}
              
              <div 
                onClick={() => handleCopy(selectedUser.uuid, 'UUID')}
                className={profileStyles['info-item']}
              >
                <div className={profileStyles['info-item-content']}>
                  <span className={`${profileStyles['info-value']} ${profileStyles['mono']}`}>
                    {myIdDisplay}
                  </span>
                  <span className={profileStyles['info-label']}>Идентификатор профиля</span>
                </div>
                <Hash size={16} className={profileStyles['info-icon']} />
              </div>
            </div>
          </div>

          {/* ПАНЕЛЬ 2: НАСТРОЙКИ ПРИВАТНОСТИ */}
          <div className={`${styles['panel-privacy']} ${spyMobileTab === 'privacy' ? styles['active-mobile-panel'] : ''}`}>
            <div className={styles['privacy-title']}>Конфиденциальность</div>
            <div className={styles['privacy-row']}><span>Показ телефона:</span><span className={styles['privacy-val']}>{privacy.phone}</span></div>
            <div className={styles['privacy-row']}><span>Показ почты:</span><span className={styles['privacy-val']}>{privacy.email}</span></div>
            <div className={styles['privacy-row']}><span>Показ онлайна:</span><span className={styles['privacy-val']}>{privacy.online}</span></div>
            <div className={styles['privacy-row']}><span>Формат имени:</span><span className={styles['privacy-val']}>{privacy.privacyNameFormat}</span></div>
            <div className={styles['privacy-row']}><span>Глобальный поиск:</span><span className={styles['privacy-val']}>{privacy.search}</span></div>
          </div>

          {/* ПАНЕЛЬ 3: ЧАТ И ПЕРЕХВАТ СООБЩЕНИЙ */}
          <div className={`${styles['panel-chat-spy']} ${spyMobileTab === 'chat' ? styles['active-mobile-panel'] : ''}`}>
            <div className={styles['chat-select-header']}>
              <select 
                value={activeSpyRoom} 
                onChange={e => handleLoadSpyRoomMessages(e.target.value)} 
                className={styles['room-select']}
              >
                {userRooms.length === 0 ? (
                  <option>Комнаты отсутствуют</option>
                ) : (
                  userRooms.map(room => (
                    <option key={room} value={room}>
                      {getPartnerNameInRoom(room, selectedUser)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div 
              className={styles['chat-messages-scroll']}
              style={{ touchAction: 'pan-y' }}
            >
              {loadingSpy ? (
                <div className={styles['state-loading-msgs']}>Загрузка сообщений...</div>
              ) : spyMessages.length === 0 ? (
                <div className={styles['state-empty-msgs']}>История переписки пуста</div>
              ) : (
                spyMessages.map((msg) => {
                  const isSenderSelected = String(msg.senderId) === String(selectedUser.uuid);
                  const isSystem = msg.senderId === 'system' || String(msg.senderId) === '00000000-0000-0000-0000-000000000000';
                  
                  const senderUserObj = usersList.find(u => u.uuid === String(msg.senderId));
                  const senderName = senderUserObj ? senderUserObj.username : `ID: ${String(msg.senderId).slice(0, 8)}`;

                  if (isSystem) {
                    return (
                      <div 
                        key={msg.id} 
                        className={styles['msg-system-bubble']}
                      >
                        {renderSystemMessageContent(msg.text)}
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={msg.id} 
                      className={`${styles['msg-bubble-card']} ${isSenderSelected ? styles['sender-target'] : styles['sender-other']}`}
                    >
                      <div className={styles['msg-header-row']}>
                        <span className={isSenderSelected ? styles['msg-sender-target'] : styles['msg-sender-other']}>{senderName}</span>
                        <span className={styles['msg-time-badge']}>
                          <Clock size={10} />
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className={styles['msg-text-content']}>
                        {msg.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className={styles['admin-container']}>
      <NavSidebar />

      {/* Шапка панели */}
      <div className={`${styles['admin-header']} ${selectedUser ? styles['hide-on-mobile'] : ''}`}>
        <button 
          type="button" 
          onClick={() => ctx.setIsNavOpen?.(true)}
          title="Открыть меню"
          className={styles['header-menu-btn']}
        >
          <Menu size={22} />
        </button>

        <div className={styles['admin-header-icon']}>
          <Shield size={24} color="#111214" />
        </div>
        <div>
          <h1 className={styles['admin-header-title']}>Admin Dashboard</h1>
          <p className={styles['admin-header-subtitle']}>Кликните на пользователя, чтобы перехватить его переписки</p>
        </div>

        {/* 🎯 Кнопка открытия отладки в правом углу шапки */}
        <button
          type="button"
          onClick={() => {
            setSelectedUser(null);
            setShowDebugPanel(prev => !prev);
          }}
          className={`${styles['admin-debug-btn']} ${showDebugPanel ? styles['active'] : ''}`}
          title="Открыть панель отладки"
        >
          <Bug size={18} />
          <span>Отладка</span>
        </button>
      </div>

      {showDebugPanel ? (
        <AdminDebugPanel/>
      ) : selectedUser ? (
        renderSpyPanel()
      ) : (
        <div className={styles['admin-main-section']}>
          <div className={styles['admin-search-wrapper']}>
            <Search 
              size={18} 
              className={styles['admin-search-icon']} 
            />
            <input
              type="text"
              placeholder="Поиск по тегу, UUID или имени..."
              value={adminSearchQuery}
              onChange={(e) => setAdminSearchQuery(e.target.value)}
              className={styles['admin-search-input']}
              autoComplete="off"
            />
            {adminSearchQuery && (
              <button
                type="button"
                onClick={() => setAdminSearchQuery('')}
                className={styles['admin-search-clear']}
              >
                ×
              </button>
            )}
          </div>

          <div className={styles['table-card']}>
            {loading ? (
              <div className={styles['table-loading']}>Загрузка пользователей PostgreSQL...</div>
            ) : (
              <table className={styles['users-table']}>
                <thead>
                  <tr className={styles['table-head-row']}>
                    <th>Пользователь</th>
                    <th>Уникальный тег</th>
                    <th>Роль</th>
                    <th>Подтверждён</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsersList.map((user) => {
                    const isCurrentSelected = selectedUser?.uuid === user.uuid;
                    return (
                      <tr 
                        key={user.uuid} 
                        onClick={() => handleSelectUserSpy(user)}
                        className={`${styles['table-row']} ${isCurrentSelected ? styles.selected : ''}`}
                      >
                        <td className={styles['cell-user']}>
                          <div className={styles['user-info-row']}>
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt="Avatar"
                                className={styles['user-avatar-img']}
                              />
                            ) : (
                              <div 
                                className={styles['user-avatar-fallback']}
                                style={{ backgroundColor: user.avatarColor || '#007aff' }}
                              >
                                {(user.username || 'U').substring(0, 1).toUpperCase()}
                              </div>
                            )}

                            <div>
                              <span className={styles['user-name-title']}>{user.username}</span>
                              <span className={styles['user-name-subtitle']}>
                                {user.firstName || ''} {user.lastName || ''}
                                {user.publicId && (
                                  <span className={styles['user-mobile-tag']}>@{user.publicId}</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className={styles['cell-tag']}>@{user.publicId || '—'}</td>
                        <td className={styles['cell-role']}>
                          {user.userStatus === 'administrator' && (
                            <span className={`${styles['badge-role']} ${styles['badge-admin']}`}>
                              <ShieldCheck size={14} /> Админ
                            </span>
                          )}
                          {user.userStatus === 'moderator' && (
                            <span className={`${styles['badge-role']} ${styles['badge-moder']}`}>
                              <Shield size={14} /> Модер
                            </span>
                          )}
                          {user.userStatus === 'test' && (
                            <span className={`${styles['badge-role']} ${styles['badge-test']}`}>
                              <MessageSquare size={14} /> Тест
                            </span>
                          )}
                          {user.userStatus === 'default' && (
                            <span className={`${styles['badge-role']} ${styles['badge-user']}`}>
                              <User size={14} /> Юзер
                            </span>
                          )}
                        </td>
                        <td className={styles['cell-role']}>
                          {!user.id && (
                            <span className={`${styles['badge-role']} ${styles['badge-new']}`}>
                              <User size={14} /> Новый
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <p title='Это пока как заглушка, возможно даже местоположение сменится'>Количество аккаунтов в системе: </p>
        </div>
      )}
    </div>
  );
}
