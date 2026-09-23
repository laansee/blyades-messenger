import styles from './css/global-ui.module.css';

export function PageLoader() {
  return (
    <div className={styles['page-loader-overlay']}>
      <div className={styles['page-spinner']}></div>
      <div className={styles['page-loader-text']}>Загрузка...</div>
    </div>
  );
}
