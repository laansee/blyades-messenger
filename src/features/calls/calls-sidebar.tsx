import React, { useState } from 'react';
import { Phone, PhoneMissed, PhoneIncoming, PhoneOutgoing, Search } from 'lucide-react';
import useMessengerContext from '../../context/messengerContext';

export default function CallsSidebar({ callsHistory }: { callsHistory: any[] }) {
  const ctx = useMessengerContext();
  const [searchQuery, setSearchQuery] = useState('');

  const myIdStr = String(ctx.currentUser?.id);
  const activeHistory = callsHistory || [];

  // Функция красивого вывода даты звонка по часовому поясу устройства
  const formatCallDate = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Формируем чистый список вызовов с именами для фильтрации
  const preparedCalls = activeHistory.map(call => {
    const isOutgoing = String(call.callerId) === myIdStr;
    const partnerId = isOutgoing ? call.receiverId : call.callerId;
    const partnerUser = ctx.chats?.find((c: any) => String(c.id) === String(partnerId));
    const partnerName = partnerUser?.name || partnerUser?.username || `Пользователь #${partnerId}`;

    let callType = 'incoming';
    if (isOutgoing) {
      callType = 'outgoing';
    } else if (call.status === 'rejected' || call.status === 'ringing') {
      callType = 'missed';
    }

    return {
      ...call,
      partnerId,
      name: partnerName,
      type: callType,
      avatarColor: partnerUser?.avatarColor || '#7a7aff'
    };
  });

  // Фильтруем историю звонков по инпуту поиска
  const filteredCalls = preparedCalls.filter(call => 
    call.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ width: '350px', height: '100%', borderRight: '1px solid #1c1c24', display: 'flex', flexDirection: 'column', backgroundColor: '#13131a', flexShrink: 0 }}>
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>Звонки</h1>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#636366' }} />
          <input 
            type="text" 
            placeholder="Поиск звонков..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 38px', backgroundColor: '#1c1c24', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {filteredCalls.length === 0 ? (
          <div style={{ color: '#636366', textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>История звонков пуста</div>
        ) : (
          filteredCalls.map(call => (
            <div 
              key={call.id} 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s', marginBottom: '4px' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1c1c24'} 
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              onClick={() => ctx.handleStartAudioCall(call.partnerId)}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: call.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '16px', flexShrink: 0 }}>
                {call.name.substring(0, 1).toUpperCase()}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{call.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  {call.type === 'missed' && <PhoneMissed size={14} style={{ color: '#ff453a' }} />}
                  {call.type === 'incoming' && <PhoneIncoming size={14} style={{ color: '#34c759' }} />}
                  {call.type === 'outgoing' && <PhoneOutgoing size={14} style={{ color: '#007aff' }} />}
                  <span style={{ color: '#8e8e93', fontSize: '13px' }}>
                    {formatCallDate(call.createdAt)}
                  </span>
                </div>
              </div>

              <button 
                type="button"
                style={{ border: 'none', background: 'transparent', color: '#007aff', cursor: 'pointer', padding: '8px', borderRadius: '50%', flexShrink: 0 }}
              >
                <Phone size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
