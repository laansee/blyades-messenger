import React, { useState, useEffect } from 'react';
import styles from '../../components/css/settings.module.css';
import useMessengerContext from '../../context/messengerContext';
import { supabase } from '../../services/supabaseClient';
import { PrivacySelectorModal, PrivacyOption } from '../../components/GlobalUI';
import { Lock } from 'lucide-react';

export default function PrivacySettings({ onBack, state, setters }: any) {
  const ctx = useMessengerContext();
  const currentUser = ctx.currentUser;
  const [isSaving, setIsSaving] = useState(false);

  const {privacyPhone, privacyEmail, privacyOnline, privacyNameFormat, privacyFullName, privacySearch}  = state;
  const {setPrivacyPhone, setPrivacyEmail, setPrivacyOnline, setPrivacyNameFormat, setPrivacyFullName, setPrivacySearch}  = setters;

  // Локальный стейт конфигурации модального окна выбора
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
    // Дефолтная троица для телефона, почты и онлайна
    if (value === 'all') return 'Все';
    if (value === 'contacts') return 'Мои контакты';
    if (value === 'none') return 'Никто';
    return value;
  };

  // Базовые опции выбора (Все / Мои контакты / Никто)
  const defaultPrivacyOptions: PrivacyOption[] = [
    { value: 'all', label: 'Все' },
    { value: 'contacts', label: 'Мои контакты' },
    { value: 'none', label: 'Никто' }
  ];

  const openPrivacySelector = (type: 'phone' | 'online' | 'email' | 'nameFormat' | 'fullName' | 'search') => {
    let title = '';
    let subtitle = '';
    let options = defaultPrivacyOptions;
    let selectedValue = '';
    let onSelectAction = async (val: string) => {};

    if (type === 'phone') {
      title = 'Номер телефона';
      // subtitle = 'Кто видит мой номер телефона';
      subtitle = 'Скрывает ваш номер в профиле.';
      selectedValue = privacyPhone;
      onSelectAction = async (val) => {
        const { error } = await supabase.from('users').update({ privacyPhone: val, updatedAt: new Date().toISOString() }).eq('id', currentUser.id);
        if (!error) {
          setPrivacyPhone(val);
          ctx.setCurrentUser({ ...currentUser, privacyPhone: val });
          ctx.showToast('Настройки видимости телефона обновлены', 'success');
        }
      };
    } else if (type === 'online') {
      title = 'Статус «В сети»';
      // subtitle = 'Кто видит, что я в сети';
      subtitle = 'Отключает отображение зелёного индикатора онлайна.';
      selectedValue = privacyOnline;
      onSelectAction = async (val) => {
        const { error } = await supabase.from('users').update({ privacyOnline: val, updatedAt: new Date().toISOString() }).eq('id', currentUser.id);
        if (!error) {
          setPrivacyOnline(val);
          ctx.setCurrentUser({ ...currentUser, privacyOnline: val });
          ctx.showToast('Видимость онлайна успешно изменена', 'success');
        }
      };
    } else if (type === 'email') {
      title = 'Электронная почта';
      // subtitle = 'Кто видит мою эл. почту';
      subtitle = 'Скрывает email в карточке вашего профиля.';
      selectedValue = privacyEmail;
      onSelectAction = async (val) => {
        const { error } = await supabase.from('users').update({ privacyEmail: val, updatedAt: new Date().toISOString() }).eq('id', currentUser.id);
        if (!error) {
          setPrivacyEmail(val);
          ctx.setCurrentUser({ ...currentUser, privacyEmail: val });
          ctx.showToast('Приватность электронной почты сохранена', 'success');
        }
      };
    } else if (type === 'nameFormat') {
      title = 'Отображение имени';
      // subtitle = 'Как выводить моё имя в чатах и беседах';
      subtitle = 'Выбор между выводом никнейма или реальный Имя и Фамилии в заголовках.';
      options = [
        { value: 'username', label: 'Никнейм' },
        { value: 'full_name', label: 'Имя и Фамилия' }
      ];
      selectedValue = privacyNameFormat;
      onSelectAction = async (val) => {
        const { error } = await supabase.from('users').update({ privacyNameFormat: val, updatedAt: new Date().toISOString() }).eq('id', currentUser.id);
        if (!error) {
          setPrivacyNameFormat(val);
          ctx.setCurrentUser({ ...currentUser, privacyNameFormat: val });
          ctx.showToast('Формат отображения имён обновлен', 'success');
        }
      };
    } else if (type === 'fullName') {
      title = 'Имя и фамилия';
      // subtitle = 'Кто видит моё имя и фамилию';
      subtitle = 'Скрывает строку настоящих имён, если выбран вывод псевдонима.';
      selectedValue = privacyFullName;
      onSelectAction = async (val) => {
        const { error } = await supabase.from('users').update({ privacyFullName: val, updatedAt: new Date().toISOString() }).eq('id', currentUser.id);
        if (!error) {
          setPrivacyFullName(val);
          ctx.setCurrentUser({ ...currentUser, privacyFullName: val });
          ctx.showToast('Видимость личных имён изменена', 'success');
        }
      };
    } else if (type === 'search') {
      // 🚀 КАСТОМНЫЕ НАСТРОЙКИ ДЛЯ СЕЛЕКТОРА ГЛОБАЛЬНОГО ПОИСКА
      title = 'Поиск аккаунта';
      // subtitle = 'Кто может найти меня по поиску';
      subtitle = 'Позволяет полностью скрыться из глобального поиска контактов мессенджера.';
      options = [
        { value: 'all', label: 'Глобальный поиск' },
        { value: 'none', label: 'Скрыть из поиска' }
      ];
      selectedValue = privacySearch || 'all';
      onSelectAction = async (val) => {
        const { error } = await supabase.from('users').update({ privacySearch: val, updatedAt: new Date().toISOString() }).eq('id', currentUser.id);
        if (!error) {
          setPrivacySearch(val);
          ctx.setCurrentUser({ ...currentUser, privacySearch: val });
          ctx.showToast('Настройки обнаружения аккаунта изменены', 'success');
        }
      };
    }

    setModalConfig({ show: true, title, subtitle, options, selectedValue, onSelect: onSelectAction });
  };

  return (
    <>

      <form className={styles.settingsFormCard} style={{ gap: '20px', width: 'stretch' }}>
        <h3 className={styles.settingsFormTitle}>
          <Lock />
          Приватность
        </h3> 

        <div className={styles.settingsFormContainer}>
          
          {/* 🛡️ ГЛАВНЫЙ БЛОК ТАБЛИЦЫ КОНФИДЕНЦИАЛЬНОСТИ */}
          <div style={{ backgroundColor: '#1c1c24', border: '1px solid #2b2d31', borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Строка 1: Видимость телефона */}
            <div 
              onClick={() => openPrivacySelector('phone')} 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #2b2d31', cursor: 'pointer', transition: 'background 0.2s' }} 
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#23232e'} 
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', color: '#fff', fontWeight: '600' }}>Кто видит мой номер телефона:</span>
                {/* <span style={{ fontSize: '13px', color: '#a2a2b5' }}>Скрывает ваш номер в модальном окне профиля.</span> */}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: '#9d7bf6', fontWeight: '600' }}>{getLabelByValue('default', privacyPhone)}</span>
                <span style={{ color: '#636366', fontSize: '14px' }}>▶</span>
              </div>
            </div>

            {/* Строка 2: Видимость онлайна */}
            <div onClick={() => openPrivacySelector('online')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #2b2d31', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#23232e'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', color: '#fff', fontWeight: '600' }}>Кто видит, что я в сети:</span>
                {/* <span style={{ fontSize: '13px', color: '#a2a2b5' }}>Отключает отображение зелёного индикатора онлайна.</span> */}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: '#9d7bf6', fontWeight: '600' }}>{getLabelByValue('default', privacyOnline)}</span>
                <span style={{ color: '#636366', fontSize: '14px' }}>▶</span>
              </div>
            </div>

            {/* Строка 3: Видимость почты */}
            <div onClick={() => openPrivacySelector('email')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #2b2d31', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#23232e'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', color: '#fff', fontWeight: '600' }}>Кто видит мою эл. почту:</span>
                {/* <span style={{ fontSize: '13px', color: '#a2a2b5' }}>Скрывает email в карточке вашего профиля.</span> */}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: '#9d7bf6', fontWeight: '600' }}>{getLabelByValue('default', privacyEmail)}</span>
                <span style={{ color: '#636366', fontSize: '14px' }}>▶</span>
              </div>
            </div>

            {/* Строка 4: Формат вывода имён */}
            <div onClick={() => openPrivacySelector('nameFormat')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #2b2d31', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#23232e'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', color: '#fff', fontWeight: '600' }}>Отображение имени в чатах:</span>
                {/* <span style={{ fontSize: '13px', color: '#a2a2b5' }}>Выбор между выводом юзернейма или реального ФИО в заголовках.</span> */}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: '#9d7bf6', fontWeight: '600' }}>{getLabelByValue('nameFormat', privacyNameFormat)}</span>
                <span style={{ color: '#636366', fontSize: '14px' }}>▶</span>
              </div>
            </div>

            {/* Строка 5: Видимость ФИО */}
            <div onClick={() => openPrivacySelector('fullName')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #2b2d31', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#23232e'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', color: '#fff', fontWeight: '600' }}>Кто видит моё имя и фамилию:</span>
                {/* <span style={{ fontSize: '13px', color: '#a2a2b5' }}>Скрывает строку настоящих имён, если выбран вывод псевдонима.</span> */}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: '#9d7bf6', fontWeight: '600' }}>{getLabelByValue('default', privacyFullName)}</span>
                <span style={{ color: '#636366', fontSize: '14px' }}>▶</span>
              </div>
            </div>

            {/* Строка 6: Глобальный поиск */}
            <div onClick={() => openPrivacySelector('search')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#23232e'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', color: '#fff', fontWeight: '600' }}>Кто может найти меня по поиску:</span>
                {/* <span style={{ fontSize: '13px', color: '#a2a2b5' }}>Позволяет полностью скрыться из глобального поиска контактов мессенджера.</span> */}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: '#9d7bf6', fontWeight: '600' }}>{getLabelByValue('search', privacySearch || 'all')}</span>
                <span style={{ color: '#636366', fontSize: '14px' }}>▶</span>
              </div>
            </div>

          </div>

          {/* 🚀 ИНТЕРАКТИВНЫЙ РАДИО-СЕЛЕКТОР В ДЕЙСТВИИ */}
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
      </form>
    </>
  );
}
