import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import useMessengerContext, { formatUserOnlineStatus } from '../../context/messengerContext';
import { Navigate } from 'react-router-dom';
import { Trash2, Shield, User, ShieldCheck, MessageSquare, Eye, X, Clock, FileText, Mail, Phone } from 'lucide-react';

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
  const [scrollTop, setScrollTop] = useState(0);

  if (!ctx.currentUser || ctx.currentUser.userStatus !== 'administrator') {
    return <Navigate to="/chat" replace />;
  }

  const fetchAllUsersForAdmin = async () => {
    setLoading(true);

    const { data: allUsers } = await supabase
      .from('users')
      .select('*');

    if (allUsers) {
      const roleWeights: { [key: string]: number } = {
        'administrator': 4,
        'moderator': 3,
        'test': 2,
        'default': 1
      };
      const sortedUsers = [...allUsers].sort((a, b) => {
        const weightA = roleWeights[a.userStatus] || 1;
        const weightB = roleWeights[b.userStatus] || 1;

        if (weightB !== weightA) {
          return weightB - weightA; // Высшие роли улетают в самый верх таблицы!
        }
        
        // Если роли одинаковые — сортируем по возрастанию ID комнаты/юзера
        return Number(a.id) - Number(b.id);
      });
      setUsersList(sortedUsers);
    }

    setLoading(false);
  };

  useEffect(() => {
    document.title = 'Панель администратора';
    fetchAllUsersForAdmin();
  }, []);

  // 🚀 ОБНОВЛЁННЫЙ ЭКСТРАКТОР: Выводит строго те беседы, где пользователь РЕАЛЬНО состоит прямо сейчас!
  const handleSelectUserSpy = async (targetUser: any) => {
    const userIdStr = String(targetUser.id);
    const matchedContact = ctx.chats?.find((c: any) => String(c.id).trim() === userIdStr && !c.isGroup);

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
      // 🎯 ШАГ 1: Запрашиваем из базы список групп, в которых этот пользователь состоит ПРЯМО СЕЙЧАС
      const { data: currentGroupMemberships } = await supabase
        .from('group_members')
        .select('chatId')
        .eq('userId', targetUser.id);

      const activeGroupIds = currentGroupMemberships ? currentGroupMemberships.map(m => String(m.chatId).trim()) : [];

      // 🎯 ШАГ 2: Выкачиваем chatId вообще всех сообщений для фильтрации ЛС
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('chatId')
        .or(`senderId.eq.${userIdStr},chatId.ilike.%_${userIdStr}%,chatId.ilike.%${userIdStr}_%`);

      if (!error && msgs) {
        // Собираем все уникальные комнаты из истории сообщений
        const allUniqueRooms = Array.from(new Set(msgs.map((m: any) => String(m.chatId).trim())));

        // 🎯 ШАГ 3: ЖЕСТКАЯ ФИЛЬТРАЦИЯ КОМНАТ
        const filteredRooms = allUniqueRooms.filter(room => {
          if (room.startsWith('group_')) {
            // Групповую беседу добавляем в список ТОЛЬКО если пользователь в ней до сих пор состоит!
            return activeGroupIds.includes(room);
          }
          // Личные чаты (ЛС) оставляем как есть
          return true;
        });

        setUserRooms(filteredRooms);

        // Кэшируем имена только тех групп, которые прошли жесткий отбор
        const groupRoomIds = filteredRooms.filter(room => room.startsWith('group_'));
        if (groupRoomIds.length > 0) {
          const { data: groupsData } = await supabase
            .from('group_chats')
            .select('id, name')
            .in('id', groupRoomIds);
          if (groupsData) {
            setSpyGroupsCache(groupsData);
          }
        }

        // Автоматически подгружаем логи первой валидной комнаты
        if (filteredRooms.length > 0) {
          handleLoadSpyRoomMessages(filteredRooms[0], filteredRooms);
        }
      }
    } catch (err) {
      console.error('Ошибка шпионского фильтра комнат:', err);
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

  // 🚀 УЛЬТИМАТИВНЫЙ ОБРАБОТЧИК ИМЕН ДИАЛОГОВ ДЛЯ ШПИОНСКОГО СЕЛЕКТА
  const getPartnerNameInRoom = (roomStr: string, currentTargetUser: any) => {
    if (!roomStr) return '';
    
    const roomStrClean = String(roomStr).trim();

    // 🎯 ФИКС ГРУППОВЫХ БЕСЕД: Если комната начинается на group_
    if (roomStrClean.startsWith('group_')) {
      // Ищем эту группу в глобальном кэше чатов контекста
      const matchedGroup = ctx.chats?.find((c: any) => String(c.id).trim() === roomStrClean && c.isGroup);
      if (matchedGroup && matchedGroup.name) {
        return `👥 Беседа: "${matchedGroup.name}"`;
      }
      
      // На всякий случай проверяем по кэшу usersList, вдруг это старая группа
      const fallbackGroup = usersList?.find((u: any) => String(u.id).trim() === roomStrClean);
      if (fallbackGroup && fallbackGroup.username) {
        return `👥 Беседа: "${fallbackGroup.username}"`;
      }

      return `👥 Групповая комната (#${roomStrClean.substring(6, 12)})`;
    }

    // 🎯 ФИКС ЛИЧНЫХ ЧАТОВ (ЛС): Находим, с кем общается объект наблюдения
    const parts = roomStrClean.split('_');
    const partnerId = parts.find(id => String(id) !== String(currentTargetUser.id));
    
    if (!partnerId) return `💬 Личный чат (ID: ${roomStrClean})`;
    
    // Ищем объект собеседника в общем списке пользователей
    const partnerObj = usersList.find(u => String(u.id) === String(partnerId));
    
    if (partnerObj) {
      const realName = (partnerObj.firstName || partnerObj.lastName) 
        ? `(${partnerObj.firstName || ''} ${partnerObj.lastName || ''}`.trim() + ')'
        : '';
      return `👤 ЛС с: ${partnerObj.username} ${realName} [#${partnerObj.id}]`;
    }
    
    return `👤 ЛС с: Пользователь #${partnerId}`;
  };

  const handleKickUser = (targetUser: any) => {
    if (targetUser.id === ctx.currentUser.id) {
      ctx.showToast('Вы не можете удалить самого себя! ❌', 'error');
      return;
    }

    if (targetUser.userStatus === 'administrator') {
      ctx.showToast('Вы не можете депортировать другого администратора! 🛡️', 'error');
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

    // 🔮 УЛЬТИМАТИВНЫЙ ТРЁХПАНЕЛЬНЫЙ ПУЛЬТ ШПИОНАЖА (РОВНО ПО ТВОЕЙ СХЕМЕ)
  const renderSpyPanel = () => {
    if (!selectedUser) return null;

    const avatarRatio = Math.min(scrollTop / 70, 1);
    const avatarSize = 100 - (avatarRatio * 55);
    const nameFontSize = 20 - (avatarRatio * 4);
    const statusFontSize = 13 - (avatarRatio * 1);
    const avatarMarginTop = 24 - (avatarRatio * 24);
    const currentHeaderHeight = Math.max(245 - (avatarRatio * 155), 90);

    const statusInfo = formatUserOnlineStatus(selectedUser?.updatedAt, 'all');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', height: 'calc(100vh - 180px)', boxSizing: 'border-box' }}>
        
        {/* ВЕРХНЯЯ НАВИГАЦИОННАЯ СТРОКА */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#111214', padding: '14px 20px', borderRadius: '12px', border: '1px solid #2b2d31' }}>
          <button 
            onClick={() => setSelectedUser(null)}
            style={{ background: 'none', border: 'none', color: '#9d7bf6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '600', padding: 0 }}
          >
            ← Назад к таблице
          </button>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#2b2d31' }} />
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: '700' }}>Объект наблюдения: {selectedUser.username}</span>
        </div>

        {/* ТРИ ПАНЕЛИ В ОДИН РЯД */}
        <div style={{ display: 'flex', gap: '20px', width: '100%', flex: 1, overflow: 'hidden' }}>
          
          {/* 🔴 КРАСНАЯ ПАНЕЛЬ: МОДАЛКА ПРОФИЛЯ С ПЕРЕКЛЮЧЕНИЕМ РЕЖИМА КОНТАКТОВ */}
          <div style={{ flex: 1, backgroundColor: '#111214', borderRadius: '12px', border: '1px solid #ff453a', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #2b2d31', backgroundColor: '#18191c', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ff453a', fontWeight: '600', fontSize: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={16} /> Карточка профиля объекта
              </div>
              
              {/* Кнопка переключения режимов */}
              {!selectedUser.isGroup && (
                <button
                  type="button"
                  onClick={() => {
                    // Переключаем стейт редактирования. Для этого в начале AdminDashboard 
                    // можно объявить: const [isSpyEditing, setIsSpyEditing] = useState(false);
                    // Но чтобы не плодить стейты, мы можем использовать локальный флаг, 
                    // либо завязать на стейт, который мы сейчас добавим.
                    ctx.showToast('Переключение режима заготовки формы...', 'info');
                  }}
                  style={{ background: 'none', border: 'none', color: '#9d7bf6', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                >
                  {selectedUser.isContact ? 'Изменить' : 'Добавить'}
                </button>
              )}
            </div>
            
            {/* Сжимающийся заголовок профиля */}
            <div style={{ height: `${200 - (avatarRatio * 110)}px`, display: 'flex', flexDirection: avatarRatio > 0.8 ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', backgroundColor: '#16161f', borderBottom: '1px solid #2b2d31', flexShrink: 0, padding: '10px', boxSizing: 'border-box', overflow: 'hidden' }}>
              <div style={{ flexShrink: 0, width: `${avatarSize}px`, height: `${avatarSize}px`, transition: 'all 0.1s ease' }}>
                {(selectedUser.avatarUrl || selectedUser.avatar_url) ? (
                  <img src={selectedUser.avatarUrl || selectedUser.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2b2d31' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: selectedUser.avatarColor || '#9d7bf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: `${avatarSize * 0.4}px`, fontWeight: 'bold', color: '#fff' }}>
                    {selectedUser.username.substring(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: avatarRatio > 0.8 ? 'flex-start' : 'center' }}>
                <span style={{ fontSize: `${nameFontSize}px`, fontWeight: '700', color: '#fff' }}>
                  {selectedUser.isContact ? `${selectedUser.contactFirstName || ''} ${selectedUser.contactLastName || ''}`.trim() || selectedUser.username : selectedUser.username}
                </span>
                <span style={{ fontSize: '12px', color: statusInfo.isOnline ? '#34c759' : '#8e8e93', marginTop: '2px' }}>{statusInfo.text}</span>
              </div>
            </div>

            {/* Тело скролла личных данных с отображением заметок */}
            <div 
              onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
              style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* 🎯 ЖЕСТКИЙ ФИКС ИМЕНИ: Выводим настоящие Имя и Фамилию ВСЕГДА! Админ видит всё! */}
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

              {/* 🎯 ЖЕСТКИЙ ФИКС ЗАМЕТКИ: Выводим заметку, если она вообще существует в объекте */}
              <div style={{ borderTop: '1px solid #2b2d31', paddingTop: '14px' }}>
                <span style={{ display: 'block', fontSize: '14px', color: '#9d7bf6', fontWeight: '600', whiteSpace: 'pre-wrap' }}>
                  {selectedUser.note || 'бля он админ' /* Фоллбэк-заглушка или динамическое поле */}
                </span>
                <span style={{ fontSize: '11px', color: '#8e8e93' }}><FileText size={10} style={{ marginRight: '4px' }} /> Ваша заметка о контакте</span>
              </div>

              <div style={{ borderTop: '1px solid #2b2d31', paddingTop: '14px' }}>
                <span style={{ display: 'block', fontSize: '14px', color: '#fff', whiteSpace: 'pre-wrap' }}>{selectedUser.aboutMe || selectedUser.about_me || 'Био-заметка отсутствует'}</span>
                <span style={{ fontSize: '11px', color: '#8e8e93' }}>О себе</span>
              </div>
            </div>
          </div>


          {/* 🟢 ЗЕЛЁНАЯ ПАНЕЛЬ: НАСТРОЙКИ КОНФИДЕНЦИАЛЬНОСТИ */}
          <div style={{ flex: 1, backgroundColor: '#111214', borderRadius: '12px', border: '1px solid #34c759', display: 'flex', flexDirection: 'column', padding: '20px', gap: '20px', overflowY: 'auto' }}>
            <div style={{ color: '#34c759', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', borderBottom: '1px solid #2b2d31', paddingBottom: '10px' }}>Конфиденциальность</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Показ телефона:</span><span style={{ color: '#34c759', fontWeight: 'bold' }}>{selectedUser.privacyPhone || 'all'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Показ почты:</span><span style={{ color: '#34c759', fontWeight: 'bold' }}>{selectedUser.privacyEmail || 'all'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Показ онлайна:</span><span style={{ color: '#34c759', fontWeight: 'bold' }}>{selectedUser.privacyOnline || 'all'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Формат имени:</span><span style={{ color: '#34c759', fontWeight: 'bold' }}>{selectedUser.privacyNameFormat || 'username'}</span></div>
          </div>

          {/* 🟡 ЖЁЛТАЯ ПАНЕЛЬ: ОКНО ЧАТА И ПЕРЕХВАТА */}
          <div style={{ flex: 1.3, backgroundColor: '#111214', borderRadius: '12px', border: '1px solid #ffcc00', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px', borderBottom: '1px solid #2b2d31', backgroundColor: '#18191c' }}>
              <select value={activeSpyRoom} onChange={e => handleLoadSpyRoomMessages(e.target.value)} style={{ width: '100%', backgroundColor: '#111214', color: '#fff', border: '1px solid #383842', borderRadius: '8px', padding: '8px', fontSize: '13px', outline: 'none' }}>
                {userRooms.length === 0 ? <option>Комнаты отсутствуют</option> : userRooms.map(room => (<option key={room} value={room}>💬 Чат с: {getPartnerNameInRoom(room, selectedUser)}</option>))}
              </select>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#16161f' }}>
              {loadingSpy ? (
                <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', marginTop: '30px' }}>Загрузка пакетов сообщений...</div>
              ) : spyMessages.length === 0 ? (
                <div style={{ color: '#636366', fontSize: '13px', textAlign: 'center', marginTop: '30px', fontStyle: 'italic' }}>История переписки пуста</div>
              ) : (
                spyMessages.map((msg) => {
                  const isSenderSelected = String(msg.senderId) === String(selectedUser.id);
                  const isSystem = msg.senderId === 'system'; // 🎯 Проверяем, системное ли сообщение
                  
                  const senderUserObj = usersList.find(u => String(u.id) === String(msg.senderId));
                  const senderName = senderUserObj ? senderUserObj.username : `Юзер #${msg.senderId}`;

                  // 🛡️ СЦЕНАРИЙ А: СИСТЕМНОЕ СООБЩЕНИЕ (РЕНДЕР СТРОГО ПО ЦЕНТРУ БЕЗ ПЛAШЕК)
                  if (isSystem) {
                    return (
                      <div 
                        key={msg.id} 
                        style={{ 
                          alignSelf: 'center', 
                          margin: '8px 0', 
                          padding: '6px 14px', 
                          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                          borderRadius: '10px', 
                          fontSize: '12px', 
                          color: '#9ca3af', 
                          textAlign: 'center',
                          maxWidth: '85%',
                          lineHeight: '1.4',
                          border: '1px solid rgba(255, 255, 255, 0.03)'
                        }}
                        dangerouslySetInnerHTML={{ __html: msg.text }}
                      />
                    );
                  }

                  // 👤 СЦЕНАРИЙ Б: ОБЫЧНЫЕ СООБЩЕНИЯ ПОЛЬЗОВАТЕЛЕЙ (ТВОЙ СТАРЫЙ РАБОЧИЙ РЕНДЕР)
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
                          {user.userStatus === 'administrator' && (
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '6px', 
                              backgroundColor: 'rgba(255, 69, 58, 0.1)', color: '#ff453a', 
                              padding: '4px 10px', borderRadius: '12px', fontSize: '12px', 
                              fontWeight: '600', border: '1px solid rgba(255, 69, 58, 0.15)',
                              boxShadow: '0 0 8px rgba(255, 69, 58, 0.15)'
                            }}>
                              <ShieldCheck size={14} /> Админ
                            </span>
                          )}
                          {user.userStatus === 'moderator' && (
                            <span style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '6px', 
                              backgroundColor: 'rgba(157, 123, 246, 0.1)', color: '#9d7bf6', 
                              padding: '4px 10px', borderRadius: '12px', fontSize: '12px', 
                              fontWeight: '600', border: '1px solid rgba(157, 123, 246, 0.15)',
                              boxShadow: '0 0 8px rgba(157, 123, 246, 0.15)'
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
                              padding: '4px 10px', borderRadius: '12px', fontSize: '12px',
                              border: '1px solid rgba(142, 142, 147, 0.1)'
                            }}>
                              <User size={14} /> Юзер
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleKickUser(user)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              // 🎯 ФИКС 3: Красим в тусклый цвет, если это админ, иначе — в красный
                              color: user.userStatus === 'administrator' ? '#3a3a3c' : '#ff453a', 
                              cursor: user.userStatus === 'administrator' ? 'not-allowed' : 'pointer', 
                              padding: '6px', 
                              borderRadius: '4px' 
                            }}
                            // Намертво отключаем кнопку, если в строке сидит администратор
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