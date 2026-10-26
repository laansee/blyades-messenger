import { useState, useEffect } from 'react';
import mainStyle from '../../components/css/main.module.css';
import style from '../../components/css/settings.module.css';
import chatStyles from '../../components/css/chat-window.module.css';
import profileStyles from '../../components/css/profile.module.css';
import useMessengerContext from '../../context/messengerContext';
import NavSidebar from '../navigation/NavSidebar';
import { renderUserStatusBadge } from '../../utils/statusBadge';
import SmartAvatar from '../../components/common/SmartAvatar';

import EditProfile from './EditProfile';
import PrivacySettings from './PrivacySettings';
import { Lock, User, Menu, Copy, Hash, ArrowLeft, Eye, X, QrCode } from 'lucide-react';

export default function SettingsPage() {
  const ctx = useMessengerContext();
  const currentUser = ctx.currentUser;

  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'privacy' | 'chats' | null>(null);
  const [previewRole, setPreviewRole] = useState<'contact' | 'stranger'>('contact');

  // 📱 Адаптивные стейты для мобильных устройств
  const [mobileScreen, setMobileScreen] = useState<'menu' | 'content'>('menu');
  const [showDrawerPreview, setShowDrawerPreview] = useState(false);

  // 🚀 ОБЩИЕ СТЕЙТЫ ДАННЫХ ПРОФИЛЯ
  const [uniqueId, setUniqueId] = useState(currentUser?.uniqueId || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [aboutMe, setAboutMe] = useState(currentUser?.aboutMe || '');
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || '#007aff');
  const [nameColor, setNameColor] = useState(currentUser?.nameColor || '#5eaddf');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || null);

  // 🚀 ОБЩИЕ СТЕЙТЫ НАСТРОЕК КОНФИДЕНЦИАЛЬНОСТИ
  const [privacyPhone, setPrivacyPhone] = useState(currentUser?.privacyPhone || 'all');
  const [privacyEmail, setPrivacyEmail] = useState(currentUser?.privacyEmail || 'all');
  const [privacyOnline, setPrivacyOnline] = useState(currentUser?.privacyOnline || 'all');
  const [privacyNameFormat, setPrivacyNameFormat] = useState(currentUser?.privacyNameFormat || 'username');
  const [privacyFullName, setPrivacyFullName] = useState(currentUser?.privacyFullName || 'all');
  const [privacySearch, setPrivacySearch] = useState(currentUser?.privacySearch || 'all');

  useEffect(() => {
    if (currentUser) {
      setUniqueId(currentUser.uniqueId || '');
      setUsername(currentUser.username || '');
      setFirstName(currentUser.firstName || '');
      setLastName(currentUser.lastName || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setAboutMe(currentUser.aboutMe || '');
      setAvatarColor(currentUser.avatarColor || '#007aff');
      setNameColor(currentUser.nameColor || '#5eaddf');
      setAvatarUrl(currentUser.avatarUrl || null);
      setPrivacyPhone(currentUser.privacyPhone || 'all');
      setPrivacyEmail(currentUser.privacyEmail || 'all');
      setPrivacyOnline(currentUser.privacyOnline || 'all');
      setPrivacyNameFormat(currentUser.privacyNameFormat || 'username');
      setPrivacyFullName(currentUser.privacyFullName || 'all');
      setPrivacySearch(currentUser.privacySearch || 'all');
    }
  }, [currentUser]);

  useEffect(() => {
    document.title = 'Настройки | Blyades';
  }, []);

  const shouldShowFieldInPreview = (setting: string) => {
    if (setting === 'all') return true;
    if (setting === 'none') return false;
    return setting === 'contacts' ? previewRole === 'contact' : true;
  };
  
  const showFullName = privacyNameFormat === 'full_name';
  const hasNamesFilled = (firstName && firstName.trim() !== '') || (lastName && lastName.trim() !== '');

  const previewDisplayName = (showFullName && hasNamesFilled)
    ? `${firstName || ''} ${lastName || ''}`.trim()
    : (username.trim() !== '' ? username : `@${uniqueId}`);

  const myIdDisplay = currentUser?.id ? `#${currentUser.id}` : currentUser?.uuid?.slice(0, 8);
  
  const handleSelectTab = (tab: 'profile' | 'privacy') => {
    setActiveSettingsTab(tab);
    setMobileScreen('content'); // На мобилках сразу открываем контент
  };

  return (
    <div className={`${mainStyle['messenger-container']} ${mobileScreen === 'menu' ? style.viewMenu : style.viewContent}`}>
      <NavSidebar />

      <section className={style.setSidebar}>
        <div className={style.setSidebarHeader} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: 'row' }}>
          <button 
            type="button" 
            onClick={() => ctx.setIsNavOpen?.(true)}
            title="Открыть меню"
            className={style.headerMenuBtn}
            style={{
              background: 'none',
              border: 'none',
              color: '#8e8e93',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '8px',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Menu size={22} />
          </button>
          <h2 style={{ margin: 0 }}>Настройки</h2>
        </div>

        <div className={style.setSidebarList}>
          <div 
            className={`${style.setSidebarItem} ${activeSettingsTab === 'profile' ? style.active : ''}`} 
            onClick={() => handleSelectTab('profile')} 
            style={{ cursor: 'pointer' }}
          >
            <User/>
            Аккаунт
          </div>
          <div 
            className={`${style.setSidebarItem} ${activeSettingsTab === 'privacy' ? style.active : ''}`} 
            onClick={() => handleSelectTab('privacy')} 
            style={{ cursor: 'pointer' }}
          >
            <Lock/>
            Приватность
          </div>
          <div className={style.setSidebarItem} title="В разработке" aria-disabled>
            💬 Чаты
          </div>
          <div className={style.setSidebarItem} data-title="В разработке" aria-disabled>
            🔔 Уведомления
          </div>

          <div className={style.settingsLineDivider}/>
          
          <div 
            className={style.setSidebarItem} 
            onClick={ctx.handleLogout}
            aria-exit
            style={{ cursor: 'pointer', color: '#ff453a' }}
          >
            🚪 Выйти
          </div>
        </div>
      </section>

      <div 
        className={style.settingsContainer} 
        style={{ 
          backgroundColor: '#13131a', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: activeSettingsTab ? 'flex-start' : 'center',
          alignItems: activeSettingsTab ? 'stretch' : 'center'
        }}
      >
        {!activeSettingsTab ? (
          /* 🎯 Заглушка по центру (как на втором скриншоте) */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            color: '#6e6f7a',
            userSelect: 'none'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              backgroundColor: '#1b1b22',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #282832'
            }}>
              <Menu size={38} color="#585966" />
            </div>
            <span style={{ fontSize: '16px', fontWeight: 500, color: '#ededed' }}>
              Выберите раздел настроек
            </span>
          </div>
        ) : (
          <>
            {/* Мобильная верхняя панель (Назад + Предпросмотр) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid #232428',
              backgroundColor: '#16171b'
            }}>
              <button 
                type="button"
                className={style.mobileBackBtn}
                onClick={() => {
                  setMobileScreen('menu');
                  setActiveSettingsTab(null);
                }}
                title="Назад к разделам"
              >
                <ArrowLeft size={20} />
                <span style={{ fontSize: '14px', fontWeight: 600, marginLeft: '6px' }}>Назад</span>
              </button>

              <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>
                {activeSettingsTab === 'profile' ? 'Аккаунт' : 'Приватность'}
              </span>

              <button 
                type="button"
                className={style.togglePreviewBtn}
                onClick={() => setShowDrawerPreview(true)}
                title="Открыть предпросмотр"
              >
                <Eye size={16} color="#9d7bf6" />
                <span>Предпросмотр</span>
              </button>
            </div>
            
            {activeSettingsTab === 'profile' && (
              <EditProfile 
                onBack={() => setMobileScreen('menu')}
                state={{ uniqueId, username, firstName, lastName, email, phone, aboutMe, avatarColor, avatarUrl, nameColor }}
                setters={{ setUniqueId, setUsername, setFirstName, setLastName, setEmail, setPhone, setAboutMe, setAvatarColor, setAvatarUrl, setNameColor }}
              />
            )}

            {activeSettingsTab === 'privacy' && (
              <PrivacySettings 
                onBack={() => setMobileScreen('menu')}
                state={{ privacyPhone, privacyEmail, privacyOnline, privacyNameFormat, privacyFullName, privacySearch }}
                setters={{ setPrivacyPhone, setPrivacyEmail, setPrivacyOnline, setPrivacyNameFormat, setPrivacyFullName, setPrivacySearch }}
              />
            )}
          </>
        )}
      </div>

      {/* 🌑 Бэкдроп при открытии предпросмотра на смартфонах/планшетах */}
      {showDrawerPreview && (
        <div 
          className={style.previewBackdrop} 
          onClick={() => setShowDrawerPreview(false)} 
        />
      )}

      {/* 🔮 ВЫДВИЖНАЯ ШТОРКА / КОЛОНКА ПРЕДПРОСМОТРА */}
      <div className={`${style.settingsPreview} ${showDrawerPreview ? style.open : ''}`}>
        <div className={style.settingsPreviewChange} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>👁️ Предпросмотр профиля:</span>
            <button 
            type="button"
            className={style.previewCloseBtn}
            onClick={() => setShowDrawerPreview(false)}
            title="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', margin: '8px 0 16px' }}>
          <button 
            type="button" 
            onClick={() => setPreviewRole('contact')} 
            style={{ 
              flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: '13px',
              backgroundColor: previewRole === 'contact' ? '#007aff' : '#23232e' 
            }}
          >
            Как контакт
          </button>
          <button 
            type="button" 
            onClick={() => setPreviewRole('stranger')} 
            style={{ 
              flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: '13px',
              backgroundColor: previewRole === 'stranger' ? '#da373c' : '#23232e' 
            }}
          >
            Незнакомец
          </button>
        </div>

        {/* Карточка профиля */}
        <div 
          className={profileStyles['view-mode']} 
          style={{ 
            width: '100%', 
            borderRadius: '16px', 
            overflow: 'hidden', 
            border: '1px solid #2b2d31',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            backgroundColor: '#1c1c24'
          }}
        >
          <div className={profileStyles['profile-header-gradient']}>
            <div className={profileStyles['profile-avatar-wrapper']}>
              <SmartAvatar
                size={84}
                avatarUrl={avatarUrl}
                avatarColor={avatarColor}
                name={previewDisplayName}
                isChannel={false}
              />
            </div>

            <h2 className={profileStyles['profile-name']}>
              {renderUserStatusBadge(currentUser)}
              {previewDisplayName}
            </h2>
            <span 
              className={`${profileStyles['profile-status']} ${
                shouldShowFieldInPreview(privacyOnline) ? profileStyles['online'] : ''
              }`}
            >
              {shouldShowFieldInPreview(privacyOnline) ? 'в сети' : 'был(а) недавно'}
            </span>
          </div>

          <div className={profileStyles['info-section']}>
            {privacyNameFormat === 'username' && shouldShowFieldInPreview(privacyFullName) && hasNamesFilled && (
              <div className={profileStyles['info-item']}>
                <div className={profileStyles['info-item-content']}>
                  <span className={profileStyles['info-value']}>
                    {`${firstName || ''} ${lastName || ''}`.trim()}
                  </span>
                  <span className={profileStyles['info-label']}>Настоящие Имя и Фамилия</span>
                </div>
                <Copy size={16} className={profileStyles['info-icon']} />
              </div>
            )}

            <div className={profileStyles['info-item']}>
              <div className={profileStyles['info-item-content']}>
                <span className={`${profileStyles['info-value']} ${profileStyles['accent']}`}>
                  @{uniqueId || 'не указан'}
                </span>
                <span className={profileStyles['info-label']}>Имя пользователя</span>
              </div>
              <QrCode size={18} className={profileStyles['info-icon']} />
            </div>

            {shouldShowFieldInPreview(privacyPhone) && phone && phone.trim() !== '' && (
              <div className={profileStyles['info-item']}>
                <div className={profileStyles['info-item-content']}>
                  <span className={profileStyles['info-value']}>{phone}</span>
                  <span className={profileStyles['info-label']}>Телефон</span>
                </div>
                <Copy size={18} className={profileStyles['info-icon']} />
              </div>
            )}
            
            {/* Электронная почта */}
            {shouldShowFieldInPreview(privacyEmail) && email && email.trim() !== '' && (
              <div className={profileStyles['info-item']}>
                <div className={profileStyles['info-item-content']}>
                  <span className={profileStyles['info-value']}>{email}</span>
                  <span className={profileStyles['info-label']}>Электронная почта</span>
                </div>
                <Copy size={18} className={profileStyles['info-icon']} />
              </div>
            )}
            
            {/* О себе */}
            {aboutMe.trim() !== '' && (
              <div className={profileStyles['info-item']} style={{ cursor: 'default' }}>
                <div className={profileStyles['info-item-content']}>
                  <span className={`${profileStyles['info-value']} ${profileStyles['multiline']}`}>
                    {aboutMe}
                  </span>
                  <span className={profileStyles['info-label']} style={{ marginTop: '4px' }}>О себе</span>
                </div>
              </div>
            )}

            {/* Идентификатор профиля */}
            <div className={profileStyles['info-item']}>
              <div className={profileStyles['info-item-content']}>
                <span className={`${profileStyles['info-value']} ${profileStyles['mono']}`}>
                  {myIdDisplay}
                </span>
                <span className={profileStyles['info-label']}>Идентификатор профиля</span>
              </div>
              <Hash size={16} className={profileStyles['info-icon']} />
            </div>
          </div>
        </div>

        <div
          className={`${chatStyles['sender-group-container']} ${chatStyles['incoming']}`} 
          style={{ 
            background: '#616161', 
            padding: '12px 14px', 
            borderRadius: '14px',
            marginTop: '14px'
          }}
        >
          <div className={chatStyles['sender-avatar-col']}>
            <SmartAvatar
              size={36}
              avatarUrl={avatarUrl}
              avatarColor={avatarColor}
              name={previewDisplayName}
              isChannel={false}
            />
          </div>

          <div className={chatStyles['sender-messages-col']}>
            <div className={`${chatStyles['message-list-item']} ${chatStyles['first-in-group']} ${chatStyles['last-in-group']}`}>
              <div className={chatStyles['message']}>
                <div className={chatStyles['message-bubble']}>
                  <div className={chatStyles['message-text']}>
                    <span 
                      className={chatStyles['group-msg-sender-name']} 
                      style={{ color: nameColor, fontWeight: '600' }}
                    >
                      {renderUserStatusBadge(currentUser)}
                      {previewDisplayName}
                    </span>
                    Привет, теперь моё сообщение будет выглядеть так!
                    <span className={chatStyles['message-meta']}>
                      <span className={chatStyles['message-time']}>13:37</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
