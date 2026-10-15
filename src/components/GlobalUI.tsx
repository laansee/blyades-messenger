import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useMessengerContext from '../context/messengerContext';
import GlobalUIStyles from './css/global-ui.module.css';
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
      className={`${GlobalUIStyles['toast-container']} ${toast.show ? 'active' : ''} ${GlobalUIStyles[toast.type] || ''}`}
      style={{right: toast.show ? '20px' : '-380px'}}
    >
      <span className={GlobalUIStyles['toast-icon']}>{getIcon()}</span>
      <span className={GlobalUIStyles['toast-message']}>{toast.message}</span>
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
      className={`${GlobalUIStyles['confirm-overlay']} ${confirm.show ? GlobalUIStyles['active'] : ''}`}
      onClick={() => setConfirm(prev => ({ ...prev, show: false }))}
    >
      <div className={GlobalUIStyles['confirm-card']} onClick={e => e.stopPropagation()}>
        <h3 className={GlobalUIStyles['confirm-title']}>{confirm.title}</h3>
        <p className={GlobalUIStyles['confirm-text']}>{confirm.text}</p>
        <div className={GlobalUIStyles['confirm-footer']}>
          <button 
            className={GlobalUIStyles['confirm-btn-cancel']}
            onClick={() => setConfirm(prev => ({ ...prev, show: false }))}
          >
            Отмена
          </button>
          <button 
            className={confirm.isDanger ? GlobalUIStyles['confirm-btn-danger'] : GlobalUIStyles['confirm-btn-primary']}
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
    <div className={GlobalUIStyles['menu-overlay']} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      <div 
        ref={menuRef}
        className={GlobalUIStyles['menu-card']} 
        style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, index) => {
          if (item.isDivider) return <div key={`divider-${index}`} className={GlobalUIStyles['menu-divider']} />;
          return (
            <button
              key={`item-${index}`}
              className={`${GlobalUIStyles['menu-item']} ${item.isDanger ? GlobalUIStyles['menu-item-danger'] : ''}`}
              onClick={() => {
                item.onClick();
                setTimeout(() => {
                  onClose();
                }, 10);
              }}
            >
              {item.icon && <span className={GlobalUIStyles['menu-item-icon']}>{item.icon}</span>}
              <span className={GlobalUIStyles['menu-text']}>{item.label}</span>
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
  tabIndex: number;
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

      if (show && menuRef.current && !menuRef.current.contains(target) && !clickedTrigger) onClose();
    };
    
    if (show) document.addEventListener('mousedown', handleOutsideClick);

    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [show, onClose]);

  if (!show) return null;

  const isAbsoluteMode = x === 0 && y === 0;

  return (
    <div 
      ref={menuRef}
      className={GlobalUIStyles.dropdown}
      style={isAbsoluteMode ? {
        position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 35000, display: 'block'
      } : {
        position: 'fixed', top: `${y}px`, left: `${x}px`, zIndex: 10000, display: 'block'
      }}
      tabIndex={999999}
    >
      <div className={GlobalUIStyles['dropdown-list']}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              tabIndex={item.tabIndex}
              onClick={() => { item.onClick(); onClose(); }}
              className={`${GlobalUIStyles['dropdown-item']} ${item.danger ? GlobalUIStyles['danger'] : ''} ${item.isSeparatorBefore ? GlobalUIStyles['separator'] : ''}`}
            >
              <div className={GlobalUIStyles['dropdown-item-left-side']}>
                {Icon && <Icon size={18} className={GlobalUIStyles['item-icon']} />}
                <span>{item.text}</span>
              </div>
              {item.arrow && (
                <span className={GlobalUIStyles['dropdown-item-arrow-indicator']}>▶</span>
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
            {/* <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#1e1f22', border: '1px solid #2b2d31', borderRadius: '6px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
            </div> */}
            {/* 🚀 ГАРАНТИРОВАННЫЙ ФИКС: Оставляем только реальных людей, отсекая группы с помощью .filter */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#1e1f22', border: '1px solid #2b2d31', borderRadius: '6px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {ctx.chats.filter((c: any) => {
                const hasLogin = (c.uniqueId && c.uniqueId.trim() !== '') || (c.username && c.username.trim() !== '');
                const isGroupFlag = c.isGroup === true;
                // Пропускаем только реальных людей, у которых есть логин и нет флага группы
                return hasLogin && !isGroupFlag;
              }).length === 0 ? (
                <div style={{ color: '#636366', fontSize: '13px', textAlign: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
                  У вас пока нет доступных пользователей
                </div>
              ) : (
                ctx.chats
                  .filter((c: any) => {
                    const hasLogin = (c.uniqueId && c.uniqueId.trim() !== '') || (c.username && c.username.trim() !== '');
                    const isGroupFlag = c.isGroup === true;
                    return hasLogin && !isGroupFlag;
                  })
                  .map((user: any) => {
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

// ========================================================
// 📝 6. УНИВЕРСАЛЬНАЯ МОДАЛКА РЕДАКТИРОВАНИЯ (EditorModal)
// ========================================================
export interface EditorInputField {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'textarea';
  maxLength?: number;
}

interface EditorModalProps {
  show: boolean;
  title: string;
  fields: EditorInputField[];
  initialValues: Record<string, string>;
  onClose: () => void;
  onSave: (values: Record<string, string>) => Promise<void>;
}

export function EditorModal({ show, title, fields, initialValues, onClose, onSave }: EditorModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Синхронизируем начальные значения при открытии модалки
  useEffect(() => {
    if (show) {
      setValues(initialValues || {});
      setIsSaving(false);
    }
  }, [show, initialValues]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(values);
      onClose();
    } catch (err) {
      console.error('Ошибка сохранения в EditorModal:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div onClick={onClose} className={GlobalUIStyles['sModal-background']}>
      <div onClick={e => e.stopPropagation()} className={GlobalUIStyles['sModal-container']}>
        <h3 className={GlobalUIStyles['sModal-title']}>{title}</h3>
        
        <form onSubmit={handleSubmit} className={GlobalUIStyles['sModal-form']}>
          {fields.map((field) => {
            const isTextarea = field.type === 'textarea';
            const currentValue = values[field.key] || '';

            return (
              <div key={field.key} className={GlobalUIStyles['sModal-card']}>
                <label className={GlobalUIStyles['sModal-label']}>{field.label}</label>
                
                {isTextarea ? (
                  <textarea
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    value={currentValue}
                    onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className={GlobalUIStyles['sModal-textarea']}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    value={currentValue}
                    onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className={GlobalUIStyles['sModal-input']}
                    autoComplete="off"
                  />
                )}

                {/* Счётчик лимита символов (для био "О себе") */}
                {field.maxLength && (
                  <span className={GlobalUIStyles['sModal-counter']}>
                    {field.maxLength - currentValue.length}
                  </span>
                )}
              </div>
            );
          })}

          <div className={GlobalUIStyles['sModal-buttons']}>
            <button type="button" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ========================================================
// 🔒 7. МОДАЛКА ВЫБОРА НАСТРОЕК ПРИВАТНОСТИ (PrivacySelectorModal)
// ========================================================
export interface PrivacyOption {
  value: string;
  label: string;
}

interface PrivacySelectorModalProps {
  show: boolean;
  title: string;
  subtitle?: string;
  options: PrivacyOption[];
  selectedValue: string;
  onClose: () => void;
  onSelect: (value: string) => Promise<void>;
}

export function PrivacySelectorModal({ show, title, subtitle, options, selectedValue, onClose, onSelect }: PrivacySelectorModalProps) {
  const [localValue, setLocalValue] = useState(selectedValue);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setLocalValue(selectedValue);
      setIsSaving(false);
    }
  }, [show, selectedValue]);

  if (!show) return null;

  const handleRadioClick = async (val: string) => {
    setLocalValue(val);
    setIsSaving(true);
    try {
      await onSelect(val);
      onClose();
    } catch (err) {
      console.error('Ошибка сохранения приватности:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div onClick={onClose} className={GlobalUIStyles['sModal-background']}>
      <div onClick={e => e.stopPropagation()} className={GlobalUIStyles['sModal-container']}>
        <div>
          <h3 className={GlobalUIStyles['sModal-title']}>{title}</h3>
          {subtitle && <p className={GlobalUIStyles['sModal-subtitle']}>{subtitle}</p>}
        </div>

        <div className={GlobalUIStyles['sModal-form']}>
          <div className={GlobalUIStyles['sModal-radio-options']}>
            {options.map((opt) => {
              const isSelected = localValue === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => !isSaving && handleRadioClick(opt.value)}
                  style={{cursor: isSaving ? 'not-allowed' : 'pointer'}}
                  className={GlobalUIStyles['sModal-radio-value']} 
                >
                  {/* Кастомная круглая радио-кнопка */}
                  <div style={{border: isSelected ? '2px solid #9d7bf6' : '2px solid #636366'}} className={GlobalUIStyles['sModal-radio-circle']}>
                    {isSelected && (
                      <div className={GlobalUIStyles['sModal-radio-isSelected']}/>
                    )}
                  </div>
                  <span style={{ fontWeight: isSelected ? '600' : '500', color: isSelected ? '#fff' : '#dbdee1' }}>
                    {opt.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={GlobalUIStyles['sModal-buttons']}>
            <button type="button" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ========================================================
// 📸 8. МОДАЛКА ВЫБОРА И ДРОП-ЗОНЫ АВАТАРА (AvatarUploadSelectorModal)
// ========================================================
interface AvatarUploadSelectorModalProps {
  show: boolean;
  avatarUrl: string | null;
  avatarColor: string;
  isDragOver: boolean;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  setAvatarColor: (color: string) => void;
  onClose: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onColorSelect: (color: string) => Promise<void>;
}
export function AvatarUploadSelectorModal({
  show,
  avatarUrl,
  avatarColor,
  isDragOver,
  uploading,
  fileInputRef,
  setAvatarColor,
  onClose,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onColorSelect
}: AvatarUploadSelectorModalProps) {
  if (!show) return null;

  const avatarPalette = [
    '#ba4c47',
    '#c36f24',
    '#8957ca',
    '#3c9c22',
    '#37a5b1',
    '#3380c1',
    '#b64c82',
    '#798896'
  ];

  return createPortal(
    <div 
      onClick={onClose} 
      style={{ 
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{ 
          backgroundColor: '#23232e', border: '1px solid #383842', padding: '24px', 
          borderRadius: '16px', width: '100%', maxWidth: '380px', display: 'flex', 
          flexDirection: 'column', alignItems: 'center', gap: '20px', 
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)', color: '#fff', fontFamily: 'sans-serif'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '700' }}>Снимок профиля</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>

        {/* Интерактивная область Drag-and-Drop */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%', height: '180px', borderRadius: '12px',
            backgroundColor: '#18181e', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '14px',
            cursor: 'pointer', border: isDragOver ? '2px dashed #9d7bf6' : '1px dashed #383842',
            transition: 'all 0.2s ease', boxShadow: isDragOver ? '0 0 15px rgba(157, 123, 246, 0.2)' : 'none'
          }}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            onChange={onFileSelect} 
            style={{ display: 'none' }} 
          />

          {avatarUrl ? (
            <img src={avatarUrl} alt="Preview" style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #383842' }} />
          ) : (
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold' }}>
              📸
            </div>
          )}

          <div style={{ textAlign: 'center', padding: '0 10px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: isDragOver ? '#9d7bf6' : '#fff', display: 'block', marginBottom: '4px' }}>
              {isDragOver ? '💥 Бросайте сюда фото!' : 'Перетащите изображение или кликните'}
            </span>
            <span style={{ fontSize: '11px', color: '#a2a2b5' }}>PNG, JPG, GIF до 5 МБ</span>
          </div>
        </div>

        {uploading && <span style={{ color: '#9d7bf6', fontSize: '13px' }}>Обработка файла...</span>}

        {/* Выбор базового цвета подложки */}
        <div style={{ width: '100%', borderTop: '1px solid #383842', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#a2a2b5', fontWeight: '600' }}>Базовый цвет подложки:</span>
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            {avatarPalette.map((color) => {
              const isSelected = avatarColor.toLowerCase() === color.toLowerCase();
              return (
                <div
                  key={color}
                  onClick={async () => {
                    setAvatarColor(color);
                    await onColorSelect(color);
                  }}
                  style={{
                    width: '28px', height: '36px', borderRadius: '50%',
                    backgroundColor: color, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? `0 0 10px ${color}` : '0 2px 4px rgba(0,0,0,0.2)',
                    border: isSelected ? '2px solid #ffffff' : '2px solid transparent',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                  }}
                  onMouseEnter={e => !isSelected && (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={e => !isSelected && (e.currentTarget.style.transform = 'scale(1)')}
                />
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: '14px', borderTop: '1px solid #383842', paddingTop: '14px' }}>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#b0b0b8', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ========================================================
// ✂️ 9. МОДАЛКА ОБРЕЗКИ И МАСШТАБИРОВАНИЯ АВАТАРА (AvatarCropModal)
// ========================================================
interface AvatarCropModalProps {
  show: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onSave: (croppedBlob: Blob) => Promise<void>;
}

export function AvatarCropModal({ show, imageSrc, onClose, onSave }: AvatarCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Загружаем изображение при открытии
  useEffect(() => {
    if (show && imageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      img.onload = () => {
        setImageObj(img);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      };
      setIsSaving(false);
    }
  }, [show, imageSrc]);

  // Живая отрисовка на Canvas с круглой маской
  useEffect(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очищаем холст
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Центр холста
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 100; // Диаметр круга обрезки — 200px

    // Считаем масштаб, чтобы вписать картинку по меньшей стороне
    const baseScale = Math.max(200 / imageObj.width, 200 / imageObj.height);
    const currentScale = baseScale * zoom;

    const iw = imageObj.width * currentScale;
    const ih = imageObj.height * currentScale;

    // Позиция отрисовки с учетом сдвига мышкой
    const x = cx - iw / 2 + offset.x;
    const y = cy - ih / 2 + offset.y;

    // Рисуем картинку на задний план (полупрозрачную)
    ctx.globalAlpha = 0.3;
    ctx.drawImage(imageObj, x, y, iw, ih);

    // Включаем маску круга
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Рисуем яркую картинку внутри круга
    ctx.drawImage(imageObj, x, y, iw, ih);
    ctx.restore();

    // Рисуем красивую фиолетовую рамку поверх круга обрезки
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#9d7bf6';
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [imageObj, zoom, offset]);

  if (!show || !imageSrc) return null;

  // Обработчики Drag-to-Move внутри Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !imageObj || !canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Рассчитываем текущие размеры картинки на экране (один в один как в рендере)
    const baseScale = Math.max(200 / imageObj.width, 200 / imageObj.height);
    const currentScale = baseScale * zoom;

    const iw = imageObj.width * currentScale;
    const ih = imageObj.height * currentScale;

    // Считаем сырые новые координаты сдвига от движения мышки
    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;

    // 🎯 ВЫЧИСЛЯЕМ МАКСИМАЛЬНО ДОПУСТИМЫЕ СДВИГИ ПО ОСИ X И Y
    // Картинка не должна уходить внутрь круга (диаметр 200px, радиус 100px от центра)
    const maxOffsetX = Math.max(0, (iw - 200) / 2);
    const maxOffsetY = Math.max(0, (ih - 200) / 2);

    // Жёстко зажимаем новые координаты в лимиты [-maxOffset, maxOffset]
    if (newX > maxOffsetX) newX = maxOffsetX;
    if (newX < -maxOffsetX) newX = -maxOffsetX;

    if (newY > maxOffsetY) newY = maxOffsetY;
    if (newY < -maxOffsetY) newY = -maxOffsetY;

    setOffset({ x: newX, y: newY });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // 🚀 БРОНЕБОЙНЫЙ ВЫРЕЗАТЕЛЬ АВАТАРОК: Берёт чистую картинку, полностью игнорируя фиолетовые рамки интерфейса!
  const handleGenerateCrop = async () => {
    if (!canvasRef.current || !imageObj) return;
    setIsSaving(true);

    const canvas = canvasRef.current;
    
    // Создаем виртуальный холст 200x200 для идеального PNG-экспорта
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 200;
    exportCanvas.height = 200;
    const eCtx = exportCanvas.getContext('2d');

    if (eCtx) {
      // 🎯 Магия математики: воссоздаем пропорции и сдвиги, но рисуем ТОЛЬКО чистый imageObj!
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      // Считаем масштаб точно так же, как при отрисовке на экране
      const baseScale = Math.max(200 / imageObj.width, 200 / imageObj.height);
      const currentScale = baseScale * zoom;

      const iw = imageObj.width * currentScale;
      const ih = imageObj.height * currentScale;

      // Считаем, какая область оригинальной картинки попала в круг обрезки 200x200
      // Переводим экранные координаты холста в систему координат экспортного канваса
      const renderX = cx - iw / 2 + offset.x;
      const renderY = cy - ih / 2 + offset.y;

      const sx = (cx - 100 - renderX) / currentScale;
      const sy = (cy - 100 - renderY) / currentScale;
      const sw = 200 / currentScale;
      const sh = 200 / currentScale;

      // Рисуем чистый исходник без масок, рамок и прозрачностей
      eCtx.drawImage(
        imageObj,
        sx, sy, sw, sh,  // Откуда вырезаем из исходного файла (x, y, w, h)
        0, 0, 200, 200   // Куда вставляем на аватарку (x, y, w, h)
      );

      // Сжимаем в Blob и пушим в Supabase
      exportCanvas.toBlob(async (blob) => {
        if (blob) {
          await onSave(blob);
          onClose();
        }
        setIsSaving(false);
      }, 'image/png', 0.95);
    }
  };

  const getConstrainedOffset = (currentX: number, currentY: number, targetZoom: number) => {
    if (!imageObj || !canvasRef.current) return { x: currentX, y: currentY };

    const baseScale = Math.max(200 / imageObj.width, 200 / imageObj.height);
    const currentScale = baseScale * targetZoom;

    const iw = imageObj.width * currentScale;
    const ih = imageObj.height * currentScale;

    const maxOffsetX = Math.max(0, (iw - 200) / 2);
    const maxOffsetY = Math.max(0, (ih - 200) / 2);

    // Зажимаем переданные координаты в новые рамки масштаба
    let fixedX = currentX;
    let fixedY = currentY;

    if (fixedX > maxOffsetX) fixedX = maxOffsetX;
    if (fixedX < -maxOffsetX) fixedX = -maxOffsetX;
    if (fixedY > maxOffsetY) fixedY = maxOffsetY;
    if (fixedY < -maxOffsetY) fixedY = -maxOffsetY;

    return { x: fixedX, y: fixedY };
  };

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#23232e', border: '1px solid #383842', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', animation: 'scaleInCard 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
        <h3 style={{ fontSize: '18px', margin: 0, color: '#fff', fontWeight: '700', alignSelf: 'flex-start' }}>Редактирование фото</h3>
        
        {/* Интерактивный интерактивный холст обрезки */}
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          style={{ 
            backgroundColor: '#13131a', 
            borderRadius: '12px', 
            cursor: isDragging ? 'grabbing' : 'grab', 
            touchAction: 'none' 
          }}
        />

        <p style={{ fontSize: '12px', color: '#a2a2b5', margin: 0, textAlign: 'center' }}>↕ Перетаскивайте фото мышкой для центрирования</p>

        {/* Слайдер Zoom-масштаба */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', padding: '0 10px', boxSizing: 'border-box' }}>
          <span style={{ fontSize: '16px', userSelect: 'none' }}>➖</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={e => {
              const nextZoom = parseFloat(e.target.value);
              setZoom(nextZoom);
              
              const corrected = getConstrainedOffset(offset.x, offset.y, nextZoom);
              setOffset(corrected);
            }}
            style={{ flex: 1, accentColor: '#9d7bf6', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '16px', userSelect: 'none' }}>➕</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', width: '100%', borderTop: '1px solid #383842', paddingTop: '16px' }}>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#b0b0b8', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Отмена</button>
          <button type="button" onClick={handleGenerateCrop} disabled={isSaving} style={{ background: 'none', border: 'none', color: '#9d7bf6', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>
            {isSaving ? 'Сохранение...' : 'Готово'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
function handleAvatarUpload(e: React.MouseEvent<HTMLCanvasElement, MouseEvent>): void {
  throw new Error('Function not implemented.');
}

// ========================================================
// 🎨 10. МОДАЛКА ВЫБОРА ЦВЕТА ИМЕНИ (NameColorSelectorModal)
// ========================================================
interface NameColorSelectorModalProps {
  show: boolean;
  title: string;
  subtitle?: string;
  colors: string[];
  selectedColor: string;
  onClose: () => void;
  onSelect: (color: string) => Promise<void>;
}
export function NameColorSelectorModal({
  show,
  title,
  subtitle,
  colors,
  selectedColor,
  onClose,
  onSelect
}: NameColorSelectorModalProps) {
  const [localColor, setLocalColor] = useState(selectedColor);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setLocalColor(selectedColor || '#5eaddf');
      setIsSaving(false);
    }
  }, [show, selectedColor]);

  if (!show) return null;

  const handleColorClick = async (color: string) => {
    setLocalColor(color);
    setIsSaving(true);
    try {
      await onSelect(color);
      onClose();
    } catch (err) {
      console.error('Ошибка при сохранении цвета имени:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div 
      onClick={onClose} 
      style={{ 
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{ 
          backgroundColor: '#23232e', border: '1px solid #383842', padding: '24px', 
          borderRadius: '16px', width: '100%', maxWidth: '380px', display: 'flex', 
          flexDirection: 'column', gap: '16px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', 
          color: '#fff', fontFamily: 'sans-serif'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '700' }}>{title}</h3>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {subtitle && (
          <p style={{ fontSize: '13px', color: '#a2a2b5', margin: '0 0 4px 0', lineHeight: 1.4 }}>
            {subtitle}
          </p>
        )}

        {/* 🚀 ПАЛИТРА КРУЖОЧКОВ В ОДНУ ЛИНИЮ (КАК НА СКРИНШОТЕ!) */}
        <div 
          style={{ 
            display: 'flex', flexDirection: 'row', flexWrap: 'wrap', 
            gap: '12px', justifyContent: 'center', padding: '10px 0', width: '100%' 
          }}
        >
          {colors.map((color) => {
            const isSelected = localColor.toLowerCase() === color.toLowerCase();
            return (
              <div
                key={color}
                onClick={() => !isSaving && handleColorClick(color)}
                style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: color, cursor: isSaving ? 'not-allowed' : 'pointer',
                  position: 'relative', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', transition: 'transform 0.15s ease',
                  boxShadow: isSelected ? '0 0 12px ' + color : '0 2px 6px rgba(0,0,0,0.3)',
                  border: isSelected ? '3px solid #ffffff' : '2px solid transparent',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={e => !isSelected && (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={e => !isSelected && (e.currentTarget.style.transform = 'scale(1)')}
              >
                {isSelected && (
                  <div 
                    style={{ 
                      width: '6px', height: '6px', borderRadius: '50%', 
                      backgroundColor: '#ffffff', boxShadow: '0 0 4px rgba(0,0,0,0.5)' 
                    }} 
                  />
                )}
              </div>
            );
          })}
        </div>

        {isSaving && <span style={{ color: '#9d7bf6', fontSize: '12px', alignSelf: 'center' }}>Сохранение выбора...</span>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: '14px', borderTop: '1px solid #383842', paddingTop: '14px', marginTop: '4px' }}>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: '#b0b0b8', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}