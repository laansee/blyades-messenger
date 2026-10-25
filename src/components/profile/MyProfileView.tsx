import { Pencil, X, Copy, QrCode, Hash } from 'lucide-react';
import SmartAvatar from '../common/SmartAvatar';
import { renderUserStatusBadge } from '../../utils/statusBadge';
import styles from '../css/profile.module.css';

interface MyProfileViewProps {
  currentUser: any;
  onEditToggle: () => void;
  onClose: () => void;
  ctx: any;
}

export default function MyProfileView({
  currentUser,
  onEditToggle,
  onClose,
  ctx
}: MyProfileViewProps) {
  if (!currentUser) return null;

  const realFullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
  
  // Проверяем, настроен ли вывод Имени и Фамилии в качестве Display Name
  const isFullNameDisplay = 
    currentUser?.privacyNameFormat === 'full_name' || 
    currentUser?.privacyNameFormat === 'name';

  // 🎯 Вычисляем заголовок шапки
  const displayName = (isFullNameDisplay && realFullName)
    ? realFullName
    : (currentUser?.username || realFullName || 'Пользователь');

  // 🎯 МЕХАНИКА:
  // Если заголовок — это никнейм, то показываем поле "Настоящие Имя и Фамилия".
  // Если заголовок — это Имя и Фамилия, скрываем поле, чтобы не дублировать шапку.
  const shouldShowRealNameField = !isFullNameDisplay && Boolean(realFullName);

  const myIdDisplay = currentUser.id ? `#${currentUser.id}` : currentUser.uuid?.slice(0, 8);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    ctx.showToast?.(`${label} скопирован в буфер`, 'success');
  };

  return (
    <div className={styles['view-mode']}>
      
      {/* ======================================================== */}
      {/* 🔮 ВЕРХНЯЯ ФИОЛЕТОВАЯ ПЛАШКА В СТИЛЕ AYUGRAM              */}
      {/* ======================================================== */}
      <div className={styles['profile-header-gradient']}>
        <div className={styles['profile-header-actions']}>
          <button
            type="button"
            onClick={onEditToggle}
            title="Редактировать профиль"
            className={styles['close-modal-btn']}
          >
            <Pencil size={16} />
          </button>

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
            avatarUrl={currentUser.avatarUrl}
            avatarColor={currentUser.avatarColor}
            name={displayName}
            isChannel={false}
          />
        </div>

        <h2 className={styles['profile-name']}>
          {renderUserStatusBadge(currentUser)}
          {displayName}
        </h2>

        <span className={styles['profile-status']}>
          в сети
        </span>
      </div>

      {/* ======================================================== */}
      {/* 📋 ТЕЛО ПРОФИЛЯ С ИНФОРМАЦИЕЙ                            */}
      {/* ======================================================== */}
      <div className={styles['info-section']}>
        
        {shouldShowRealNameField && (
          <div 
            onClick={() => handleCopy(realFullName, 'Имя и Фамилия')}
            className={styles['info-item']}
          >
            <div className={styles['info-item-content']}>
              <span className={styles['info-value']}>
                {realFullName}
              </span>
              <span className={styles['info-label']}>Настоящие Имя и Фамилия</span>
            </div>
            <Copy size={16} className={styles['info-icon']} />
          </div>
        )}

        {/* Имя пользователя (@username) */}
        <div 
          onClick={() => handleCopy(`@${currentUser.uniqueId || currentUser.username}`, 'Тег пользователя')}
          className={styles['info-item']}
        >
          <div className={styles['info-item-content']}>
            <span className={`${styles['info-value']} ${styles['accent']}`}>
              @{currentUser.uniqueId || currentUser.username}
            </span>
            <span className={styles['info-label']}>Имя пользователя</span>
          </div>
          <QrCode size={18} className={styles['info-icon']} />
        </div>

        {/* Номер телефона */}
        {currentUser.phone && (
          <div 
            onClick={() => handleCopy(currentUser.phone, 'Телефон')}
            className={styles['info-item']}
          >
            <div className={styles['info-item-content']}>
              <span className={styles['info-value']}>{currentUser.phone}</span>
              <span className={styles['info-label']}>Телефон</span>
            </div>
            <Copy size={16} className={styles['info-icon']} />
          </div>
        )}

        {/* Электронная почта */}
        {currentUser.email && (
          <div 
            onClick={() => handleCopy(currentUser.email, 'Электронная почта')}
            className={styles['info-item']}
          >
            <div className={styles['info-item-content']}>
              <span className={styles['info-value']}>{currentUser.email}</span>
              <span className={styles['info-label']}>Электронная почта</span>
            </div>
            <Copy size={16} className={styles['info-icon']} />
          </div>
        )}

        {/* О себе / Био */}
        {currentUser.aboutMe && currentUser.aboutMe.trim() !== '' && (
          <div className={styles['info-item']} style={{ cursor: 'default' }}>
            <div className={styles['info-item-content']}>
              <span className={`${styles['info-value']} ${styles['multiline']}`}>
                {currentUser.aboutMe}
              </span>
              <span className={styles['info-label']} style={{ marginTop: '4px' }}>О себе</span>
            </div>
          </div>
        )}

        {/* Идентификатор профиля */}
        <div 
          onClick={() => handleCopy(currentUser.uuid, 'UUID')}
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
      </div>
    </div>
  );
}