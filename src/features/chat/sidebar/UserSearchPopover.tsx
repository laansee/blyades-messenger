import React, { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import SmartAvatar from '../../../components/common/SmartAvatar';
import { formatUserOnlineStatus } from '../../../context/messengerContext';

interface UserSearchPopoverProps {
  show: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  usersList: any[];
  resolveSender: (senderId: string) => any;
  onSelectUser: (user: any) => void;
  onClose: () => void;
}

export const UserSearchPopover: React.FC<UserSearchPopoverProps> = ({
  show,
  searchQuery,
  onSearchChange,
  usersList,
  resolveSender,
  onSelectUser,
  onClose
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // 🎯 Закрытие при клике вне зоны поповера
  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Слушаем с небольшой задержкой, чтобы клик открытия не триггерил закрытие
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div 
      ref={popoverRef}
      style={{
        position: 'absolute', top: '56px', left: '16px', right: '16px', zIndex: 1200,
        backgroundColor: '#21212b', border: '1px solid #2f2f3d', borderRadius: '12px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.65)', display: 'flex', flexDirection: 'column',
        maxHeight: '460px', overflow: 'hidden'
      }}
    >
      <div style={{ padding: '16px 16px 10px 16px', fontSize: '16px', fontWeight: 600, color: '#fff' }}>
        Показать сообщения от
      </div>

      <div style={{ padding: '0 16px 10px 16px', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '26px', top: '10px', color: '#8e8e93' }} />
        <input
          type="text"
          placeholder="Поиск"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          style={{
            width: '100%', backgroundColor: '#181820', border: '1px solid #2c2c38',
            borderRadius: '8px', padding: '8px 12px 8px 34px', color: '#fff', fontSize: '14px', outline: 'none'
          }}
          autoFocus
        />
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '0 8px' }}>
        {usersList.map((u: any) => {
          const senderData = resolveSender(u.uuid || u.id);
          const status = formatUserOnlineStatus(u.updatedAt, u.privacyOnline);

          return (
            <div
              key={u.uuid || u.id}
              onClick={() => onSelectUser(u)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 10px',
                borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2c2c3a'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <SmartAvatar size={40} avatarUrl={senderData.avatarUrl} avatarColor={senderData.avatarColor} name={senderData.name} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>{senderData.name}</span>
                <span style={{ fontSize: '12px', color: status.isOnline ? '#007aff' : '#8e8e93' }}>
                  {status.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #2b2b38' }}>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#8774e1', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
        >
          Отмена
        </button>
      </div>
    </div>
  );
};