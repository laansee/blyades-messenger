import React, { useState } from 'react';
import { Megaphone } from 'lucide-react';

interface SmartAvatarProps {
  avatarUrl?: string | null;
  avatarColor?: string | null;
  name?: string | null;
  isChannel?: boolean;
  size?: number;
  iconSize?: number;
  className?: string;
  showOnline?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

function SmartAvatarComponent({
  avatarUrl,
  avatarColor = '#5865F2',
  name = '?',
  isChannel = false,
  size = 40,
  iconSize,
  className,
  showOnline = false,
  onClick,
}: SmartAvatarProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const letter = (name?.trim()?.substring(0, 1) || '?').toUpperCase();
  const calculatedIconSize = iconSize || Math.round(size * 0.5);

  // Сценарий 1: Канал (рупор)
  if (isChannel) {
    return (
      <div
        className={className}
        onClick={onClick}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: avatarColor || '#9d7bf6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          userSelect: 'none',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        <Megaphone size={calculatedIconSize} color="#fff" />
      </div>
    );
  }

  const hasPhoto = Boolean(avatarUrl && !hasError);

  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        className={className}
        onClick={onClick}
        style={{
          position: 'relative',
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: avatarColor || '#5865F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: `${Math.round(size * 0.42)}px`,
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        <span>{letter}</span>

        {hasPhoto && (
          <img
            src={avatarUrl!}
            alt={name || 'Avatar'}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.2s ease',
            }}
          />
        )}
      </div>

      {showOnline && (
        <span
          style={{
            position: 'absolute',
            bottom: '1px',
            right: '1px',
            width: size >= 48 ? '13px' : '10px',
            height: size >= 48 ? '13px' : '10px',
            borderRadius: '50%',
            backgroundColor: '#23a55a',
            border: '2.5px solid #16171b',
            boxSizing: 'border-box',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
}

export default React.memo(SmartAvatarComponent);