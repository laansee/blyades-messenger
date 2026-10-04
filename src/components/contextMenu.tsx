// import React, { useEffect, useRef, useState } from 'react';
import { useEffect, useRef, useState } from 'react';
import styles from './css/global-ui.module.css';

interface ContextMenuProps {
  show: boolean;
  x: number;
  y: number;
  onClose: () => void;
  items: any[];
}

export default function ContextMenu({ show, x, y, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: y, left: x });

  useEffect(() => {
    if (show && menuRef.current) {
      const menuWidth = menuRef.current.offsetWidth || 180;
      const menuHeight = menuRef.current.offsetHeight || 150;
      let finalX = x;
      let finalY = y;

      if (x + menuWidth > window.innerWidth) finalX = window.innerWidth - menuWidth - 10;
      if (y + menuHeight > window.innerHeight) finalY = window.innerHeight - menuHeight - 10;

      setCoords({ top: finalY, left: finalX });
    }
  }, [show, x, y, items]);

  if (!show || !items || items.length === 0) return null;

  return (
    <div className={styles['menu-overlay']} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      <div 
        ref={menuRef}
        className={styles['menu-card']} 
        style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, index) => {
          if (item.isDivider) return <div key={`divider-${index}`} className={styles['menu-divider']} />;
          return (
            <button
              key={`item-${index}`}
              className={`${styles['menu-item']} ${item.isDanger ? styles['menu-item-danger'] : ''}`}
              
              onClick={() => {
                item.onClick();
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
    </div>
  );
}
