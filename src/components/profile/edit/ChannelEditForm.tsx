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

interface ChannelEditFormProps {
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

export const ChannelEditForm: React.FC<ChannelEditFormProps> = ({
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
        <h3 className={styles['channel-edit-title']}>Редактировать канал</h3>
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
              <label className={styles['channel-edit-label']}>Название канала</label>
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
              <span>Тип канала</span>
            </div>
            <span className={styles['channel-setting-value']}>{channelType}</span>
          </div>

          {/* Обсуждение (disabled) */}
          <div 
            className={`${styles['channel-setting-item']} ${styles['channel-setting-disabled']}`}
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-left']}>
              <Users size={18} className={styles['channel-setting-icon']} />
              <span>Обсуждение</span>
            </div>
            <span className={styles['channel-setting-link']}>Добавить группу</span>
          </div>

          {/* Сообщения каналу (disabled) */}
          <div 
            className={`${styles['channel-setting-item']} ${styles['channel-setting-disabled']}`}
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-left']}>
              <MessageSquare size={18} className={styles['channel-setting-icon']} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Сообщения каналу</span>
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
            <span className={styles['tg-pill-badge']}>{editFirstName.toLowerCase()}</span>
          </div>

          {/* Переводить сообщения (disabled) */}
          <div 
            className={`${styles['channel-setting-item']} ${styles['channel-setting-disabled']}`}
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-left']}>
              <Languages size={18} className={styles['channel-setting-icon']} />
              <span>Переводить сообщения</span>
            </div>
            <label className={styles['tg-switch']} onClick={(e) => e.stopPropagation()}>
              <input 
                type="checkbox" 
                disabled
                checked={translateEnabled} 
                onChange={(e) => setTranslateEnabled(e.target.checked)} 
              />
              <span className={styles['tg-slider']} />
            </label>
          </div>

          {/* Подписывать сообщения (disabled) */}
          <div 
            className={`${styles['channel-setting-card']} ${styles['channel-setting-disabled']}`}
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-item-inner']}>
              <div className={styles['channel-setting-left']}>
                <PenTool size={18} className={styles['channel-setting-icon']} />
                <span>Подписывать сообщения</span>
              </div>
              <label className={styles['tg-switch']} onClick={(e) => e.stopPropagation()}>
                <input 
                  type="checkbox" 
                  disabled
                  checked={signMessagesEnabled} 
                  onChange={(e) => setSignMessagesEnabled(e.target.checked)} 
                />
                <span className={styles['tg-slider']} />
              </label>
            </div>
            <span className={styles['channel-setting-hint']}>
              Добавлять имена администраторов к их сообщениям в канале.
            </span>
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

          {/* Партнёрские программы (disabled) */}
          <div 
            className={`${styles['channel-setting-item']} ${styles['channel-setting-disabled']}`} 
            onClick={notifyDev}
          >
            <div className={styles['channel-setting-left']}>
              <Sparkles size={18} className={styles['channel-setting-icon']} />
              <span>Партнёрские программы</span>
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
              <span>Добавить канал в сообщество</span>
            </div>
          </div>
          <span className={styles['channel-setting-hint']}>
            Вы можете добавить канал в сообщество чатов, связанных между собой.
          </span>
        </div>

        <div className={styles['channel-edit-divider']} />

        {/* Удаление канала (активно) */}
        <button 
          type="button" 
          className={styles['channel-delete-btn']}
          onClick={handleDeleteChannel}
        >
          Удалить канал
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