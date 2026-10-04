import React, { useState, useEffect } from 'react';
import styles from '../../components/css/settings.module.css';
import chatStyles from '../../components/css/chat-window.module.css';
import useMessengerContext from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';

export default function PrivacySettings({ onBack }: { onBack: () => void }) {
  const ctx = useMessengerContext();
  const currentUser = ctx.currentUser;

  const [isSaving, setIsSaving] = useState(false);
  const [previewRole, setPreviewRole] = useState<'contact' | 'stranger'>('contact');

  // Локальные стейты приватности
  const [uniqueId, setUniqueId] = useState(currentUser?.uniqueId || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || '#007aff');
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
      const { error } = await supabase
        .from('users')
        .update({ privacyPhone, privacyEmail, privacyOnline, privacyNameFormat, privacyFullName, privacySearch, updatedAt: new Date().toISOString() })
        .eq('id', currentUser.id);

      if (!error) {
        ctx.setCurrentUser({ ...currentUser, privacyPhone, privacyEmail, privacyOnline, privacyNameFormat, privacyFullName, privacySearch });
        ctx.showToast('Настройки приватности сохранены! 🔒', 'success');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const shouldShowFieldInPreview = (setting: string) => {
    if (setting === 'all') return true;
    if (setting === 'none') return false;
    return setting === 'contacts' ? previewRole === 'contact' : true;
  };

  const previewDisplayName = privacyNameFormat === 'full_name' && (currentUser?.firstName || currentUser?.lastName)
    ? `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim()
    : (currentUser?.username || `@${currentUser?.uniqueId}`);

  return (
    <>
      {/* <div className={styles.settingsInputField} style={{ gap: '16px' }}> */}
        {/* <button onClick={onBack} className={styles.settingsBackBtn}>
          ⬅ Назад к списку
        </button> */}
        
        <form onSubmit={handlePrivacySubmit} className={styles.settingsFormCard} style={{ gap: '20px' }}>
          <h3 className={styles.settingsFormTitle}>🔒 Конфиденциальность</h3>
          
          <div className={styles.privacyItemRow}>
            <div className={styles.privacyTextInfo}>
              <span className={styles.privacyTextTitle}>Кто видит мой номер телефона:</span>
              <span className={styles.privacyTextSubtitle}>Скрывает ваш номер в модальном окне профиля.</span>
            </div>
            <select 
              value={privacyPhone} 
              id='privacyPhone'
              onChange={e => setPrivacyPhone(e.target.value)} 
              className={styles.privacySelectInput}
            >
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
            <select 
              value={privacyOnline}
              id='privacyOnline' 
              onChange={e => setPrivacyOnline(e.target.value)} 
              className={styles.privacySelectInput}
            >
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
            <select 
              value={privacyEmail} 
              id='privacyEmail'
              onChange={e => setPrivacyEmail(e.target.value)} 
              className={styles.privacySelectInput}
            >
              <option value="all">Все пользователи</option>
              <option value="contacts">Только мои контакты</option>
              <option value="none">Никто</option>
            </select>
          </div>

          <div className={`${styles.privacyItemRow} ${styles.privacyNoBorder}`}>
            <div className={styles.privacyTextInfo}>
              <span className={styles.privacyTextTitle}>Отображение имени в чатах:</span>
              <span className={styles.privacyTextSubtitle}>
                Выбирает, что увидят пользователи в заголовках и списках диалогов — ваш логин или настоящее имя.
                {/* 💡 Динамические подсказки для пользователя */}
                {(!currentUser?.username || currentUser?.username.trim() === '' || currentUser?.username === 'NULL') && (
                  <b style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>⚠️ Заблокировано: у вас не заполнен никнейм в профиле.</b>
                )}
                {((!currentUser?.firstName || currentUser?.firstName.trim() === '' || currentUser?.firstName === 'NULL') &&
                  (!currentUser?.lastName || currentUser?.lastName.trim() === '' || currentUser?.lastName === 'NULL')) && (
                  <b style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>⚠️ Заблокировано: у вас не заполнены имя и фамилия в профиле.</b>
                )}
              </span>
            </div>
            <select 
              value={privacyNameFormat} 
              onChange={e => handleNameFormatChange(e.target.value)} 
              className={styles.privacySelectInput}
              disabled={
                (!currentUser?.username || currentUser?.username.trim() === '' || currentUser?.username === 'NULL') ||
                ((!currentUser?.firstName || currentUser?.firstName.trim() === '' || currentUser?.firstName === 'NULL') &&
                (!currentUser?.lastName || currentUser?.lastName.trim() === '' || currentUser?.lastName === 'NULL'))
              }
              style={{
                opacity: (
                  (!currentUser?.username || currentUser?.username.trim() === '' || currentUser?.username === 'NULL') ||
                  ((!currentUser?.firstName || currentUser?.firstName.trim() === '' || currentUser?.firstName === 'NULL') &&
                  (!currentUser?.lastName || currentUser?.lastName.trim() === '' || currentUser?.lastName === 'NULL'))
                ) ? 0.4 : 1,
                cursor: (
                  (!currentUser?.username || currentUser?.username.trim() === '' || currentUser?.username === 'NULL') ||
                  ((!currentUser?.firstName || currentUser?.firstName.trim() === '' || currentUser?.firstName === 'NULL') &&
                  (!currentUser?.lastName || currentUser?.lastName.trim() === '' || currentUser?.lastName === 'NULL'))
                ) ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s ease'
              }}
            >
              <option value="username">Показывать никнейм</option>
              <option value="full_name">Показывать имя и фамилию</option>
            </select>
          </div>

          {/* 🚀 ДИНАМИЧЕСКИЙ ПРЕВЬЮ-БЛОК В СТИЛЕ ТЕЛЕГРАМА */}
          {/* <div className={`${styles.privacyItemRow} ${styles.privacyPreviewNick}`} >
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
          </div> */}

          <div className={`${styles.privacyItemRow} ${styles.privacyBothBorder}`}>
            <div className={styles.privacyTextInfo}>
              <span className={styles.privacyTextTitle}>Кто видит моё имя и фамилию:</span>
              <span className={styles.privacyTextSubtitle}>Скрывает или показывает реальное имя и фамилию в модальном окне вашего профиля.</span>
            </div>
            <select 
              value={privacyFullName} 
              id='privacyFullName'
              onChange={e => setPrivacyFullName(e.target.value)} 
              className={styles.privacySelectInput}
              disabled={privacyNameFormat === 'full_name'}
              style={{
                opacity: privacyNameFormat === 'full_name' ? 0.4 : 1,
                cursor: privacyNameFormat === 'full_name' ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s ease'
              }}
            >
              <option value="all">Все пользователи</option>
              <option value="contacts">Только мои контакты</option>
              <option value="none">Никто</option>
            </select>
          </div>
          
          <div className={styles.privacyItemRow}>
            <div className={styles.privacyTextInfo}>
              <span className={styles.privacyTextTitle}>Кто может найти меня по поиску:</span>
              <span className={styles.privacyTextSubtitle}>Разрешает или запрещает незнакомцам находить ваш аккаунт по логину во вкладке контактов.</span>
            </div>
            <select 
              value={privacySearch} 
              id='privacySearch'
              onChange={e => setPrivacySearch(e.target.value)} 
              className={styles.privacySelectInput}
            >
              <option value="all">Глобальный поиск</option>
              <option value="none">Скрыть из поиска</option>
            </select>
          </div>

          <div className={styles.privacyItemRow}>
            <div className={styles.privacyTextInfo}>
              <span className={styles.privacyTextTitle}>Кто видит фото профиля:</span>
              <span className={styles.privacyTextSubtitle}>
                НЕ ГОТОВО {/* Скрывает email в карточке вашего профиля. */}
              </span>
            </div>
            <select 
              // value={privacyEmail} 
              // id='privacyEmail'
              // onChange={e => setPrivacyEmail(e.target.value)} 
              className={styles.privacySelectInput}
            >
              <option value="all">Все пользователи</option>
              <option value="contacts">Только мои контакты</option>
              <option value="none">Никто</option>
            </select>
          </div>

          <button 
            type="submit" disabled={isSaving} 
            className={`${styles.settingsSaveBtn} ${styles.greenBtn}`}
          >
            {isSaving ? 'Применение...' : 'Применить настройки приватности'}
          </button>
        </form>
      {/* </div> */}
      <div style={{ padding: '24px', boxSizing: 'border-box', display: "grid", gridTemplateRows: "93px auto 93px", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: '14px', textTransform: 'uppercase', color: '#8e8e93', fontWeight: 'bold', display: 'block', marginBottom: '16px' }}>
            👁️ Предпросмотр профиля:
          </span>

          <div style={{ display: 'flex', backgroundColor: '#1e1f22', padding: '3px', borderRadius: '8px' }}>
            <button 
              type="button" 
              onClick={() => setPreviewRole('contact')} 
              style={{ flex: 1, border: 'none', borderRadius: '6px', padding: '6px', fontSize: '12px', cursor: 'pointer', backgroundColor: previewRole === 'contact' ? '#007aff' : 'transparent', color: '#fff' }}
            >
              Как контакт
            </button>
            <button 
              type="button" 
              onClick={() => setPreviewRole('stranger')} 
              style={{ flex: 1, border: 'none', borderRadius: '6px', padding: '6px', fontSize: '12px', cursor: 'pointer', backgroundColor: previewRole === 'stranger' ? '#da373c' : 'transparent', color: '#fff' }}
            >
              Незнакомец
            </button>
          </div>
        </div>

        <div style={{ height: "-webkit-fill-available", display: "flex", justifyContent: "center", background: "#532e2e", borderRadius: "25px", alignItems: "center" }}>
          <div 
            className={chatStyles['profile-modal-card']} 
            style={{ width: '380px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'none' }}
          >
            <div className={chatStyles['profile-avatar-wrapper']}>
              <div className={chatStyles['profile-avatar']} style={{ backgroundColor: avatarColor }}>
                {previewDisplayName.substring(0, 1).toUpperCase()}
              </div>
            </div>
            <h2 className={chatStyles['profile-name']}>
              {previewDisplayName}
            </h2>
            <span className={chatStyles['profile-status']} style={{ color: shouldShowFieldInPreview(privacyOnline) ? '#2ec761' : '#707579' }}>
              {shouldShowFieldInPreview(privacyOnline) ? 'в сети' : 'был(а) недавно'}
            </span>
            <div className={chatStyles['info-section']}>
              <div className={chatStyles['info-item']}>
                <span className={chatStyles['info-value']}>
                  @{uniqueId || 'не указан'}
                </span>
                <span className={chatStyles['info-label']}>
                  Имя пользователя
                </span>
              </div>
              <div className={chatStyles['info-item']}>
                <span className={chatStyles['info-value']}>
                  {/* @{desc || 'не указан'} */}
                  не указан
                </span>
                <span className={chatStyles['info-label']}>
                  [ТЕСТОВЫЙ БЛОК] О себе:
                </span>
              </div>
              {phone.trim() !== '' && <div className={chatStyles['info-item']}>
                <span className={chatStyles['info-value']}>
                  {phone}
                </span>
                <span className={chatStyles['info-label']}>
                  Телефон
                </span>
              </div>}
              {email.trim() !== '' && <div className={chatStyles['info-item']}>
                <span className={chatStyles['info-value']}>
                  {email}
                </span>
                <span className={chatStyles['info-label']}>
                  Электронная почта
                </span>
              </div>}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
