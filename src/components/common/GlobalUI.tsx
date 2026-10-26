import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useMessengerContext from '../../context/messengerContext';
import GlobalUIStyles from '../css/global-ui.module.css';
import { Plus, X } from 'lucide-react';

export function useModalAnimation(show: boolean, onClose?: () => void, duration = 200) {
  const [mounted, setMounted] = useState(show);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (show) {
      setMounted(true);
      setIsClosing(false);
    } else if (mounted) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setIsClosing(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose?.();
      setMounted(false);
      setIsClosing(false);
    }, duration);
  };

  // 🎯 Универсальное закрытие по Escape для всех модалок, использующих анимацию
  useEffect(() => {
    if (!mounted || isClosing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mounted, isClosing]);

  return { mounted, isClosing, handleClose };
}

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
export interface ConfirmState {
  show: boolean;
  title: string;
  text: string;
  isDanger?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmModalProps {
  confirm: ConfirmState;
  setConfirm: React.Dispatch<React.SetStateAction<ConfirmState>>;
}

export function ConfirmModal({ confirm, setConfirm }: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const { mounted, isClosing, handleClose } = useModalAnimation(
    confirm.show, 
    () => {
      setLoading(false);
      setConfirm(prev => ({ ...prev, show: false }));
    }, 
    200
  );

  useEffect(() => {
    if (!confirm.show) {
      setLoading(false);
    }
  }, [confirm.show]);

  const handleConfirmClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (confirm.onConfirm) {
        await confirm.onConfirm();
      }
      handleClose();
    } catch (err) {
      console.error('Ошибка в ConfirmModal:', err);
      setLoading(false);
    }
  };

  // ⌨️ Обработка нажатий клавиш: Enter (подтвердить) и Escape (отмена)
  useEffect(() => {
    if (!confirm.show || loading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleConfirmClick();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirm.show, loading, confirm.onConfirm]);

  if (!mounted) return null;

  const activeClass = !isClosing ? `${GlobalUIStyles['active'] || ''} active` : '';

  return createPortal(
    <div 
      className={`${GlobalUIStyles['confirm-overlay']} ${activeClass}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999999,
        pointerEvents: isClosing ? 'none' : 'auto'
      }}
      onClick={() => {
        if (!loading) handleClose();
      }}
    >
      <div 
        className={GlobalUIStyles['confirm-card']} 
        style={{
          position: 'relative',
          zIndex: 10000000,
          pointerEvents: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className={GlobalUIStyles['confirm-title']}>{confirm.title}</h3>
        <p className={GlobalUIStyles['confirm-text']}>{confirm.text}</p>
        <div className={GlobalUIStyles['confirm-footer']}>
          <button 
            type="button"
            className={GlobalUIStyles['confirm-btn-cancel']}
            onClick={handleClose}
            disabled={loading}
            style={{ 
              opacity: loading ? 0.5 : 1, 
              cursor: loading ? 'not-allowed' : 'pointer' 
            }}
          >
            Отмена
          </button>
          <button 
            type="button"
            autoFocus
            className={confirm.isDanger ? GlobalUIStyles['confirm-btn-danger'] : GlobalUIStyles['confirm-btn-primary']}
            onClick={handleConfirmClick}
            disabled={loading}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              minWidth: '110px',
              opacity: loading ? 0.75 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading && (
              <span 
                className={GlobalUIStyles['button-spinner']} 
                style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                  display: 'inline-block'
                }}
              />
            )}
            <span>{loading ? 'Удаление...' : 'Подтвердить'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ========================================================
// 3. 🗂️ ВЫПАДАЮЩИЙ СПИСОК ДЕЙСТВИЙ (DropdownMenu)
// ========================================================
export interface DropdownItem {
  id: string;
  text: string;
  tabIndex?: number;
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
  const { mounted, isClosing, handleClose } = useModalAnimation(show, onClose, 150);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickedTrigger = target.closest('.dropdown-trigger-btn');
      if (mounted && menuRef.current && !menuRef.current.contains(target) && !clickedTrigger) {
        handleClose();
      }
    };
    
    if (mounted) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [mounted]);

  if (!mounted) return null;

  const isAbsoluteMode = x === 0 && y === 0;

  return (
    <div 
      ref={menuRef}
      className={GlobalUIStyles.dropdown}
      style={{
        position: isAbsoluteMode ? 'absolute' : 'fixed',
        top: isAbsoluteMode ? 'calc(100% + 8px)' : `${y}px`,
        right: isAbsoluteMode ? 0 : undefined,
        left: isAbsoluteMode ? undefined : `${x}px`,
        zIndex: 35000,
        display: 'block',
        animation: `${isClosing ? 'modalScaleOut' : 'modalScaleIn'} 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards`
      }}
      tabIndex={999999}
    >
      <div className={GlobalUIStyles['dropdown-list']}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              tabIndex={item.tabIndex ?? 0}
              onClick={() => { item.onClick(); handleClose(); }}
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
// 📝 4. УНИВЕРСАЛЬНАЯ МОДАЛКА РЕДАКТИРОВАНИЯ (EditorModal)
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
  const { mounted, isClosing, handleClose } = useModalAnimation(show, onClose, 200);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setValues(initialValues || {});
      setIsSaving(false);
    }
  }, [show, initialValues]);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(values);
      handleClose();
    } catch (err) {
      console.error('Ошибка сохранения в EditorModal:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div 
      onClick={handleClose} 
      className={GlobalUIStyles['sModal-background']}
      style={{
        animation: `${isClosing ? 'modalFadeOut' : 'modalFadeIn'} 0.2s ease forwards`
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        className={GlobalUIStyles['sModal-container']}
        style={{
          animation: `${isClosing ? 'modalScaleOut' : 'modalScaleIn'} 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards`
        }}
      >
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

                {field.maxLength && (
                  <span className={GlobalUIStyles['sModal-counter']}>
                    {field.maxLength - currentValue.length}
                  </span>
                )}
              </div>
            );
          })}

          <div className={GlobalUIStyles['sModal-buttons']}>
            <button type="button" onClick={handleClose}>
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
// 🔒 5. МОДАЛКА ВЫБОРА НАСТРОЕК ПРИВАТНОСТИ (PrivacySelectorModal)
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
  const { mounted, isClosing, handleClose } = useModalAnimation(show, onClose, 200);
  const [localValue, setLocalValue] = useState(selectedValue);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setLocalValue(selectedValue);
      setIsSaving(false);
    }
  }, [show, selectedValue]);

  if (!mounted) return null;

  const handleRadioClick = async (val: string) => {
    setLocalValue(val);
    setIsSaving(true);
    try {
      await onSelect(val);
      handleClose();
    } catch (err) {
      console.error('Ошибка сохранения приватности:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div 
      onClick={handleClose} 
      className={GlobalUIStyles['sModal-background']}
      style={{
        animation: `${isClosing ? 'modalFadeOut' : 'modalFadeIn'} 0.2s ease forwards`
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        className={GlobalUIStyles['sModal-container']}
        style={{
          animation: `${isClosing ? 'modalScaleOut' : 'modalScaleIn'} 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards`
        }}
      >
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
                  style={{ cursor: isSaving ? 'not-allowed' : 'pointer' }}
                  className={GlobalUIStyles['sModal-radio-value']} 
                >
                  {/* Кастомная круглая радио-кнопка */}
                  <div style={{ border: isSelected ? '2px solid #9d7bf6' : '2px solid #636366' }} className={GlobalUIStyles['sModal-radio-circle']}>
                    {isSelected && <div className={GlobalUIStyles['sModal-radio-isSelected']} />}
                  </div>
                  <span style={{ fontWeight: isSelected ? '600' : '500', color: isSelected ? '#fff' : '#dbdee1' }}>
                    {opt.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={GlobalUIStyles['sModal-buttons']}>
            <button type="button" onClick={handleClose}>
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
// 📸 6. МОДАЛКА ВЫБОРА И ДРОП-ЗОНЫ АВАТАРА (AvatarUploadSelectorModal)
// ========================================================
export type AvatarUploadTarget = 'users' | 'groups' | 'channels';

interface AvatarUploadSelectorModalProps {
  show: boolean;
  avatarUrl: string | null;
  avatarColor: string;
  isDragOver: boolean;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setAvatarColor: (color: string) => void;
  onClose: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onColorSelect: (color: string) => Promise<void>;
  targetType?: AvatarUploadTarget;
  title?: string;
  showColorPalette?: boolean;
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
  onColorSelect,
  targetType = 'users',
  title,
  showColorPalette = true,
}: AvatarUploadSelectorModalProps) {
  const { mounted, isClosing, handleClose } = useModalAnimation(show, onClose, 200);

  if (!mounted) return null;

  const displayTitle = title || (
    targetType === 'users' ? 'Снимок профиля' :
    targetType === 'groups' ? 'Аватар беседы' : 'Аватар канала'
  );

  const avatarPalette = [
    '#ba4c47', '#c36f24', '#8957ca', '#3c9c22',
    '#37a5b1', '#3380c1', '#b64c82', '#798896'
  ];

  return createPortal(
    <div 
      onClick={handleClose} 
      style={{ 
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999,
        animation: `${isClosing ? 'modalFadeOut' : 'modalFadeIn'} 0.2s ease forwards`
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{ 
          backgroundColor: '#23232e', border: '1px solid #383842', padding: '24px', 
          borderRadius: '16px', width: '100%', maxWidth: '380px', display: 'flex', 
          flexDirection: 'column', alignItems: 'center', gap: '20px', 
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)', color: '#fff', fontFamily: 'sans-serif',
          animation: `${isClosing ? 'modalScaleOut' : 'modalScaleIn'} 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '700' }}>{displayTitle}</h3>
          <button 
            type="button" 
            onClick={handleClose} 
            style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', fontSize: '20px' }}
          >
            <X/>
          </button>
        </div>

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
            <img 
              src={avatarUrl} 
              alt="Preview" 
              style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #383842' }} 
            />
          ) : (
            <div style={{ 
              width: '70px', height: '70px', borderRadius: '50%', 
              backgroundColor: avatarColor, display: 'flex', alignItems: 'center', 
              justifyContent: 'center', fontSize: '28px', fontWeight: 'bold' 
            }}>
              📸
            </div>
          )}

          <div style={{ textAlign: 'center', padding: '0 10px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: isDragOver ? '#9d7bf6' : '#fff', display: 'block', marginBottom: '4px' }}>
              {isDragOver ? '💥 Бросайте сюда фото!' : 'Перетащите изображение или кликните'}
            </span>
            <span style={{ fontSize: '11px', color: '#a2a2b5' }}>PNG, JPG до 5 МБ</span>
          </div>
        </div>

        {uploading && <span style={{ color: '#9d7bf6', fontSize: '13px' }}>Обработка файла...</span>}

        {showColorPalette && (
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
                  />
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: '14px', borderTop: '1px solid #383842', paddingTop: '14px' }}>
          <button type="button" onClick={handleClose} style={{ background: 'none', border: 'none', color: '#b0b0b8', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ========================================================
// ✂️ 7. МОДАЛКА ОБРЕЗКИ И МАСШТАБИРОВАНИЯ АВАТАРА (AvatarCropModal)
// ========================================================
interface AvatarCropModalProps {
  show: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onSave: (croppedBlob: Blob) => Promise<void>;
}

export function AvatarCropModal({ show, imageSrc, onClose, onSave }: AvatarCropModalProps) {
  const { mounted, isClosing, handleClose } = useModalAnimation(show && Boolean(imageSrc), onClose, 200);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 100;

    const baseScale = Math.max(200 / imageObj.width, 200 / imageObj.height);
    const currentScale = baseScale * zoom;

    const iw = imageObj.width * currentScale;
    const ih = imageObj.height * currentScale;

    const x = cx - iw / 2 + offset.x;
    const y = cy - ih / 2 + offset.y;

    ctx.globalAlpha = 0.3;
    ctx.drawImage(imageObj, x, y, iw, ih);

    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(imageObj, x, y, iw, ih);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#9d7bf6';
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [imageObj, zoom, offset]);

  if (!mounted || !imageSrc) return null;

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !imageObj || !canvasRef.current) return;
    
    const baseScale = Math.max(200 / imageObj.width, 200 / imageObj.height);
    const currentScale = baseScale * zoom;

    const iw = imageObj.width * currentScale;
    const ih = imageObj.height * currentScale;

    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;

    const maxOffsetX = Math.max(0, (iw - 200) / 2);
    const maxOffsetY = Math.max(0, (ih - 200) / 2);

    if (newX > maxOffsetX) newX = maxOffsetX;
    if (newX < -maxOffsetX) newX = -maxOffsetX;
    if (newY > maxOffsetY) newY = maxOffsetY;
    if (newY < -maxOffsetY) newY = -maxOffsetY;

    setOffset({ x: newX, y: newY });
  };

  const handleGenerateCrop = async () => {
    if (!canvasRef.current || !imageObj) return;
    setIsSaving(true);

    const canvas = canvasRef.current;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 200;
    exportCanvas.height = 200;
    const eCtx = exportCanvas.getContext('2d');

    if (eCtx) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const baseScale = Math.max(200 / imageObj.width, 200 / imageObj.height);
      const currentScale = baseScale * zoom;

      const iw = imageObj.width * currentScale;
      const ih = imageObj.height * currentScale;

      const renderX = cx - iw / 2 + offset.x;
      const renderY = cy - ih / 2 + offset.y;

      const sx = (cx - 100 - renderX) / currentScale;
      const sy = (cy - 100 - renderY) / currentScale;
      const sw = 200 / currentScale;
      const sh = 200 / currentScale;

      eCtx.drawImage(imageObj, sx, sy, sw, sh, 0, 0, 200, 200);

      exportCanvas.toBlob(async (blob) => {
        if (blob) {
          await onSave(blob);
          handleClose();
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

    let fixedX = currentX;
    let fixedY = currentY;

    if (fixedX > maxOffsetX) fixedX = maxOffsetX;
    if (fixedX < -maxOffsetX) fixedX = -maxOffsetX;
    if (fixedY > maxOffsetY) fixedY = maxOffsetY;
    if (fixedY < -maxOffsetY) fixedY = -maxOffsetY;

    return { x: fixedX, y: fixedY };
  };

  return createPortal(
    <div 
      onClick={handleClose} 
      style={{ 
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
        backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999,
        animation: `${isClosing ? 'modalFadeOut' : 'modalFadeIn'} 0.2s ease forwards`
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{ 
          backgroundColor: '#23232e', border: '1px solid #383842', padding: '24px', 
          borderRadius: '16px', width: '100%', maxWidth: '380px', display: 'flex', 
          flexDirection: 'column', alignItems: 'center', gap: '20px', 
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          animation: `${isClosing ? 'modalScaleOut' : 'modalScaleIn'} 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards`
        }}
      >
        <h3 style={{ fontSize: '18px', margin: 0, color: '#fff', fontWeight: '700', alignSelf: 'flex-start' }}>Редактирование фото</h3>
        
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          style={{ backgroundColor: '#13131a', borderRadius: '12px', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        />

        <p style={{ fontSize: '12px', color: '#a2a2b5', margin: 0, textAlign: 'center' }}>↕ Перетаскивайте фото мышкой для центрирования</p>

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
          <span style={{ fontSize: '16px', userSelect: 'none' }}><Plus/></span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', width: '100%', borderTop: '1px solid #383842', paddingTop: '16px' }}>
          <button type="button" onClick={handleClose} style={{ background: 'none', border: 'none', color: '#b0b0b8', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Отмена</button>
          <button type="button" onClick={handleGenerateCrop} disabled={isSaving} style={{ background: 'none', border: 'none', color: '#9d7bf6', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>
            {isSaving ? 'Сохранение...' : 'Готово'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ========================================================
// 🎨 8. МОДАЛКА ВЫБОРА ЦВЕТА ИМЕНИ (NameColorSelectorModal)
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
  const { mounted, isClosing, handleClose } = useModalAnimation(show, onClose, 200);
  const [localColor, setLocalColor] = useState(selectedColor);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setLocalColor(selectedColor || '#5eaddf');
      setIsSaving(false);
    }
  }, [show, selectedColor]);

  if (!mounted) return null;

  const handleColorClick = async (color: string) => {
    setLocalColor(color);
    setIsSaving(true);
    try {
      await onSelect(color);
      handleClose();
    } catch (err) {
      console.error('Ошибка при сохранении цвета имени:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div 
      onClick={handleClose} 
      style={{ 
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999,
        animation: `${isClosing ? 'modalFadeOut' : 'modalFadeIn'} 0.2s ease forwards`
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{ 
          backgroundColor: '#23232e', border: '1px solid #383842', padding: '24px', 
          borderRadius: '16px', width: '100%', maxWidth: '380px', display: 'flex', 
          flexDirection: 'column', gap: '16px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', 
          color: '#fff', fontFamily: 'sans-serif',
          animation: `${isClosing ? 'modalScaleOut' : 'modalScaleIn'} 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '700' }}>{title}</h3>
          <button 
            type="button" 
            onClick={handleClose} 
            style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}
          >
            <X/>
          </button>
        </div>

        {subtitle && (
          <p style={{ fontSize: '13px', color: '#a2a2b5', margin: '0 0 4px 0', lineHeight: 1.4 }}>
            {subtitle}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', padding: '10px 0', width: '100%' }}>
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
              >
                {isSelected && (
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ffffff', boxShadow: '0 0 4px rgba(0,0,0,0.5)' }} />
                )}
              </div>
            );
          })}
        </div>

        {isSaving && <span style={{ color: '#9d7bf6', fontSize: '12px', alignSelf: 'center' }}>Сохранение выбора...</span>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: '14px', borderTop: '1px solid #383842', paddingTop: '14px', marginTop: '4px' }}>
          <button 
            type="button" 
            onClick={handleClose} 
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

// ========================================================
// 👥 9. МОДАЛКА ДОБАВЛЕНИЯ УЧАСТНИКОВ В БЕСЕДУ (AddParticipantsModal)
// ========================================================
interface AddParticipantsModalProps {
  show: boolean;
  existingUserIds: string[];
  onClose: () => void;
  onAdd: (selectedIds: string[]) => Promise<void>;
}

export function AddParticipantsModal({ show, existingUserIds, onClose, onAdd }: AddParticipantsModalProps) {
  const ctx = useMessengerContext();
  const { mounted, isClosing, handleClose } = useModalAnimation(show, onClose, 200);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, onClose]);

  useEffect(() => {
    if (show) {
      setSelectedUsers([]);
      setIsSaving(false);
    }
  }, [show]);

  if (!mounted) return null;

  const toggleUserSelection = (userUuid: string) => {
    setSelectedUsers(prev =>
      prev.includes(userUuid) ? prev.filter(id => id !== userUuid) : [...prev, userUuid]
    );
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) return;
    setIsSaving(true);
    try {
      await onAdd(selectedUsers);
      handleClose();
    } catch (err) {
      console.error('Ошибка при добавлении участников:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const availableContacts = (ctx.chats || []).filter((c: any) => {
    const isNotGroup = !c.isGroup && c.type !== 'group' && c.type !== 'channel';
    const userUuid = String(c.partnerId || c.uuid || '');
    const isAlreadyInGroup = userUuid && existingUserIds.map(String).includes(userUuid);
    return isNotGroup && userUuid && !isAlreadyInGroup;
  });

  return createPortal(
    <div 
      onClick={handleClose} 
      style={{ 
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999,
        animation: `${isClosing ? 'modalFadeOut' : 'modalFadeIn'} 0.2s ease forwards`
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{ 
          backgroundColor: '#23232e', border: '1px solid #383842', padding: '24px', 
          borderRadius: '16px', width: '100%', maxWidth: '360px', display: 'flex', 
          flexDirection: 'column', gap: '20px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', 
          color: '#fff', fontFamily: 'sans-serif',
          animation: `${isClosing ? 'modalScaleOut' : 'modalScaleIn'} 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '700' }}>Добавить в беседу</h3>
          <button type="button" onClick={handleClose} style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>

        <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Выберите контакты ({selectedUsers.length})
            </label>
            
            <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#18181e', border: '1px solid #2b2d31', borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {availableContacts.length === 0 ? (
                <div style={{ color: '#636366', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  Все ваши доступные контакты уже добавлены в эту беседу
                </div>
              ) : (
                availableContacts.map((user: any) => {
                  const userUuid = String(user.partnerId || user.uuid || user.id);
                  const isChecked = selectedUsers.includes(userUuid);

                  return (
                    <div 
                      key={userUuid} 
                      onClick={() => toggleUserSelection(userUuid)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderRadius: '6px', cursor: 'pointer', backgroundColor: isChecked ? 'rgba(157, 123, 246, 0.08)' : 'transparent', transition: 'background-color 0.15s ease' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: user.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '12px' }}>
                          {user.name ? user.name.substring(0, 1).toUpperCase() : 'U'}
                        </div>
                        <span style={{ color: isChecked ? '#fff' : '#dbdee1', fontSize: '14px', fontWeight: isChecked ? '600' : '500' }}>
                          {user.name || user.username}
                        </span>
                      </div>
                      
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: isChecked ? 'none' : '2px solid #3a3a3c', backgroundColor: isChecked ? '#9d7bf6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}>
                        {isChecked && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}>✓</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid #383842', paddingTop: '14px', marginTop: '4px' }}>
            <button type="button" onClick={handleClose} style={{ background: 'none', border: 'none', color: '#b0b0b8', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
              Отмена
            </button>
            <button type="submit" disabled={selectedUsers.length === 0 || isSaving} style={{ background: 'none', border: 'none', color: selectedUsers.length === 0 ? '#4e4e5a' : '#9d7bf6', cursor: selectedUsers.length === 0 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '700' }}>
              {isSaving ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
