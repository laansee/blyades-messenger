import React, { useState } from 'react';
import styles from '../../components/css/settings.module.css'; // Твои оригинальные стили
import useMessengerContext from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';
import { 
  EditorModal, EditorInputField, 
  PrivacySelectorModal, PrivacyOption 
} from '../../components/GlobalUI';
import { User } from 'lucide-react';

export default function EditProfile({ onBack, state, setters }: any) {
  const ctx = useMessengerContext();
  const currentUser = ctx.currentUser;

  // Извлекаем стейты и сетнеры из верхнего компонента
  const { uniqueId, username, firstName, lastName, email, phone, aboutMe, avatarColor, avatarUrl } = state;
  const { setUniqueId, setUsername, setFirstName, setLastName, setEmail, setPhone, setAboutMe, setAvatarColor, setAvatarUrl } = setters;
  
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    fields: EditorInputField[];
    initialValues: Record<string, string>;
    onSave: (values: Record<string, string>) => Promise<void>;
  }>({
    show: false,
    title: '',
    fields: [],
    initialValues: {},
    onSave: async () => {}
  });
  
    // Локальный стейт конфигурации модального окна выбора
    const [radioModalConfig, setRadioModalConfig] = useState<{
      show: boolean;
      title: string;
      subtitle: string;
      options: PrivacyOption[];
      selectedValue: string;
      onSelect: (value: string) => Promise<void>;
    }>({
      show: false,
      title: '',
      subtitle: '',
      options: [],
      selectedValue: '',
      onSelect: async () => {}
    });

  // Вспомогательный метод открытия модалки под конкретную строку
  const openEditor = (type: 'name' | 'username' | 'phone' | 'email' | 'about') => {
    let title = '';
    let fields: EditorInputField[] = [];
    let initialValues: Record<string, string> = {};
    let onSaveAction = async (values: Record<string, string>) => {};

    if (type === 'name') {
      title = 'Редактирование имени';
      fields = [
        { key: 'firstName', label: 'Имя', placeholder: 'Введите ваше имя' },
        { key: 'lastName', label: 'Фамилия', placeholder: 'Введите вашу фамилию' }
      ];
      initialValues = { firstName, lastName };
      onSaveAction = async (v) => {
        const { error } = await supabase.from('users').update({ firstName: v.firstName.trim() || null, lastName: v.lastName.trim() || null }).eq('id', currentUser.id);
        if (!error) {
          setFirstName(v.firstName.trim());
          setLastName(v.lastName.trim());
          ctx.setCurrentUser({ ...currentUser, firstName: v.firstName.trim() || null, lastName: v.lastName.trim() || null });
          ctx.showToast('Имя успешно обновлено', 'success');
        }
      };
    } else if (type === 'username') {
      title = 'Изменить имя пользователя';
      fields = [
        { key: 'username', label: 'Отображаемое имя (Никнейм)', placeholder: 'Никнейм' },
        { key: 'uniqueId', label: 'Имя пользователя (ID)', placeholder: 'Логин', required: true } as any
      ];
      initialValues = { username, uniqueId };
      onSaveAction = async (v) => {
        if (!v.uniqueId.trim()) return;
        const { error } = await supabase.from('users').update({ username: v.username.trim(), uniqueId: v.uniqueId.trim() }).eq('id', currentUser.id);
        if (!error) {
          setUsername(v.username.trim());
          setUniqueId(v.uniqueId.trim());
          ctx.setCurrentUser({ ...currentUser, username: v.username.trim(), uniqueId: v.uniqueId.trim() });
          ctx.showToast('Идентификаторы обновлены', 'success');
        }
      };
    } else if (type === 'phone') {
      title = 'Изменить номер телефона';
      fields = [{ key: 'phone', label: 'Номер телефона', type: 'tel', placeholder: '+7...' }];
      initialValues = { phone };
      onSaveAction = async (v) => {
        const { error } = await supabase.from('users').update({ phone: v.phone.trim() || null }).eq('id', currentUser.id);
        if (!error) {
          setPhone(v.phone.trim());
          ctx.setCurrentUser({ ...currentUser, phone: v.phone.trim() || null });
          ctx.showToast('Телефон сохранен', 'success');
        }
      };
    } else if (type === 'email') {
      title = 'Изменить электронную почту';
      fields = [{ key: 'email', label: 'Электронная почта', type: 'email', placeholder: 'mail@example.com' }];
      initialValues = { email };
      onSaveAction = async (v) => {
        const { error } = await supabase.from('users').update({ email: v.email.trim() || null }).eq('id', currentUser.id);
        if (!error) {
          setEmail(v.email.trim());
          ctx.setCurrentUser({ ...currentUser, email: v.email.trim() || null });
          ctx.showToast('Почта сохранена', 'success');
        }
      };
    } else if (type === 'about') {
      title = 'О себе';
      fields = [{ key: 'aboutMe', label: 'Любые подробности, например: возраст, род занятий...', type: 'textarea', maxLength: 70 }];
      initialValues = { aboutMe };
      onSaveAction = async (v) => {
        const { error } = await supabase.from('users').update({ about_me: v.aboutMe.trim() || null }).eq('id', currentUser.id);
        if (!error) {
          setAboutMe(v.aboutMe.trim());
          ctx.setCurrentUser({ ...currentUser, about_me: v.aboutMe.trim() || null });
          ctx.showToast('Информация "О себе" обновлена', 'success');
        }
      };
    }

    setModalConfig({ show: true, title, fields, initialValues, onSave: onSaveAction });
  };
  
  const openPrivacySelector = () => {
    let title = 'Цвет имени';
    let subtitle = '';
    let options = [
      { value: '#5eaddf', label: '#5eaddf' },
      { value: '#7aca7c', label: '#7aca7c' },
      { value: '#e49553', label: '#e49553' },
      { value: '#e45a63', label: '#e45a63' },
      { value: '#a580de', label: '#a580de' },
      { value: '#5bc1d1', label: '#5bc1d1' },
      { value: '#e8508a', label: '#e8508a' }
    ];
    let selectedValue = '';
    let onSelectAction = async (val: string) => {};

    // onSelectAction = async (val) => {
    //   const { error } = await supabase.from('users').update({ privacySearch: val, updatedAt: new Date().toISOString() }).eq('id', currentUser.id);
    //   if (!error) {
    //     setPrivacySearch(val);
    //     ctx.setCurrentUser({ ...currentUser, privacySearch: val });
    //     ctx.showToast('Настройки обнаружения аккаунта изменены', 'success');
    //   }
    // };

    setRadioModalConfig({ show: true, title, subtitle, options, selectedValue, onSelect: onSelectAction });
  };
  
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        
        ctx.showToast('Профиль успешно сохранен!', 'success');
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      ctx.showToast('Загрузка аватарки...', 'info');
      setUploading(true);

      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      if (data?.publicUrl) {
        const { error: dbError } = await supabase.from('users')
          .update({ avatarUrl: data.publicUrl })
          .eq('id', currentUser.id);
        if (dbError) throw dbError;

        setAvatarUrl(data.publicUrl);
        ctx.setCurrentUser({ ...currentUser, avatarUrl: data.publicUrl });
        ctx.showToast('Фото успешно сохранено! 📸', 'success');
      }
    } catch (err: any) {
      console.error(err);
      ctx.showToast(`Ошибка загрузки: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>        
      <form onSubmit={handleFormSubmit} className={styles.settingsFormCard} style={{ width: 'stretch' }}>
        <h3 className={styles.settingsFormTitle}>
          <User/>
          Личные данные аккаунта
        </h3>

        {/* Модернизированный селектор аватарки */}
        <div className={styles.settingsInputField}>
          <label className={styles.settingsLabel} htmlFor='avatarColor-input'>Фото профиля:</label>
          <div className={styles.settingsColorPickerRow}>
            {/* <input type="color" className={styles.settingsColorCircleInput} value={avatarColor} id='avatarColor-input' onChange={e => setAvatarColor(e.target.value)} />
            <span className={styles.settingsColorHint}>Цвет круга</span> */}
            
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

        {/*  */}
        {/* <div className={styles.settingsInputField}>
          <h6 className={styles.settingsLabel}>Цвет имени</h6>
          <div>
            <button style={{background: '#5eaddf'}}>/</button>
            <button style={{background: '#7aca7c'}}>/</button>
            <button style={{background: '#e49553'}}>/</button>
            <button style={{background: '#e45a63'}}>/</button>
            <button style={{background: '#a580de'}}>/</button>
            <button style={{background: '#5bc1d1'}}>/</button>
            <button style={{background: '#e8508a'}}>/</button>
          </div>
        </div> */}

        <div className={styles.settingsFormFields}>
          {/* Строка 1: Имя и Фамилия */}
          <div 
            onClick={() => openEditor('name')} 
            className={styles.settingsFormInput}
          >
            <div className={styles.settingsFormInputText}>
              <span className={styles.settingsFormInputTitle}>Имя</span>
              <span className={styles.settingsFormInputValue}>{`${firstName || ''} ${lastName || ''}`.trim() || 'Не указано'}</span>
            </div>
            <span className={styles.settingsFormInputArrow}>▶</span>
          </div>

          {/* Строка 2: Логины и никнеймы */}
          <div 
            onClick={() => openEditor('username')} 
            className={styles.settingsFormInput}
          >
            <div className={styles.settingsFormInputText}>
              <span className={styles.settingsFormInputTitle}>Имя пользователя (ID / Никнейм)</span>
              <span className={styles.settingsFormInputValue}>@{uniqueId} {username && `(${username})`}</span>
            </div>
            <span className={styles.settingsFormInputArrow}>▶</span>
          </div>

          {/*  */}
          {/* <div 
            onClick={() => openPrivacySelector()} 
            className={styles.settingsFormInput}
          >
            <div className={styles.settingsFormInputText}>
              <span className={styles.settingsFormInputTitle}>Цвет имени</span>
              <span className={styles.settingsFormInputValue}>@{uniqueId} {username && `(${username})`}</span>
            </div>
            <span className={styles.settingsFormInputArrow}>▶</span>
          </div> */}

          {/* Строка 3: Номер телефона */}
          <div 
            onClick={() => openEditor('phone')} 
            className={styles.settingsFormInput}
          >
            <div className={styles.settingsFormInputText}>
              <span className={styles.settingsFormInputTitle}>Номер телефона</span>
              <span className={styles.settingsFormInputValue}>{phone || 'Не указан'}</span>
            </div>
            <span className={styles.settingsFormInputArrow}>▶</span>
          </div>

          {/* Строка 4: Почта */}
          <div 
            onClick={() => openEditor('email')} 
            className={styles.settingsFormInput}
          >
            <div className={styles.settingsFormInputText}>
              <span className={styles.settingsFormInputTitle}>Электронная почта</span>
              <span className={styles.settingsFormInputValue}>{email || 'Не указана'}</span>
            </div>
            <span className={styles.settingsFormInputArrow}>▶</span>
          </div>

          {/* Строка 5: О себе */}
          <div 
            onClick={() => openEditor('about')} 
            className={styles.settingsFormInput}
          >
            <div className={styles.settingsFormInputText}>
              <span className={styles.settingsFormInputTitle}>О себе</span>
              <span className={styles.settingsFormInputValue}>{aboutMe || 'Расскажите о себе...'}</span>
            </div>
            <span className={styles.settingsFormInputArrow}>▶</span>
          </div>
        </div>

        {/* 🛡️ НАША ЖИВАЯ УНИВЕРСАЛЬНАЯ МОДАЛКА */}
        <EditorModal
          show={modalConfig.show}
          title={modalConfig.title}
          fields={modalConfig.fields}
          initialValues={modalConfig.initialValues}
          onClose={() => setModalConfig(prev => ({ ...prev, show: false }))}
          onSave={modalConfig.onSave}
        />
        <PrivacySelectorModal
          show={radioModalConfig.show}
          title={radioModalConfig.title}
          subtitle={radioModalConfig.subtitle}
          options={radioModalConfig.options}
          selectedValue={radioModalConfig.selectedValue}
          onClose={() => setRadioModalConfig(prev => ({ ...prev, show: false }))}
          onSelect={radioModalConfig.onSelect}
        />
      </form>
    </>
  );
}
