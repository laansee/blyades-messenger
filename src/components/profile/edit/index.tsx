import { ContactEditForm } from './ContactEditForm';
import { GroupEditForm } from './GroupEditForm';
import { ChannelEditForm } from './ChannelEditForm';

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
  const isChannel = currentChatUser?.isChannel || currentChatUser?.type === 'channel';
  const isGroup = currentChatUser?.isGroup || currentChatUser?.type === 'group';

  if (isChannel) {
    return <ChannelEditForm {...props} />;
  }

  if (isGroup) {
    return <GroupEditForm {...props} />;
  }

  return <ContactEditForm {...props} />;
}