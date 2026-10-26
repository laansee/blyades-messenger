import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import useMessengerContext from '../../context/messengerContext';
import { Phone, PhoneMissed, PhoneIncoming, PhoneOutgoing, Users, Trash2, X } from 'lucide-react';
import styles from '../../components/css/calls.module.css';

interface CallsHistoryModalProps {
  show: boolean;
  onClose: () => void;
}

export default function CallsHistoryModal({ show, onClose }: CallsHistoryModalProps) {
  const ctx = useMessengerContext();
  const [history, setHistory] = useState<any[]>([]);

  const myIdStr = String(ctx.currentUser?.id || '');
  const myUuidStr = String(ctx.currentUser?.uuid || '');

  const loadHistory = async () => {
    if (!ctx.currentUser) return;

    const { data } = await supabase
      .from('calls')
      .select('*')
      .or(`callerId.eq.${myIdStr},receiverId.eq.${myIdStr},receiverId.eq.${myUuidStr},roomName.ilike.call_group_%`)
      .order('createdAt', { ascending: false })
      .limit(50);

    if (data) setHistory(data);
  };

  useEffect(() => {
    if (show) loadHistory();
  }, [show, ctx.currentUser]);

  const handleDeleteCallRecord = async (e: React.MouseEvent, callId: number) => {
    e.stopPropagation();
    ctx.showConfirm(
      'Удаление записи',
      'Удалить эту запись из истории звонков?',
      async () => {
        await supabase.from('calls').delete().eq('id', callId);
        setHistory(prev => prev.filter(c => c.id !== callId));
        ctx.showToast('Запись удалена', 'info');
      },
      true
    );
  };

  if (!show) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={`${styles.modalCard} ${styles.historyModalCard}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Недавние звонки</h3>
          <button type="button" onClick={onClose} className={styles.modalCloseBtn}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.historyList}>
          {history.length === 0 ? (
            <div className={styles.historyEmpty}>История звонков пуста</div>
          ) : (
            history.map((call) => {
              const isGroup = String(call.roomName).startsWith('call_group_') || String(call.receiverId).startsWith('group_');
              const isOutgoing = String(call.callerId) === myIdStr || String(call.callerId) === myUuidStr;
              const isMissed = !isOutgoing && call.status !== 'accepted';

              // Определяем ID и карточку собеседника / группы
              let displayName = 'Звонок';
              let avatarColor = '#5865F2';
              let partnerTargetId: string = '';

              if (isGroup) {
                const groupId = call.roomName.replace('call_group_', '').replace('group_', '') || call.receiverId.replace('group_', '');
                const groupChat = (ctx.chats || []).find((c: any) => String(c.id) === String(groupId));
                displayName = groupChat?.name || `Группа #${groupId}`;
                avatarColor = groupChat?.avatarColor || '#2ec761';
                partnerTargetId = `group_${groupId}`;
              } else {
                const partnerId = isOutgoing ? call.receiverId : call.callerId;
                partnerTargetId = String(partnerId);

                const foundChat = (ctx.chats || []).find(
                  (c: any) => String(c.partnerId) === String(partnerId) || String(c.id) === String(partnerId)
                );
                displayName = foundChat?.name || foundChat?.username || `Пользователь #${partnerId}`;
                avatarColor = foundChat?.avatarColor || '#007aff';
              }

              const formattedTime = new Date(call.createdAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={call.id}
                  className={styles.historyRow}
                  onClick={() => {
                    onClose();
                    ctx.handleStartAudioCall(partnerTargetId, { isGroup });
                  }}
                >
                  <div className={styles.historyMeta}>
                    <div className={styles.historyIconCircle} style={{ backgroundColor: '#23232c' }}>
                      {isGroup ? (
                        <Users size={18} color="#2ec761" />
                      ) : isMissed ? (
                        <PhoneMissed size={18} color="#ff453a" />
                      ) : isOutgoing ? (
                        <PhoneOutgoing size={18} color="#007aff" />
                      ) : (
                        <PhoneIncoming size={18} color="#34c759" />
                      )}
                    </div>
                    <div>
                      <div className={styles.historyRoomName}>{displayName}</div>
                      <div className={styles.historyDate}>
                        {isGroup ? 'Групповой звонок' : isMissed ? 'Пропущенный' : isOutgoing ? 'Исходящий' : 'Входящий'} • {formattedTime}
                      </div>
                    </div>
                  </div>

                  <div className={styles.historyActions}>
                    <button
                      type="button"
                      title="Перезвонить"
                      className={styles.historyCallbackBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        ctx.handleStartAudioCall(partnerTargetId, { isGroup });
                      }}
                    >
                      <Phone size={18} />
                    </button>

                    <button
                      type="button"
                      title="Удалить из истории"
                      className={styles.historyDeleteBtn}
                      onClick={(e) => handleDeleteCallRecord(e, call.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}