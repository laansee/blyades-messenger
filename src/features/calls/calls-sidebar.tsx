import React, { useState } from 'react';
import { Phone, PhoneMissed, PhoneIncoming, PhoneOutgoing, Search } from 'lucide-react';
import useMessengerContext from '../../context/messengerContext';
import styles from '../../components/css/sidebar.module.css'; 
// 🚀 Импортируем наш готовый компонент контекстного меню
import ContextMenu from '../../components/context-menu'; 
import { supabase } from '../../services/supabaseClient';

export default function CallsSidebar({ callsHistory }: { callsHistory: any[] }) {
  const ctx = useMessengerContext();
  const [searchQuery, setSearchQuery] = useState('');

  const myIdStr = String(ctx.currentUser?.id);
  const activeHistory = callsHistory || [];

  function formatCallTimeOrDate(isoString: string | undefined): string {
    if (!isoString) return '';
    try {
      const msgDate = new Date(isoString);
      const today = new Date();
      const isToday = msgDate.getDate() === today.getDate() &&
                      msgDate.getMonth() === today.getMonth() &&
                      msgDate.getFullYear() === today.getFullYear();
                      
      if (isToday) {
        const hours = String(msgDate.getHours()).padStart(2, '0');
        const minutes = String(msgDate.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      } else {
        const day = String(msgDate.getDate()).padStart(2, '0');
        const month = String(msgDate.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}`;
      }
    } catch (e) {
      return '';
    }
  }

  const preparedCalls = activeHistory.map(call => {
    const isOutgoing = String(call.callerId) === myIdStr;
    const partnerId = isOutgoing ? call.receiverId : call.callerId;
    const partnerUser = ctx.chats?.find((c: any) => String(c.id) === String(partnerId));
    const partnerName = partnerUser?.name || partnerUser?.username || `Пользователь #${partnerId}`;

    let callType = 'incoming';
    let statusText = 'Входящий звонок';
    if (isOutgoing) {
      callType = 'outgoing';
      statusText = 'Исходящий звонок';
    } else if (call.status === 'rejected' || call.status === 'ringing') {
      callType = 'missed';
      statusText = 'Пропущенный звонок';
    }

    return {
      ...call,
      partnerId,
      name: partnerName,
      type: callType,
      statusText: statusText,
      avatarColor: partnerUser?.avatarColor || '#7a7aff'
    };
  });

  const filteredCalls = preparedCalls.filter(call => 
    call.name.toLowerCase().includes(searchQuery.toLowerCase() || ctx.searchQuery.toLowerCase())
  );

  return (
    <section className={styles['chats-sidebar']}>
      <div className={styles['sidebar-header']}>
        <h2>Звонки</h2>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} className={styles['sidebar-search-icon']}/>
          <input 
            type="search" 
            id='calls-search'
            placeholder="Поиск по звонкам..." 
            className={styles['chat-search']} 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      <div className={styles['chats-list']}>
        {filteredCalls.length === 0 ? (
          <div style={{ color: '#636366', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>
            История звонков пуста
          </div>
        ) : (
          filteredCalls.map(call => {
            const isCardActive = ctx.currentCall && String(ctx.currentCall.roomName) === call.roomName;

            return (
              <div 
                key={call.id} 
                className={`${styles['chat-preview-card']} ${isCardActive ? styles.active : ''}`} 
                onClick={() => ctx.handleStartAudioCall(call.partnerId)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  ctx.setCtxMenu({
                    show: true,
                    x: e.clientX,
                    y: e.clientY,
                    items: [
                      { 
                        label: 'Перезвонить', 
                        icon: '📞', 
                        onClick: () => ctx.handleStartAudioCall(call.partnerId) 
                      },
                      { isDivider: true } as any,
                      { 
                        label: 'Удалить из истории', 
                        icon: '🗑️', 
                        isDanger: true, 
                        onClick: () => {
                          ctx.showConfirm(
                            'Удаление записи', 
                            'Вы действительно хотите удалить эту запись из истории звонков?', 
                            async () => {
                              // Удаляем конкретную строку звонка из базы по ID
                              await supabase.from('calls').delete().eq('id', call.id);
                              ctx.setConfirm((prev: any) => ({ ...prev, show: false }));
                              ctx.showToast('Запись удалена', 'success');
                            }, 
                            true
                          );
                        }
                      }
                    ]
                  });
                }}
              >
                <div className={styles['avatar-wrapper']}>
                  <div className={styles['chat-avatar']} style={{ backgroundColor: call.avatarColor }}>
                    {call.name.substring(0, 1).toUpperCase()}
                  </div>
                </div>

                <div className={styles['chat-info']}>
                  <div className={styles['chat-meta']}>
                    <span className={styles['chat-name']}>{call.name}</span>
                    <span className={styles['chat-time']}>
                      {formatCallTimeOrDate(call.createdAt)}
                    </span>
                  </div>
                  
                  <div className={styles['chat-last-message']}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {call.type === 'missed' && <PhoneMissed size={14} style={{ color: '#ff453a', flexShrink: 0 }} />}
                      {call.type === 'incoming' && <PhoneIncoming size={14} style={{ color: '#34c759', flexShrink: 0 }} />}
                      {call.type === 'outgoing' && <PhoneOutgoing size={14} style={{ color: '#007aff', flexShrink: 0 }} />}
                      <span>{call.statusText}</span>
                    </p>
                    
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', color: '#8e8e93' }}>
                      <Phone size={14} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 🚀 Отрендерили скрытый инстанс меню — он будет всплывать ровно в координатах клика e.clientX/Y */}
      <ContextMenu 
        show={ctx.ctxMenu.show} 
        x={ctx.ctxMenu.x} 
        y={ctx.ctxMenu.y} 
        onClose={ctx.closeContextMenu} 
        items={ctx.ctxMenu.items} 
      />
    </section>
  );
}
