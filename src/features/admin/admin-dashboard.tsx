import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import useMessengerContext from '../../context/messengerContext';
import { Navigate } from 'react-router-dom';
import { Trash2, Shield, User, ShieldCheck, MessageSquare, Eye, X, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const ctx = useMessengerContext();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🚀 СТЕЙТЫ ШПИОНАЖА
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userRooms, setUserRooms] = useState<string[]>([]);
  const [activeSpyRoom, setActiveSpyRoom] = useState<string>('');
  const [spyMessages, setSpyMessages] = useState<any[]>([]);
  const [loadingSpy, setLoadingSpy] = useState(false);

  if (!ctx.currentUser || !ctx.currentUser.isAdmin) {
    return <Navigate to="/chat" replace />;
  }

  const fetchAllUsersForAdmin = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('messages') // Прогреваем кэш Realtime на всякий случай
      .select('chatId');

    const { data: allUsers } = await supabase
      .from('users')
      .select('*')
      .order('id', { ascending: true });

    if (!error && allUsers) {
      setUsersList(allUsers);
    }
    setLoading(false);
  };

  useEffect(() => {
    document.title = 'Панель администратора';
    fetchAllUsersForAdmin();
  }, []);

  // 🚀 ЭКСТРАКТОР ДИАЛОГОВ: Ищет все уникальные комнаты, где участвовал юзер
  const handleSelectUserSpy = async (targetUser: any) => {
    setSelectedUser(targetUser);
    setSpyMessages([]);
    setActiveSpyRoom('');
    setLoadingSpy(true);

    const userIdStr = String(targetUser.id);

    // Выкачиваем все chatId сообщений, где данный юзер был отправителем или участником ID комнат
    const { data: msgs, error } = await supabase
      .from('messages')
      .select('chatId')
      .or(`senderId.eq.${userIdStr},chatId.ilike.%_${userIdStr}%,chatId.ilike.%${userIdStr}_%`);

    if (!error && msgs) {
      // Собираем только уникальные ID комнат
      const uniqueRooms = Array.from(new Set(msgs.map((m: any) => m.chatId)));
      setUserRooms(uniqueRooms);
      
      if (uniqueRooms.length > 0) {
        // Автоматически подгружаем первую найденную комнату
        handleLoadSpyRoomMessages(uniqueRooms[0], uniqueRooms);
      }
    }
    setLoadingSpy(false);
  };

  // Выгружаем сообщения из конкретной шпионящей комнаты
  const handleLoadSpyRoomMessages = async (roomName: string, currentRoomsList = userRooms) => {
    setActiveSpyRoom(roomName);
    setLoadingSpy(true);

    const { data: msgs, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chatId', roomName)
      .order('id', { ascending: true });

    if (!error && msgs) {
      setSpyMessages(msgs);
    }
    setLoadingSpy(false);
  };

  // Получаем красивое имя собеседника в комнате для админа
  const getPartnerNameInRoom = (roomStr: string, currentTargetUser: any) => {
    if (!roomStr) return '';
    const parts = roomStr.split('_');
    const partnerId = parts.find(id => String(id) !== String(currentTargetUser.id));
    const partnerObj = usersList.find(u => String(u.id) === String(partnerId));
    return partnerObj ? `${partnerObj.username} (#${partnerObj.id})` : `Пользователь #${partnerId}`;
  };

  const handleKickUser = (targetUser: any) => {
    if (targetUser.id === ctx.currentUser.id) {
      ctx.showToast('Вы не можете удалить самого себя! ❌', 'error');
      return;
    }

    ctx.showConfirm(
      'Депортация пользователя',
      `Вы действительно хотите НАВСЕГДА удалить аккаунт пользователя ${targetUser.username}? Это сотрет все его диалоги.`,
      async () => {
        await supabase.from('users').delete().eq('id', targetUser.id);
        ctx.showToast(`Пользователь ${targetUser.username} успешно удален! 🧹`, 'success');
        setUsersList(prev => prev.filter(u => u.id !== targetUser.id));
        if (selectedUser?.id === targetUser.id) setSelectedUser(null);
        ctx.setConfirm((prev: any) => ({ ...prev, show: false }));
      },
      true
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

      <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* ЛЕВАЯ СТОРОНА: ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ */}
        <div style={{ flex: 2, minWidth: '600px', backgroundColor: '#111214', borderRadius: '8px', border: '1px solid #2b2d31', overflow: 'hidden' }}>
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
                  <th style={{ padding: '14px 20px', textAlign: 'center' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((user) => {
                  const isCurrentSelected = selectedUser?.id === user.id;
                  return (
                    <tr 
                      key={user.id} 
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
                      <td style={{ padding: '16px 20px', color: '#636366', fontWeight: 'bold' }}>#{user.id}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt="Avatar"
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
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
                        {user.isAdmin ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,204,0,0.1)', color: '#ffcc00', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                            <ShieldCheck size={14} /> Админ
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(142,142,147,0.1)', color: '#8e8e93', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
                            <User size={14} /> Юзер
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleKickUser(user)}
                          style={{ background: 'none', border: 'none', color: user.isAdmin ? '#3a3a3c' : '#ff453a', cursor: user.isAdmin ? 'not-allowed' : 'pointer', padding: '6px', borderRadius: '4px' }}
                          disabled={user.isAdmin}
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
        {/* 🚀 ПРАВАЯ СТОРОНА: МОДУЛЬ ПЕРЕХВАТА И ЧТЕНИЯ СООБЩЕНИЙ (SPY PANEL) */}
        {selectedUser && (
          <div style={{ flex: 1.2, minWidth: '380px', backgroundColor: '#111214', border: '1px solid #2b2d31', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '40px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}>
            
            {/* Заголовок перехвата */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2b2d31', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Eye size={18} color="#ffcc00" />
                <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>Логи переписок: {selectedUser.username}</h3>
              </div>
              <button type="button" onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Селект выбора комнат переписки */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>Активные диалоги пользователя:</label>
              {userRooms.length === 0 ? (
                <div style={{ color: '#636366', fontSize: '14px', fontStyle: 'italic', padding: '10px 0' }}>Пользователь ещё ни разу никому не писал</div>
              ) : (
                <select 
                  value={activeSpyRoom} 
                  onChange={e => handleLoadSpyRoomMessages(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#1e1f22', color: '#dbdee1', border: '1px solid #2b2d31', borderRadius: '6px', padding: '10px', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
                >
                  {userRooms.map(room => (
                    <option key={room} value={room}>
                      Чат с: {getPartnerNameInRoom(room, selectedUser)} (комната {room})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Тело вывода шпионских сообщений */}
            <div style={{ flex: 1, minHeight: '320px', maxHeight: '450px', backgroundColor: '#1e1f22', borderRadius: '6px', border: '1px solid #2b2d31', padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loadingSpy ? (
                <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>Синхронизация пакетов сообщений...</div>
              ) : spyMessages.length === 0 ? (
                <div style={{ color: '#636366', fontSize: '13px', textAlign: 'center', marginTop: '40px', fontStyle: 'italic' }}>Выберите комнату для выгрузки логов</div>
              ) : (
                spyMessages.map((msg) => {
                  const isSenderSelected = String(msg.senderId) === String(selectedUser.id);
                  const senderUserObj = usersList.find(u => String(u.id) === String(msg.senderId));
                  const senderName = senderUserObj ? senderUserObj.username : `Юзер #${msg.senderId}`;

                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: isSenderSelected ? 'rgba(255,204,0,0.04)' : 'rgba(0,122,255,0.04)', padding: '10px', borderRadius: '6px', borderLeft: isSenderSelected ? '3px solid #ffcc00' : '3px solid #007aff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ fontWeight: 'bold', color: isSenderSelected ? '#ffcc00' : '#007aff' }}>{senderName}</span>
                        <span style={{ color: '#636366', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={10} />
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#fff', wordBreak: 'break-word', lineHeight: '1.4' }}>{msg.text}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}