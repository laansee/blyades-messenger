import React, { useState } from 'react';
import { X } from 'lucide-react';
import styles from '../../css/profile.module.css';
import chatStyles from '../../css/chat-window.module.css';
import SmartAvatar from '../../common/SmartAvatar';
import useMessengerContext from '../../../context/messengerContext';
import { 
  PROFILE_THEMES, 
  NAME_THEMES, 
  DEFAULT_PROFILE_COLOR, 
  // DEFAULT_NAME_THEME,
  getProfileTheme,
  getNameTheme,
  type ProfileTheme,
  type NameTheme
} from '../../../utils/themeColors';
// Замени импорт supabase на userService и normalizeUser:
import { userService, normalizeUser } from '../../../services/userService';





export interface CircleColorItem {
  id?: string;
  name?: string;
  circleColor: string | [string, string];
  hasCenterBadge?: boolean;
}

interface ColorCirclePickerProps {
  colors: (string | CircleColorItem | ProfileTheme | NameTheme)[];
  selectedColor: string;
  onSelect: (idOrHex: string) => void;
  circleSize?: number;
  columns?: number;
}

export const ColorCirclePicker: React.FC<ColorCirclePickerProps> = ({
  colors,
  selectedColor,
  onSelect,
  circleSize = 27,
  columns = 8,
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        justifyItems: 'center',
        alignItems: 'center',
        rowGap: '12px',
        columnGap: '8px',
        padding: '6px 10px',
      }}
    >
      {colors.map((item, index) => {
        const isString = typeof item === 'string';
        const key = isString ? item : (item.id || String(index));
        const colorVal = isString ? item : item.circleColor;
        const hasCenterBadge = !isString && (item as any).hasCenterBadge;

        // Фон кружочка: сплошной или двухцветный диагональный сплит
        const circleBackground = Array.isArray(colorVal)
          ? `linear-gradient(135deg, ${colorVal[0]} 50%, ${colorVal[1]} 50%)`
          : colorVal;

        const isSelected = selectedColor.toLowerCase() === key.toLowerCase() ||
          (typeof colorVal === 'string' && selectedColor.toLowerCase() === colorVal.toLowerCase());

        const ringColor = Array.isArray(colorVal) ? colorVal[0] : colorVal;

        return (
          <div
            key={key}
            onClick={() => onSelect(key)}
            // title={title}
            style={{
              position: 'relative',
              width: `${circleSize}px`,
              height: `${circleSize}px`,
              borderRadius: '50%',
              background: circleBackground,
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: isSelected
                ? `0 0 0 3px #1b1b24, 0 0 0 5px ${ringColor}`
                : 'none',
              transition: 'box-shadow 0.15s ease, transform 0.15s ease',
              transform: isSelected ? 'scale(1.08)' : 'scale(1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Белый значок-ромбик в центре для 3-го ряда */}
            {hasCenterBadge && (
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  backgroundColor: '#ffffff',
                  borderRadius: '2px',
                  transform: 'rotate(45deg)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};





interface ProfileColorPreviewProps {
  profileThemeIdOrHex: string;
  avatarUrl?: string | null;
  avatarColor?: string;
  displayName: string;
}

export const ProfileColorPreview: React.FC<ProfileColorPreviewProps> = ({
  profileThemeIdOrHex,
  avatarUrl,
  avatarColor = '#5865F2',
  displayName,
}) => {
  const theme = getProfileTheme(profileThemeIdOrHex);

  return (
    <div
      style={{
        background: theme.background,
        padding: '24px 16px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        transition: 'background 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '3px',
          borderRadius: '50%',
          border: `2px solid ${theme.avatarRingColor || 'transparent'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: theme.type === 'gradient'
            ? `0 0 20px ${theme.avatarRingColor}44`
            : '0 4px 14px rgba(0,0,0,0.35)',
          transition: 'all 0.3s ease',
        }}
      >
        <SmartAvatar
          size={74}
          avatarUrl={avatarUrl}
          avatarColor={avatarColor}
          name={displayName}
        />
      </div>

      <span
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#f3f2f2',
          marginTop: '12px',
          letterSpacing: '-0.2px',
        }}
      >
        {displayName}
      </span>
      <span
        style={{
          fontSize: '13px',
          color: '#cac9c9',
          fontWeight: 600,
          marginTop: '2px',
        }}
      >
        в сети
      </span>
    </div>
  );
};





interface NameColorMessagePreviewProps {
  nameThemeIdOrHex: string;
  avatarUrl?: string | null;
  avatarColor?: string;
  displayName: string;
}

export const NameColorMessagePreview: React.FC<NameColorMessagePreviewProps> = ({
  nameThemeIdOrHex,
  avatarUrl,
  avatarColor = '#5865F2',
  displayName,
}) => {
  const theme = getNameTheme(nameThemeIdOrHex);

  const replyThemeStyles = {
    '--reply-color': theme.nameColor,
    '--reply-bg': `${theme.nameColor}15`,
    '--reply-bg-hover': `${theme.nameColor}24`,
  } as React.CSSProperties;

  return (
    <div
      style={{
        backgroundColor: '#131317',
        padding: '16px 14px',
      }}
    >
      <div className={`${chatStyles['sender-group-container']} ${chatStyles['incoming']}`} style={{ margin: 0 }}>
        <div className={chatStyles['sender-avatar-col']}>
          <SmartAvatar
            size={36}
            avatarUrl={avatarUrl}
            avatarColor={avatarColor}
            name={displayName}
            isChannel={false}
          />
        </div>

        <div className={chatStyles['sender-messages-col']}>
          <div className={`${chatStyles['message-list-item']} ${chatStyles['first-in-group']} ${chatStyles['last-in-group']}`}>
            <div className={chatStyles['message']}>
              <div
                className={chatStyles['message-bubble']}
                style={{
                  backgroundColor: '#21212b',
                  maxWidth: '260px',
                  borderRadius: '16px 16px 16px 4px',
                }}
              >
                {/* Имя автора в чате */}
                <span
                  className={chatStyles['group-msg-sender-name']}
                  style={{ color: theme.nameColor, transition: 'color 0.2s ease' }}
                >
                  {displayName}
                </span>

                {/* 🎯 Блок ответа/цитаты с динамической полосой темы */}
                <div
                  className={chatStyles['message-reply-quote']}
                  style={replyThemeStyles}
                >
                  <div 
                    className={chatStyles['message-reply-stripe']} 
                    style={{ background: theme.stripeBackground }} 
                  />
                  <span className={chatStyles['message-reply-name']} style={{transition: 'color 0.2s'}}>
                    {displayName}
                  </span>
                  <span className={chatStyles['message-reply-text']}>
                    Ваше исходное сообщение
                  </span>
                </div>

                <div className={chatStyles['message-text']}>
                  Выбранным цветом выделяются Ваше имя и ответы на Ваши сообщения.
                  <span className={chatStyles['message-meta']}>
                    <span className={chatStyles['message-time']}>13:37</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};






interface ColorSettingsModalProps {
  show: boolean;
  currentProfileColor?: string;
  currentNameColor?: string;
  onClose: () => void;
  onSuccess?: (colors: { profileColor: string; nameColor: string }) => void;
}

export default function ColorSettingsModal({
  show,
  currentProfileColor,
  currentNameColor,
  onClose,
  onSuccess,
}: ColorSettingsModalProps) {
  const ctx = useMessengerContext();
  const currentUser = ctx.currentUser;

  const [activeTab, setActiveTab] = useState<'profile' | 'name'>('profile');
  const [profileColor, setProfileColor] = useState(currentProfileColor || DEFAULT_PROFILE_COLOR);
  const [nameColor, setNameColor] = useState(currentNameColor || '#5eaddf');
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const displayName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim() 
    || currentUser?.username 
    || 'Пользователь';

  const handleSave = async () => {
    setLoading(true);
    try {
      const userUuid = String(currentUser?.uuid || currentUser?.id || '');
      if (!userUuid) throw new Error('Не удалось определить ID пользователя');

      const res = await userService.updateProfile(userUuid, {
        profileColor,
        nameColor,
      });

      if (!res.success) throw new Error(res.error);

      if (ctx.setCurrentUser) {
        ctx.setCurrentUser((prev: any) =>
          normalizeUser({
            ...prev,
            profileColor,
            nameColor,
          })
        );
      }

      ctx.showToast?.('Цвета оформления обновлены! 🎨', 'success');
      onSuccess?.({ profileColor, nameColor });
      onClose();
    } catch (err: any) {
      console.error(err);
      ctx.showToast?.(`Ошибка сохранения: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['modal-overlay']} onClick={onClose} style={{ zIndex: 1000002, userSelect: 'none' }}>
      <div 
        className={styles['dialog-card']} 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '330px', padding: '0', gap: '8px' }}
      >
        {/* Шапка модалки */}
        <div className={styles['dialog-header']} style={{padding: "10px 10px 0px 15px"}}>
          <h3 className={styles['dialog-title']}>Предпросмотр цвета</h3>
          <button type="button" onClick={onClose} className={styles['dialog-close-btn']}>
            <X size={20} />
          </button>
        </div>

        <div>
        {/* Переключатель вкладок «Профиль» / «Имя» */}
        <div style={{
          display: 'flex',
          backgroundColor: '#16161f',
          padding: '3px',
          borderRadius: '24px',
          gap: '4px',
          width: '210px',
          margin: '0 auto 8px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              flex: 1,
              padding: '6px 0',
              border: 'none',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'profile' ? '#2f2c3d' : 'transparent',
              color: activeTab === 'profile' ? '#fff' : '#8e8e93',
              transition: 'all 0.15s ease'
            }}
          >
            Профиль
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('name')}
            style={{
              flex: 1,
              padding: '6px 0',
              border: 'none',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'name' ? '#2f2c3d' : 'transparent',
              color: activeTab === 'name' ? '#fff' : '#8e8e93',
              transition: 'all 0.15s ease'
            }}
          >
            Имя
          </button>
        </div>

        {/* ======================================================== */}
        {/* 1. ВКЛАДКА «ПРОФИЛЬ»                                     */}
        {/* ======================================================== */}
        {activeTab === 'profile' && (
          <>
            <ProfileColorPreview
              profileThemeIdOrHex={profileColor}
              avatarUrl={currentUser?.avatarUrl}
              avatarColor={currentUser?.avatarColor}
              displayName={displayName}
            />

            <ColorCirclePicker
              colors={PROFILE_THEMES}
              selectedColor={profileColor}
              onSelect={setProfileColor}
              circleSize={27}
              columns={8}
            />
          </>
        )}

        {/* ======================================================== */}
        {/* 2. ВКЛАДКА «ИМЯ»                                         */}
        {/* ======================================================== */}
        {activeTab === 'name' && (
          <>
            <NameColorMessagePreview
              nameThemeIdOrHex={nameColor}
              avatarUrl={currentUser?.avatarUrl}
              avatarColor={currentUser?.avatarColor}
              displayName={displayName}
            />

            <ColorCirclePicker
              colors={NAME_THEMES}
              selectedColor={nameColor}
              onSelect={setNameColor}
              circleSize={28}
              columns={7}
            />
          </>
        )}
        </div>

        {/* Подвал с кнопками */}
        <div className={styles['dialog-footer']} style={{ padding: '4px 16px 14px' }}>
          <button type="button" onClick={onClose} className={styles['btn-text-cancel']}>
            Отмена
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSave}
            className={styles['btn-primary']}
          >
            {loading ? 'Сохранение...' : 'Готово'}
          </button>
        </div>
      </div>
    </div>
  );
}