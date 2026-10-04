import React, { useState } from 'react';
import styles from '../../components/css/settings.module.css'; // Твои оригинальные стили
import chatStyles from '../../components/css/chat-window.module.css'; 
import useMessengerContext from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';

interface EditProfileProps {
  onBack: () => void;
}

export default function EditProfile({ onBack }: { onBack: () => void }) {
  const ctx = useMessengerContext();
  const currentUser = ctx.currentUser;

  const [uniqueId, setUniqueId] = useState(currentUser?.uniqueId || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [aboutMe, setAboutMe] = useState(currentUser?.about_me || '');
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || '#007aff');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const privacyPhone = currentUser?.privacyPhone || 'all';
  const privacyEmail = currentUser?.privacyEmail || 'all';
  const privacyOnline = currentUser?.privacyOnline || 'all';
  const privacyNameFormat = currentUser?.privacyNameFormat || 'username';
  const privacyFullName = currentUser?.privacyFullName || 'all';
  const [previewRole, setPreviewRole] = useState<'contact' | 'stranger'>('contact');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Грузим картинку в созданный нами бакет 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Получаем постоянную публичную ссылку на загруженный файл
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      if (data?.publicUrl) {
        setAvatarUrl(data.publicUrl); // Мгновенно рендерим фотку в превью!
        ctx.showToast('Фото профиля успешно загружено на сервер! 📸', 'success');
      }
    } catch (err: any) {
      console.error(err);
      ctx.showToast(`Ошибка загрузки: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() && !firstName.trim()) {
      ctx.showToast('Ошибка: Должно быть заполнено либо "Отображаемое имя", либо "Имя"!', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          username: username.trim(),
          uniqueId: uniqueId.trim(),
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          about_me: aboutMe.trim() || null,
          avatarUrl: avatarUrl,
          avatarColor,
          updatedAt: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (!error) {
        // Локально обновляем состояние в ядре приложения
        ctx.setCurrentUser({
          ...currentUser,
          username: username.trim(),
          uniqueId: uniqueId.trim(),
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          about_me: aboutMe.trim() || null,
          avatarUrl: avatarUrl,
          avatarColor
        });
        
        ctx.showToast('Профиль успешно сохранен! 👤', 'success');
        onBack();
      } else {
        ctx.showToast(`Ошибка сохранения: ${error.message}`, 'error');
      }
    } catch (err) {
      console.error(err);
      ctx.showToast('Не удалось связаться с базой данных', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const shouldShowFieldInPreview = (setting: string) => {
    if (setting === 'all') return true;
    if (setting === 'none') return false;
    return setting === 'contacts' ? previewRole === 'contact' : true;
  };

  const previewDisplayName = username.trim() !== '' ? username : `@${uniqueId}`;

  return (
    <>
      {/* <div className={styles.settingsInputField} style={{ gap: '16px' }}> */}
        {/* <button onClick={onBack} className={styles.settingsBackBtn}>
          ⬅ Назад к списку
        </button> */}
        
        <form onSubmit={handleFormSubmit} className={styles.settingsFormCard}>
          <div style={{display: "flex", flexDirection: "column", gap: "16px"}}>
            <h3 className={styles.settingsFormTitle}>👤 Личные данные аккаунта</h3>

            {/* Модернизированный селектор аватарки */}
            <div className={styles.settingsInputField}>
              <label className={styles.settingsLabel} htmlFor='avatarColor-input'>Фото профиля (цвет вашей аватарки):</label>
              <div className={styles.settingsColorPickerRow}>
                <input type="color" className={styles.settingsColorCircleInput} value={avatarColor} id='avatarColor-input' onChange={e => setAvatarColor(e.target.value)} />
                <span className={styles.settingsColorHint}>Цвет круга</span>
                
                {/* 🚀 НАСТОЯЩИЙ ИНПУТ ЗАГРУЗКИ ФОТКИ */}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarUpload} 
                  disabled={uploading}
                  style={{ color: '#9ca3af', fontSize: '13px' }}
                />
                {uploading && <span style={{ color: '#007aff', fontSize: '12px' }}>Загрузка файла...</span>}
              </div>
            </div>
            
            <div className={styles.settingsInputField}>
              <label 
                className={styles.settingsLabel}
                htmlFor='username-input'
              >
                Отображаемое имя (Никнейм):
              </label>
              <input 
                type="text" 
                className={styles.settingsInputText}
                value={username}
                id='username-input' 
                onChange={e => setUsername(e.target.value)} 
                placeholder="Введите никнейм"
              />
            </div>
            
            <div style={{display: "flex", justifyContent: "space-between", gap: "20px"}}>
              <div className={styles.settingsInputField} style={{width: "50%"}}>
                <label 
                  className={styles.settingsLabel}
                  htmlFor='firstName-input'
                >
                  Имя:
                </label>
                <input 
                  type="text" 
                  className={styles.settingsInputText}
                  value={firstName} 
                  id='firstName-input'
                  onChange={e => setFirstName(e.target.value)} 
                  placeholder="Введите ваше имя"
                />
              </div>
              <div className={styles.settingsInputField} style={{width: "50%"}}>
                <label 
                  className={styles.settingsLabel}
                  htmlFor='lastName-input'
                >
                  Фамилия:
                </label>
                <input 
                  type="text" 
                  className={styles.settingsInputText}
                  value={lastName} 
                  id='lastName-input'
                  onChange={e => setLastName(e.target.value)} 
                  placeholder="Введите вашу фамилию"
                />
              </div>
            </div>

            <div className={styles.settingsInputField}>
              <label 
                className={styles.settingsLabel}
                htmlFor='uniqueId-input'
              >
                Имя пользователя (ID):
              </label>
              <input 
                type="text" 
                className={styles.settingsInputText}
                value={uniqueId}
                id='uniqueId-input' 
                onChange={e => setUniqueId(e.target.value)} 
                placeholder="Придумайте логин" 
                required
              />
            </div>

            <div className={styles.settingsInputField}>
              <label 
                className={styles.settingsLabel}
                htmlFor='phone-input'
              >
                Номер телефона:
              </label>
              <input 
                type="text" 
                className={styles.settingsInputText}
                value={phone} 
                id='phone-input'
                onChange={e => setPhone(e.target.value)} 
                placeholder="+7 (999) 999-99-99"
              />
            </div>

            <div className={styles.settingsInputField}>
              <label 
                className={styles.settingsLabel}
                htmlFor='email-input'
              >
                Электронная почта:
              </label>
              <input 
                type="email" 
                className={styles.settingsInputText}
                value={email}
                id='email-input' 
                onChange={e => setEmail(e.target.value)} 
                placeholder="example@mail.com"
              />
            </div>

            <div className={styles.settingsInputField}>
              <label className={styles.settingsLabel} htmlFor='aboutMe-input'>О себе:</label>
              <textarea
                id='aboutMe-input'
                className={styles.settingsInputText}
                value={aboutMe}
                onChange={e => setAboutMe(e.target.value)}
                placeholder="Расскажите немного о себе..."
                style={{ resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                maxLength={70}
              />
            </div>
          </div>
          <button type="submit" disabled={isSaving} className={`${styles.settingsSaveBtn} ${styles.blueBtn}`}>
            {isSaving ? 'Сохранение...' : 'Сохранить профиль'}
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
              style={{ flex: 1, border: 'none', borderRadius: '6px', padding: '6px', fontSize: '16px', cursor: 'pointer', backgroundColor: previewRole === 'contact' ? '#007aff' : 'transparent', color: '#fff' }}
            >
              Как контакт
            </button>
            <button 
              type="button" 
              onClick={() => setPreviewRole('stranger')} 
              style={{ flex: 1, border: 'none', borderRadius: '6px', padding: '6px', fontSize: '16px', cursor: 'pointer', backgroundColor: previewRole === 'stranger' ? '#da373c' : 'transparent', color: '#fff' }}
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
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                />
              ) : (
                <div className={chatStyles['profile-avatar']} style={{ backgroundColor: avatarColor }}>
                  {previewDisplayName.substring(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <h2 className={chatStyles['profile-name']}>
              {previewDisplayName}
            </h2>
            <span className={chatStyles['profile-status']} style={{ color: shouldShowFieldInPreview(privacyOnline) ? '#2ec761' : '#707579' }}>
              {shouldShowFieldInPreview(privacyOnline) ? 'в сети' : 'был(а) недавно'}
            </span>
            <div className={chatStyles['info-section']}>
              {privacyNameFormat === 'username' && 
               shouldShowFieldInPreview(privacyFullName) && 
               ((firstName && firstName.trim() !== '') || (lastName && lastName.trim() !== '')) && (
                <div className={chatStyles['info-item']}>
                  <span className={chatStyles['info-value']}>
                    {`${firstName || ''} ${lastName || ''}`.trim()}
                  </span>
                  <span className={chatStyles['info-label']}>Настоящие Имя и Фамилия</span>
                </div>
              )}
              <div className={chatStyles['info-item']}>
                <span className={chatStyles['info-value']}>
                  @{uniqueId || 'не указан'}
                </span>
                <span className={chatStyles['info-label']}>
                  Имя пользователя
                </span>
              </div>
              {aboutMe.trim() !== '' && (
                <div className={chatStyles['info-item']}>
                  <span className={chatStyles['info-value']} style={{ whiteSpace: 'pre-wrap' }}>
                    {aboutMe}
                  </span>
                  <span className={chatStyles['info-label']}>
                    О себе
                  </span>
                </div>
              )}
              {shouldShowFieldInPreview(privacyPhone) && phone && phone.trim() !== '' && (
                <div className={chatStyles['info-item']}>
                  <span className={chatStyles['info-value']}>{phone}</span>
                  <span className={chatStyles['info-label']}>Телефон</span>
                </div>
              )}
              {shouldShowFieldInPreview(privacyEmail) && email && email.trim() !== '' && (
                <div className={chatStyles['info-item']}>
                  <span className={chatStyles['info-value']}>{email}</span>
                  <span className={chatStyles['info-label']}>Электронная почта</span>
                </div>
              )}
              {/* {currentChatUser.privacyNameFormat === 'username' && 
              shouldShowField(currentChatUser.privacyFullName, currentChatUser.isContact) && 
              (currentChatUser.firstName || currentChatUser.lastName) && (
                <div className={styles['info-item']}>
                  <span className={styles['info-value']}>
                    {`${currentChatUser.firstName || ''} ${currentChatUser.lastName || ''}`.trim()}
                  </span>
                  <span className={styles['info-label']}>Настоящие Имя и Фамилия</span>
                </div>
              )} */}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
