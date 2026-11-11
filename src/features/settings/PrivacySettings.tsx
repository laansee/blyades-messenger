import { useState } from 'react';
import styles from '../../components/css/settings.module.css';
import useMessengerContext from '../../context/messengerContext';
import { userService } from '../../services/userService';
import { PrivacySelectorModal, type PrivacyOption } from '../../components/common/GlobalUI';

export default function PrivacySettings({ state, setters }: any) {
  const ctx = useMessengerContext();
  const currentUser = ctx.currentUser;

  const { privacyPhone, privacyEmail, privacyOnline, privacyNameFormat, privacyFullName, privacySearch } = state;
  const { setPrivacyPhone, setPrivacyEmail, setPrivacyOnline, setPrivacyNameFormat, setPrivacyFullName, setPrivacySearch } = setters;
  
  const [modalConfig, setModalConfig] = useState<{
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

  const getLabelByValue = (keyType: 'default' | 'nameFormat' | 'search', value: string) => {
    if (keyType === 'nameFormat') {
      return value === 'full_name' ? 'Имя и Фамилия' : 'Никнейм';
    }
    if (keyType === 'search') {
      return value === 'none' ? 'Никто' : 'Все';
    }
    if (value === 'all') return 'Все';
    if (value === 'contacts') return 'Мои контакты';
    if (value === 'none') return 'Никто';
    return value || 'Все';
  };

  const defaultPrivacyOptions: PrivacyOption[] = [
    { value: 'all', label: 'Все' },
    { value: 'contacts', label: 'Мои контакты' },
    { value: 'none', label: 'Никто' }
  ];

  const openPrivacySelector = (type: 'phone' | 'online' | 'email' | 'nameFormat' | 'fullName' | 'search') => {
    let titleModal = '';
    let subtitle = '';
    let options = defaultPrivacyOptions;
    let selectedValue = '';
    let keyToUpdate: any = '';
    let setterFn: (val: string) => void = () => {};

    if (type === 'phone') {
      titleModal = 'Номер телефона';
      subtitle = 'Кто может видеть мой номер телефона в профиле.';
      selectedValue = privacyPhone;
      keyToUpdate = 'privacyPhone';
      setterFn = setPrivacyPhone;
    } else if (type === 'online') {
      titleModal = 'Время захода';
      subtitle = 'Кто видит, когда вы были в сети и онлайн.';
      selectedValue = privacyOnline;
      keyToUpdate = 'privacyOnline';
      setterFn = setPrivacyOnline;
    } else if (type === 'email') {
      titleModal = 'Электронная почта';
      subtitle = 'Кто может видеть ваш email в карточке профиля.';
      selectedValue = privacyEmail;
      keyToUpdate = 'privacyEmail';
      setterFn = setPrivacyEmail;
    } else if (type === 'nameFormat') {
      titleModal = 'Отображение имени';
      subtitle = 'Выбор между выводом никнейма или реальных Имени и Фамилии в чатах.';
      options = [
        { value: 'username', label: 'Никнейм' },
        { value: 'full_name', label: 'Имя и Фамилия' }
      ];
      selectedValue = privacyNameFormat;
      keyToUpdate = 'privacyNameFormat';
      setterFn = setPrivacyNameFormat;
    } else if (type === 'fullName') {
      titleModal = 'Имя и фамилия';
      subtitle = 'Кто видит строку реальных имён, если выбран вывод псевдонима.';
      selectedValue = privacyFullName;
      keyToUpdate = 'privacyFullName';
      setterFn = setPrivacyFullName;
    } else if (type === 'search') {
      titleModal = 'Поиск аккаунта';
      subtitle = 'Кто может найти ваш профиль в глобальном поиске мессенджера.';
      options = [
        { value: 'all', label: 'Все' },
        { value: 'none', label: 'Никто' }
      ];
      selectedValue = privacySearch || 'all';
      keyToUpdate = 'privacySearch';
      setterFn = setPrivacySearch;
    }

    const onSelectAction = async (val: string) => {
      ctx.showToast?.('Сохранение настроек приватности...', 'loading');
      const userUuid = String(currentUser?.uuid || currentUser?.id);
      const res = await userService.updatePrivacySetting(userUuid, keyToUpdate, val as any);

      if (res.success) {
        setterFn(val);
        ctx.setCurrentUser({ ...currentUser, [keyToUpdate]: val });
        ctx.showToast?.('Настройки приватности обновлены! ✅', 'success');
      } else {
        ctx.showToast?.(`Ошибка сохранения: ${res.error}`, 'error');
      }
    };

    setModalConfig({
      show: true,
      title: titleModal,
      subtitle,
      options,
      selectedValue,
      onSelect: onSelectAction
    });
  };

  return (
    <>
      <div className={styles.tgProfilePage}>

        {/* Карточка со списком настроек (Telegram Desktop Style) */}
        <div className={styles.tgSectionCard}>
          {/* Голубой заголовок группы */}
          <span className={styles.tgSectionTitle}>Конфиденциальность</span>

          {/* Номер телефона */}
          <div 
            className={styles.tgRow} 
            onClick={() => openPrivacySelector('phone')}
          >
            <span className={styles.tgRowLabel}>Номер телефона</span>
            <span className={`${styles.tgRowValue} ${styles.tgRowValueAccent}`}>
              {getLabelByValue('default', privacyPhone)}
            </span>
          </div>

          {/* Время захода */}
          <div 
            className={styles.tgRow} 
            onClick={() => openPrivacySelector('online')}
          >
            <span className={styles.tgRowLabel}>Время захода</span>
            <span className={`${styles.tgRowValue} ${styles.tgRowValueAccent}`}>
              {getLabelByValue('default', privacyOnline)}
            </span>
          </div>

          {/* Электронная почта */}
          <div 
            className={styles.tgRow} 
            onClick={() => openPrivacySelector('email')}
          >
            <span className={styles.tgRowLabel}>Электронная почта</span>
            <span className={`${styles.tgRowValue} ${styles.tgRowValueAccent}`}>
              {getLabelByValue('default', privacyEmail)}
            </span>
          </div>

          {/* Отображение имени */}
          <div 
            className={styles.tgRow} 
            onClick={() => openPrivacySelector('nameFormat')}
          >
            <span className={styles.tgRowLabel}>Отображение имени</span>
            <span className={`${styles.tgRowValue} ${styles.tgRowValueAccent}`}>
              {getLabelByValue('nameFormat', privacyNameFormat)}
            </span>
          </div>

          {/* Имя и фамилия */}
          <div 
            className={styles.tgRow} 
            onClick={() => openPrivacySelector('fullName')}
          >
            <span className={styles.tgRowLabel}>Имя и фамилия</span>
            <span className={`${styles.tgRowValue} ${styles.tgRowValueAccent}`}>
              {getLabelByValue('default', privacyFullName)}
            </span>
          </div>

          {/* Поиск аккаунта */}
          <div 
            className={`${styles.tgRow} ${styles.tgRowLast}`}
            onClick={() => openPrivacySelector('search')}
          >
            <span className={styles.tgRowLabel}>Поиск аккаунта</span>
            <span className={`${styles.tgRowValue} ${styles.tgRowValueAccent}`}>
              {getLabelByValue('search', privacySearch || 'all')}
            </span>
          </div>

          <p className={styles.tgSectionHint}>
            Вы можете ограничить доступ к вашей информации для людей, которых нет в вашем списке контактов.
          </p>
        </div>
      </div>

      <PrivacySelectorModal
        show={modalConfig.show}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        options={modalConfig.options}
        selectedValue={modalConfig.selectedValue}
        onClose={() => setModalConfig(prev => ({ ...prev, show: false }))}
        onSelect={modalConfig.onSelect}
      />
    </>
  );
}