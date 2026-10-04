import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useMessengerContext from '../context/messengerContext';
import styles from './css/global-ui.module.css';
import chatStyles from './css/chat-window.module.css';
import { X, Users, Check } from 'lucide-react';


// ========================================================
// 1. 🚀 КОМПОНЕНТ ТОСТ-УВЕДОМЛЕНИЙ (ToastNotification)
// ========================================================
export interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface ToastNotificationProps {
  toast: ToastState;
}

// 1. Компонент уведомлений (Toasts)
export function ToastNotification({ toast }: ToastNotificationProps) {
  const getIcon = () => {
    if (toast.type === 'success') return '✅';
    if (toast.type === 'warning') return '⚠️';
    if (toast.type === 'error') return '❌';
    return 'ℹ️';
  };

  return (
    <div 
      className={`${styles['toast-container']} ${toast.show ? 'active' : ''} ${styles[toast.type] || ''}`}
      style={{right: toast.show ? '20px' : '-380px'}}
    >
      <span className={styles['toast-icon']}>{getIcon()}</span>
      <span className={styles['toast-message']}>{toast.message}</span>
    </div>
  );
}

// ========================================================
// 2. 🛡️ МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ ДЕЙСТВИЙ (ConfirmModal)
// ========================================================

// Описание типов для Модалки подтверждения
export interface ConfirmState {
  show: boolean;
  title: string;
  text: string;
  isDanger?: boolean;
  onConfirm: () => void;
}

interface ConfirmModalProps {
  confirm: ConfirmState;
  setConfirm: React.Dispatch<React.SetStateAction<ConfirmState>>;
}

