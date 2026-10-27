// import React, { useState, useRef } from 'react';
// import styles from '../../css/profile.module.css';
// import { supabase } from '../../../services/supabaseClient';
// import useMessengerContext from '../../../context/messengerContext';
// import { AvatarCropModal, AvatarUploadSelectorModal } from '../../common/GlobalUI';
// import { EditAvatarButton } from './EditAvatarButton';

// interface GroupChannelEditFormProps {
//   currentChatUser: any;
//   editFirstName: string;
//   setEditFirstName: (v: string) => void;
//   editDescription?: string;
//   setEditDescription?: (v: string) => void;
//   editAvatarColor?: string;
//   setEditAvatarColor?: (v: string) => void;
//   editAvatarUrl?: string;
//   setEditAvatarUrl?: (v: string) => void;
//   onCancel: () => void;
//   onSave: () => Promise<void>;
// }

// const PRESET_COLORS = ['#9d7bf6', '#5865F2', '#3ba55c', '#faa61a', '#ed4245', '#eb459e', '#007aff'];

// export const GroupEditForm: React.FC<GroupChannelEditFormProps> = ({
//   currentChatUser,
//   editFirstName,
//   setEditFirstName,
//   editDescription = '',
//   setEditDescription,
//   editAvatarColor = '#5865F2',
//   setEditAvatarColor,
//   editAvatarUrl = '',
//   setEditAvatarUrl,
//   onCancel,
//   onSave
// }) => {
//   const ctx = useMessengerContext();
//   const isChannel = currentChatUser.isChannel || currentChatUser.type === 'channel';
//   const entityTitle = isChannel ? 'канала' : 'беседы';

//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const [isDragOver, setIsDragOver] = useState(false);
//   const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
//   const [showCropModal, setShowCropModal] = useState(false);
//   const [showUploadSelector, setShowUploadSelector] = useState(false);
//   const [isUploading, setIsUploading] = useState(false);

//   const processSelectedFile = (file: File) => {
//     if (!file.type.startsWith('image/')) {
//       ctx.showToast('Ошибка: Можно загружать только изображения!', 'error');
//       return;
//     }
//     const reader = new FileReader();
//     reader.onload = () => {
//       setRawImageSrc(reader.result as string);
//       setShowUploadSelector(false);
//       setShowCropModal(true);
//     };
//     reader.readAsDataURL(file);
//   };

//   const handleSaveCroppedAvatar = async (croppedBlob: Blob) => {
//     try {
//       setIsUploading(true);
//       ctx.showToast('Загрузка аватарки в облако...', 'info');

//       const targetFolder = isChannel ? 'channels' : 'groups';
//       const entityId = currentChatUser.internalChatId || currentChatUser.id;
//       const fileName = `${targetFolder}/${entityId}-${Date.now()}.png`;

//       const { error: uploadError } = await supabase.storage
//         .from('avatars')
//         .upload(fileName, croppedBlob, { contentType: 'image/png' });

//       if (uploadError) throw uploadError;

//       const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
//       if (data?.publicUrl) {
//         const freshUrl = data.publicUrl;

//         const { error: dbError } = await supabase
//           .from('chats')
//           .update({ avatarUrl: freshUrl, updatedAt: new Date().toISOString() })
//           .eq('id', Number(entityId));

//         if (dbError) throw dbError;

//         if (setEditAvatarUrl) setEditAvatarUrl(freshUrl);

//         if (ctx.setChats) {
//           ctx.setChats((prev: any[]) =>
//             prev.map((c: any) =>
//               String(c.id) === String(entityId) ? { ...c, avatarUrl: freshUrl } : c
//             )
//           );
//         }

