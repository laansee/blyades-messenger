import React from 'react';
import styles from './css/global-ui.module.css'; // Твой CSS-модуль для UI

// Описание типов для Уведомлений (Toast)
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
      /* 🚀 ИСПРАВЛЕНИЕ: active пишем как чистую строку, чтобы CSS-модуль его не сожрал */
      className={`${styles['toast-container']} ${toast.show ? 'active' : ''} ${styles[toast.type] || ''}`}
      style={{
        /* 🎯 ЖЕЛЕЗНЫЙ ПРЕДОХРАНИТЕЛЬ: если в стейте false — полностью выключаем элемент из видимости */
        right: toast.show ? '20px' : '-380px'
      }}
    >
      <span className={styles['toast-icon']}>{getIcon()}</span>
      <span className={styles['toast-message']}>{toast.message}</span>
    </div>
  );
}

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
