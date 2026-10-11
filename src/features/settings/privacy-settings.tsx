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
      subtitle = 'Кто видит мой номер телефона';
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
      subtitle = 'Кто видит, что я в сети';
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
      subtitle = 'Кто видит мою эл. почту';
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
      subtitle = 'Как выводить моё имя в чатах и беседах';
      options = [
        { value: 'username', label: 'Показывать псевдоним (никнейм)' },
        { value: 'full_name', label: 'Показывать Имя и Фамилию' }
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
      subtitle = 'Кто видит моё имя и фамилию';
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
      subtitle = 'Кто может найти меня по поиску';
      options = [
        { value: 'all', label: 'Глобальный поиск (находят все)' },
        { value: 'none', label: 'Скрыть из поиска (полный инкогнито)' }
      ];
      selectedValue = privacySearch || 'all';
      onSelectAction = async (val) => {
        const { error } = await supabase.from('users').update({ privacySearch: val, updatedAt: new Date().toISOString() }).eq('id', currentUser.id);
        if (!error) {
          setPrivacySearch(val);
          ctx.setCurrentUser({ ...currentUser, privacySearch: val });
          ctx.showToast('Настройки обнаружимости аккаунта изменены', 'success');
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

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '24px', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
          
          {/* 🛡️ ГЛАВНЫЙ БЛОК ТАБЛИЦЫ КОНФИДЕНЦИАЛЬНОСТИ */}
          <div style={{ backgroundColor: '#1c1c24', border: '1px solid #2b2d31', borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Строка 1: Видимость телефона */}
            <div onClick={() => openPrivacySelector('phone')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #2b2d31', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#23232e'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', color: '#fff', fontWeight: '600' }}>Кто видит мой номер телефона:</span>
                <span style={{ fontSize: '13px', color: '#a2a2b5' }}>Скрывает ваш номер в модальном окне профиля.</span>
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
                <span style={{ fontSize: '13px', color: '#a2a2b5' }}>Отключает отображение зелёного индикатора онлайна.</span>
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
                <span style={{ fontSize: '13px', color: '#a2a2b5' }}>Скрывает email в карточке вашего профиля.</span>
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
                <span style={{ fontSize: '13px', color: '#a2a2b5' }}>Выбор между выводом юзернейма или реального ФИО в заголовках.</span>
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
                <span style={{ fontSize: '13px', color: '#a2a2b5' }}>Скрывает строку настоящих имён, если выбран вывод псевдонима.</span>
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
                <span style={{ fontSize: '13px', color: '#a2a2b5' }}>Позволяет полностью скрыться из глобального поиска контактов мессенджера.</span>
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
        
        {/* <div className={styles.privacyItemRow}>
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
              НЕ ГОТОВО 
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
        </div> */}

        {/* <button 
          type="submit" disabled={isSaving} 
          className={`${styles.settingsSaveBtn} ${styles.greenBtn}`}
        >
          {isSaving ? 'Применение...' : 'Применить настройки приватности'}
        </button> */}
      </form>
    </>
  );
}