//         ctx.showToast(`Аватар ${entityTitle} успешно обновлен! 📸`, 'success');
//       }
//     } catch (err: any) {
//       console.error(err);
//       ctx.showToast(`Ошибка загрузки: ${err.message}`, 'error');
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   return (
//     <div className={styles['profile-edit-mode']}>
//       <h3 className={styles['profile-edit-title']}>
//         {`Настройки ${entityTitle}`}
//       </h3>

//       <div className={styles['profile-edit-header']}>
//         <EditAvatarButton
//           avatarUrl={editAvatarUrl}
//           avatarColor={editAvatarColor}
//           fallbackLetter={editFirstName.substring(0, 1) || '?'}
//           isEditable={true}
//           onClick={() => setShowUploadSelector(true)}
//         />

//         <div className={styles['profile-edit-user-meta']}>
//           <div className={styles['profile-meta-name']}>{editFirstName}</div>
//           <div style={{ fontSize: '12px', color: '#8e8e93' }}>
//             #{currentChatUser.internalChatId || currentChatUser.id}
//           </div>
//         </div>
//       </div>

//       <div className={styles['profile-inputs-list']}>
//         <div className={styles['profile-input-field']}>
//           <input 
//             type="text" 
//             value={editFirstName}
//             onChange={(e) => setEditFirstName(e.target.value)}
//             placeholder=" "
//             className={styles['profile-line-input']} 
//             id="groupTitle-input" 
//             autoComplete="off"
//           />
//           <label className={styles['profile-field-label']} htmlFor="groupTitle-input">
//             {`Название ${entityTitle}`}
//           </label>
//         </div>

//         <div className={styles['profile-input-field']}>
//           <input 
//             type="text" 
//             value={editDescription} 
//             onChange={(e) => setEditDescription && setEditDescription(e.target.value)}
//             placeholder=" "
//             className={styles['profile-line-input']}
//             id="groupDesc-input"
//             autoComplete="off"
//           />
//           <label className={styles['profile-field-label']} htmlFor="groupDesc-input">
//             {`Описание ${entityTitle}`}
//           </label>
//         </div>

//         {/* Палитра цвета заглушки */}
//         <div style={{ marginTop: '10px' }}>
//           <span style={{ fontSize: '12px', color: '#8e8e93', display: 'block', marginBottom: '8px' }}>
//             Цвет заглушки аватара:
//           </span>
//           <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
//             {PRESET_COLORS.map((color) => (
//               <div
//                 key={color}
//                 onClick={() => setEditAvatarColor && setEditAvatarColor(color)}
//                 style={{
//                   width: '26px',
//                   height: '26px',
//                   borderRadius: '50%',
//                   backgroundColor: color,
//                   cursor: 'pointer',
//                   border: editAvatarColor === color ? '2px solid #fff' : '2px solid transparent',
//                   transform: editAvatarColor === color ? 'scale(1.15)' : 'scale(1)',
//                   transition: 'all 0.15s ease'
//                 }}
//               />
//             ))}
//           </div>
//         </div>
//       </div>

//       <div className={styles['profile-edit-footer']}>
//         <button type="button" className={styles['profile-footer-cancel-btn']} onClick={onCancel}>
//           Отмена
//         </button>
//         <button type="button" className={styles['profile-footer-ready-btn']} onClick={onSave}>
//           Готово
//         </button>
//       </div>

//       {/* Модалки загрузки и кадрирования фото */}
//       <AvatarUploadSelectorModal
//         show={showUploadSelector}
//         avatarUrl={editAvatarUrl}
//         avatarColor={editAvatarColor || '#5865F2'}
//         isDragOver={isDragOver}
//         uploading={isUploading}
//         fileInputRef={fileInputRef}
//         setAvatarColor={(c) => setEditAvatarColor && setEditAvatarColor(c)}
//         onClose={() => setShowUploadSelector(false)}
//         onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
//         onDragLeave={() => setIsDragOver(false)}
//         onDrop={(e) => {
//           e.preventDefault();
//           setIsDragOver(false);
//           if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//             processSelectedFile(e.dataTransfer.files[0]);
//           }
//         }}
//         onFileSelect={(e) => e.target.files && e.target.files.length > 0 && processSelectedFile(e.target.files[0])}
//         onColorSelect={async (chosenColor: string) => {
//           if (setEditAvatarColor) setEditAvatarColor(chosenColor);
//         }}
//         targetType={isChannel ? 'channels' : 'groups'}
//         title={`Аватар ${entityTitle}`}
//       />

//       <AvatarCropModal 
//         show={showCropModal} 
//         imageSrc={rawImageSrc} 
//         onClose={() => { setShowCropModal(false); setRawImageSrc(null); }} 
//         onSave={handleSaveCroppedAvatar} 
//       />
//     </div>
//   );
// };














import React, { useState, useRef, useEffect } from 'react';
import styles from '../../css/profile.module.css';
import { 
  Camera, Smile, KeyRound, MessageSquare, Palette, 
  Languages, PenTool, Heart, Hand, Link2, Shield, 
  Users, UserX, ClipboardList, Sparkles 
} from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import useMessengerContext from '../../../context/messengerContext';
import { AvatarCropModal, AvatarUploadSelectorModal } from '../../common/GlobalUI';
import { SubscribersModal } from '../../profile/SubscribersModal';
import { AdministratorsModal } from '../AdministratorsModal';

interface GroupChannelEditFormProps {
  currentChatUser: any;
  editFirstName: string;
  setEditFirstName: (v: string) => void;
  editDescription?: string;
  setEditDescription?: (v: string) => void;
  editAvatarColor?: string;
  setEditAvatarColor?: (v: string) => void;
  editAvatarUrl?: string;
  setEditAvatarUrl?: (v: string) => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
}

export const GroupEditForm: React.FC<GroupChannelEditFormProps> = ({
  currentChatUser,
  editFirstName,
  setEditFirstName,
  editDescription = '',
  setEditDescription,
  editAvatarColor = '#5865F2',
  setEditAvatarColor,
  editAvatarUrl = '',
  setEditAvatarUrl,
  onCancel,
  onSave
}) => {
  const ctx = useMessengerContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [signMessagesEnabled, setSignMessagesEnabled] = useState(false);

  const [isDragOver, setIsDragOver] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showUploadSelector, setShowUploadSelector] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSubscribersModal, setShowSubscribersModal] = useState(false);
  const [showAdminsModal, setShowAdminsModal] = useState(false);
  const [adminsCount, setAdminsCount] = useState<number>(1);

  const channelType = currentChatUser.publicId || currentChatUser.accessType === 'public' ? 'Публичный' : 'Частный';
  const subscribersCount = currentChatUser.membersCount || currentChatUser.subscribersCount || 1;

  const notifyDev = () => ctx.showToast?.('Раздел находится в разработке', 'info');

  // Функция для подсчёта реального числа админов
  const fetchAdminsCount = async () => {
    const entityId = currentChatUser.internalChatId || currentChatUser.id;
    if (!entityId) return;
    const { data } = await supabase
      .from('chat_members')
      .select('role')
      .eq('chatId', Number(entityId))
      .in('role', ['owner', 'admin']);
    if (data) {
      setAdminsCount(data.length);
    }
  };

  useEffect(() => {
    fetchAdminsCount();
  }, [currentChatUser]);

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      ctx.showToast?.('Можно загружать только изображения', 'error');
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

  const handleSaveCroppedAvatar = async (croppedBlob: Blob) => {
    try {
      setIsUploading(true);
      ctx.showToast?.('Загрузка аватарки в облако...', 'info');

      const entityId = currentChatUser.internalChatId || currentChatUser.id;
      const fileName = `channels/${entityId}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      if (data?.publicUrl) {
        const freshUrl = data.publicUrl;

        await supabase
          .from('chats')
          .update({ avatarUrl: freshUrl, updatedAt: new Date().toISOString() })
          .eq('id', Number(entityId));

        if (setEditAvatarUrl) setEditAvatarUrl(freshUrl);

        if (ctx.setChats) {
          ctx.setChats((prev: any[]) =>
            prev.map((c: any) =>
              String(c.id) === String(entityId) ? { ...c, avatarUrl: freshUrl } : c
            )
          );
        }

        ctx.showToast?.('Аватар канала успешно обновлен! 📸', 'success');
      }
    } catch (err: any) {
      ctx.showToast?.(`Ошибка загрузки: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteChannel = () => {
    ctx.showConfirm?.(
      'Удалить канал',
      `Вы действительно хотите безвозвратно удалить канал «${editFirstName}»? Все сообщения и подписчики будут стёрты.`,
      async () => {
        try {
          const entityId = currentChatUser.internalChatId || currentChatUser.id;
          await supabase.from('messages').delete().eq('chatId', entityId);
          await supabase.from('chat_members').delete().eq('chatId', entityId);
          await supabase.from('chats').delete().eq('id', entityId);

          ctx.showToast?.('Канал успешно удалён', 'info');
          if (String(ctx.activeChatId) === String(entityId)) {
            ctx.setActiveChatId(null);
          }
          if (ctx.fetchAndMatchChats) {
            await ctx.fetchAndMatchChats();
          }
          onCancel();
        } catch (err: any) {
          ctx.showToast?.(`Ошибка при удалении: ${err.message}`, 'error');
        }
      },
      true
    );
  };

  return (
    <div className={styles['channel-edit-container']}>
      {/* 1. ФИКСИРОВАННАЯ ШАПКА */}
      <div className={styles['channel-edit-header']}>
        <h3 className={styles['channel-edit-title']}>Настройки группы</h3>
      </div>

      {/* 2. СКРОЛЛИРУЕМЫЙ ЦЕНТРАЛЬНЫЙ БЛОК */}
      <div className={styles['channel-edit-body']}>
        {/* Аватар + Инпут названия */}
        <div className={styles['channel-edit-top']}>
          <div 
            className={styles['channel-edit-avatar-btn']}
            onClick={() => setShowUploadSelector(true)}
            title="Сменить фото канала"
          >
            {editAvatarUrl ? (
              <img src={editAvatarUrl} alt="Avatar" className={styles['channel-edit-avatar-img']} />
            ) : (
              <div 
                className={styles['channel-edit-avatar-placeholder']}
                style={{ backgroundColor: editAvatarColor }}
              >
                <Camera size={26} color="#fff" />
              </div>
            )}
            <div className={styles['channel-edit-avatar-overlay']}>
              <Camera size={22} color="#fff" />
            </div>
          </div>

          <div className={styles['channel-edit-name-col']}>
            <div className={styles['channel-edit-input-wrapper']}>
              <label className={styles['channel-edit-label']}>Название группы</label>
              <div className={styles['channel-edit-input-row']}>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className={styles['channel-clean-input']}
                  autoComplete="off"
                />
                <button 
                  type="button" 
                  className={styles['channel-emoji-btn']}
                  onClick={notifyDev}
                >
                  <Smile size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Описание */}
        <div className={styles['channel-desc-block']}>
          <input
            type="text"
            placeholder="Описание (необязательно)"
            value={editDescription}
            onChange={(e) => setEditDescription && setEditDescription(e.target.value)}
            className={styles['channel-clean-input']}
            autoComplete="off"
          />
        </div>

        <div className={styles['channel-edit-divider']} />

        {/* Параметры канала */}
        <div className={styles['channel-settings-list']}>
          {/* Тип канала (disabled) */}
          <div 
            className={`${styles['channel-setting-item']} ${styles['channel-setting-disabled']}`} 
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-left']}>
              <KeyRound size={18} className={styles['channel-setting-icon']} />
              <span>Тип группы</span>
            </div>
            <span className={styles['channel-setting-value']}>{channelType}</span>
          </div>

          {/* История чата для новых участников (disabled) */}
          <div 
            className={`${styles['channel-setting-item']} ${styles['channel-setting-disabled']}`}
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-left']}>
              <MessageSquare size={18} className={styles['channel-setting-icon']} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>История чата для новых участников</span>
              </div>
            </div>
            <span className={styles['channel-setting-value']}>Видно</span>
          </div>

          {/* Сообщения каналу (disabled) */}
          <div 
            className={`${styles['channel-setting-item']} ${styles['channel-setting-disabled']}`}
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-left']}>
              <MessageSquare size={18} className={styles['channel-setting-icon']} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Темы</span>
                <span className={styles['tg-badge-new']}>НОВОЕ</span>
              </div>
            </div>
            <span className={styles['channel-setting-value']}>Выкл.</span>
          </div>

          {/* Оформление (disabled) */}
          <div 
            className={`${styles['channel-setting-item']} ${styles['channel-setting-disabled']}`}
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-left']}>
              <Palette size={18} className={styles['channel-setting-icon']} />
              <span>Оформление</span>
            </div>
          </div>
        </div>

        <div className={styles['channel-edit-divider']} />

        {/* Статистика и управление */}
        <div className={styles['channel-settings-list']}>
          {/* Реакции (disabled) */}
          <div 
            className={`${styles['channel-setting-item']} ${styles['channel-setting-disabled']}`} 
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-left']}>
              <Heart size={18} className={styles['channel-setting-icon']} />
              <span>Реакции</span>
            </div>
            <span className={styles['channel-setting-value']}>Все</span>
          </div>

          {/* Приветственное сообщение (disabled) */}
          <div 
            className={`${styles['channel-setting-item']} ${styles['channel-setting-disabled']}`} 
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-left']}>
              <Hand size={18} className={styles['channel-setting-icon']} />
              <span>Приветственное сообщение</span>
            </div>
            <span className={styles['channel-setting-value']}>Выкл.</span>
          </div>

          {/* Пригласительные ссылки (disabled) */}
          <div 
            className={`${styles['channel-setting-item']} ${styles['channel-setting-disabled']}`} 
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-left']}>
              <Link2 size={18} className={styles['channel-setting-icon']} />
              <span>Разрешения</span>
            </div>
            <span className={styles['channel-setting-value']}>1/15</span>
          </div>

          {/* Пригласительные ссылки (disabled) */}
          <div 
            className={`${styles['channel-setting-item']} ${styles['channel-setting-disabled']}`} 
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-left']}>
              <Link2 size={18} className={styles['channel-setting-icon']} />
              <span>Пригласительные ссылки</span>
            </div>
            <span className={styles['channel-setting-value']}>1</span>
          </div>

          {/* Администраторы (disabled) */}
          <div 
            className={styles['channel-setting-item']} 
            onClick={() => setShowAdminsModal(true)}
          >
            <div className={styles['channel-setting-left']}>
              <Shield size={18} className={styles['channel-setting-icon']} />
              <span>Администраторы</span>
            </div>
            <span className={styles['channel-setting-value']}>{adminsCount}</span>
          </div>

          {/* Подписчики (активно / кликабельно для просмотра) */}
          <div 
            className={styles['channel-setting-item']} 
            onClick={() => setShowSubscribersModal(true)}
          >
            <div className={styles['channel-setting-left']}>
              <Users size={18} className={styles['channel-setting-icon']} />
              <span>Подписчики</span>
            </div>
            <span className={styles['channel-setting-value']}>{subscribersCount}</span>
          </div>

          {/* Чёрный список (disabled) */}
          <div 
            className={`${styles['channel-setting-item']} ${styles['channel-setting-disabled']}`} 
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-left']}>
              <UserX size={18} className={styles['channel-setting-icon']} />
              <span>Чёрный список</span>
            </div>
          </div>

          {/* Недавние действия (disabled) */}
          <div 
            className={`${styles['channel-setting-item']} ${styles['channel-setting-disabled']}`} 
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-left']}>
              <ClipboardList size={18} className={styles['channel-setting-icon']} />
              <span>Недавние действия</span>
            </div>
          </div>
        </div>

        <div className={styles['channel-edit-divider']} />

        {/* Сообщество (disabled) */}
        <div 
          className={`${styles['channel-setting-card']} ${styles['channel-setting-disabled']}`}
          onClick={notifyDev}
        >
          <div className={styles['channel-setting-item-inner']}>
            <div className={styles['channel-setting-left']}>
              <Users size={18} className={styles['channel-setting-icon']} />
              <span>Добавить группу в сообщество</span>
            </div>
          </div>
          <span className={styles['channel-setting-hint']}>
            Вы можете добавить группу в сообщество чатов, связанных между собой.
          </span>
        </div>

        <div className={styles['channel-edit-divider']} />

        {/* Удаление канала (активно) */}
        <button 
          type="button" 
          className={styles['channel-delete-btn']}
          onClick={handleDeleteChannel}
        >
          Удалить группу
        </button>
      </div>

      {/* 3. ФИКСИРОВАННЫЙ ПОДВАЛ */}
      <div className={styles['channel-edit-footer']}>
        <button type="button" className={styles['channel-footer-btn-cancel']} onClick={onCancel}>
          Отмена
        </button>
        <button type="button" className={styles['channel-footer-btn-save']} onClick={onSave}>
          Сохранить
        </button>
      </div>

      {/* Модалки аватара */}
      <AvatarUploadSelectorModal
        show={showUploadSelector}
        avatarUrl={editAvatarUrl}
        avatarColor={editAvatarColor || '#5865F2'}
        isDragOver={isDragOver}
        uploading={isUploading}
        fileInputRef={fileInputRef}
        setAvatarColor={(c) => setEditAvatarColor && setEditAvatarColor(c)}
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
          if (setEditAvatarColor) setEditAvatarColor(chosenColor);
        }}
        targetType="channels"
        title="Аватар канала"
      />

      <AvatarCropModal 
        show={showCropModal} 
        imageSrc={rawImageSrc} 
        onClose={() => { setShowCropModal(false); setRawImageSrc(null); }} 
        onSave={handleSaveCroppedAvatar} 
      />
      <AdministratorsModal
        show={showAdminsModal}
        channelId={currentChatUser.internalChatId || currentChatUser.id}
        channelName={editFirstName}
        currentUserId={String(ctx.currentUser?.uuid || ctx.currentUser?.id)}
        isOwner={Boolean(
          String(currentChatUser.createdBy) === String(ctx.currentUser?.uuid || ctx.currentUser?.id) ||
          currentChatUser.role === 'owner'
        )}
        onClose={() => setShowAdminsModal(false)}
        onAdminsUpdated={fetchAdminsCount}
      />
      <SubscribersModal
        show={showSubscribersModal}
        channelId={currentChatUser.internalChatId || currentChatUser.id}
        channelName={editFirstName}
        currentUserId={String(ctx.currentUser?.uuid || ctx.currentUser?.id)}
        isOwnerOrAdmin={true}
        onClose={() => setShowSubscribersModal(false)}
        onSubscribersUpdated={ctx.fetchAndMatchChats}
      />
    </div>
  );
};