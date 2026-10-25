import { useState, useEffect } from 'react';
import mainStyle from '../../components/css/main.module.css';
import style from '../../components/css/settings.module.css';
import chatStyles from '../../components/css/chat-window.module.css';
import profileStyles from '../../components/css/profile.module.css';
import useMessengerContext from '../../context/messengerContext';
import NavSidebar from '../navigation/nav-sidebar';
import { renderUserStatusBadge } from '../../utils/statusBadge';

import EditProfile from './edit-profile';
import PrivacySettings from './privacy-settings';
import { Lock, User } from 'lucide-react';

export default function SettingsPage() {
  const ctx = useMessengerContext();
  const currentUser = ctx.currentUser;

  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'privacy' | 'chats'>('profile');
  const [previewRole, setPreviewRole] = useState<'contact' | 'stranger'>('contact');

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

  // Синхронизация данных с базой при холодном старте
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

  // 🔒 Проверка видимости полей на основе настроек приватности и выбранной роли
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

  return (
    <div className={mainStyle['messenger-container']}>
      <NavSidebar />

      <section className={style.setSidebar}>
        <div className={style.setSidebarHeader}>
          <h2>Настройки</h2>
        </div>

        <div className={style.setSidebarList}>
          <div 
            className={`${style.setSidebarItem} ${activeSettingsTab === 'profile' ? style.active : ''}`} 
            onClick={() => setActiveSettingsTab('profile')} 
            style={{ cursor: 'pointer' }}
          >
            <User/>
            Аккаунт
          </div>
          <div 
            className={`${style.setSidebarItem} ${activeSettingsTab === 'privacy' ? style.active : ''}`} 
            onClick={() => setActiveSettingsTab('privacy')} 
            style={{ cursor: 'pointer' }}
          >
            <Lock/>
            Приватность
          </div>
          <div 
            className={style.setSidebarItem} 
            title="В разработке"
            aria-disabled
          >
            💬 Чаты
          </div>
          <div 
            className={style.setSidebarItem} 
            data-title="В разработке"
            aria-disabled
          >
            🔔 Уведомления
          </div>

          <div className={style.settingsLineDivider}></div>
          
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

      <div className={style.settingsContainer} style={{ backgroundColor: '#13131a', overflowY: 'auto' }}>
        
        {activeSettingsTab === 'profile' && (
          <EditProfile 
            onBack={() => setActiveSettingsTab('profile')}
            state={{ uniqueId, username, firstName, lastName, email, phone, aboutMe, avatarColor, avatarUrl, nameColor }}
            setters={{ setUniqueId, setUsername, setFirstName, setLastName, setEmail, setPhone, setAboutMe, setAvatarColor, setAvatarUrl, setNameColor }}
            title="Личные данные аккаунта"
            Icon={<User />}
          />
        )}

        {activeSettingsTab === 'privacy' && (
          <PrivacySettings 
            onBack={() => setActiveSettingsTab('privacy')}
            state={{ privacyPhone, privacyEmail, privacyOnline, privacyNameFormat, privacyFullName, privacySearch }}
            setters={{ setPrivacyPhone, setPrivacyEmail, setPrivacyOnline, setPrivacyNameFormat, setPrivacyFullName, setPrivacySearch }}
            title="Приватность"
            Icon={<Lock />}
          />
        )}
      </div>

      <div className={style.settingsPreview}>
        <div className={style.settingsPreviewChange}>
          <span>👁️ Предпросмотр профиля:</span>
          <div>
            <button 
              type="button" 
              onClick={() => setPreviewRole('contact')} 
              style={{ backgroundColor: previewRole === 'contact' ? '#007aff' : 'transparent' }}
            >
              Как контакт
            </button>
            <button 
              type="button" 
              onClick={() => setPreviewRole('stranger')} 
              style={{ backgroundColor: previewRole === 'stranger' ? '#da373c' : 'transparent' }}
            >
              Незнакомец
            </button>
          </div>
        </div>

        <div className={profileStyles['profile-modal-card']} style={{ width: '100%', position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'none' }}>
          <div style={{ padding: '24px' }}>
            <div className={profileStyles['profile-avatar-wrapper']}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div className={profileStyles['profile-avatar']} style={{ backgroundColor: avatarColor }}>
                  {previewDisplayName.substring(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <h2 className={profileStyles['profile-name']}>
              {renderUserStatusBadge(currentUser)}
              {previewDisplayName}
            </h2>
            <span className={profileStyles['profile-status']} style={{ color: shouldShowFieldInPreview(privacyOnline) ? '#2ec761' : '#707579' }}>
              {shouldShowFieldInPreview(privacyOnline) ? 'в сети' : 'был(а) недавно'}
            </span>
          </div>

          <div className={profileStyles['info-section']}>
            {privacyNameFormat === 'username' && shouldShowFieldInPreview(privacyFullName) && hasNamesFilled && (
              <div className={profileStyles['info-item']}>
                <span className={profileStyles['info-value']}>
                  {`${firstName || ''} ${lastName || ''}`.trim()}
                </span>
                <span className={profileStyles['info-label']}>
                  Настоящие Имя и Фамилия
                </span>
              </div>
            )}

            <div className={profileStyles['info-item']}>
              <span className={profileStyles['info-value']}>
                @{uniqueId || 'не указан'}
              </span>
              <span className={profileStyles['info-label']}>
                Имя пользователя
              </span>
            </div>
            
            {shouldShowFieldInPreview(privacyPhone) && phone && phone.trim() !== '' && (
              <div className={profileStyles['info-item']}>
                <span className={profileStyles['info-value']}>
                  {phone}
                </span>
                <span className={profileStyles['info-label']}>
                  Телефон
                </span>
              </div>
            )}
            
            {shouldShowFieldInPreview(privacyEmail) && email && email.trim() !== '' && (
              <div className={profileStyles['info-item']}>
                <span className={profileStyles['info-value']}>
                  {email}
                </span>
                <span className={profileStyles['info-label']}>
                  Электронная почта
                </span>
              </div>
            )}

            {aboutMe.trim() !== '' && (
              <div className={profileStyles['info-item']}>
                <span className={profileStyles['info-value']} style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                  {aboutMe}
                </span>
                <span className={profileStyles['info-label']}>
                  О себе
                </span>
              </div>
            )}
          </div>
        </div>



        <div className={chatStyles['message-with-avatar']} style={{background: '#616161', padding: '10px', borderRadius: '9px',}}>
          <div 
            className={chatStyles['group-msg-avatar']} 
            style={{ backgroundColor: avatarColor }}
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              previewDisplayName.substring(0, 1).toUpperCase()
            )}
          </div>
          <div 
            className={chatStyles['message-bubble']}
            style={{ background: '#1c1c24' }}
          >
            <div className={chatStyles['message-text']}>
              <span 
                className={chatStyles['group-msg-sender-name']} 
                style={{ color: nameColor }}
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
  );
}
