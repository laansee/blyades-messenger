import React, { useState } from 'react';
import styles from '../../components/css/settings.module.css'; // Твои оригинальные стили
import useMessengerContext from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';

interface EditProfileProps {
  onBack: () => void;
}

export default function EditProfile({ onBack }: EditProfileProps) {
  const ctx = useMessengerContext();
  const currentUser = ctx.currentUser;

  const [uniqueId, setUniqueId] = useState(currentUser?.uniqueId || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || '#007aff');
  const [isSaving, setIsSaving] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() && !firstName.trim()) {
      ctx.showToast('Ошибка: Должно быть заполнено либо "Отображаемое имя", либо "Имя"!', 'error');
      return;
    }

    setIsSaving(true);

    try {
      // 🚀 ОБНОВЛЯЕМ НАПРЯМУЮ В SUPABASE ТАБЛИЦУ users С МАЛЕНЬКОЙ БУКВЫ
      const { error } = await supabase
        .from('users')
        .update({
          username: username.trim(),
          uniqueId: uniqueId.trim(),
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
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
          avatarColor
        });
        
        ctx.showToast('Все данные профиля успешно сохранены! 👤', 'success');
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
    <div className={styles.settingsInputField} style={{ gap: '16px' }}>
      <button onClick={onBack} className={styles.settingsBackBtn}>
        ⬅ Назад к списку
      </button>
      
      <form onSubmit={handleFormSubmit} className={styles.settingsFormCard}>
        <h3 className={styles.settingsFormTitle}>👤 Личные данные аккаунта</h3>

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

        <div className={styles.settingsInputField}>
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

        <div className={styles.settingsInputField}>
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
          <label 
            className={styles.settingsLabel}
            htmlFor='avatarColor-input'
          >
            Цвет вашей аватарки:
          </label>
          <div className={styles.settingsColorPickerRow}>
            <input 
              type="color" 
              className={styles.settingsColorCircleInput}
              value={avatarColor}
              id='avatarColor-input' 
              onChange={e => setAvatarColor(e.target.value)} 
            />
            <span className={styles.settingsColorHint}>Выберите цвет круга</span>
          </div>
        </div>

        <button type="submit" disabled={isSaving} className={`${styles.settingsSaveBtn} ${styles.blueBtn}`}>
          {isSaving ? 'Сохранение...' : 'Сохранить профиль'}
        </button>
      </form>
    </div>
  );
}
