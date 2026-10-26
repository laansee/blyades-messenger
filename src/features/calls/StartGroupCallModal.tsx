import { Volume2, Radio, X } from 'lucide-react';
import styles from '../../components/css/calls.module.css';

interface StartGroupCallModalProps {
  show: boolean;
  groupName: string;
  onClose: () => void;
  onStart: (isSilent: boolean) => void;
}

export default function StartGroupCallModal({ show, groupName, onClose, onStart }: StartGroupCallModalProps) {
  if (!show) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={`${styles.modalCard} ${styles.startCallModalCard}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.startCallModalHeader}>
          <h3 className={styles.modalTitle}>Голосовой чат в беседе</h3>
          <button type="button" onClick={onClose} className={styles.modalCloseBtn}>
            <X size={20} />
          </button>
        </div>

        <p className={styles.startCallDescription}>
          Выберите способ запуска созвона для «{groupName}»:
        </p>

        <div className={styles.startCallActions}>
          <button
            type="button"
            onClick={() => onStart(false)}
            className={styles.startCallOptionBtn}
          >
            <div className={`${styles.startCallOptionIcon} ${styles.optionIconCall}`}>
              <Volume2 size={20} color="#fff" />
            </div>
            <div>
              <div className={styles.startCallOptionTitle}>Вызов для всех</div>
              <div className={styles.startCallOptionSubtitle}>У всех участников зазвонит экран входящего вызова</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onStart(true)}
            className={styles.startCallOptionBtn}
          >
            <div className={`${styles.startCallOptionIcon} ${styles.optionIconSilent}`}>
              <Radio size={20} color="#fff" />
            </div>
            <div>
              <div className={styles.startCallOptionTitle}>Начать без уведомления</div>
              <div className={styles.startCallOptionSubtitle}>Создаст комнату. Участники смогут войти добровольно</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}