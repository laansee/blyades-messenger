import { formatUserOnlineStatus } from '../../context/messengerContext';
import styles from '../css/profile.module.css';
import { renderUserStatusBadge } from '../../utils/statusBadge';
import { userService } from '../../services/userService';
import CreateContactModal from '../modals/CreateContactModal';
import { X, Copy, Hash, Plus, Settings, MessagesCircle, Bell, BellRing, BellOff, Phone } from 'lucide-react';
import SmartAvatar from '../common/SmartAvatar';

interface UserProfileViewProps {
  currentChatUser: any;
  baseName: string;
  shouldShowField: (setting: string | undefined, isContact: boolean) => boolean;
  onStartCall: () => void;
  onEditToggle: () => void;
  onClose: () => void;
  ctx: any;
}

// Хелпер для читаемого форматирования разницы времени без слипания
function formatExactDiff(updatedAt: string | undefined): string {
  if (!updatedAt) return '∞';
  const diffMs = new Date().getTime() - new Date(updatedAt).getTime();
  if (diffMs < 0) return 'только что';

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} дн.`);
  if (hours > 0 || days > 0) parts.push(`${hours} ч.`);
  if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins} мин.`);
  parts.push(`${secs} сек. назад`);

  return parts.join(' ');
}

export default function UserProfileView({
  currentChatUser,
  baseName,
  shouldShowField,
  onStartCall,
  onEditToggle,
  onClose,
  ctx
}: UserProfileViewProps) {
  if (!currentChatUser) return null;
  
  // ID собеседника: гарантируем получение валидного UUID
  const partnerIdentifier = String(
    currentChatUser.partnerId || currentChatUser.uuid || currentChatUser.id || ''
  );

  // 🎯 Проверяем: сохранён ли пользователь в контактах на самом деле
  const savedContact = (ctx.contacts || []).find((c: any) => 
    String(c.contactId || c.partnerId || c.uuid || c.id) === partnerIdentifier
  );
  const isContact = Boolean(savedContact || currentChatUser.isContact);

  // Идентификатор чата в базе данных (если чата ещё нет — пишем «ещё не создан»)
  const activeChatNumericId = currentChatUser.chatId || currentChatUser.internalChatId || (currentChatUser.type ? currentChatUser.id : 'ещё не создан');
  const activeChatUniqueKey = currentChatUser.uniqueId || (activeChatNumericId !== 'ещё не создан' ? `chat_${activeChatNumericId}` : 'none');

  const isOnline = ctx.isUserOnline ? ctx.isUserOnline(currentChatUser) : false;
  const statusInfo = formatUserOnlineStatus(currentChatUser?.updatedAt, currentChatUser?.privacyOnline);

  const myIdDisplay = currentChatUser.id ? `#${currentChatUser.id}` : currentChatUser.uuid?.slice(0, 8);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    ctx.showToast?.(`${label} скопирован в буфер`, 'success');
  };

  return (
    <div className={styles['view-mode']}>
      <div className={styles['profile-header-gradient']}>
        <div className={styles['profile-header-actions']}>
          <button
            type="button"
            onClick={onClose}
            title="Закрыть"
            className={styles['close-modal-btn']}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles['profile-avatar-wrapper']}>
          <SmartAvatar
            size={84}
            avatarUrl={currentChatUser.avatarUrl}
            avatarColor={currentChatUser.avatarColor}
            name={baseName}
            isChannel={false}
          />
        </div>

        <h2 className={styles['profile-name']}>
          {renderUserStatusBadge(currentChatUser)}
          {baseName}
        </h2>

        <span className={`${styles['profile-status']} ${isOnline ? styles['online'] : ''}`}>
          {isOnline ? 'в сети' : statusInfo.text}
        </span>

        <div className={styles['action-buttons-row']}>
          <button 
            type="button" 
            className={styles['action-btn']} 
            onClick={async () => { 
              if (ctx.openOrCreateDirectChat) {
                await ctx.openOrCreateDirectChat({
                  ...currentChatUser,
                  partnerId: partnerIdentifier,
                  uuid: partnerIdentifier
                });
              }
              onClose(); 
            }}
          >
            <span className={styles['btn-icon']}><MessagesCircle/></span>
            <span className={styles['btn-text']}>Чат</span>
          </button>

          <button 
            type="button" 
            className={styles['action-btn']}
            onClick={() => ctx.showToast('Настройки уведомлений в разработке', 'info')}
          >
            <span className={styles['btn-icon']}>
              <Bell/>
              {/* <BellRing/> */}
              {/* <BellOff/> */}
            </span>
            <span className={styles['btn-text']}>Звук</span>
          </button>

          <button 
            type="button" 
            onClick={onStartCall} 
            className={styles['action-btn']}
          >
            <span className={styles['btn-icon']}><Phone/></span>
            <span className={styles['btn-text']}>Звонок</span>
          </button>
          
          <button 
            type="button" 
            className={styles['action-btn']} 
            onClick={onEditToggle}
          >
            <span className={styles['btn-icon']}>{isContact ? <Settings/> : <Plus/>}</span>
            <span className={styles['btn-text']}>
              {isContact ? 'Изменить' : 'Добавить'}
            </span>
          </button>
        </div>
      </div>

      <div className={styles['info-section']}>
        {currentChatUser.privacyNameFormat === 'username' && 
         shouldShowField(currentChatUser.privacyFullName, currentChatUser.isAmHisContact) && 
         (currentChatUser.firstName || currentChatUser.lastName) && (
          <div 
            onClick={() => handleCopy(`${currentChatUser.firstName || ''} ${currentChatUser.lastName || ''}`.trim(), 'Имя и Фамилия')}
            className={styles['info-item']}
          >
            <div className={styles['info-item-content']}>
              <span className={styles['info-value']}>
                {`${currentChatUser.firstName || ''} ${currentChatUser.lastName || ''}`.trim()}
              </span>
              <span className={styles['info-label']}>Настоящие Имя и Фамилия</span>
            </div>
            <Copy size={16} className={styles['info-icon']} />
          </div>
        )}
        
        
        <div
          onClick={() => handleCopy(`@${currentChatUser.uniqueId || currentChatUser.username}`, 'Тег пользователя')}
          className={styles['info-item']}
        >
          <div className={styles['info-item-content']}>
            <span className={`${styles['info-value']} ${styles['accent']}`}>
              @{currentChatUser.uniqueId || currentChatUser.username || 'не указан'}
            </span>
            <span className={styles['info-label']}>Имя пользователя</span>
          </div>
            <Copy size={18} className={styles['info-icon']} />
        </div>

        
        {shouldShowField(currentChatUser.privacyPhone, currentChatUser.isAmHisContact) && currentChatUser.phone && currentChatUser.phone.trim() !== '' && (
          <div
            onClick={() => handleCopy(currentChatUser.phone, 'Телефон')}
            className={styles['info-item']}
          >
            <div className={styles['info-item-content']}>
              <span className={styles['info-value']}>{currentChatUser.phone}</span>
              <span className={styles['info-label']}>Телефон</span>
            </div>
            <Copy size={18} className={styles['info-icon']} />
          </div>
        )}
  
        {shouldShowField(currentChatUser.privacyEmail, currentChatUser.isAmHisContact) && currentChatUser.email && currentChatUser.email.trim() !== '' && (
          <div
            onClick={() => handleCopy(currentChatUser.email, 'Электронная почта')}
            className={styles['info-item']}
          >
            <div className={styles['info-item-content']}>
              <span className={styles['info-value']}>{currentChatUser.email}</span>
              <span className={styles['info-label']}>Электронная почта</span>
            </div>
            <Copy size={18} className={styles['info-icon']} />
          </div>
        )}

        {currentChatUser.aboutMe && currentChatUser.aboutMe.trim() !== '' && (
          <div className={styles['info-item']} style={{ cursor: 'default' }}>
            <div className={styles['info-item-content']}>
              <span className={`${styles['info-value']} ${styles['multiline']}`}>
                {currentChatUser.aboutMe}
              </span>
              <span className={styles['info-label']}>О себе</span>
            </div>
          </div>
        )}


        {currentChatUser.note && (
          <div className={styles['info-item']} style={{ cursor: 'default' }}>
            <div className={styles['info-item-content']}>
              <span className={styles['info-value']}>{currentChatUser.note}</span>
              <span className={styles['info-label']}>Ваша заметка</span>
            </div>
          </div>
        )}

        {/* Идентификатор профиля */}
        <div 
          onClick={() => handleCopy(currentChatUser.uuid, 'UUID')}
          className={styles['info-item']}
        >
          <div className={styles['info-item-content']}>
            <span className={`${styles['info-value']} ${styles['mono']}`}>
              {myIdDisplay}
            </span>
            <span className={styles['info-label']}>Идентификатор профиля</span>
          </div>
          <Hash size={16} className={styles['info-icon']} />
        </div>

        {/* 🔑 ДЕБАГ: ИДЕНТИФИКАТОРЫ СЕССИИ И МАРШРУТА КОМНАТЫ */}
        {ctx.currentUser?.userStatus === 'administrator' && (
          <div>
            <div style={{ backgroundColor: '#1a1f2c', border: '1px solid #007aff', padding: '10px', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#007aff', fontWeight: 'bold', textTransform: 'uppercase' }}>Маршрутизация пакетов (Room Router)</span>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#8e8e93' }}>ID Собеседника (UUID):</span>
                <span style={{ fontFamily: 'monospace', color: '#fff' }}>{String(partnerIdentifier).slice(0, 13)}...</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#8e8e93' }}>ID комнаты в БД (chats.id):</span>
                <span style={{ fontFamily: 'monospace', color: '#34c759', fontWeight: 'bold' }}>#{activeChatNumericId}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#8e8e93' }}>Служебный uniqueId:</span>
                <span style={{ fontFamily: 'monospace', color: '#ffcc00', fontWeight: 'bold' }}>{activeChatUniqueKey}</span>
              </div>
            </div>
            {isContact && 
              <div style={{ backgroundColor: '#212124', border: '1px solid #8e8e93', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#8e8e93', fontWeight: 'bold', textTransform: 'uppercase' }}>Сырые метаданные (Meta Tracker)</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>firstName:</span>
                  <span style={{ color: '#fff' }}>"{currentChatUser.firstName || ''}"</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>lastName:</span>
                  <span style={{ color: '#fff' }}>"{currentChatUser.lastName || ''}"</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>displayName:</span>
                  <span style={{ color: '#fff' }}>"{currentChatUser.username || ''}"</span>
                </div>
              </div>
            }
            <div style={{ backgroundColor: '#1a2421', border: '1px solid #34c759', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#34c759', fontWeight: 'bold', textTransform: 'uppercase' }}>Сетевой статус (Supabase Realtime)</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Сырой updatedAt из БД:</span>
                <span style={{ fontFamily: 'monospace', color: '#fff' }}>{currentChatUser.updatedAt || 'NULL / Отсутствует'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Чистая разница времени:</span>
                <span style={{ fontWeight: 'bold', color: '#34c759' }}>
                  {formatExactDiff(currentChatUser.updatedAt)}
                </span>
              </div>
            </div>
            <div style={{ 
              backgroundColor: '#18181f', 
              border: '1px solid #9d7bf6', 
              padding: '12px', 
              borderRadius: '0 0 16px 16px', 
              boxSizing: 'border-box'
            }}>
              <span style={{ 
                fontSize: '11px', 
                color: '#9d7bf6', 
                fontWeight: 'bold', 
                display: 'block', 
                marginBottom: '8px',
                letterSpacing: '0.5px'
              }}>
                RAW DATA DUMP (currentChatUser)
              </span>
              <pre style={{ 
                margin: 0, 
                padding: '10px', 
                backgroundColor: '#111214', 
                borderRadius: '6px', 
                color: '#34c759', // Приятный хакерский зелёный шрифт логов
                fontSize: '11px', 
                fontFamily: 'monospace', 
                overflowX: 'auto', // Горизонтальный скролл длинных полей
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-all',
                maxHeight: '150px', // Зажимаем по высоте, чтобы не ломать Collapsing-эффект карточки
                overflowY: 'auto' // Внутренний вертикальный скролл лога
              }}>
                {JSON.stringify(currentChatUser, null, 2)}
              </pre>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
