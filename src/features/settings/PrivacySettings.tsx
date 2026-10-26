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
      return value === 'full_name' ? 'Имя и Фамилия' : 'Псевдоним (никнейм)';
    }
    if (keyType === 'search') {
      return value === 'none' ? 'Скрыть из поиска' : 'Глобальный поиск';
    }
    if (value === 'all') return 'Все';
    if (value === 'contacts') return 'Мои контакты';
    if (value === 'none') return 'Никто';
    return value;
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
      subtitle = 'Скрывает ваш номер в профиле.';
      selectedValue = privacyPhone;
      keyToUpdate = 'privacyPhone';
      setterFn = setPrivacyPhone;
    } else if (type === 'online') {
      titleModal = 'Статус «В сети»';
      subtitle = 'Отключает отображение зелёного индикатора онлайна.';
      selectedValue = privacyOnline;
      keyToUpdate = 'privacyOnline';
      setterFn = setPrivacyOnline;
    } else if (type === 'email') {
      titleModal = 'Электронная почта';
      subtitle = 'Скрывает email в карточке вашего профиля.';
      selectedValue = privacyEmail;
      keyToUpdate = 'privacyEmail';
      setterFn = setPrivacyEmail;
    } else if (type === 'nameFormat') {
      titleModal = 'Отображение имени';
      subtitle = 'Выбор между выводом никнейма или реальных Имени и Фамилии в заголовках.';
      options = [
        { value: 'username', label: 'Никнейм' },
        { value: 'full_name', label: 'Имя и Фамилия' }
      ];
      selectedValue = privacyNameFormat;
      keyToUpdate = 'privacyNameFormat';
      setterFn = setPrivacyNameFormat;
    } else if (type === 'fullName') {
      titleModal = 'Имя и фамилия';
      subtitle = 'Скрывает строку настоящих имён, если выбран вывод псевдонима.';
      selectedValue = privacyFullName;
      keyToUpdate = 'privacyFullName';
      setterFn = setPrivacyFullName;
    } else if (type === 'search') {
      titleModal = 'Поиск аккаунта';
      subtitle = 'Позволяет полностью скрыться из глобального поиска контактов мессенджера.';
      options = [
        { value: 'all', label: 'Глобальный поиск' },
        { value: 'none', label: 'Скрыть из поиска' }
      ];
      selectedValue = privacySearch || 'all';
      keyToUpdate = 'privacySearch';
      setterFn = setPrivacySearch;
    }

    const onSelectAction = async (val: string) => {
      const userUuid = String(currentUser?.uuid || currentUser?.id);
      const res = await userService.updatePrivacySetting(userUuid, keyToUpdate, val as any);

      if (res.success) {
        setterFn(val);
        ctx.setCurrentUser({ ...currentUser, [keyToUpdate]: val });
        ctx.showToast('Настройки приватности обновлены', 'success');
      } else {
        ctx.showToast(`Ошибка сохранения: ${res.error}`, 'error');
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
    <div className={styles.settingsFormCard} style={{ gap: '20px', width: '100%' }}>
      <div className={styles.settingsFormFields}>
        
        <div 
          onClick={() => openPrivacySelector('phone')} 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #2b2d31', cursor: 'pointer', transition: 'background 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#23232e'} 
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span style={{ fontSize: '15px', color: '#fff', fontWeight: '600' }}>Кто видит мой номер телефона:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: '#9d7bf6', fontWeight: '600' }}>{getLabelByValue('default', privacyPhone)}</span>
            <span style={{ color: '#636366', fontSize: '14px' }}>▶</span>
          </div>
        </div>

        <div 
          onClick={() => openPrivacySelector('online')} 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #2b2d31', cursor: 'pointer', transition: 'background 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#23232e'} 
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span style={{ fontSize: '15px', color: '#fff', fontWeight: '600' }}>Кто видит, что я в сети:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: '#9d7bf6', fontWeight: '600' }}>{getLabelByValue('default', privacyOnline)}</span>
            <span style={{ color: '#636366', fontSize: '14px' }}>▶</span>
          </div>
        </div>

        <div 
          onClick={() => openPrivacySelector('email')} 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #2b2d31', cursor: 'pointer', transition: 'background 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#23232e'} 
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span style={{ fontSize: '15px', color: '#fff', fontWeight: '600' }}>Кто видит мою эл. почту:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: '#9d7bf6', fontWeight: '600' }}>{getLabelByValue('default', privacyEmail)}</span>
            <span style={{ color: '#636366', fontSize: '14px' }}>▶</span>
          </div>
        </div>

        <div 
          onClick={() => openPrivacySelector('nameFormat')} 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #2b2d31', cursor: 'pointer', transition: 'background 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#23232e'} 
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span style={{ fontSize: '15px', color: '#fff', fontWeight: '600' }}>Отображение имени в чатах:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: '#9d7bf6', fontWeight: '600' }}>{getLabelByValue('nameFormat', privacyNameFormat)}</span>
            <span style={{ color: '#636366', fontSize: '14px' }}>▶</span>
          </div>
        </div>

        <div 
          onClick={() => openPrivacySelector('fullName')} 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #2b2d31', cursor: 'pointer', transition: 'background 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#23232e'} 
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span style={{ fontSize: '15px', color: '#fff', fontWeight: '600' }}>Кто видит моё имя и фамилию:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: '#9d7bf6', fontWeight: '600' }}>{getLabelByValue('default', privacyFullName)}</span>
            <span style={{ color: '#636366', fontSize: '14px' }}>▶</span>
          </div>
        </div>

        <div 
          onClick={() => openPrivacySelector('search')} 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', transition: 'background 0.2s' }} 
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#23232e'} 
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span style={{ fontSize: '15px', color: '#fff', fontWeight: '600' }}>Кто может найти меня по поиску:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: '#9d7bf6', fontWeight: '600' }}>{getLabelByValue('search', privacySearch || 'all')}</span>
            <span style={{ color: '#636366', fontSize: '14px' }}>▶</span>
          </div>
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
    </div>
  );
}