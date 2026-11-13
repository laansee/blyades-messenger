import { useState, useRef, useEffect } from 'react';
import styles from '../../components/css/settings.module.css';
import useMessengerContext from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';
import { userService, getUserPrivacy } from '../../services/userService';
import { 
  getProfileTheme, 
  getNameColor, 
  getProfileColor 
} from '../../utils/themeColors';
import ColorSettingsModal from '../../components/modals/edit/ColorSettingsModal';
import { 
  EditorModal, 
  type EditorInputField,
  AvatarCropModal,
  AvatarUploadSelectorModal,
} from '../../components/common/GlobalUI';
import { 
  Camera, 
  ChevronRight, 
  User as UserIcon, 
  Phone as PhoneIcon, 
  AtSign, 
  Mail, 
  Palette,
  Sparkles
} from 'lucide-react';
import SmartAvatar from '../../components/common/SmartAvatar';

export default function EditProfile({ state, setters }: any) {
  const ctx = useMessengerContext();
  const currentUser = ctx.currentUser;
  const userUuid = String(currentUser?.uuid || currentUser?.id);

  const { publicId, username, firstName, lastName, email, phone, aboutMe, avatarColor, avatarUrl, nameColor, profileColor } = state;
  const { setPublicId, setUsername, setFirstName, setLastName, setEmail, setPhone, setAboutMe, setAvatarColor, setAvatarUrl, setNameColor, setProfileColor } = setters;

  // Локальный стейт для ввода без задержек
  const [localAbout, setLocalAbout] = useState(aboutMe || '');
  const latestAboutRef = useRef(localAbout);
  const isSavingAboutRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Автоматический ресайз высоты textarea под контент
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    setLocalAbout(aboutMe || '');
    latestAboutRef.current = aboutMe || '';
    setTimeout(adjustTextareaHeight, 0);
  }, [aboutMe]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showUploadSelector, setShowUploadSelector] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);

  const showFullName = getUserPrivacy(currentUser).privacyNameFormat === 'full_name';
  const hasNamesFilled = (firstName && firstName.trim() !== '') || (lastName && lastName.trim() !== '');

  const previewDisplayName = (showFullName && hasNamesFilled)
    ? `${firstName || ''} ${lastName || ''}`.trim()
    : (username?.trim() !== '' ? username : (publicId ? `@${publicId}` : 'Пользователь'));

  // 💾 Функция сохранения «О себе» с автоматической обрезкой до 70 символов
  const saveAboutMeDirectly = async (textToSave: string) => {
    // 1. Обрезаем строку строго до первых 70 символов
    const sliced = textToSave.slice(0, 70);
    const trimmed = sliced.trim();

    // Если текст был длиннее 70 символов, синхронизируем стейт и поле ввода
    if (textToSave.length > 70) {
      setLocalAbout(sliced);
      latestAboutRef.current = sliced;
      adjustTextareaHeight();
    }

    // Если значение не изменилось или уже идёт запрос к базе — пропускаем
    if (trimmed === (aboutMe || '').trim() || isSavingAboutRef.current) return;

    isSavingAboutRef.current = true;
    ctx.showToast?.('Сохранение описания...', 'loading');

    try {
      const res = await userService.updateProfile(userUuid, { aboutMe: trimmed || null });
      if (res.success) {
        setAboutMe(trimmed);
        ctx.setCurrentUser({ ...currentUser, aboutMe: trimmed || null });
        ctx.showToast?.('Описание профиля сохранено! ✅', 'success');
      } else {
        ctx.showToast?.(`Ошибка сохранения: ${res.error}`, 'error');
      }
    } catch (err: any) {
      console.error(err);
      ctx.showToast?.('Не удалось сохранить изменения', 'error');
    } finally {
      isSavingAboutRef.current = false;
    }
  };

  // Автосохранение при размонтировании (уход со страницы/закрытие вкладки)
  useEffect(() => {
    return () => {
      const sliced = latestAboutRef.current.slice(0, 70).trim();
      if (sliced !== (aboutMe || '').trim()) {
        userService.updateProfile(userUuid, { aboutMe: sliced || null });
      }
    };
  }, [aboutMe, userUuid]);

  useEffect(() => {
    return () => {
      if (
        latestAboutRef.current.length <= 70 &&
        latestAboutRef.current.trim() !== (aboutMe || '').trim()
      ) {
        userService.updateProfile(userUuid, { aboutMe: latestAboutRef.current.trim() || null });
      }
    };
  }, [aboutMe, userUuid]);

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      ctx.showToast?.('Ошибка: Можно загружать только изображения!', 'error');
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
      ctx.showToast?.('Загрузка аватарки в облако...', 'loading');
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
        ctx.showToast?.('Новое фото профиля успешно применено! 📸', 'success');
      }
    } catch (err: any) {
      console.error(err);
      ctx.showToast?.(`Ошибка сохранения: ${err.message}`, 'error');
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

  const openEditor = (type: 'name' | 'username' | 'displayName' | 'phone' | 'email') => {
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
        ctx.showToast?.('Сохранение имени...', 'loading');
        const payload = { 
          firstName: v.firstName.trim() || null, 
          lastName: v.lastName.trim() || null 
        };
        const res = await userService.updateProfile(userUuid, payload);
        if (res.success) {
          setFirstName(v.firstName.trim());
          setLastName(v.lastName.trim());
          ctx.setCurrentUser({ ...currentUser, ...payload });
          ctx.showToast?.('Имя успешно обновлено ✅', 'success');
        } else {
          ctx.showToast?.(`Ошибка: ${res.error}`, 'error');
        }
      };
    } else if (type === 'displayName') {
      titleModal = 'Отображаемое имя (Никнейм)';
      fields = [{ key: 'username', label: 'Никнейм', placeholder: 'Ваш никнейм', maxLength: 25 }];
      initialValues = { username };
      onSaveAction = async (v) => {
        ctx.showToast?.('Сохранение никнейма...', 'loading');
        const payload = { username: v.username.trim() };
        const res = await userService.updateProfile(userUuid, payload);
        if (res.success) {
          setUsername(v.username.trim());
          ctx.setCurrentUser({ ...currentUser, ...payload });
          ctx.showToast?.('Никнейм обновлен ✅', 'success');
        } else {
          ctx.showToast?.(`Ошибка: ${res.error}`, 'error');
        }
      };
    } else if (type === 'username') {
      titleModal = 'Публичный тег';
      fields = [{ key: 'publicId', label: 'Имя пользователя (тег)', placeholder: 'username' }];
      initialValues = { publicId };
      onSaveAction = async (v) => {
        ctx.showToast?.('Проверка и сохранение тега...', 'loading');
        const res = await userService.updatePublicTag(userUuid, v.publicId || null);
        if (res.success) {
          const newTag = res.tag || '';
          setPublicId(newTag);
          ctx.setCurrentUser({ ...currentUser, publicId: res.tag ?? null, uniqueId: res.tag ?? null });
          ctx.showToast?.(res.tag ? 'Публичный тег обновлён ✅' : 'Публичный тег удалён', 'success');
        } else {
          ctx.showToast?.(`Ошибка: ${res.error}`, 'error');
        }
      };
    } else if (type === 'phone') {
      titleModal = 'Номер телефона';
      fields = [{ key: 'phone', label: 'Номер телефона', type: 'tel', placeholder: '+7...' }];
      initialValues = { phone };
      onSaveAction = async (v) => {
        ctx.showToast?.('Сохранение номера...', 'loading');
        const payload = { phone: v.phone.trim() || null };
        const res = await userService.updateProfile(userUuid, payload);
        if (res.success) {
          setPhone(v.phone.trim());
          ctx.setCurrentUser({ ...currentUser, ...payload });
          ctx.showToast?.('Телефон сохранен ✅', 'success');
        } else {
          ctx.showToast?.(`Ошибка: ${res.error}`, 'error');
        }
      };
    } else if (type === 'email') {
      titleModal = 'Электронная почта';
      fields = [{ key: 'email', label: 'Электронная почта', type: 'email', placeholder: 'mail@example.com' }];
      initialValues = { email };
      onSaveAction = async (v) => {
        ctx.showToast?.('Сохранение почты...', 'loading');
        const payload = { email: v.email.trim() || null };
        const res = await userService.updateProfile(userUuid, payload);
        if (res.success) {
          setEmail(v.email.trim());
          ctx.setCurrentUser({ ...currentUser, ...payload });
          ctx.showToast?.('Почта сохранена ✅', 'success');
        } else {
          ctx.showToast?.(`Ошибка: ${res.error}`, 'error');
        }
      };
    }

    setModalConfig({ show: true, title: titleModal, fields, initialValues, onSave: onSaveAction });
  };

  const profileTheme = getProfileTheme(profileColor || currentUser?.profileColor);
  const currentNameColorHex = getNameColor(nameColor || currentUser?.nameColor);

  // Счётчик оставшихся символов (70 - длина)[cite: 37, 38, 39]
  const remainingChars = 70 - localAbout.length;
  const isOverLimit = remainingChars < 0;

  return (
    <>
      <div className={styles.tgProfilePage}>

        {/* ======================================================== */}
        {/* 1. ШАПКА: АВАТАРКА С КНОПКОЙ КАМЕРЫ + ИМЯ + СТАТУС     */}
        {/* ======================================================== */}
        <div className={styles.tgHeader}>
          <div 
            className={styles.tgAvatarWrapper}
            onClick={() => setShowUploadSelector(true)}
            title="Сменить фото профиля"
          >
            <div style={{
              borderRadius: '50%',
              border: `2px solid ${profileTheme.avatarRingColor || 'transparent'}`,
              boxShadow: profileTheme.avatarRingColor ? `0 0 16px ${profileTheme.avatarRingColor}44` : 'none'
            }}>
              <SmartAvatar
                size={80}
                avatarUrl={avatarUrl}
                avatarColor={avatarColor}
                name={previewDisplayName}
                isChannel={false}
              />
            </div>
            <button 
              type="button" 
              className={styles.tgCameraBadge}
              onClick={(e) => {
                e.stopPropagation();
                setShowUploadSelector(true);
              }}
              title="Загрузить фото"
            >
              <Camera size={15} />
            </button>
          </div>

          <h2 className={styles.tgHeaderName}>{previewDisplayName}</h2>
          <span className={styles.tgHeaderStatus}>в сети</span>
        </div>

        {/* ======================================================== */}
        {/* 2. БЛОК «О СЕБЕ» (TELEGRAM DESKTOP STYLE)                */}
        {/* ======================================================== */}
        <div className={styles.tgBioCard} onClick={() => textareaRef.current?.focus()}>
          <textarea
            ref={textareaRef}
            className={styles.tgBioInputArea}
            placeholder="О себе"
            rows={1}
            value={localAbout}
            onChange={(e) => {
              setLocalAbout(e.target.value);
              latestAboutRef.current = e.target.value;
              adjustTextareaHeight();
            }}
            onBlur={() => saveAboutMeDirectly(localAbout)}
          />
          <span className={`${styles.tgBioCounter} ${isOverLimit ? styles.tgBioCounterLimit : ''}`}>
            {remainingChars}
          </span>
        </div>
        <p className={styles.tgSectionHint}>
          Любые подробности, например: возраст, род занятий или город.<br />
          Пример: 23 года, дизайнер из Санкт-Петербурга.
        </p>

        {/* ======================================================== */}
        {/* 3. ОСНОВНЫЕ ДАННЫЕ (Имя, Телефон, @username, Email)      */}
        {/* ======================================================== */}
        <div className={styles.tgSectionCard}>
          {/* Имя */}
          <div className={styles.tgRow} onClick={() => openEditor('name')}>
            <div className={styles.tgRowIcon}>
              <UserIcon size={20} />
            </div>
            <span className={styles.tgRowLabel}>Имя</span>
            <span className={styles.tgRowValue}>
              {`${firstName || ''} ${lastName || ''}`.trim() || 'Не указано'}
            </span>
          </div>

          {/* Отображаемое имя (Никнейм) */}
          <div className={styles.tgRow} onClick={() => openEditor('displayName')}>
            <div className={styles.tgRowIcon}>
              <Sparkles size={20} />
            </div>
            <span className={styles.tgRowLabel}>Отображаемое имя</span>
            <span className={styles.tgRowValue}>
              {username ? `${username}` : 'Не указано'}
            </span>
          </div>

          {/* Телефон */}
          <div className={styles.tgRow} onClick={() => openEditor('phone')}>
            <div className={styles.tgRowIcon}>
              <PhoneIcon size={20} />
            </div>
            <span className={styles.tgRowLabel}>Номер телефона</span>
            <span className={styles.tgRowValue}>
              {phone || 'Не указан'}
            </span>
          </div>

          {/* Электронная почта */}
          <div className={styles.tgRow} onClick={() => openEditor('email')}>
            <div className={styles.tgRowIcon}>
              <Mail size={20} />
            </div>
            <span className={styles.tgRowLabel}>Электронная почта</span>
            <span className={styles.tgRowValue}>
              {email || 'Не указана'}
            </span>
          </div>

          {/* Имя пользователя (@username) */}
          <div className={styles.tgRow} onClick={() => openEditor('username')}>
            <div className={styles.tgRowIcon}>
              <AtSign size={20} />
            </div>
            <span className={styles.tgRowLabel}>Имя пользователя</span>
            <span className={`${styles.tgRowValue} ${styles.tgRowValueAccent}`}>
              {publicId ? `@${publicId}` : 'Не указано'}
            </span>
          </div>
        </div>
        <p className={styles.tgSectionHint}>
          С помощью имени пользователя другие люди смогут связаться с Вами в Blyades, не зная Вашего телефона.
        </p>

        {/* ======================================================== */}
        {/* 4. ОФОРМЛЕНИЕ И ЦВЕТА                                    */}
        {/* ======================================================== */}
        <div className={styles.tgSectionCard}>
          <div className={styles.tgRow} onClick={() => setShowColorModal(true)}>
            <div className={styles.tgRowIcon}>
              <Palette size={20} />
            </div>
            <span className={styles.tgRowLabel}>Цвет имени и профиля</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={styles.tgNameBadge} style={{ color: currentNameColorHex }}>
                {previewDisplayName}
              </span>
              <span 
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: getProfileColor(profileColor || currentUser?.profileColor),
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
                title="Цвет профиля"
              />
              <ChevronRight size={18} color="#708499" />
            </div>
          </div>
        </div>

        <div className={styles.tgSectionCard} style={{ marginTop: '24px', border: '1px solid rgba(255, 69, 58, 0.3)' }}>
          {/* <span className={styles.tgSectionTitle} style={{ color: '#ff453a' }}>Опасная зона</span> */}
          
          <div 
            className={styles.tgRow} 
            onClick={() => {
              ctx.showConfirm(
                'Удаление аккаунта',
                'Вы уверены, что хотите безвозвратно удалить свой аккаунт? Это действие невозможно отменить, все ваши данные будут стерты.',
                async () => {
                  ctx.showToast('Удаление аккаунта...', 'loading');
                  try {
                    const { error } = await supabase.rpc('delete_user_account');
                    if (error) throw error;

                    localStorage.clear();
                    ctx.showToast('Аккаунт удален', 'info');
                    window.location.href = '/auth';
                  } catch (err: any) {
                    ctx.showToast(`Ошибка удаления: ${err.message}`, 'error');
                  }
                },
                true // Кнопка подтверждения красная (danger)
              );
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className={styles.tgRowLabel} style={{ color: '#ff453a', fontWeight: 600 }}>Удалить аккаунт</span>
          </div>
        </div>
      </div>

      {/* Модалки */}
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
          setAvatarColor(chosenColor);
          ctx.showToast?.('Сохранение цвета аватарки...', 'loading');
          const res = await userService.updateProfile(userUuid, { avatarColor: chosenColor });
          if (res.success) {
            ctx.setCurrentUser((prev: any) => ({
              ...prev,
              avatarColor: chosenColor,
              appearance: {
                ...(prev?.appearance || {}),
                avatarColor: chosenColor,
              },
            }));
            ctx.showToast?.('Цвет аватарки сохранён! 🎨', 'success');
          } else {
            ctx.showToast?.(`Ошибка сохранения: ${res.error}`, 'error');
          }
        }}
      />

      <AvatarCropModal 
        show={showCropModal} 
        imageSrc={rawImageSrc} 
        onClose={() => { setShowCropModal(false); setRawImageSrc(null); }} 
        onSave={saveCroppedAvatar} 
      />

      <ColorSettingsModal
        show={showColorModal}
        currentProfileColor={profileColor || currentUser?.profileColor}
        currentNameColor={nameColor || currentUser?.nameColor}
        onClose={() => setShowColorModal(false)}
        onSuccess={({ profileColor: pColor, nameColor: nColor }) => {
          if (setProfileColor) setProfileColor(pColor);
          if (setNameColor) setNameColor(nColor);
        }}
      />
    </>
  );
}