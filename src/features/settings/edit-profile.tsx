import React, { useState, useRef } from 'react';
import styles from '../../components/css/settings.module.css'; // Твои оригинальные стили
import useMessengerContext from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';
import { 
  EditorModal, EditorInputField,
  AvatarCropModal,
  AvatarUploadSelectorModal,
  NameColorSelectorModal
} from '../../components/GlobalUI';
import { User } from 'lucide-react';

export default function EditProfile({ onBack, state, setters }: any) {
  const ctx = useMessengerContext();
  const currentUser = ctx.currentUser;

  // Извлекаем стейты и сетнеры из верхнего компонента
  const { uniqueId, username, firstName, lastName, email, phone, aboutMe, avatarColor, avatarUrl } = state;
  const { setUniqueId, setUsername, setFirstName, setLastName, setEmail, setPhone, setAboutMe, setAvatarColor, setAvatarUrl } = setters;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showUploadSelector, setShowUploadSelector] = useState(false);
  const [colorModalConfig, setColorModalConfig] = useState<{
    show: boolean;
    selectedColor: string;
  }>({
    show: false,
    selectedColor: '#5eaddf'
  });

  const openNameColorSelector = () => {
    // Подтягиваем текущий цвет из глобального контекста юзера, либо ставим дефолтный голубой
    const currentColor = currentUser?.nameColor || '#5eaddf';
    setColorModalConfig({
      show: true,
      selectedColor: currentColor
    });
  };

  // Колбэк, который срабатывает при клике по кружочку в палитре
  const handleSaveNameColor = async (chosenColor: string) => {
    const { error } = await supabase
      .from('users')
      .update({ nameColor: chosenColor, updatedAt: new Date().toISOString() })
      .eq('id', currentUser.id);

    if (!error) {
      // Обновляем ядро мессенджера, чтобы имя мгновенно перекрасилось во всех чатах!
      ctx.setCurrentUser({ ...currentUser, nameColor: chosenColor });
      ctx.showToast('Цвет имени успешно обновлён! 🎨', 'success');
    } else {
      ctx.showToast(`Ошибка смены цвета: ${error.message}`, 'error');
    }
  };

  // 🚀 ОБРАБОТЧИК ФАЙЛОВ ИЗ ДРОП-ЗОНЫ ИЛИ ИНПУТА
  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      ctx.showToast('Ошибка: Можно загружать только изображения!', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setShowUploadSelector(false);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  // 🚀 СОХРАНЕНИЕ ОБРЕЗАННОГО СЖАТОГО BLOB В СТОРАДЖ SUPABASE
  const saveCroppedAvatar = async (croppedBlob: Blob) => {
    try {
      ctx.showToast('Загрузка аватарки в облако...', 'info');
      const fileName = `${currentUser.id}-${Date.now()}.png`;

      // 1. Отправляем Blob напрямую в бакет 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      // 2. Достаем постоянную публичную ссылку
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      if (data?.publicUrl) {
        const freshUrl = data.publicUrl;

        // 3. Синхронизируем ячейку в таблице пользователей
        const { error: dbError } = await supabase.from('users').update({ avatarUrl: freshUrl }).eq('id', currentUser.id);
        if (dbError) throw dbError;

        setAvatarUrl(freshUrl);
        ctx.setCurrentUser({ ...currentUser, avatarUrl: freshUrl });
        ctx.showToast('Новое фото профиля успешно применено! 📸', 'success');
      }
    } catch (err: any) {
      console.error(err);
      ctx.showToast(`Ошибка сохранения: ${err.message}`, 'error');
    }
  };

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
        const { error } = await supabase.from('users').update({ aboutMe: v.aboutMe.trim() || null }).eq('id', currentUser.id);
        if (!error) {
          setAboutMe(v.aboutMe.trim());
          ctx.setCurrentUser({ ...currentUser, aboutMe: v.aboutMe.trim() || null });
          ctx.showToast('Информация "О себе" обновлена', 'success');
        }
      };
    }

    setModalConfig({ show: true, title, fields, initialValues, onSave: onSaveAction });
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
          aboutMe: aboutMe.trim() || null,
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
          aboutMe: aboutMe.trim() || null,
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

  return (
    <>        
      <form onSubmit={handleFormSubmit} className={styles.settingsFormCard} style={{ width: 'stretch' }}>
        <h3 className={styles.settingsFormTitle}>
          <User/>
          Личные данные аккаунта
        </h3>

        <div className={styles.settingsFormFields}>


          {/*  */}
          <div 
            onClick={() => setShowUploadSelector(true)} 
            className={styles.settingsFormInput}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.settingsFormInputText}>
              <span className={styles.settingsFormInputTitle}>Фото</span>
              <span className={styles.settingsFormInputValue}>Сменить...</span>
            </div>
            <span className={styles.settingsFormInputArrow}>▶</span>
          </div>


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
          <div 
            onClick={openNameColorSelector} 
            className={styles.settingsFormInput}
          >
            <div className={styles.settingsFormInputText}>
              <span className={styles.settingsFormInputTitle}>Цвет имени</span>
              <span 
                className={styles.settingsFormInputValue} 
                style={{ color: currentUser?.nameColor || '#5eaddf', fontWeight: 'bold' }}
              >
                {currentUser?.nameColor || '#5eaddf'}
              </span>
            </div>
            <span className={styles.settingsFormInputArrow}>▶</span>
          </div>

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

        <EditorModal
          show={modalConfig.show}
          title={modalConfig.title}
          fields={modalConfig.fields}
          initialValues={modalConfig.initialValues}
          onClose={() => setModalConfig(prev => ({ ...prev, show: false }))}
          onSave={modalConfig.onSave}
        />
        <AvatarUploadSelectorModal
          show={showUploadSelector}
          avatarUrl={avatarUrl}
          avatarColor={avatarColor}
          isDragOver={isDragOver}
          uploading={false}
          fileInputRef={fileInputRef}
          setAvatarColor={setAvatarColor}
          onClose={() => setShowUploadSelector(false)}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              processSelectedFile(e.dataTransfer.files[0]);
            }
          }}
          onFileSelect={(e) => e.target.files && e.target.files.length > 0 && processSelectedFile(e.target.files[0])}
          onColorSelect={async (chosenColor: string) => {
            const { error } = await supabase
              .from('users')
              .update({ avatarColor: chosenColor, updatedAt: new Date().toISOString() })
              .eq('id', currentUser.id);

            if (!error) {
              ctx.setCurrentUser({ ...currentUser, avatarColor: chosenColor });
              ctx.showToast('Базовый цвет аватарки сохранён! 🎨', 'success');
            } else {
              ctx.showToast(`Ошибка сохранения цвета: ${error.message}`, 'error');
            }
          }}
        />
        <AvatarCropModal 
          show={showCropModal} 
          imageSrc={rawImageSrc} 
          onClose={() => { setShowCropModal(false); setRawImageSrc(null); }} 
          onSave={saveCroppedAvatar} 
        />
        <NameColorSelectorModal
          show={colorModalConfig.show}
          title="Предпросмотр цвета"
          subtitle="Выберите цвет, которым будут выделяться Ваше имя."
          colors={[
            '#5eaddf',
            '#7aca7c',
            '#e49553',
            '#e45a63',
            '#a580de',
            '#5bc1d1',
            '#e8508a'
          ]}
          selectedColor={colorModalConfig.selectedColor}
          onClose={() => setColorModalConfig(prev => ({ ...prev, show: false }))}
          onSelect={handleSaveNameColor}
        />
      </form>
    </>
  );
}
