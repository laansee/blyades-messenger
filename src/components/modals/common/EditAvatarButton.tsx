import React from 'react';
import styles from '../../css/profile.module.css';
import { Camera } from 'lucide-react';

interface EditAvatarButtonProps {
  avatarUrl?: string;
  avatarColor?: string;
  fallbackLetter: string;
  isEditable?: boolean;
  onClick?: () => void;
}

export const EditAvatarButton: React.FC<EditAvatarButtonProps> = ({
  avatarUrl,
  avatarColor = '#5865F2',
  fallbackLetter,
  isEditable = false,
  onClick
}) => {
  return (
    <div
      onClick={isEditable ? onClick : undefined}
      title={isEditable ? 'Нажмите, чтобы сменить фото' : undefined}
      style={{
        position: 'relative',
        width: '54px',
        height: '54px',
        borderRadius: '50%',
        overflow: 'hidden',
        cursor: isEditable ? 'pointer' : 'default',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        backgroundColor: avatarColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '20px'
      }}
    >
      {avatarUrl?.trim() ? (
        <img
          src={avatarUrl}
          alt="Avatar"
          style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        <div 
          className={styles['profile-edit-avatar']} 
          style={{ backgroundColor: avatarColor }}
        >
          {fallbackLetter.toUpperCase() || '?'}
        </div>
      )}

      {isEditable && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
        >
          <Camera size={20} color="#ffffff" />
        </div>
      )}
    </div>
  );
};