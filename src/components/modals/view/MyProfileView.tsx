import { NavLink } from 'react-router';
import { Pencil, X, Copy, QrCode, Hash } from 'lucide-react';
import styles from '../../css/profile.module.css';
import SmartAvatar from '../../common/SmartAvatar';
import { getProfileGradient } from '../../../utils/themeColors';
import { getUserStatusBadge, getUserPrivacy } from '../../../services/userService';

interface MyProfileViewProps {
  currentUser: any;
  onEditToggle: () => void;
  onClose: () => void;
  ctx: any;
}

export default function MyProfileView({
  currentUser,
  onClose,
  ctx
}: MyProfileViewProps) {
  if (!currentUser) return null;

  const privacy = getUserPrivacy(currentUser);
  const appearance = currentUser.appearance || {};
  const badge = getUserStatusBadge(currentUser);
  const publicTag = currentUser.publicId || currentUser.uniqueId;

  const realFullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
  const isFullNameDisplay = privacy.privacyNameFormat === 'full_name';

  const displayName = (isFullNameDisplay && realFullName)
    ? realFullName
    : (currentUser?.username || realFullName || 'Пользователь');

  const shouldShowRealNameField = !isFullNameDisplay && Boolean(realFullName);
  const myIdDisplay = currentUser.id ? `#${currentUser.id}` : currentUser.uuid?.slice(0, 8);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    ctx.showToast?.(`${label} скопирован в буфер`, 'success');
  };

  return (
    <div className={styles['view-mode']}>
      <div 
        className={styles['profile-header-gradient']}
        style={{ background: getProfileGradient(appearance.profileColor || currentUser?.profileColor) }}
      >
        <div className={styles['profile-header-actions']}>
          <NavLink
            to="/settings?tab=account"
            className={styles['close-modal-btn']}
            onClick={() => {
              if (ctx.setActiveTab) ctx.setActiveTab('settings');
              onClose();
            }}
          >
            <Pencil size={16} />
          </NavLink>

          <button
            type="button"
            onClick={onClose}
            className={styles['close-modal-btn']}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles['profile-avatar-wrapper']}>
          <SmartAvatar
            size={84}
            avatarUrl={currentUser.avatarUrl}
            avatarColor={appearance.avatarColor || currentUser.avatarColor}
            name={displayName}
            isChannel={false}
          />
        </div>

        <h2 className={styles['profile-name']}>
          {badge && (
            <span title={badge.title} style={{ cursor: 'help', userSelect: 'none' }}>
              {badge.icon}
            </span>
          )}
          {displayName}
        </h2>

        <span className={styles['profile-status']}>
          в сети
        </span>
      </div>

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

        <div 
          onClick={() => handleCopy(`@${publicTag || currentUser.username}`, 'Тег пользователя')}
          className={styles['info-item']}
        >
          <div className={styles['info-item-content']}>
            <span className={`${styles['info-value']} ${styles['accent']}`}>
              @{publicTag || currentUser.username}
            </span>
            <span className={styles['info-label']}>Имя пользователя</span>
          </div>
          <QrCode size={18} className={styles['info-icon']} />
        </div>

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