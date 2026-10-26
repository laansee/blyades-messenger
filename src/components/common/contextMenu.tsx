import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../css/global-ui.module.css';

export interface ContextMenuItem {
  label?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  isDanger?: boolean;
  isDivider?: boolean;
  disabled?: boolean;
  title?: string;
}

interface ContextMenuProps {
  show: boolean;
  x: number;
  y: number;
  onClose: () => void;
  items: ContextMenuItem[];
}

export default function ContextMenu({ show, x, y, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: y, left: x });
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (show) {
      setMounted(true);
      setIsClosing(false);
    } else if (mounted) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setIsClosing(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [show, mounted]);

  useEffect(() => {
    if (mounted && menuRef.current) {
      const menuWidth = menuRef.current.offsetWidth || 210;
      const menuHeight = menuRef.current.offsetHeight || 150;
      
      let finalX = x;
      if (x + menuWidth > window.innerWidth - 10) {
        finalX = window.innerWidth - menuWidth - 10;
      }
      if (finalX < 10) finalX = 10;

      let finalY = y;
      if (y + menuHeight > window.innerHeight - 10) {
        finalY = window.innerHeight - menuHeight - 10;
      }
      if (finalY < 10) finalY = 10;

      setCoords({ top: finalY, left: finalX });
    }
  }, [mounted, x, y, items]);

  const handleSmoothClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setMounted(false);
      setIsClosing(false);
    }, 150);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mounted) handleSmoothClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mounted]);

  if (!mounted || !items || items.length === 0) return null;

  return createPortal(
    <div 
      className={styles['menu-overlay']} 
      onClick={handleSmoothClose} 
      onContextMenu={(e) => { e.preventDefault(); handleSmoothClose(); }}
      style={{
        animation: `${isClosing ? 'modalFadeOut' : 'modalFadeIn'} 0.15s ease forwards`
      }}
    >
      <div 
        ref={menuRef}
        className={styles['menu-card']} 
        style={{ 
          top: `${coords.top}px`, 
          left: `${coords.left}px`,
          minWidth: '220px',
          animation: `${isClosing ? 'modalScaleOut' : 'modalScaleIn'} 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, index) => {
          if (item.isDivider) {
            return <div key={`divider-${index}`} className={styles['menu-divider']} />;
          }

          return (
            <button
              key={`item-${index}`}
              type="button"
              disabled={item.disabled}
              title={item.title || (item.disabled ? 'Недоступно' : undefined)}
              className={`${styles['menu-item']} ${item.isDanger ? styles['menu-item-danger'] : ''} ${item.disabled ? styles['menu-item-disabled'] : ''}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
              onClick={() => {
                if (item.disabled) return;
                item.onClick?.();
                handleSmoothClose();
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {item.icon && <span className={styles['menu-item-icon']}>{item.icon}</span>}
                <span className={styles['menu-text']}>{item.label}</span>
              </div>
              
              {item.shortcut && (
                <span style={{ 
                  fontSize: '11px', 
                  color: item.disabled ? '#4e4e56' : '#8e8e93', 
                  marginLeft: '16px',
                  letterSpacing: '0.3px',
                  userSelect: 'none'
                }}>
                  {item.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
