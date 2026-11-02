import React from 'react';
import styles from '../../../components/css/sidebar.module.css';
import { Check, CheckCheck, Clock, Pin, Users, Megaphone } from 'lucide-react';
import SmartAvatar from '../../../components/common/SmartAvatar';
import { renderUserStatusBadge } from '../../../utils/statusBadge';

interface ChatCardProps {
  chat: any;
  isSelected: boolean;
  currentUserIdStr: string;
  isUserOnline: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  resolveSenderName: (senderId: string) => string | null;
  formatText: (text: string | undefined) => string;
  formatTime: (timeIso: string | undefined) => string;
}

export const ChatCard: React.FC<ChatCardProps> = ({
  chat,
  isSelected,
  currentUserIdStr,
  isUserOnline,
  onSelect,
  onContextMenu,
  resolveSenderName,
  formatText,
  formatTime
}) => {
  const isGroup = Boolean(chat.isGroup || chat.type === 'group' || String(chat.id).startsWith('group_'));
  const isChannel = Boolean(chat.isChannel || chat.type === 'channel');
  
  const hasLastMessage = chat.lastMessageId != null || chat.lastMessageAt != null;
  const lastMessage = hasLastMessage
    ? {
        id: chat.lastMessageId,
        text: chat.lastMessageText ?? '',
        senderId: chat.lastMessageSenderUUID || chat.lastMessageSenderId,
        createdAt: chat.lastMessageAt,
      }
    : null;

  const senderIdStr = String(lastMessage?.senderId || '');
  const isMyLast = senderIdStr && senderIdStr === currentUserIdStr;
  const unreadCount = Number(chat.unreadCount ?? 0);

  // 🎯 Проверка на системное сообщение (устраняет ложную приписку «Участник:»)
  const isSystemMessage = 
    senderIdStr === 'system' || 
    senderIdStr === '00000000-0000-0000-0000-000000000000' || 
    !senderIdStr;

  const otherSenderName = (!isMyLast && !isSystemMessage && isGroup && senderIdStr)
    ? resolveSenderName(senderIdStr)
    : null;

  return (
    <div 
      className={`${styles['chat-preview-card']} ${isSelected ? styles.active : ''}`} 
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      <div className={styles['avatar-wrapper']}>
        <SmartAvatar
          size={48}
          avatarUrl={chat.avatarUrl}
          avatarColor={chat.avatarColor}
          name={chat.name || chat.username}
          isChannel={isChannel}
          showOnline={isUserOnline}
        />
      </div>

      <div className={styles['chat-info']}>
        <div className={styles['chat-meta']}>
          <span 
            className={styles['chat-name']} 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              minWidth: 0,
              overflow: 'hidden'
            }}
          >
            {isChannel && (
              <Megaphone size={15} color="#8e8e93" style={{ flexShrink: 0, opacity: 0.85 }} />
            )}
            {!isChannel && isGroup && (
              <Users size={15} color="#8e8e93" style={{ flexShrink: 0, opacity: 0.85 }} />
            )}
            {renderUserStatusBadge(chat)}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {chat.name}
            </span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {isMyLast && (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                {chat.lastMessageStatus === 'sending' ? (
                  <Clock size={12} style={{ color: '#8e8e93' }} />
                ) : chat.lastMessageStatus === 'read' ? (
                  <CheckCheck size={14} style={{ color: '#8e8e93' }} />
                ) : (
                  <Check size={14} style={{ color: '#8e8e93' }} />
                )}
              </span>
            )}

            <span className={styles['chat-time']}>
              {formatTime(lastMessage?.createdAt)}
            </span>
          </div>
        </div>
        
        <div className={styles['chat-last-message']}>
          <p style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: unreadCount > 0 ? '75%' : '85%' }}>
            {!isSystemMessage && isMyLast ? (
              <span style={{ color: '#007aff', fontWeight: 'bold' }}>Вы: </span>
            ) : otherSenderName ? (
              <span style={{ color: '#8e8e93', fontWeight: 500 }}>{otherSenderName}: </span>
            ) : null}
            {formatText(lastMessage?.text)}
          </p>
          
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {unreadCount > 0 ? (
              <div style={{
                minWidth: '18px', height: '18px', borderRadius: '10px',
                backgroundColor: '#007aff', color: '#fff', fontSize: '11px', fontWeight: 'bold',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px'
              }}>
                {unreadCount}
              </div>
            ) : chat.isPinned && String(chat.id) !== '1' && (
              <Pin size={13} style={{ color: '#8e8e93', transform: 'rotate(45deg)' }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};