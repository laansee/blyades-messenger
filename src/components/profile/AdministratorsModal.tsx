import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ArrowLeft, ShieldCheck } from 'lucide-react';
import styles from '../css/profile.module.css';
import SmartAvatar from '../common/SmartAvatar';
import { supabase } from '../../services/supabaseClient';
import useMessengerContext from '../../context/messengerContext';

interface AdminItem {
  id: string | number;
  uuid: string;
  name?: string;
  username?: string;
  avatarUrl?: string | null;
  avatarColor?: string;
  role: 'owner' | 'admin' | 'member';
  online?: boolean;
  promotedBy?: string;
}

interface AdministratorsModalProps {
  show: boolean;
  channelId: string | number;
  channelName: string;
  currentUserId: string;
  isOwner: boolean;
  onClose: () => void;
  onAdminsUpdated?: () => Promise<void>;
}

export const AdministratorsModal: React.FC<AdministratorsModalProps> = ({
  show,
  channelId,
  channelName,
  currentUserId,
  isOwner,
  onClose,
  onAdminsUpdated,
}) => {
  const ctx = useMessengerContext();
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [candidates, setCandidates] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string>('');

  const [viewMode, setViewMode] = useState<'list' | 'add'>('list');

  const loadAdminsAndCandidates = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const { data: members, error: membersError } = await supabase
        .from('chat_members')
        .select('*')
        .eq('chatId', Number(channelId));

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        setAdmins([]);
        setCandidates([]);
        return;
      }

      const userUuids = members.map((m: any) => String(m.userId));
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('uuid', userUuids);

      if (usersError) throw usersError;

      const usersMap = new Map((usersData || []).map((u: any) => [String(u.uuid || u.id), u]));

      // Находим имя владельца
      const ownerMember = members.find((m: any) => m.role === 'owner');
      const ownerUser = ownerMember ? usersMap.get(String(ownerMember.userId)) : null;
      const detectedOwnerName = ownerUser?.username || ownerUser?.name || 'владелец';
      setOwnerName(detectedOwnerName);

      const adminList: AdminItem[] = [];
      const candidateList: AdminItem[] = [];

      members.forEach((m: any) => {
        const uid = String(m.userId);
        const u = usersMap.get(uid);

        const item: AdminItem = {
          id: u?.id || uid,
          uuid: uid,
          name: u?.username || u?.name || 'Пользователь',
          username: u?.username || u?.uniqueId,
          avatarUrl: u?.avatarUrl || null,
          avatarColor: u?.avatarColor || '#5865F2',
          role: m.role || 'member',
          online: u?.status === 'online',
          promotedBy: m.role === 'owner' ? 'Владелец' : `Назначил(а) ${detectedOwnerName}`,
        };

        if (m.role === 'owner' || m.role === 'admin') {
          adminList.push(item);
        } else {
          candidateList.push(item);
        }
      });

      adminList.sort((a, b) => {
        if (a.role === 'owner') return -1;
        if (b.role === 'owner') return 1;
        return (a.name || '').localeCompare(b.name || '');
      });

      setAdmins(adminList);
      setCandidates(candidateList);
    } catch (err: any) {
      console.error('Ошибка при загрузке администраторов:', err);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    if (show) {
      setViewMode('list');
      setSearchQuery('');
      loadAdminsAndCandidates();
    }
  }, [show, loadAdminsAndCandidates]);

  const currentList = viewMode === 'list' ? admins : candidates;
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentList;
    return currentList.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const username = (item.username || '').toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [currentList, searchQuery]);

  const handleDemoteAdmin = (admin: AdminItem) => {
    const displayName = admin.name || admin.username || 'Пользователь';

    ctx.showConfirm?.(
      'Разжаловать администратора',
      `Снять полномочия администратора с пользователя ${displayName}?`,
      async () => {
        try {
          setProcessingId(admin.uuid);
          const { error } = await supabase
            .from('chat_members')
            .update({ role: 'default' })
            .eq('chatId', Number(channelId))
            .eq('userId', admin.uuid);

          if (error) throw error;

          ctx.showToast?.(`${displayName} больше не администратор`, 'info');
          await loadAdminsAndCandidates();
          if (onAdminsUpdated) {
            await onAdminsUpdated();
          }
        } catch (err: any) {
          ctx.showToast?.(`Ошибка: ${err.message}`, 'error');
        } finally {
          setProcessingId(null);
        }
      },
      true
    );
  };

  const handlePromoteToAdmin = async (candidate: AdminItem) => {
    const displayName = candidate.name || candidate.username || 'Пользователь';
    try {
      setProcessingId(candidate.uuid);
      const { error } = await supabase
        .from('chat_members')
        .update({ role: 'admin' })
        .eq('chatId', Number(channelId))
        .eq('userId', candidate.uuid);

      if (error) throw error;

      ctx.showToast?.(`${displayName} назначен(а) администратором! 🛡️`, 'success');
      setViewMode('list');
      setSearchQuery('');
      await loadAdminsAndCandidates();
      if (onAdminsUpdated) {
        await onAdminsUpdated();
      }
    } catch (err: any) {
      ctx.showToast?.(`Ошибка: ${err.message}`, 'error');
    } finally {
      setProcessingId(null);
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
        {/* 1. РЕЖИМ СПИСКА АДМИНИСТРАТОРОВ                          */}
        {/* ======================================================== */}
        {viewMode === 'list' && (
          <>
            <div style={{ padding: '20px 20px 14px 20px', flexShrink: 0 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                Администраторы
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

            {/* СПИСОК АДМИНИСТРАТОРОВ */}
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
                  Загрузка администраторов...
                </div>
              ) : filteredList.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#707579', fontSize: '13px', padding: '40px 10px' }}>
                  Администраторы не найдены
                </div>
              ) : (
                filteredList.map((admin) => {
                  const isOwnerItem = admin.role === 'owner';
                  const isMe = String(admin.uuid) === String(currentUserId);
                  const canDemote = isOwner && !isOwnerItem && !isMe;

                  return (
                    <div
                      key={admin.uuid}
                      onClick={() => {
                        if (canDemote) handleDemoteAdmin(admin);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        cursor: canDemote ? 'pointer' : 'default',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (canDemote) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        if (canDemote) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <SmartAvatar
                          size={42}
                          avatarUrl={admin.avatarUrl}
                          avatarColor={admin.avatarColor || '#5865F2'}
                          name={admin.name || admin.username || 'User'}
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
                            {admin.name || admin.username || 'Пользователь'}
                          </span>
                          {/* 🎯 Текст источника полномочий (как в референсе) */}
                          <span
                            style={{
                              fontSize: '12px',
                              color: '#707579',
                              marginTop: '2px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {admin.promotedBy}
                          </span>
                        </div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        {isOwnerItem ? (
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
                        ) : (
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
                onClick={() => {
                  setViewMode('add');
                  setSearchQuery('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8b84f7',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Добавить администратора
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
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Закрыть
              </button>
            </div>
          </>
        )}

        {/* ======================================================== */}
        {/* 2. РЕЖИМ НАЗНАЧЕНИЯ АДМИНИСТРАТОРА                      */}
        {/* ======================================================== */}
        {viewMode === 'add' && (
          <>
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
                onClick={() => {
                  setViewMode('list');
                  setSearchQuery('');
                }}
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
                Назначить админа
              </h3>
            </div>

            <div style={{ padding: '12px 20px 6px 20px', flexShrink: 0 }}>
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
                  placeholder="Поиск среди подписчиков"
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

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              {filteredList.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#707579', fontSize: '13px', padding: '40px 10px' }}>
                  Нет доступных подписчиков для назначения
                </div>
              ) : (
                filteredList.map((cand) => (
                  <div
                    key={cand.uuid}
                    onClick={() => handlePromoteToAdmin(cand)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      cursor: processingId === cand.uuid ? 'wait' : 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <SmartAvatar
                        size={38}
                        avatarUrl={cand.avatarUrl}
                        avatarColor={cand.avatarColor || '#5865F2'}
                        name={cand.name || cand.username || 'User'}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
                          {cand.name || cand.username || 'Пользователь'}
                        </span>
                        <span style={{ fontSize: '12px', color: '#707579', marginTop: '2px' }}>
                          {cand.online ? 'в сети' : 'был(а) недавно'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={processingId === cand.uuid}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#8b84f7',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {processingId === cand.uuid ? '...' : '+ Назначить'}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '14px 20px',
                borderTop: '1px solid #282933',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setViewMode('list');
                  setSearchQuery('');
                }}
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
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};