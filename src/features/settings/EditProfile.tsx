import { useState, useRef } from 'react';
import styles from '../../components/css/settings.module.css';
import useMessengerContext from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';
import { userService } from '../../services/userService';
import { 
  EditorModal, 
  type EditorInputField,
  AvatarCropModal,
  AvatarUploadSelectorModal,
  NameColorSelectorModal
} from '../../components/common/GlobalUI';

export default function EditProfile({ state, setters }: any) {
  const ctx = useMessengerContext();
  const currentUser = ctx.currentUser;
  const userUuid = String(currentUser?.uuid || currentUser?.id);

  const { uniqueId, username, firstName, lastName, email, phone, aboutMe, avatarColor, avatarUrl, nameColor } = state;
  const { setUniqueId, setUsername, setFirstName, setLastName, setEmail, setPhone, setAboutMe, setAvatarColor, setAvatarUrl, setNameColor } = setters;
  
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
    setColorModalConfig({
      show: true,
      selectedColor: nameColor || currentUser?.nameColor || '#5eaddf'
    });
  };

  const handleSaveNameColor = async (chosenColor: string) => {
    const res = await userService.updateNameColor(userUuid, chosenColor);
    if (res.success) {
      if (setNameColor) setNameColor(chosenColor);
      ctx.setCurrentUser({ ...currentUser, nameColor: chosenColor });
      ctx.showToast('Цвет имени успешно обновлён! 🎨', 'success');
    } else {
      ctx.showToast(`Ошибка смены цвета: ${res.error}`, 'error');
    }
  };

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

  const saveCroppedAvatar = async (croppedBlob: Blob) => {
    try {
      ctx.showToast('Загрузка аватарки в облако...', 'info');
      const fileName = `users/${userUuid}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      if (data?.publicUrl) {
        const freshUrl = data.publicUrl;
        const res = await userService.updateAvatar(userUuid, freshUrl);
          
        if (!res.success) throw new Error(res.error);

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

  const openEditor = (type: 'name' | 'username' | 'phone' | 'email' | 'about') => {
    let titleModal = '';
    let fields: EditorInputField[] = [];
    let initialValues: Record<string, string> = {};
    let onSaveAction = async (_values: Record<string, string>) => {};

    if (type === 'name') {
      titleModal = 'Редактирование имени';
      fields = [
        { key: 'firstName', label: 'Имя', placeholder: 'Введите ваше имя' },
        { key: 'lastName', label: 'Фамилия', placeholder: 'Введите вашу фамилию' }
      ];
      initialValues = { firstName, lastName };
      onSaveAction = async (v) => {
        const payload = { 
          firstName: v.firstName.trim() || null, 
          lastName: v.lastName.trim() || null 
        };
        const res = await userService.updateProfile(userUuid, payload);
        if (res.success) {
          setFirstName(v.firstName.trim());
          setLastName(v.lastName.trim());
          ctx.setCurrentUser({ ...currentUser, ...payload });
          ctx.showToast('Имя успешно обновлено', 'success');
        } else {
          ctx.showToast(`Ошибка: ${res.error}`, 'error');
        }
      };
    } else if (type === 'username') {
      titleModal = 'Изменить имя пользователя';
      fields = [
        { key: 'username', label: 'Отображаемое имя (Никнейм)', placeholder: 'Никнейм' },
        { key: 'uniqueId', label: 'Имя пользователя (ID)', placeholder: 'Логин' }
      ];
      initialValues = { username, uniqueId };
      onSaveAction = async (v) => {
        if (!v.uniqueId.trim()) {
          ctx.showToast('Логин не может быть пустым', 'warning');
          return;
        }
        
        try {
          await supabase.auth.updateUser({
            data: { display_name: v.username.trim() }
          });

          const payload = { 
            username: v.username.trim(), 
            uniqueId: v.uniqueId.trim() 
          };
          const res = await userService.updateProfile(userUuid, payload);

          if (res.success) {
            setUsername(v.username.trim());
            setUniqueId(v.uniqueId.trim());
            ctx.setCurrentUser({ ...currentUser, ...payload });
            ctx.showToast('Идентификаторы обновлены', 'success');
          } else {
            throw new Error(res.error);
          }
        } catch (err: any) {
          ctx.showToast(`Ошибка сохранения: ${err.message}`, 'error');
        }
      };
    } else if (type === 'phone') {
      titleModal = 'Изменить номер телефона';
      fields = [{ key: 'phone', label: 'Номер телефона', type: 'tel', placeholder: '+7...' }];
      initialValues = { phone };
      onSaveAction = async (v) => {
        const payload = { phone: v.phone.trim() || null };
        const res = await userService.updateProfile(userUuid, payload);
        if (res.success) {
          setPhone(v.phone.trim());
          ctx.setCurrentUser({ ...currentUser, ...payload });
          ctx.showToast('Телефон сохранен', 'success');
        } else {
          ctx.showToast(`Ошибка: ${res.error}`, 'error');
        }
      };
    } else if (type === 'email') {
      titleModal = 'Изменить электронную почту';
      fields = [{ key: 'email', label: 'Электронная почта', type: 'email', placeholder: 'mail@example.com' }];
      initialValues = { email };
      onSaveAction = async (v) => {
        const payload = { email: v.email.trim() || null };
        const res = await userService.updateProfile(userUuid, payload);
        if (res.success) {
          setEmail(v.email.trim());
          ctx.setCurrentUser({ ...currentUser, ...payload });
          ctx.showToast('Почта сохранена', 'success');
        } else {
          ctx.showToast(`Ошибка: ${res.error}`, 'error');
        }
      };
    } else if (type === 'about') {
      titleModal = 'О себе';
      fields = [{ key: 'aboutMe', label: 'Любые подробности, например: возраст, род занятий...', type: 'textarea', maxLength: 70 }];
      initialValues = { aboutMe };
      onSaveAction = async (v) => {
        const payload = { aboutMe: v.aboutMe.trim() || null };
        const res = await userService.updateProfile(userUuid, payload);
        if (res.success) {
          setAboutMe(v.aboutMe.trim());
          ctx.setCurrentUser({ ...currentUser, ...payload });
          ctx.showToast('Информация "О себе" обновлена', 'success');
        } else {
          ctx.showToast(`Ошибка: ${res.error}`, 'error');
        }
      };
    }

    setModalConfig({ show: true, title: titleModal, fields, initialValues, onSave: onSaveAction });
  };

  // const handleFormSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!username.trim() && !firstName.trim()) {
  //     ctx.showToast('Ошибка: Должно быть заполнено либо "Отображаемое имя", либо "Имя"!', 'error');
  //     return;
  //   }
  //   setIsSaving(true);
  //   try {
  //     const { error } = await supabase
  //       .from('users')
  //       .update({
  //         username: username.trim(),
  //         uniqueId: uniqueId.trim(),
  //         firstName: firstName.trim() || null,
  //         lastName: lastName.trim() || null,
  //         email: email.trim() || null,
  //         phone: phone.trim() || null,
  //         aboutMe: aboutMe.trim() || null,
  //         avatarUrl: avatarUrl,
  //         avatarColor,
  //         updatedAt: new Date().toISOString()
  //       })
  //       .eq('uuid', currentUser.uuid);

  //     if (!error) {
  //       ctx.setCurrentUser({
  //         ...currentUser,
  //         username: username.trim(),
  //         uniqueId: uniqueId.trim(),
  //         firstName: firstName.trim() || null,
  //         lastName: lastName.trim() || null,
  //         email: email.trim() || null,
  //         phone: phone.trim() || null,
  //         aboutMe: aboutMe.trim() || null,
  //         avatarUrl: avatarUrl,
  //         avatarColor
  //       });
        
  //       ctx.showToast('Профиль успешно сохранен!', 'success');
  //       onBack();
  //     } else {
  //       ctx.showToast(`Ошибка сохранения: ${error.message}`, 'error');
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     ctx.showToast('Не удалось связаться с базой данных', 'error');
  //   } finally {
  //     setIsSaving(false);
  //   }
  // };

  return (
    <div className={styles.settingsFormCard} style={{ width: '100%' }}>
      <div className={styles.settingsFormFields}>
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

        <div 
          onClick={() => openEditor('name')} 
          className={styles.settingsFormInput}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.settingsFormInputText}>
            <span className={styles.settingsFormInputTitle}>Имя</span>
            <span className={styles.settingsFormInputValue}>{`${firstName || ''} ${lastName || ''}`.trim() || 'Не указано'}</span>
          </div>
          <span className={styles.settingsFormInputArrow}>▶</span>
        </div>

        <div 
          onClick={() => openEditor('username')} 
          className={styles.settingsFormInput}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.settingsFormInputText}>
            <span className={styles.settingsFormInputTitle}>Имя пользователя (ID / Никнейм)</span>
            <span className={styles.settingsFormInputValue}>@{uniqueId} {username && `(${username})`}</span>
          </div>
          <span className={styles.settingsFormInputArrow}>▶</span>
        </div>

        <div 
          onClick={openNameColorSelector} 
          className={styles.settingsFormInput}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.settingsFormInputText}>
            <span className={styles.settingsFormInputTitle}>Цвет имени</span>
            <span 
              className={styles.settingsFormInputValue} 
              style={{ color: nameColor || currentUser?.nameColor || '#5eaddf', fontWeight: 'bold' }}
            >
              {nameColor || currentUser?.nameColor || '#5eaddf'}
            </span>
          </div>
          <span className={styles.settingsFormInputArrow}>▶</span>
        </div>

        <div 
          onClick={() => openEditor('phone')} 
          className={styles.settingsFormInput}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.settingsFormInputText}>
            <span className={styles.settingsFormInputTitle}>Номер телефона</span>
            <span className={styles.settingsFormInputValue}>{phone || 'Не указан'}</span>
          </div>
          <span className={styles.settingsFormInputArrow}>▶</span>
        </div>

        <div 
          onClick={() => openEditor('email')} 
          className={styles.settingsFormInput}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.settingsFormInputText}>
            <span className={styles.settingsFormInputTitle}>Электронная почта</span>
            <span className={styles.settingsFormInputValue}>{email || 'Не указана'}</span>
          </div>
          <span className={styles.settingsFormInputArrow}>▶</span>
        </div>

        <div 
          onClick={() => openEditor('about')} 
          className={styles.settingsFormInput}
          style={{ cursor: 'pointer', borderBottom: 'none' }}
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
        fileInputRef={fileInputRef as any}
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
          const res = await userService.updateProfile(userUuid, { avatarColor: chosenColor });
          if (res.success) {
            ctx.setCurrentUser({ ...currentUser, avatarColor: chosenColor });
            ctx.showToast('Базовый цвет аватарки сохранён! 🎨', 'success');
          } else {
            ctx.showToast(`Ошибка сохранения цвета: ${res.error}`, 'error');
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
    </div>
  );
}
