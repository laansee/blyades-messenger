import React, { useEffect, useRef } from 'react';
import styles from './css/chat-window.module.css';

export interface DropdownItem {
  id: string;
  text: string;
  icon?: React.ComponentType<any>;
  danger?: boolean;
  arrow?: boolean;
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
      // Закрываем меню, если кликнули в любую точку экрана мимо самого поп-апа
      // if (show && menuRef.current && !menuRef.current.contains(e.target as Node)) {
      //   onClose();
      // }

      // Закрываем меню, ТОЛЬКО если кликнули мимо самого меню И не кликали по кнопке вызова
      if (show && menuRef.current && !menuRef.current.contains(target) && !clickedTrigger) {
        onClose();
      }
    };
    
    if (show) 
      document.addEventListener('mousedown', handleOutsideClick);
    
    // Добавляем задержку в 10мс, чтобы клик открытия не успел сразу сработать как клик закрытия мимо
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
    }, 10);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div 
      ref={menuRef}
      className={styles['accountMenu-dropdown']}
      style={{ 
        position: 'fixed', 
        zIndex: 10000,
        display: 'block' // Гарантируем видимость слоя
      }}
    >
      <div className={styles['accountMenu-list']}>
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => { item.onClick(); onClose(); }}
              className={`${styles['accountMenu-item']} ${item.danger ? styles['danger'] : ''} ${index === 0 ? styles['separator'] : ''}`}
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
