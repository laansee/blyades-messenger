import { ContactEditForm } from './ContactEditForm';
import { GroupChannelEditForm } from './GroupChannelEditForm';

export interface EditModeProps {
  currentChatUser: any;
  editFirstName: string;
  setEditFirstName: (v: string) => void;
  editLastName: string;
  setEditLastName: (v: string) => void;
  editNote: string;
  setEditNote: (v: string) => void;
  editDescription?: string;
  setEditDescription?: (v: string) => void;
  editAvatarColor?: string;
  setEditAvatarColor?: (v: string) => void;
  editAvatarUrl?: string;
  setEditAvatarUrl?: (v: string) => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onDeleteContact?: () => void;
}

export default function EditMode(props: EditModeProps) {
  const { currentChatUser } = props;
  const isGroupOrChannel = 
    currentChatUser?.isGroup || 
    currentChatUser?.isChannel || 
    currentChatUser?.type === 'group' || 
    currentChatUser?.type === 'channel';

  if (isGroupOrChannel) {
    return <GroupChannelEditForm {...props} />;
  }

  return <ContactEditForm {...props} />;
}