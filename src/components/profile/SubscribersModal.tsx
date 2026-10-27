import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ArrowLeft, Check, Users } from 'lucide-react';
import styles from '../css/profile.module.css';
import SmartAvatar from '../common/SmartAvatar';
import { supabase } from '../../services/supabaseClient';
import useMessengerContext from '../../context/messengerContext';

interface SubscriberItem {
  id: string | number;
  uuid: string;
  name?: string;
  username?: string;
  avatarUrl?: string | null;
  avatarColor?: string;
  role?: 'owner' | 'admin' | 'member';
  online?: boolean;
  lastSeen?: string;
}

interface SubscribersModalProps {
  show: boolean;
  channelId: string | number;
  channelName: string;
  currentUserId: string;
  isOwnerOrAdmin: boolean;
  onClose: () => void;
  onSubscribersUpdated?: () => Promise<void>;
}

export const SubscribersModal: React.FC<SubscribersModalProps> = ({
  show,
  channelId,
  channelName,
  currentUserId,
  isOwnerOrAdmin,
  onClose,
  onSubscribersUpdated,
}) => {
  const ctx = useMessengerContext();
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Режим экрана: 'list' (список подписчиков) или 'add' (добавление новых)
  const [viewMode, setViewMode] = useState<'list' | 'add'>('list');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // 🔄 Загрузка подписчиков канала
  const loadSubscribers = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const { data: members, error: membersError } = await supabase
        .from('chat_members')
        .select('*')
        .eq('chatId', Number(channelId));

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        setSubscribers([]);
        return;
      }

      const userUuids = members.map((m: any) => String(m.userId));
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('uuid', userUuids);

      if (usersError) throw usersError;

      const usersMap = new Map((usersData || []).map((u: any) => [String(u.uuid || u.id), u]));

      const formatted: SubscriberItem[] = members.map((m: any) => {
        const uid = String(m.userId);
        const u = usersMap.get(uid);

        return {
          id: u?.id || uid,
          uuid: uid,
          name: u?.username || u?.name || 'Пользователь',
          username: u?.username || u?.uniqueId,
          avatarUrl: u?.avatarUrl || null,
          avatarColor: u?.avatarColor || '#5865F2',
          role: m.role || 'member',
          online: u?.status === 'online',
          lastSeen: u?.lastSeen,
        };
      });

      formatted.sort((a, b) => {
        const score = (r?: string) => (r === 'owner' ? 3 : r === 'admin' ? 2 : 1);
        return score(b.role) - score(a.role);
      });

      setSubscribers(formatted);
    } catch (err: any) {
      console.error('Ошибка при загрузке подписчиков:', err);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    if (show) {
      setViewMode('list');
      setSelectedUserIds([]);
      loadSubscribers();
    }
  }, [show, loadSubscribers]);

  // Фильтрация поиска в списке подписчиков
  const filteredSubscribers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((sub) => {
      const name = (sub.name || '').toLowerCase();
      const username = (sub.username || '').toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [subscribers, searchQuery]);

  // Список доступных контактов для добавления (исключая уже добавленных)
  const existingUuids = useMemo(() => subscribers.map((s) => String(s.uuid)), [subscribers]);

  const availableContacts = useMemo(() => {
    return (ctx.chats || []).filter((chat: any) => {
      const isDirect = !chat.isGroup && !chat.isChannel && chat.type !== 'group' && chat.type !== 'channel';
      const contactUuid = String(chat.partnerId || chat.uuid || '');
      return isDirect && contactUuid && !existingUuids.includes(contactUuid);
    });
  }, [ctx.chats, existingUuids]);

  // Удаление подписчика
  const handleRemoveSubscriber = (sub: SubscriberItem) => {
    const displayName = sub.name || sub.username || 'Пользователь';

    ctx.showConfirm?.(
      'Удалить из канала',
      `Вы действительно хотите удалить пользователя ${displayName} из канала «${channelName}»?`,
      async () => {
        try {
          setRemovingId(sub.uuid);
          const { error } = await supabase
            .from('chat_members')
            .delete()
            .eq('chatId', Number(channelId))
            .eq('userId', sub.uuid);

          if (error) throw error;

          ctx.showToast?.(`${displayName} удален(а) из канала`, 'info');
          await loadSubscribers();
          if (onSubscribersUpdated) {
            await onSubscribersUpdated();
          }
        } catch (err: any) {
          ctx.showToast?.(`Ошибка удаления: ${err.message}`, 'error');
        } finally {
          setRemovingId(null);
        }
      },
      true
    );
  };

  // Переключение выбора контакта
  const toggleContactSelection = (uuid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uuid) ? prev.filter((id) => id !== uuid) : [...prev, uuid]
    );
  };

  // Подтверждение добавления выбранных контактов
  const handleConfirmAdd = async () => {
    if (selectedUserIds.length === 0 || isAdding) return;
    setIsAdding(true);
    try {
      const nowIso = new Date().toISOString();
      const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id);

      const membersToInsert = selectedUserIds.map((uid) => ({
        chatId: Number(channelId),
        userId: String(uid),
        role: 'default',
        joinedAt: nowIso,
      }));

      const { error } = await supabase.from('chat_members').insert(membersToInsert);
      if (error) throw error;

      ctx.showToast?.(`Добавлено участников: ${selectedUserIds.length}`, 'success');
      setViewMode('list');
      setSelectedUserIds([]);
      await loadSubscribers();
      if (onSubscribersUpdated) {
        await onSubscribersUpdated();
      }
    } catch (err: any) {
      console.error('Ошибка добавления участников:', err);
      ctx.showToast?.(`Не удалось добавить участников: ${err.message}`, 'error');
    } finally {
      setIsAdding(false);
    }
  };

  if (!show) return null;

  return createPortal(
    <div
      className={styles['modal-overlay']}
      onClick={onClose}
      style={{ zIndex: 1000000 }}
    >
      <div
        className={styles['profile-modal-card']}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '380px',
          height: '620px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1c1c24',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        {/* ======================================================== */}
        {/* РЕЖИМ 1: СПИСОК ПОДПИСЧИКОВ                             */}
        {/* ======================================================== */}
        {viewMode === 'list' && (
          <>
            {/* ШАПКА И ПОИСК */}
            <div style={{ padding: '20px 20px 14px 20px', flexShrink: 0 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                Подписчики
              </h3>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: '#16161d',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  border: '1px solid #2b2b36',
                }}
              >
                <Search size={16} color="#707579" />
                <input
                  type="text"
                  placeholder="Поиск"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#ffffff',
                    fontSize: '14px',
                  }}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* СПИСОК ПОДПИСЧИКОВ */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '4px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              {loading ? (
                <div style={{ textAlign: 'center', color: '#707579', fontSize: '13px', padding: '40px 10px' }}>
                  Загрузка подписчиков...
                </div>
              ) : filteredSubscribers.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#707579', fontSize: '13px', padding: '40px 10px' }}>
                  Подписчики не найдены
                </div>
              ) : (
                filteredSubscribers.map((sub) => {
                  const isMe = String(sub.uuid) === String(currentUserId);
                  const isOwner = sub.role === 'owner';
                  const isAdmin = sub.role === 'admin';
                  const canRemove = isOwnerOrAdmin && !isOwner && !isMe;

                  return (
                    <div
                      key={sub.uuid}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <SmartAvatar
                          size={42}
                          avatarUrl={sub.avatarUrl}
                          avatarColor={sub.avatarColor || '#5865F2'}
                          name={sub.name || sub.username || 'User'}
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span
                            style={{
                              color: '#ffffff',
                              fontSize: '14px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {sub.name || sub.username || 'Пользователь'}
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              color: sub.online ? '#8374be' : '#707579',
                              fontWeight: sub.online ? 500 : 400,
                              marginTop: '2px',
                            }}
                          >
                            {sub.online ? 'в сети' : sub.lastSeen || 'был(а) недавно'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        {canRemove && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSubscriber(sub)}
                            disabled={removingId === sub.uuid}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#8b84f7',
                              fontSize: '13px',
                              cursor: 'pointer',
                              padding: 0,
                              fontWeight: 500,
                            }}
                          >
                            {removingId === sub.uuid ? '...' : 'Удалить'}
                          </button>
                        )}

                        {isOwner && (
                          <span
                            style={{
                              fontSize: '11px',
                              backgroundColor: '#272138',
                              color: '#a78bfa',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontWeight: 500,
                            }}
                          >
                            владелец
                          </span>
                        )}

                        {isAdmin && (
                          <span
                            style={{
                              fontSize: '11px',
                              backgroundColor: '#172822',
                              color: '#34c759',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontWeight: 500,
                            }}
                          >
                            админ
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ПОДВАЛ */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderTop: '1px solid #282933',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('add')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8b84f7',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Добавить пользователей
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8b84f7',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Закрыть
              </button>
            </div>
          </>
        )}

        {/* ======================================================== */}
        {/* РЕЖИМ 2: ВЫБОР КОНТАКТОВ ДЛЯ ДОБАВЛЕНИЯ                 */}
        {/* ======================================================== */}
        {viewMode === 'add' && (
          <>
            {/* ШАПКА ВЫБОРА КОНТАКТОВ */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '18px 20px 14px 20px',
                borderBottom: '1px solid #282933',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8b84f7',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
              >
                <ArrowLeft size={20} />
              </button>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                Добавить в канал ({selectedUserIds.length})
              </h3>
            </div>

            {/* СПИСОК ДОСТУПНЫХ КОНТАКТОВ */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              {availableContacts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#707579', fontSize: '13px', padding: '40px 10px' }}>
                  Все ваши доступные собеседники уже подписаны на этот канал
                </div>
              ) : (
                availableContacts.map((chat: any) => {
                  const targetUuid = String(chat.partnerId || chat.uuid || chat.id);
                  const isChecked = selectedUserIds.includes(targetUuid);
                  const displayName = chat.name || chat.username || 'Пользователь';

                  return (
                    <div
                      key={targetUuid}
                      onClick={() => toggleContactSelection(targetUuid)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: isChecked ? 'rgba(139, 132, 247, 0.08)' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isChecked) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <SmartAvatar
                          size={38}
                          avatarUrl={chat.avatarUrl}
                          avatarColor={chat.avatarColor || '#5865F2'}
                          name={displayName}
                        />
                        <span style={{ color: isChecked ? '#fff' : '#dbdee1', fontSize: '14px', fontWeight: isChecked ? 600 : 500 }}>
                          {displayName}
                        </span>
                      </div>

                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: isChecked ? 'none' : '2px solid #3a3a3c',
                          backgroundColor: isChecked ? '#8b84f7' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ПОДВАЛ ДОБАВЛЕНИЯ */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '16px',
                padding: '14px 20px',
                borderTop: '1px solid #282933',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8e8e93',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Отмена
              </button>

              <button
                type="button"
                disabled={selectedUserIds.length === 0 || isAdding}
                onClick={handleConfirmAdd}
                style={{
                  background: 'none',
                  border: 'none',
                  color: selectedUserIds.length === 0 || isAdding ? '#4d4a65' : '#8b84f7',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: selectedUserIds.length === 0 || isAdding ? 'not-allowed' : 'pointer',
                  transition: 'color 0.15s ease',
                }}
              >
                {isAdding ? 'Добавление...' : 'Добавить'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};