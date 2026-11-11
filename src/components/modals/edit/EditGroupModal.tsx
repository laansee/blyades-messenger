import { useState, useRef, useEffect } from 'react';
import styles from '../../css/profile.module.css';
import { 
  Camera, KeyRound, MessageSquare, Palette, 
  Heart, Link2, Shield, Users, UserX, ClipboardList 
} from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import useMessengerContext from '../../../context/messengerContext';
import { AvatarCropModal, AvatarUploadSelectorModal } from '../../common/GlobalUI';
import { SubscribersModal } from '../view/SubscribersModal';
import { AdministratorsModal } from '../view/AdministratorsModal';

interface EditGroupModalProps {
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
  onSave?: () => Promise<void>;
}

export default function EditGroupModal({
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
  onSave
}: EditGroupModalProps) {
  const ctx = useMessengerContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localName, setLocalName] = useState(propName ?? currentChatUser?.name ?? '');
  const [localDesc, setLocalDesc] = useState(propDesc ?? currentChatUser?.aboutMe ?? currentChatUser?.description ?? '');
  const [localColor, setLocalColor] = useState(propColor ?? currentChatUser?.avatarColor ?? '#5865F2');
  const [localUrl, setLocalUrl] = useState(propUrl ?? currentChatUser?.avatarUrl ?? '');

  const groupName = propName !== undefined ? propName : localName;
  const setGroupName = propSetName || setLocalName;
  const groupDesc = propDesc !== undefined ? propDesc : localDesc;
  const setGroupDesc = propSetDesc || setLocalDesc;
  const groupColor = propColor !== undefined ? propColor : localColor;
  const setGroupColor = propSetColor || setLocalColor;
  const groupUrl = propUrl !== undefined ? propUrl : localUrl;
  const setGroupUrl = propSetUrl || setLocalUrl;

  const [isDragOver, setIsDragOver] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showUploadSelector, setShowUploadSelector] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAdminsModal, setShowAdminsModal] = useState(false);
  const [adminsCount, setAdminsCount] = useState<number>(1);

  const groupType = currentChatUser?.publicId || currentChatUser?.accessType === 'public' ? 'Публичная' : 'Частная';
  const membersCount = currentChatUser?.membersCount || currentChatUser?.memberCount || 1;

  const notifyDev = () => ctx.showToast?.('Раздел находится в разработке', 'info');

  const fetchAdminsCount = async () => {
    const entityId = currentChatUser?.internalChatId || currentChatUser?.id;
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

      const entityId = currentChatUser?.internalChatId || currentChatUser?.id;
      const fileName = `groups/${entityId}-${Date.now()}.png`;

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

        setGroupUrl(freshUrl);

        if (ctx.setChats) {
          ctx.setChats((prev: any[]) =>
            prev.map((c: any) =>
              String(c.id) === String(entityId) ? { ...c, avatarUrl: freshUrl } : c
            )
          );
        }

        ctx.showToast?.('Аватар группы успешно обновлен! 📸', 'success');
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

    const entityId = Number(currentChatUser?.internalChatId || currentChatUser?.id);
    const updatedFields = {
      name: groupName.trim(),
      description: groupDesc.trim() || null,
      avatarColor: groupColor,
      avatarUrl: groupUrl.trim() || null,
      updatedAt: new Date().toISOString()
    };

    const { error } = await supabase
      .from('chats')
      .update(updatedFields)
      .eq('id', entityId);

    if (error) {
      ctx.showToast?.('Ошибка сохранения группы', 'error');
      return;
    }

    if (ctx.setChats) {
      ctx.setChats((prev: any[]) =>
        prev.map((c: any) =>
          Number(c.id) === entityId ? { ...c, ...updatedFields, aboutMe: updatedFields.description } : c
        )
      );
    }

    ctx.showToast?.('Группа сохранена!', 'success');
    onCancel();
  };

  const handleDeleteGroup = () => {
    ctx.showConfirm?.(
      'Удалить группу',
      `Вы действительно хотите безвозвратно удалить группу «${groupName}»? Все сообщения и участники будут стёрты.`,
      async () => {
        try {
          const entityId = Number(currentChatUser?.internalChatId || currentChatUser?.id);
          await supabase.from('messages').delete().eq('chatId', entityId);
          await supabase.from('chat_members').delete().eq('chatId', entityId);
          await supabase.from('chats').delete().eq('id', entityId);

          ctx.showToast?.('Группа успешно удалена', 'info');
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
        <h3 className={styles['modal-edit-title']}>Настройки группы</h3>
      </div>

      <div className={styles['modal-edit-body']}>
        <div className={styles['modal-edit-top']}>
          <div 
            className={styles['modal-edit-avatar-btn']}
            onClick={() => setShowUploadSelector(true)}
            // title="Сменить фото группы"
          >
            {groupUrl ? (
              <img src={groupUrl} alt="Avatar" className={styles['modal-edit-avatar-img']} />
            ) : (
              <div 
                className={styles['modal-edit-avatar-placeholder']}
                style={{ backgroundColor: groupColor }}
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
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
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
            value={groupDesc}
            onChange={(e) => setGroupDesc(e.target.value)}
            className={styles['modal-clean-input']}
            autoComplete="off"
          />
        </div>

        <div className={styles['modal-edit-divider']} />

        <div className={styles['modal-settings-list']}>
          <div 
            className={`${styles['modal-setting-item']} ${styles['modal-setting-disabled']}`} 
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <KeyRound size={18} className={styles['modal-setting-icon']} />
              <span>Тип группы</span>
            </div>
            <span className={styles['modal-setting-value']}>{groupType}</span>
          </div>

          <div 
            className={`${styles['modal-setting-item']} ${styles['modal-setting-disabled']}`}
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <MessageSquare size={18} className={styles['modal-setting-icon']} />
              <span>История чата для новых участников</span>
            </div>
            <span className={styles['modal-setting-value']}>Видно</span>
          </div>

          <div 
            className={`${styles['modal-setting-item']} ${styles['modal-setting-disabled']}`}
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <Palette size={18} className={styles['modal-setting-icon']} />
              <span>Оформление</span>
            </div>
          </div>
        </div>

        <div className={styles['modal-edit-divider']} />

        <div className={styles['modal-settings-list']}>
          <div 
            className={`${styles['modal-setting-item']} ${styles['modal-setting-disabled']}`} 
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <Heart size={18} className={styles['modal-setting-icon']} />
              <span>Реакции</span>
            </div>
            <span className={styles['modal-setting-value']}>Все</span>
          </div>

          <div 
            className={`${styles['modal-setting-item']} ${styles['modal-setting-disabled']}`} 
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <Link2 size={18} className={styles['modal-setting-icon']} />
              <span>Разрешения</span>
            </div>
            <span className={styles['modal-setting-value']}>1/15</span>
          </div>

          <div 
            className={`${styles['modal-setting-item']} ${styles['modal-setting-disabled']}`} 
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <Link2 size={18} className={styles['modal-setting-icon']} />
              <span>Пригласительные ссылки</span>
            </div>
            <span className={styles['modal-setting-value']}>1</span>
          </div>

          <div 
            className={styles['modal-setting-item']} 
            onClick={() => setShowAdminsModal(true)}
          >
            <div className={styles['modal-setting-left']}>
              <Shield size={18} className={styles['modal-setting-icon']} />
              <span>Администраторы</span>
            </div>
            <span className={styles['modal-setting-value']}>{adminsCount}</span>
          </div>

          <div 
            className={styles['modal-setting-item']} 
            onClick={() => setShowMembersModal(true)}
          >
            <div className={styles['modal-setting-left']}>
              <Users size={18} className={styles['modal-setting-icon']} />
              <span>Участники</span>
            </div>
            <span className={styles['modal-setting-value']}>{membersCount}</span>
          </div>

          <div 
            className={`${styles['modal-setting-item']} ${styles['modal-setting-disabled']}`} 
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <UserX size={18} className={styles['modal-setting-icon']} />
              <span>Чёрный список</span>
            </div>
          </div>

          <div 
            className={`${styles['modal-setting-item']} ${styles['modal-setting-disabled']}`} 
            onClick={notifyDev}
          >
            <div className={styles['modal-setting-left']}>
              <ClipboardList size={18} className={styles['modal-setting-icon']} />
              <span>Недавние действия</span>
            </div>
          </div>
        </div>

        <div className={styles['modal-edit-divider']} />

        <button 
          type="button" 
          className={styles['modal-delete-btn']}
          onClick={handleDeleteGroup}
        >
          Удалить группу
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
        avatarUrl={groupUrl}
        avatarColor={groupColor || '#5865F2'}
        isDragOver={isDragOver}
        uploading={isUploading}
        fileInputRef={fileInputRef}
        setAvatarColor={(c) => setGroupColor(c)}
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
          setGroupColor(chosenColor);
        }}
        targetType="groups"
        // title="Аватар группы"
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
        channelName={groupName}
        currentUserId={String(ctx.currentUser?.uuid || ctx.currentUser?.id)}
        isOwner={Boolean(
          String(currentChatUser?.createdBy) === String(ctx.currentUser?.uuid || ctx.currentUser?.id) ||
          currentChatUser?.role === 'owner'
        )}
        onClose={() => setShowAdminsModal(false)}
        onAdminsUpdated={fetchAdminsCount}
      />

      <SubscribersModal
        show={showMembersModal}
        channelId={currentChatUser?.internalChatId || currentChatUser?.id}
        channelName={groupName}
        currentUserId={String(ctx.currentUser?.uuid || ctx.currentUser?.id)}
        isOwnerOrAdmin={true}
        onClose={() => setShowMembersModal(false)}
        onSubscribersUpdated={ctx.fetchAndMatchChats}
      />
    </div>
  );
}

export { EditGroupModal as GroupEditForm };