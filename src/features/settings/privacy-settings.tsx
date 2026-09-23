import React, { useState } from 'react';
import styles from '../../components/css/settings.module.css';
import useMessengerContext from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';

interface PrivacySettingsProps {
  onBack: () => void;
}

export default function PrivacySettings({ onBack }: PrivacySettingsProps) {
  const ctx = useMessengerContext();
  const currentUser = ctx.currentUser;

  const [isSaving, setIsSaving] = useState(false);
  const [privacyPhone, setPrivacyPhone] = useState(currentUser?.privacyPhone || 'all');
  const [privacyEmail, setPrivacyEmail] = useState(currentUser?.privacyEmail || 'all');
  const [privacyOnline, setPrivacyOnline] = useState(currentUser?.privacyOnline || 'all');
  const [privacyNameFormat, setPrivacyNameFormat] = useState(currentUser?.privacyNameFormat || 'username');
  const [privacyFullName, setPrivacyFullName] = useState(currentUser?.privacyFullName || 'all');
  const [privacySearch, setPrivacySearch] = useState(currentUser?.privacySearch || 'all');

  const handlePrivacySubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    try {
      // 🚀 ОБНОВЛЯЕМ ПАРАМЕТРЫ КОНФИДЕНЦИАЛЬНОСТИ В SUPABASE
      const { error } = await supabase
        .from('users')
        .update({
          privacyPhone,
          privacyEmail,
          privacyOnline,
          privacyNameFormat,
          privacyFullName,
          privacySearch,
          updatedAt: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (!error) {
        ctx.setCurrentUser({
          ...currentUser,
          privacyPhone,
          privacyEmail,
          privacyOnline,
          privacyNameFormat,
          privacyFullName,
          privacySearch
        });
        ctx.showToast('Настройки приватности успешно сохранены! 🔒', 'success');
        onBack();
      } else {
        ctx.showToast(`Ошибка сохранения: ${error.message}`, 'error');
      }
    } catch (err) {
      console.error(err);
      ctx.showToast('Не удалось связаться с сервером.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.settingsInputField} style={{ gap: '16px' }}>
      <button onClick={onBack} className={styles.settingsBackBtn}>
        ⬅ Назад к списку
      </button>
      
      <form onSubmit={handlePrivacySubmit} className={styles.settingsFormCard} style={{ gap: '20px' }}>
        <h3 className={styles.settingsFormTitle}>🔒 Конфиденциальность</h3>
        
        <div className={styles.privacyItemRow}>
          <div className={styles.privacyTextInfo}>
            <span className={styles.privacyTextTitle}>Кто видит мой номер телефона:</span>
            <span className={styles.privacyTextSubtitle}>Скрывает ваш номер в модальном окне профиля.</span>
          </div>
          <select value={privacyPhone} onChange={e => setPrivacyPhone(e.target.value)} className={styles.privacySelectInput}>
            <option value="all">Все пользователи</option>
            <option value="contacts">Только мои контакты</option>
            <option value="none">Никто</option>
          </select>
        </div>

        <div className={styles.privacyItemRow}>
          <div className={styles.privacyTextInfo}>
            <span className={styles.privacyTextTitle}>Кто видит, что я в сети:</span>
            <span className={styles.privacyTextSubtitle}>Отключает отображение зеленого индикатора онлайна.</span>
          </div>
          <select value={privacyOnline} onChange={e => setPrivacyOnline(e.target.value)} className={styles.privacySelectInput}>
            <option value="all">Все пользователи</option>
            <option value="contacts">Только мои контакты</option>
            <option value="none">Никто</option>
          </select>
        </div>

        <div className={styles.privacyItemRow}>
          <div className={styles.privacyTextInfo}>
            <span className={styles.privacyTextTitle}>Кто видит мою эл. почту:</span>
            <span className={styles.privacyTextSubtitle}>Скрывает email в карточке вашего профиля.</span>
          </div>
          <select value={privacyEmail} onChange={e => setPrivacyEmail(e.target.value)} className={styles.privacySelectInput}>
            <option value="all">Все пользователи</option>
            <option value="contacts">Только мои контакты</option>
            <option value="none">Никто</option>
          </select>
        </div>

        <div className={`${styles.privacyItemRow} ${styles.privacyNoBorder}`}>
          <div className={styles.privacyTextInfo}>
            <span className={styles.privacyTextTitle}>Отображение имени в чатах:</span>
            <span className={styles.privacyTextSubtitle}>
              Выбирает, что увидят пользователи <b>(у которых вы не в контактах)</b> в заголовках и списках диалогов — ваш логин или настоящее имя.
            </span>
          </div>
          <select value={privacyNameFormat} onChange={e => setPrivacyNameFormat(e.target.value)} className={styles.privacySelectInput}>
            <option value="username">Показывать никнейм</option>
            <option value="full_name">Показывать имя и фамилию</option>
          </select>
        </div>

        {/* 🚀 ДИНАМИЧЕСКИЙ ПРЕВЬЮ-БЛОК В СТИЛЕ ТЕЛЕГРАМА */}
        <div className={`${styles.privacyItemRow} ${styles.privacyPreviewNick}`} >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              backgroundColor: currentUser?.avatarColor || '#007aff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '14px'
            }}>
              {privacyNameFormat === 'full_name' && (currentUser?.firstName || currentUser?.lastName)
                ? (currentUser?.firstName || currentUser?.lastName).substring(0, 1).toUpperCase()
                : (currentUser?.username || currentUser?.uniqueId || 'U').substring(0, 1).toUpperCase()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontSize: '12px', color: '#a2a2b5', fontWeight: '500', marginBottom: '2px' }}>
                👀 Так вас увидят другие пользователи:
              </span>
              <span style={{ fontSize: '15px', color: '#fff', fontWeight: 'bold' }}>
                {privacyNameFormat === 'full_name'
                  ? (`${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || currentUser?.username)
                  : (currentUser?.username || `@${currentUser?.uniqueId}`)}
              </span>
              <span style={{ fontSize: '13px', color: '#8e8e93', marginTop: '2px' }}>
                Привет! Я использую этот мессенджер...
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#636366', alignSelf: 'flex-start' }}>23:13</span>
          </div>
        </div>

        <div className={`${styles.privacyItemRow} ${styles.privacyTopBorder}`}>
          <div className={styles.privacyTextInfo}>
            <span className={styles.privacyTextTitle}>Кто видит моё имя и фамилию:</span>
            <span className={styles.privacyTextSubtitle}>Скрывает или показывает реальное имя и фамилию в модальном окне вашего профиля.</span>
          </div>
          <select value={privacyFullName} onChange={e => setPrivacyFullName(e.target.value)} className={styles.privacySelectInput}>
            <option value="all">Все пользователи</option>
            <option value="contacts">Только мои контакты</option>
            <option value="none">Никто</option>
          </select>
        </div>
        
        {/* 🚀 НОВЫЙ БЛОК: ВИДИМОСТЬ ДЛЯ ПОИСКА */}
        <div className={styles.privacyItemRow}>
          <div className={styles.privacyTextInfo}>
            <span className={styles.privacyTextTitle}>Кто может найти меня по поиску:</span>
            <span className={styles.privacyTextSubtitle}>Разрешает или запрещает незнакомцам находить ваш аккаунт по логину во вкладке контактов.</span>
          </div>
          <select value={privacySearch} onChange={e => setPrivacySearch(e.target.value)} className={styles.privacySelectInput}>
            <option value="all">Глобальный поиск</option>
            <option value="none">Скрыть из поиска</option>
          </select>
        </div>

        <button 
          type="submit" disabled={isSaving} 
          className={`${styles.settingsSaveBtn} ${styles.greenBtn}`}
        >
          {isSaving ? 'Применение...' : 'Применить настройки приватности'}
        </button>
      </form>
    </div>
  );
}
