import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import useMessengerContext, { formatUserOnlineStatus } from '../../context/messengerContext';
import { userService, type AppUser } from '../../services/userService';
import { Navigate } from 'react-router';
import { Trash2, Shield, User, ShieldCheck, MessageSquare, Clock, FileText, Mail, Phone, Search } from 'lucide-react';

export default function AdminDashboard() {
  const ctx = useMessengerContext();
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userRooms, setUserRooms] = useState<string[]>([]);
  const [spyGroupsCache, setSpyGroupsCache] = useState<any[]>([]);
  const [activeSpyRoom, setActiveSpyRoom] = useState<string>('');
  const [spyMessages, setSpyMessages] = useState<any[]>([]);
  const [loadingSpy, setLoadingSpy] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  if (!ctx.currentUser || ctx.currentUser.userStatus !== 'administrator') {
    return <Navigate to="/chat" replace />;
  }

  const filteredUsersList = React.useMemo(() => {
    const query = adminSearchQuery.trim().toLowerCase().replace(/^[@#]/, ''); // Игнорируем введённые @ или #
    if (!query) return usersList;

    return usersList.filter((user: any) => {
      const matchTag = String(user.uniqueId || '').toLowerCase().includes(query);
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

        const sortedUsers = [...allUsers].sort((a, b) => {
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
    setScrollTop(0);

    try {
      // 1. Членства в групповых комнатах через актуальную таблицу chat_members
      const { data: currentMemberships } = await supabase
        .from('chat_members')
        .select('chatId')
        .eq('userId', userUuid);

      const activeChatIds = currentMemberships
        ? currentMemberships.map((m: any) => String(m.chatId).trim())
        : [];

      // 2. Уникальные комнаты из сообщений (где пользователь отправлял что-либо)
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
          // Выкачиваем метаданные комнат из таблицы chats
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

    // 1. Поиск среди групп/каналов из кэша
    const cachedGroup = spyGroupsCache.find(g => String(g.id) === roomStrClean);
    if (cachedGroup?.name) {
      return `${cachedGroup.type === 'channel' ? '📢 Канал' : '👥 Беседа'}: "${cachedGroup.name}"`;
    }

    // 2. Поиск в контексте чатов
    const matchedChat = (ctx.chats || []).find((c: any) => String(c.id).trim() === roomStrClean);
    if (matchedChat?.name) {
      return `${matchedChat.isGroup ? '👥' : '💬'} ${matchedChat.name}`;
    }

    // 3. Личный диалог по составному ключу (если есть старый формат uuid1_uuid2)
    if (roomStrClean.includes('_')) {
      const parts = roomStrClean.split('_');
      const partnerUuid = parts.find(id => String(id) !== String(currentTargetUser.uuid));
      const partnerObj = usersList.find(u => u.uuid === partnerUuid);
      if (partnerObj) {
        return `👤 ЛС с: ${partnerObj.username} [@${partnerObj.uniqueId || partnerObj.username}]`;
      }
    }

    return `💬 Комната #${roomStrClean}`;
  };

  const handleKickUser = (targetUser: AppUser) => {
    const myUuid = ctx.currentUser.uuid || ctx.currentUser.id;
    if (targetUser.uuid === myUuid) {
      ctx.showToast('Вы не можете удалить самого себя! ❌', 'error');
      return;
    }

    if (targetUser.userStatus === 'administrator') {
      ctx.showToast('Вы не можете депортировать другого администратора! 🛡️', 'error');
      return;
    }

    ctx.showConfirm(
      'Депортация пользователя',
      `Вы действительно хотите НАВСЕГДА удалить аккаунт пользователя ${targetUser.username}? Это сотрёт все его данные.`,
      async () => {
        // 🎯 Удаление строго по UUID
        await supabase.from('users').delete().eq('uuid', targetUser.uuid);
        ctx.showToast(`Пользователь ${targetUser.username} успешно удален! 🧹`, 'success');
        setUsersList(prev => prev.filter(u => u.uuid !== targetUser.uuid));
        if (selectedUser?.uuid === targetUser.uuid) setSelectedUser(null);
        ctx.setConfirm((prev: any) => ({ ...prev, show: false }));
      },
      true
    );
  };

  const renderSpyPanel = () => {
    if (!selectedUser) return null;

    const avatarRatio = Math.min(scrollTop / 70, 1);
    const avatarSize = 100 - (avatarRatio * 55);
    const nameFontSize = 20 - (avatarRatio * 4);

    const isOnline = ctx.isUserOnline ? ctx.isUserOnline(selectedUser) : false;
    const statusInfo = formatUserOnlineStatus(selectedUser?.updatedAt, 'all');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', height: 'calc(100vh - 180px)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#111214', padding: '14px 20px', borderRadius: '12px', border: '1px solid #2b2d31' }}>
          <button 
            type="button"
            onClick={() => setSelectedUser(null)}
            style={{ background: 'none', border: 'none', color: '#9d7bf6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '600', padding: 0 }}
          >
            ← Назад к таблице
          </button>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#2b2d31' }} />
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>
            Объект наблюдения: {selectedUser.username}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '20px', width: '100%', flex: 1, overflow: 'hidden' }}>
          
          {/* ПАНЕЛЬ 1: ПРОФИЛЬ ОБЪЕКТА */}
          <div style={{ flex: 1, backgroundColor: '#111214', borderRadius: '12px', border: '1px solid #ff453a', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #2b2d31', backgroundColor: '#18191c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ff453a', fontWeight: '600', fontSize: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={16} /> Карточка профиля объекта
              </div>
            </div>
            
            <div style={{ height: `${200 - (avatarRatio * 110)}px`, display: 'flex', flexDirection: avatarRatio > 0.8 ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', backgroundColor: '#16161f', borderBottom: '1px solid #2b2d31', flexShrink: 0, padding: '10px', boxSizing: 'border-box', overflow: 'hidden' }}>
              <div style={{ flexShrink: 0, width: `${avatarSize}px`, height: `${avatarSize}px`, transition: 'all 0.1s ease' }}>
                {selectedUser.avatarUrl ? (
                  <img src={selectedUser.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2b2d31' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: selectedUser.avatarColor || '#9d7bf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${avatarSize * 0.4}px`, fontWeight: 'bold', color: '#fff' }}>
                    {(selectedUser.username || 'U').substring(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: avatarRatio > 0.8 ? 'flex-start' : 'center' }}>
                <span style={{ fontSize: `${nameFontSize}px`, fontWeight: '700', color: '#fff' }}>
                  {selectedUser.isContact 
                    ? `${selectedUser.contactFirstName || ''} ${selectedUser.contactLastName || ''}`.trim() || selectedUser.username 
                    : selectedUser.username}
                </span>
                <span style={{ fontSize: '12px', color: isOnline ? '#34c759' : '#8e8e93', marginTop: '2px' }}>
                  {isOnline ? 'в сети' : statusInfo.text}
                </span>
              </div>
            </div>

            <div 
              onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
              style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {(selectedUser.firstName || selectedUser.lastName) && (
                <div>
                  <span style={{ display: 'block', fontSize: '15px', color: '#fff', fontWeight: '500' }}>
                    {`${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()}
                  </span>
                  <span style={{ fontSize: '11px', color: '#8e8e93' }}>Настоящие Имя и Фамилия</span>
                </div>
              )}

              <div>
                <span style={{ display: 'block', fontSize: '15px', color: '#fff', fontWeight: '500' }}>{selectedUser.phone || 'не указан'}</span>
                <span style={{ fontSize: '11px', color: '#8e8e93' }}><Phone size={10} style={{ marginRight: '4px' }} /> Номер телефона</span>
              </div>
              
              <div>
                <span style={{ display: 'block', fontSize: '15px', color: '#fff', fontWeight: '500' }}>{selectedUser.email || 'не указана'}</span>
                <span style={{ fontSize: '11px', color: '#8e8e93' }}><Mail size={10} style={{ marginRight: '4px' }} /> Электронная почта</span>
              </div>
              
              <div>
                <span style={{ display: 'block', fontSize: '15px', color: '#fff', fontWeight: '500' }}>@{selectedUser.uniqueId || selectedUser.username}</span>
                <span style={{ fontSize: '11px', color: '#8e8e93' }}>Уникальный ID</span>
              </div>

              {selectedUser.note && (
                <div style={{ borderTop: '1px solid #2b2d31', paddingTop: '14px' }}>
                  <span style={{ display: 'block', fontSize: '14px', color: '#9d7bf6', fontWeight: '600', whiteSpace: 'pre-wrap' }}>
                    {selectedUser.note}
                  </span>
                  <span style={{ fontSize: '11px', color: '#8e8e93' }}><FileText size={10} style={{ marginRight: '4px' }} /> Ваша заметка</span>
                </div>
              )}

              <div style={{ borderTop: '1px solid #2b2d31', paddingTop: '14px' }}>
                <span style={{ display: 'block', fontSize: '14px', color: '#fff', whiteSpace: 'pre-wrap' }}>
                  {selectedUser.aboutMe || 'Био-заметка отсутствует'}
                </span>
                <span style={{ fontSize: '11px', color: '#8e8e93' }}>О себе</span>
              </div>
            </div>
          </div>


          {/* ПАНЕЛЬ 2: НАСТРОЙКИ ПРИВАТНОСТИ */}
          <div style={{ flex: 1, backgroundColor: '#111214', borderRadius: '12px', border: '1px solid #34c759', display: 'flex', flexDirection: 'column', padding: '20px', gap: '20px', overflowY: 'auto' }}>
            <div style={{ color: '#34c759', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', borderBottom: '1px solid #2b2d31', paddingBottom: '10px' }}>Конфиденциальность</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Показ телефона:</span><span style={{ color: '#34c759', fontWeight: 'bold' }}>{selectedUser.privacyPhone || 'all'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Показ почты:</span><span style={{ color: '#34c759', fontWeight: 'bold' }}>{selectedUser.privacyEmail || 'all'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Показ онлайна:</span><span style={{ color: '#34c759', fontWeight: 'bold' }}>{selectedUser.privacyOnline || 'all'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Формат имени:</span><span style={{ color: '#34c759', fontWeight: 'bold' }}>{selectedUser.privacyNameFormat || 'username'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Глобальный поиск:</span><span style={{ color: '#34c759', fontWeight: 'bold' }}>{selectedUser.privacySearch || 'all'}</span></div>
          </div>

          {/* 🟡 ЖЁЛТАЯ ПАНЕЛЬ: ОКНО ЧАТА И ПЕРЕХВАТА */}
          <div style={{ flex: 1.3, backgroundColor: '#111214', borderRadius: '12px', border: '1px solid #ffcc00', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px', borderBottom: '1px solid #2b2d31', backgroundColor: '#18191c' }}>
              <select 
                value={activeSpyRoom} 
                onChange={e => handleLoadSpyRoomMessages(e.target.value)} 
                style={{ width: '100%', backgroundColor: '#111214', color: '#fff', border: '1px solid #383842', borderRadius: '8px', padding: '8px', fontSize: '13px', outline: 'none' }}
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#16161f' }}>
              {loadingSpy ? (
                <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', marginTop: '30px' }}>Загрузка сообщений...</div>
              ) : spyMessages.length === 0 ? (
                <div style={{ color: '#636366', fontSize: '13px', textAlign: 'center', marginTop: '30px', fontStyle: 'italic' }}>История переписки пуста</div>
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
                        style={{ 
                          alignSelf: 'center', margin: '8px 0', padding: '6px 14px', 
                          backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', 
                          fontSize: '12px', color: '#9ca3af', textAlign: 'center', maxWidth: '85%'
                        }}
                        dangerouslySetInnerHTML={{ __html: msg.text }}
                      />
                    );
                  }

                  return (
                    <div 
                      key={msg.id} 
                      style={{ 
                        alignSelf: isSenderSelected ? 'flex-end' : 'flex-start',
                        maxWidth: '75%',
                        backgroundColor: isSenderSelected ? '#2b1a3a' : '#23232e', 
                        border: isSenderSelected ? '1px solid #9d7bf6' : '1px solid #383842',
                        padding: '10px 14px', 
                        borderRadius: isSenderSelected ? '14px 14px 0 14px' : '14px 14px 14px 0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ fontWeight: 'bold', color: isSenderSelected ? '#ffcc00' : '#007aff' }}>{senderName}</span>
                        <span style={{ color: '#636366', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={10} />
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#fff', wordBreak: 'break-word', lineHeight: '1.4' }}>
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
    <div style={{ flex: 1, minHeight: '100vh', backgroundColor: '#1e1f22', padding: '40px', fontFamily: 'sans-serif', color: '#dbdee1', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Шапка панели */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #2b2d31', paddingBottom: '20px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ffcc00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={24} color="#111214" />
        </div>
        <div>
          <h1 style={{ color: '#fff', fontSize: '26px', margin: 0, fontWeight: '700' }}>Admin Dashboard</h1>
          <p style={{ color: '#9ca3af', margin: '4px 0 0 0', fontSize: '14px' }}>Кликните на пользователя, чтобы перехватить и прочитать его переписки</p>
        </div>
      </div>

      {selectedUser ? (
        renderSpyPanel()
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          
          {/* 🔍 ПАНЕЛЬ ПОИСКА */}
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            maxWidth: '460px', 
            display: 'flex', 
            alignItems: 'center' 
          }}>
            <Search 
              size={18} 
              color="#8e8e93" 
              style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }} 
            />
            <input
              type="text"
              placeholder="Поиск по @тегу, #ID, UUID или никнейму..."
              value={adminSearchQuery}
              onChange={(e) => setAdminSearchQuery(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#111214',
                border: '1px solid #2b2d31',
                borderRadius: '10px',
                padding: '12px 38px 12px 42px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#9d7bf6';
                e.currentTarget.style.boxShadow = '0 0 10px rgba(157, 123, 246, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#2b2d31';
                e.currentTarget.style.boxShadow = 'none';
              }}
              autoComplete="off"
            />
            {adminSearchQuery && (
              <button
                type="button"
                onClick={() => setAdminSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#8e8e93',
                  fontSize: '16px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* ЛЕВАЯ СТОРОНА: ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ */}
          <div style={{ width: '100%', backgroundColor: '#111214', borderRadius: '8px', border: '1px solid #2b2d31', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ color: '#9ca3af', textAlign: 'center', padding: '40px' }}>Загрузка пользователей PostgreSQL...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#18191c', borderBottom: '1px solid #2b2d31', color: '#9ca3af' }}>
                    <th style={{ padding: '14px 20px' }}>ID</th>
                    <th style={{ padding: '14px 20px' }}>Пользователь</th>
                    <th style={{ padding: '14px 20px' }}>Уникальный тег</th>
                    <th style={{ padding: '14px 20px' }}>Роль</th>
                    <th style={{ padding: '14px 20px' }}>Подтверждён</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsersList.map((user) => {
                    const isCurrentSelected = selectedUser?.uuid === user.uuid;
                    return (
                      <tr 
                        key={user.uuid} 
                        onClick={() => handleSelectUserSpy(user)}
                        style={{ 
                          borderBottom: '1px solid #2b2d31', 
                          cursor: 'pointer',
                          backgroundColor: isCurrentSelected ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
                          transition: 'background-color 0.15s ease' 
                        }} 
                        onMouseEnter={e => { if(!isCurrentSelected) e.currentTarget.style.backgroundColor = '#1e1f22' }} 
                        onMouseLeave={e => { if(!isCurrentSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        <td style={{ padding: '16px 20px', color: '#636366', fontWeight: 'bold' }}>
                          {(user as any).id ? `#${(user as any).id}` : user.uuid.slice(0, 8)}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt="Avatar"
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: user.avatarColor || '#007aff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '12px' }}>
                                {(user.username || 'U').substring(0, 1).toUpperCase()}
                              </div>
                            )}

                            <div>
                              <span style={{ color: '#fff', fontWeight: '600', display: 'block' }}>{user.username}</span>
                              <span style={{ color: '#8e8e93', fontSize: '12px' }}>{user.firstName || ''} {user.lastName || ''}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', color: '#007aff', fontWeight: '500' }}>@{user.uniqueId || '—'}</td>
                        <td style={{ padding: '16px 20px' }}>
                          {user.userStatus === 'administrator' && (
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '6px', 
                              backgroundColor: 'rgba(255, 69, 58, 0.1)', color: '#ff453a', 
                              padding: '4px 10px', borderRadius: '12px', fontSize: '12px', 
                              fontWeight: '600', border: '1px solid rgba(255, 69, 58, 0.15)'
                            }}>
                              <ShieldCheck size={14} /> Админ
                            </span>
                          )}
                          {user.userStatus === 'moderator' && (
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '6px', 
                              backgroundColor: 'rgba(157, 123, 246, 0.1)', color: '#9d7bf6', 
                              padding: '4px 10px', borderRadius: '12px', fontSize: '12px', 
                              fontWeight: '600', border: '1px solid rgba(157, 123, 246, 0.15)'
                            }}>
                              <Shield size={14} /> Модер
                            </span>
                          )}
                          {user.userStatus === 'test' && (
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '6px', 
                              backgroundColor: 'rgba(52, 199, 89, 0.1)', color: '#34c759', 
                              padding: '4px 10px', borderRadius: '12px', fontSize: '12px', 
                              fontWeight: '600', border: '1px solid rgba(52, 199, 89, 0.15)'
                            }}>
                              <MessageSquare size={14} /> Тест
                            </span>
                          )}
                          {user.userStatus === 'default' && (
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '6px', 
                              backgroundColor: 'rgba(142, 142, 147, 0.08)', color: '#8e8e93', 
                              padding: '4px 10px', borderRadius: '12px', fontSize: '12px'
                            }}>
                              <User size={14} /> Юзер
                            </span>
                          )}
                        </td>
                        <td>
                          {!user.id && 
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '6px', 
                              backgroundColor: 'rgba(157, 123, 246, 0.1)', color: '#9d7bf6', 
                              padding: '4px 10px', borderRadius: '12px', fontSize: '12px', 
                              fontWeight: '600', border: '1px solid rgba(157, 123, 246, 0.15)',
                              boxShadow: '0 0 8px rgba(157, 123, 246, 0.15)'
                            }}>
                              <User size={14} /> Новый
                            </span>
                          }
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleKickUser(user)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: user.userStatus === 'administrator' ? '#3a3a3c' : '#ff453a', 
                              cursor: user.userStatus === 'administrator' ? 'not-allowed' : 'pointer', 
                              padding: '6px', 
                              borderRadius: '4px' 
                            }}
                            disabled={user.userStatus === 'administrator'}
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