// 2. Компонент подтверждения (Confirm Modal)
export function ConfirmModal({ confirm, setConfirm }: ConfirmModalProps) {
  if (!confirm.show) return null;

  return (
    <div 
      className={`${styles['confirm-overlay']} ${confirm.show ? styles['active'] : ''}`}
      onClick={() => setConfirm(prev => ({ ...prev, show: false }))}
    >
      <div className={styles['confirm-card']} onClick={e => e.stopPropagation()}>
        <h3 className={styles['confirm-title']}>{confirm.title}</h3>
        <p className={styles['confirm-text']}>{confirm.text}</p>
        <div className={styles['confirm-footer']}>
          <button 
            className={styles['confirm-btn-cancel']}
            onClick={() => setConfirm(prev => ({ ...prev, show: false }))}
          >
            Отмена
          </button>
          <button 
            className={confirm.isDanger ? styles['confirm-btn-danger'] : styles['confirm-btn-primary']}
            onClick={async () => {
              // Сначала запускаем переданную функцию удаления/действия
              if (confirm.onConfirm) {
                await confirm.onConfirm();
              }
              // Железный предохранитель: принудительно гасим окно после клика!
              setConfirm((prev: any) => ({ ...prev, show: false }));
            }}
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// 🖱️ 3. КОНТЕКСТНОЕ МЕНЮ КЛИКА МЫШИ (ContextMenu)
// ========================================================
interface ContextMenuProps {
  show: boolean;
  x: number;
  y: number;
  onClose: () => void;
  items: any[];
}

export function ContextMenu({ show, x, y, onClose, items }: ContextMenuProps) {
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

// ========================================================
// 🗂️ 4. ВЫПАДАЮЩИЙ СПИСОК ДЕЙСТВИЙ (DropdownMenu)
// ========================================================
export interface DropdownItem {
  id: string;
  text: string;
  icon?: React.ComponentType<any>;
  danger?: boolean;
  arrow?: boolean;
  isSeparatorBefore?: boolean; 
  onClick: () => void;
}

interface DropdownMenuProps {
  show: boolean;
  onClose: () => void;
  x: number;
  y: number;
  items: DropdownItem[];
}

export function DropdownMenu({ show, onClose, x, y, items }: DropdownMenuProps) {
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

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [show, onClose]);

  if (!show) return null;

  const isAbsoluteMode = x === 0 && y === 0;

  return (
    <div 
      ref={menuRef}
      className={chatStyles['accountMenu-dropdown']}
      style={isAbsoluteMode ? {
        position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 35000, display: 'block'
      } : {
        position: 'fixed', top: `${y}px`, left: `${x}px`, zIndex: 10000, display: 'block'
      }}
    >
      <div className={chatStyles['accountMenu-list']}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => { item.onClick(); onClose(); }}
              className={`${chatStyles['accountMenu-item']} ${item.danger ? chatStyles['danger'] : ''} ${item.isSeparatorBefore ? chatStyles['separator'] : ''}`}
            >
              <div className={chatStyles['accountMenu-item-left-side']}>
                {Icon && <Icon size={18} className={chatStyles['item-icon']} />}
                <span>{item.text}</span>
              </div>
              {item.arrow && (
                <span className={chatStyles['accountMenu-item-arrow-indicator']}>▶</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ========================================================
// 👥 5. МОДАЛКА СОЗДАНИЯ НОВЫХ БЕСЕД (CreateGroupModal)
// ========================================================
interface CreateGroupModalProps {
  show: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ show, onClose }: CreateGroupModalProps) {
  const ctx = useMessengerContext();
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUserIds] = useState<string[]>([]);

  if (!show) return null;

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      ctx.showToast('Введите название беседы', 'warning');
      return;
    }

    if (ctx.handleCreateGroupChat) {
      await ctx.handleCreateGroupChat(groupName, selectedUsers);
      setGroupName('');
      setSelectedUserIds([]);
      onClose();
    }
  };

  return createPortal(
    <div 
      onClick={onClose} 
      style={{ 
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', 
        alignItems: 'center',  justifyContent: 'center', zIndex: 999999,
        transition: 'opacity 0.2s ease'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          backgroundColor: '#1c1c24', border: '1px solid #2b2d31',
          borderRadius: '16px', padding: '24px',  maxWidth: '420px',  width: '100%',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)', position: 'relative',
          display: 'flex', flexDirection: 'column', gap: '16px'
        }}
      >
        
        {/* Шапка модалки */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2b2d31', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
            <Users size={20} color="#007aff" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', fontFamily: 'sans-serif' }}>
              Создание беседы
            </h3>
          </div>
          <button 
            type="button" onClick={onClose} 
            style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        <form 
          onSubmit={handleSubmit} 
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          {/* Инпут названия */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'sans-serif' }}
            >
              Название беседы
            </label>
            <input 
              type="text" 
              placeholder="Например: Конференция..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{ width: '100%', backgroundColor: '#1e1f22', color: '#fff', border: '1px solid #2b2d31', borderRadius: '6px', padding: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              autoComplete="off"
            />
          </div>

          {/* Список контактов с чекбоксами */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
              Пригласить участников ({selectedUsers.length})
            </label>
            <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#1e1f22', border: '1px solid #2b2d31', borderRadius: '6px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {ctx.chats.length === 0 ? (
                <div style={{ color: '#636366', fontSize: '13px', textAlign: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
                  У вас пока нет контактов
                </div>
              ) : (
                ctx.chats.map((user: any) => {
                  const isChecked = selectedUsers.includes(user.id);
                  return (
                    <div 
                      key={user.id} 
                      onClick={() => toggleUserSelection(user.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderRadius: '4px', cursor: 'pointer', backgroundColor: isChecked ? 'rgba(0, 122, 255, 0.08)' : 'transparent', transition: 'background-color 0.15s ease' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: user.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '12px', fontFamily: 'sans-serif' }}>
                          {user.name.substring(0, 1).toUpperCase()}
                        </div>
                        <span style={{ color: isChecked ? '#fff' : '#dbdee1', fontSize: '14px', fontWeight: isChecked ? '600' : '500', fontFamily: 'sans-serif' }}>
                          {user.name}
                        </span>
                      </div>
                      
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: isChecked ? 'none' : '2px solid #3a3a3c', backgroundColor: isChecked ? '#007aff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}>
                        {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Кнопки футера */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px', borderTop: '1px solid #2b2d31', paddingTop: '16px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ flex: 1, backgroundColor: 'transparent', color: '#fff', border: '1px solid #3a3a3c', borderRadius: '6px', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', fontFamily: 'sans-serif' }}
            >
              Отмена
            </button>
            <button 
              type="submit"
              style={{ flex: 1, backgroundColor: '#007aff', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'sans-serif' }}
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}