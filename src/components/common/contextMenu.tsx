import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../css/global-ui.module.css';

export interface ContextMenuItem {
  label?: string;
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

  useEffect(() => {
    if (show && menuRef.current) {
      const menuWidth = menuRef.current.offsetWidth || 180;
      const menuHeight = menuRef.current.offsetHeight || 150;
      
      // Корректировка по горизонтали
      let finalX = x;
      if (x + menuWidth > window.innerWidth - 10) {
        finalX = window.innerWidth - menuWidth - 10;
      }
      if (finalX < 10) finalX = 10;

      // Корректировка по вертикали
      let finalY = y;
      if (y + menuHeight > window.innerHeight - 10) {
        finalY = window.innerHeight - menuHeight - 10;
      }
      if (finalY < 10) finalY = 10;

      setCoords({ top: finalY, left: finalX });
    }
  }, [show, x, y, items]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  if (!show || !items || items.length === 0) return null;

  return createPortal(
    <div 
      className={styles['menu-overlay']} 
      onClick={onClose} 
      onContextMenu={(e) => { e.preventDefault(); onClose(); }}
    >
      <div 
        ref={menuRef}
        className={styles['menu-card']} 
        style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
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
              title={item.title || (item.disabled ? 'В разработке' : undefined)}
              className={`${styles['menu-item']} ${item.isDanger ? styles['menu-item-danger'] : ''} ${item.disabled ? styles['menu-item-disabled'] : ''}`}
              onClick={() => {
                if (item.disabled) return;
                item.onClick?.();
                setTimeout(() => {
                  onClose();
                }, 10);
              }}
            >
              {item.icon && <span className={styles['menu-item-icon']}>{item.icon}</span>}
              <span className={styles['menu-text']}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
