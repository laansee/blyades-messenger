import { useState, useRef, useEffect } from 'react';
import styles from '../../css/profile.module.css';
import { 
  Camera, KeyRound, MessageSquare, Palette, 
  PenTool, Heart, Hand, Link2, Shield, 
  Users, UserX, ClipboardList, Sparkles 
} from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import useMessengerContext from '../../../context/messengerContext';
import { AvatarCropModal, AvatarUploadSelectorModal } from '../../common/GlobalUI';
import { SubscribersModal } from '../view/SubscribersModal';
import { AdministratorsModal } from '../view/AdministratorsModal';

interface EditChannelModalProps {
  currentChatUser: any;
  editFirstName?: string;
  setEditFirstName?: (v: string) => void;
  editDescription?: string;
  setEditDescription?: (v: string) => void;
  editAvatarColor?: string;
  setEditAvatarColor?: (v: string) => void;
  editAvatarUrl?: string;
  setEditAvatarUrl?: (v: string) => void;
  onCancel: () => void;
  onSuccess?: () => void;
  onSave?: () => Promise<void>;
}

export default function EditChannelModal({
  currentChatUser,
  editFirstName: propName,
  setEditFirstName: propSetName,
  editDescription: propDesc,
  setEditDescription: propSetDesc,
  editAvatarColor: propColor,
  setEditAvatarColor: propSetColor,
  editAvatarUrl: propUrl,
  setEditAvatarUrl: propSetUrl,
  onCancel,
  onSuccess,
  onSave
}: EditChannelModalProps) {
  const ctx = useMessengerContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localName, setLocalName] = useState(propName ?? currentChatUser?.name ?? '');
  const [localDesc, setLocalDesc] = useState(propDesc ?? currentChatUser?.aboutMe ?? currentChatUser?.description ?? '');
  const [localColor, setLocalColor] = useState(propColor ?? currentChatUser?.avatarColor ?? '#5865F2');
  const [localUrl, setLocalUrl] = useState(propUrl ?? currentChatUser?.avatarUrl ?? '');

  const channelName = propName !== undefined ? propName : localName;
  const setChannelName = propSetName || setLocalName;
  const channelDesc = propDesc !== undefined ? propDesc : localDesc;
  const setChannelDesc = propSetDesc || setLocalDesc;
  const channelColor = propColor !== undefined ? propColor : localColor;
  const setChannelColor = propSetColor || setLocalColor;
  const channelUrl = propUrl !== undefined ? propUrl : localUrl;
  const setChannelUrl = propSetUrl || setLocalUrl;

  // 🎯 Настройка "Подписывать сообщения"
  const [signMessagesEnabled, setSignMessagesEnabled] = useState<boolean>(
    Boolean(currentChatUser?.signMessages)
  );

  const [isDragOver, setIsDragOver] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showUploadSelector, setShowUploadSelector] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSubscribersModal, setShowSubscribersModal] = useState(false);
  const [showAdminsModal, setShowAdminsModal] = useState(false);
  const [adminsCount, setAdminsCount] = useState<number>(1);

  const channelType = currentChatUser?.publicId || currentChatUser?.accessType === 'public' ? 'Публичный' : 'Частный';
  const subscribersCount = currentChatUser?.memberCount || currentChatUser?.membersCount || currentChatUser?.subscribersCount || 1;

  const notifyDev = () => ctx.showToast?.('Раздел находится в разработке', 'info');

  const fetchChannelDetailsAndAdmins = async () => {
    const rawId = currentChatUser?.internalChatId || currentChatUser?.chatId || currentChatUser?.id;
    const entityId = Number(rawId);
    if (!entityId || isNaN(entityId)) return;

    // 1. Всегда проверяем актуальное значение signMessages из БД (чтобы после F5 ничего не сбрасывалось)
    const { data: chatRow } = await supabase
      .from('chats')
      .select('signMessages, postMode')
      .eq('id', entityId)
      .single();

    if (chatRow) {
      const actualSign = Boolean(chatRow.signMessages);
      setSignMessagesEnabled(actualSign);

      if (ctx.setChats) {
        ctx.setChats((prev: any[]) =>
          prev.map((c: any) =>
            Number(c.id) === entityId ? { ...c, signMessages: actualSign, postMode: chatRow.postMode } : c
          )
        );
      }
    }

    // 2. Считаем администраторов
    const { data: adminsData } = await supabase
      .from('chat_members')
      .select('role')
      .eq('chatId', entityId)
      .in('role', ['owner', 'admin']);

    if (adminsData) {
      setAdminsCount(adminsData.length);
    }
  };

  useEffect(() => {
    fetchChannelDetailsAndAdmins();
  }, [currentChatUser?.id]);

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

      const entityId = currentChatUser?.internalChatId || currentChatUser?.id;
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

        setChannelUrl(freshUrl);

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

  const handleInternalSave = async () => {
    if (onSave) {
      await onSave();
      return;
    }

    const rawId = currentChatUser?.internalChatId || currentChatUser?.chatId || currentChatUser?.id;
    const numId = Number(rawId);
    const isNumericId = !isNaN(numId) && numId > 0 && !String(rawId).startsWith('channel_');
    const uniqueStringId = String(currentChatUser?.uniqueId || currentChatUser?.id || '');

    const updatedFields: Record<string, any> = {
      name: channelName.trim(),
      description: channelDesc.trim() || null,
      avatarColor: channelColor,
      avatarUrl: channelUrl.trim() || null,
      signMessages: signMessagesEnabled,
      postMode: signMessagesEnabled ? 'user' : 'channel',
      updatedAt: new Date().toISOString()
    };

    try {
      let query = supabase.from('chats').update(updatedFields);

      if (isNumericId) {
        query = query.eq('id', numId);
      } else if (uniqueStringId) {
        query = query.eq('uniqueId', uniqueStringId);
      } else {
        throw new Error('Не удалось определить ID канала для обновления');
      }

      const { data, error } = await query.select();

      if (error) throw error;

      if (!data || data.length === 0) {
        await supabase
          .from('chats')
          .update(updatedFields)
          .eq('name', currentChatUser?.name);
      }

      if (ctx.setChats) {
        ctx.setChats((prev: any[]) =>
          prev.map((c: any) => {
            const isMatch = Number(c.id) === numId || String(c.uniqueId) === uniqueStringId || c.name === channelName;
            return isMatch 
              ? { 
                  ...c, 
                  ...updatedFields, 
                  aboutMe: updatedFields.description, 
                  signMessages: signMessagesEnabled,
                  postMode: updatedFields.postMode 
                } 
              : c;
          })
        );
      }

      if (ctx.fetchAndMatchChats) {
        await ctx.fetchAndMatchChats();
      }

      ctx.showToast?.('Канал сохранён!', 'success');
      onSuccess?.();
      onCancel();
    } catch (err: any) {
      console.error('Ошибка сохранения настроек канала:', err);
      ctx.showToast?.(`Ошибка сохранения: ${err.message}`, 'error');
    }
  };

  const handleDeleteChannel = () => {
    ctx.showConfirm?.(
      'Удалить канал',
      `Вы действительно хотите безвозвратно удалить канал «${channelName}»? Все сообщения и подписчики будут стёрты.`,
      async () => {
        try {
          const entityId = Number(currentChatUser?.internalChatId || currentChatUser?.id);
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
    <div className={styles['modal-edit-container']}>
      <div className={styles['modal-edit-header']}>
        <h3 className={styles['modal-edit-title']}>Редактировать канал</h3>
      </div>

      <div className={styles['modal-edit-body']}>
        <div className={styles['modal-edit-top']}>
          <div 
            className={styles['modal-edit-avatar-btn']}
            onClick={() => setShowUploadSelector(true)}
            title="Сменить фото канала"
          >
            {channelUrl ? (
              <img src={channelUrl} alt="Avatar" className={styles['modal-edit-avatar-img']} />
            ) : (
              <div 
                className={styles['modal-edit-avatar-placeholder']}
                style={{ backgroundColor: channelColor }}
              >
                <Camera size={26} color="#fff" />
              </div>
            )}
            <div className={styles['modal-edit-avatar-overlay']}>
              <Camera size={22} color="#fff" />
            </div>
          </div>

          <div className={styles['modal-edit-name-col']}>
            <div className={styles['modal-edit-input-wrapper']}>
              <div className={styles['profile-input-field']}>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className={styles['profile-line-input']}
                  autoComplete="off"
                  placeholder=" "
                />
                <label className={styles['profile-field-label']}>Название канала</label>
              </div>
            </div>
          </div>
        </div>

        <div className={styles['modal-desc-block']}>
          <input
            type="text"
            placeholder="Описание (необязательно)"
            value={channelDesc}
            onChange={(e) => setChannelDesc(e.target.value)}
            className={styles['modal-clean-input']}
            autoComplete="off"
          />
        </div>

        <div className={styles['info-divider']} />

        <div 
          className={styles['modal-settings-list']}
          style={{ margin: 0 }}
        >
          <div 
            className={styles['action-bottom-btn']} 
            aria-disabled
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <KeyRound size={18} className={styles['modal-setting-icon']} />
              <span>Тип канала</span>
            </div>
            <span className={styles['modal-setting-value']}>{channelType}</span>
          </div>

          <div 
            className={styles['action-bottom-btn']} 
            aria-disabled
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <Users size={18} className={styles['modal-setting-icon']} />
              <span>Обсуждение</span>
            </div>
            <span className={styles['modal-setting-link']}>Добавить группу</span>
          </div>

          <div 
            className={styles['action-bottom-btn']} 
            aria-disabled
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <MessageSquare size={18} className={styles['modal-setting-icon']} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Сообщения каналу</span>
                <span className={styles['badge-accent']}>НОВОЕ</span>
              </div>
            </div>
            <span className={styles['modal-setting-value']}>Выкл.</span>
          </div>

          <div 
            className={styles['action-bottom-btn']} 
            aria-disabled
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <Palette size={18} className={styles['modal-setting-icon']} />
              <span>Оформление</span>
            </div>
            <span className={styles['badge-pill']}>{channelName.toLowerCase()}</span>
          </div>

          {/* 🎯 РАБОЧИЙ ПЕРЕКЛЮЧАТЕЛЬ: Подписывать сообщения */}
          <div 
            className={styles['action-bottom-btn']} 
            onClick={() => setSignMessagesEnabled(prev => !prev)}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles['modal-setting-left']}>
              <PenTool size={18} className={styles['modal-setting-icon']} />
              <span>Подписывать сообщения</span>
            </div>
            <label className={styles['toggle-switch']} onClick={(e) => e.stopPropagation()}>
              <input 
                type="checkbox" 
                checked={signMessagesEnabled} 
                onChange={(e) => setSignMessagesEnabled(e.target.checked)} 
              />
              <span className={styles['toggle-slider']} />
            </label>
            {/* <span className={styles['modal-setting-hint']}>
              {signMessagesEnabled 
                ? 'Включено: сообщения авторов будут отображаться с их аватарками и именами (как в беседе).'
                : 'Выключено: все сообщения от имени канала. Доступна текстовая подпись автора внизу.'}
            </span> */}
          </div>
        </div>

        <div className={styles['info-divider']} />

        <div 
          className={styles['modal-settings-list']}
          style={{ margin: 0 }}
        >
          <div 
            className={styles['action-bottom-btn']} 
            aria-disabled
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <Heart size={18} className={styles['modal-setting-icon']} />
              <span>Реакции</span>
            </div>
            <span className={styles['modal-setting-value']}>Все</span>
          </div>

          <div 
            className={styles['action-bottom-btn']} 
            aria-disabled
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <Hand size={18} className={styles['modal-setting-icon']} />
              <span>Приветственное сообщение</span>
            </div>
            <span className={styles['modal-setting-value']}>Выкл.</span>
          </div>

          <div 
            className={styles['action-bottom-btn']} 
            aria-disabled
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <Link2 size={18} className={styles['modal-setting-icon']} />
              <span>Пригласительные ссылки</span>
            </div>
            <span className={styles['modal-setting-value']}>1</span>
          </div>

          <div 
            className={styles['action-bottom-btn']} 
            onClick={() => setShowAdminsModal(true)}
          >
            <div className={styles['modal-setting-left']}>
              <Shield size={18} className={styles['modal-setting-icon']} />
              <span>Администраторы</span>
            </div>
            <span className={styles['modal-setting-value']}>{adminsCount}</span>
          </div>

          <div 
            className={styles['action-bottom-btn']} 
            onClick={() => setShowSubscribersModal(true)}
          >
            <div className={styles['modal-setting-left']}>
              <Users size={18} className={styles['modal-setting-icon']} />
              <span>Подписчики</span>
            </div>
            <span className={styles['modal-setting-value']}>{subscribersCount}</span>
          </div>

          <div 
            className={styles['action-bottom-btn']} 
            aria-disabled
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <UserX size={18} className={styles['modal-setting-icon']} />
              <span>Чёрный список</span>
            </div>
          </div>

          <div 
            className={styles['action-bottom-btn']} 
            aria-disabled
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <ClipboardList size={18} className={styles['modal-setting-icon']} />
              <span>Недавние действия</span>
            </div>
          </div>

          <div 
            className={styles['action-bottom-btn']} 
            aria-disabled
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <Sparkles size={18} className={styles['modal-setting-icon']} />
              <span>Партнёрские программы</span>
            </div>
          </div>
        </div>

        <div className={styles['info-divider']} />

        <button 
          type="button" 
          className={styles['modal-delete-btn']}
          onClick={handleDeleteChannel}
        >
          Удалить канал
        </button>
      </div>

      <div className={styles['modal-edit-footer']}>
        <button type="button" className={styles['modal-footer-btn-cancel']} onClick={onCancel}>
          Отмена
        </button>
        <button type="button" className={styles['modal-footer-btn-save']} onClick={handleInternalSave}>
          Сохранить
        </button>
      </div>

      <AvatarUploadSelectorModal
        show={showUploadSelector}
        avatarUrl={channelUrl}
        avatarColor={channelColor || '#5865F2'}
        isDragOver={isDragOver}
        uploading={isUploading}
        fileInputRef={fileInputRef}
        setAvatarColor={(c) => setChannelColor(c)}
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
          setChannelColor(chosenColor);
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
        channelId={currentChatUser?.internalChatId || currentChatUser?.id}
        channelName={channelName}
        currentUserId={String(ctx.currentUser?.uuid || ctx.currentUser?.id)}
        isOwner={Boolean(
          String(currentChatUser?.createdBy) === String(ctx.currentUser?.uuid || ctx.currentUser?.id) ||
          currentChatUser?.role === 'owner'
        )}
        onClose={() => setShowAdminsModal(false)}
        onAdminsUpdated={fetchChannelDetailsAndAdmins}
      />

      <SubscribersModal
        show={showSubscribersModal}
        channelId={currentChatUser?.internalChatId || currentChatUser?.id}
        channelName={channelName}
        currentUserId={String(ctx.currentUser?.uuid || ctx.currentUser?.id)}
        isOwnerOrAdmin={true}
        onClose={() => setShowSubscribersModal(false)}
        onSubscribersUpdated={ctx.fetchAndMatchChats}
      />
    </div>
  );
}

export { EditChannelModal as ChannelEditForm };