import React, { useEffect, useRef } from 'react';
import styles from './css/chat-window.module.css';

export interface DropdownItem {
  id: string;
  text: string;
  icon?: React.ComponentType<any>;
  danger?: boolean;
  arrow?: boolean;
  isSeparatorBefore?: boolean; // 🚀 УПРАВЛЯЕМЫЙ РАЗДЕЛИТЕЛЬ: Теперь полоса ставится только там, где мы сами попросим!
  onClick: () => void;
}

interface DropdownMenuProps {
  show: boolean;
  onClose: () => void;
  x: number;
  y: number;
  items: DropdownItem[];
}

export default function DropdownMenu({ show, onClose, x, y, items }: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickedTrigger = target.closest('.dropdown-trigger-btn');

      if (show && menuRef.current && !menuRef.current.contains(target) && !clickedTrigger) {
        onClose();
      }
    };
    
    if (show) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
    }, 10);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [show, onClose]);

  if (!show) return null;

  // 🚀 УМНОЕ ОПРЕДЕЛЕНИЕ ПОЗИЦИИ: Если координаты переданы (не 0), юзаем fixed, иначе absolute под кнопку
  const isAbsoluteMode = x === 0 && y === 0;

  return (
    <div 
      ref={menuRef}
      className={styles['accountMenu-dropdown']}
      style={isAbsoluteMode ? {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        zIndex: 35000,
        display: 'block'
      } : {
        position: 'fixed', 
        top: `${y}px`,
        left: `${x}px`,
        zIndex: 10000,
        display: 'block'
      }}
    >
      <div className={styles['accountMenu-list']}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => { item.onClick(); onClose(); }}
              /* 🚀 ИСПРАВЛЕНИЕ ЛИНЕЙКИ: Убрали авто-класс на индекс 0, теперь разделитель слушает только свойство isSeparatorBefore */
              className={`${styles['accountMenu-item']} ${item.danger ? styles['danger'] : ''} ${item.isSeparatorBefore ? styles['separator'] : ''}`}
            >
              <div className={styles['accountMenu-item-left-side']}>
                {Icon && <Icon size={18} className={styles['item-icon']} />}
                <span>{item.text}</span>
              </div>
              {item.arrow && (
                <span className={styles['accountMenu-item-arrow-indicator']}>▶</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
