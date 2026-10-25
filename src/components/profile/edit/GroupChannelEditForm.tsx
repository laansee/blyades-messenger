import React, { useState, useRef } from 'react';
import styles from '../../css/profile.module.css';
import { supabase } from '../../../services/supabaseClient';
import useMessengerContext from '../../../context/messengerContext';
import { AvatarCropModal, AvatarUploadSelectorModal } from '../../common/GlobalUI';
import { EditAvatarButton } from './EditAvatarButton';

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

const PRESET_COLORS = ['#9d7bf6', '#5865F2', '#3ba55c', '#faa61a', '#ed4245', '#eb459e', '#007aff'];

export const GroupChannelEditForm: React.FC<GroupChannelEditFormProps> = ({
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
  const isChannel = currentChatUser.isChannel || currentChatUser.type === 'channel';
  const entityTitle = isChannel ? 'канала' : 'беседы';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showUploadSelector, setShowUploadSelector] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      ctx.showToast('Ошибка: Можно загружать только изображения!', 'error');
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
      ctx.showToast('Загрузка аватарки в облако...', 'info');

      const targetFolder = isChannel ? 'channels' : 'groups';
      const entityId = currentChatUser.internalChatId || currentChatUser.id;
      const fileName = `${targetFolder}/${entityId}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      if (data?.publicUrl) {
        const freshUrl = data.publicUrl;

        const { error: dbError } = await supabase
          .from('chats')
          .update({ avatarUrl: freshUrl, updatedAt: new Date().toISOString() })
          .eq('id', Number(entityId));

        if (dbError) throw dbError;

        if (setEditAvatarUrl) setEditAvatarUrl(freshUrl);

        if (ctx.setChats) {
          ctx.setChats((prev: any[]) =>
            prev.map((c: any) =>
              String(c.id) === String(entityId) ? { ...c, avatarUrl: freshUrl } : c
            )
          );
        }

        ctx.showToast(`Аватар ${entityTitle} успешно обновлен! 📸`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      ctx.showToast(`Ошибка загрузки: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles['profile-edit-mode']}>
      <h3 className={styles['profile-edit-title']}>
        {`Настройки ${entityTitle}`}
      </h3>

      <div className={styles['profile-edit-header']}>
        <EditAvatarButton
          avatarUrl={editAvatarUrl}
          avatarColor={editAvatarColor}
          fallbackLetter={editFirstName.substring(0, 1) || '?'}
          isEditable={true}
          onClick={() => setShowUploadSelector(true)}
        />

        <div className={styles['profile-edit-user-meta']}>
          <div className={styles['profile-meta-name']}>{editFirstName}</div>
          <div style={{ fontSize: '12px', color: '#8e8e93' }}>
            #{currentChatUser.internalChatId || currentChatUser.id}
          </div>
        </div>
      </div>

      <div className={styles['profile-inputs-list']}>
        <div className={styles['profile-input-field']}>
          <input 
            type="text" 
            value={editFirstName}
            onChange={(e) => setEditFirstName(e.target.value)}
            placeholder=" "
            className={styles['profile-line-input']} 
            id="groupTitle-input" 
            autoComplete="off"
          />
          <label className={styles['profile-field-label']} htmlFor="groupTitle-input">
            {`Название ${entityTitle}`}
          </label>
        </div>

        <div className={styles['profile-input-field']}>
          <input 
            type="text" 
            value={editDescription} 
            onChange={(e) => setEditDescription && setEditDescription(e.target.value)}
            placeholder=" "
            className={styles['profile-line-input']}
            id="groupDesc-input"
            autoComplete="off"
          />
          <label className={styles['profile-field-label']} htmlFor="groupDesc-input">
            {`Описание ${entityTitle}`}
          </label>
        </div>

        {/* Палитра цвета заглушки */}
        <div style={{ marginTop: '10px' }}>
          <span style={{ fontSize: '12px', color: '#8e8e93', display: 'block', marginBottom: '8px' }}>
            Цвет заглушки аватара:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PRESET_COLORS.map((color) => (
              <div
                key={color}
                onClick={() => setEditAvatarColor && setEditAvatarColor(color)}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: editAvatarColor === color ? '2px solid #fff' : '2px solid transparent',
                  transform: editAvatarColor === color ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.15s ease'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={styles['profile-edit-footer']}>
        <button type="button" className={styles['profile-footer-cancel-btn']} onClick={onCancel}>
          Отмена
        </button>
        <button type="button" className={styles['profile-footer-ready-btn']} onClick={onSave}>
          Готово
        </button>
      </div>

      {/* Модалки загрузки и кадрирования фото */}
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
        targetType={isChannel ? 'channels' : 'groups'}
        title={`Аватар ${entityTitle}`}
      />

      <AvatarCropModal 
        show={showCropModal} 
        imageSrc={rawImageSrc} 
        onClose={() => { setShowCropModal(false); setRawImageSrc(null); }} 
        onSave={handleSaveCroppedAvatar} 
      />
    </div>
  );
};