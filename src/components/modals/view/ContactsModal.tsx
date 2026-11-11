import { useState, useMemo } from 'react';
import styles from '../../css/profile.module.css';
import { Search, UserPlus, Trash2, Edit3, MessageSquare, X } from 'lucide-react';
import useMessengerContext, { formatUserOnlineStatus } from '../../../context/messengerContext';
import SmartAvatar from '../../common/SmartAvatar';
import { supabase } from '../../../services/supabaseClient';
import AddContactModal from '../add/AddContactModal';
import EditContactModal from '../edit/EditContactModal';

interface ContactsModalProps {
  show: boolean;
  onClose: () => void;
}

export default function ContactsModal({ show, onClose }: ContactsModalProps) {
  const ctx = useMessengerContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any | null>(null);

  const myUuid = String(ctx.currentUser?.uuid || ctx.currentUser?.id || '');

  const resolveContactData = (contact: any) => {
    const targetUuid = String(contact.contactId || contact.uuid || contact.id || '');
    
    const globalUser = (ctx.users || []).find((u: any) => 
      String(u.uuid || u.id) === targetUuid
    ) || (ctx.chats || []).find((c: any) => 
      String(c.partnerId || c.uuid || c.id) === targetUuid
    );

    const manualFirstName = contact.firstName && contact.firstName !== 'EMPTY' ? contact.firstName.trim() : '';
    const manualLastName = contact.lastName && contact.lastName !== 'EMPTY' ? contact.lastName.trim() : '';
    const manualFullName = `${manualFirstName} ${manualLastName}`.trim();

    const displayName = manualFullName || 
      globalUser?.username || 
      globalUser?.name || 
      (globalUser?.firstName ? `${globalUser.firstName} ${globalUser.lastName || ''}`.trim() : '') || 
      contact.username || 
      'Пользователь';

    const avatarUrl = globalUser?.avatarUrl || contact.avatarUrl || null;
    const avatarColor = globalUser?.avatarColor || contact.avatarColor || '#5865F2';
    const updatedAt = globalUser?.updatedAt || contact.updatedAt;
    const privacyOnline = globalUser?.privacyOnline || contact.privacyOnline || 'all';

    return {
      ...contact,
      ...globalUser,
      contactId: targetUuid,
      displayName,
      avatarUrl,
      avatarColor,
      updatedAt,
      privacyOnline
    };
  };

  const enrichedContacts = useMemo(() => {
    return (ctx.contacts || []).map(resolveContactData);
  }, [ctx.contacts, ctx.users, ctx.chats]);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedContacts
      .filter((c: any) => {
        const name = (c.displayName || '').toLowerCase();
        const phone = String(c.phone || '');
        const username = String(c.username || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || username.includes(q);
      })
      .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName, 'ru'));
  }, [enrichedContacts, searchQuery]);

  if (!show) return null;

  const handleDeleteContact = (contact: any) => {
    const contactUuid = String(contact.contactId || contact.uuid || contact.id);
    const displayName = contact.displayName || 'контакт';

    ctx.showConfirm(
      'Удаление контакта',
      `Удалить «${displayName}» из списка контактов?`,
      async () => {
        const { error } = await supabase
          .from('contacts')
          .delete()
          .eq('userId', myUuid)
          .eq('contactId', contactUuid);

        if (error) {
          ctx.showToast('Не удалось удалить', 'error');
          return;
        }

        ctx.showToast('Контакт удалён', 'info');
        if (ctx.fetchAndMatchChats) await ctx.fetchAndMatchChats();
      },
      true
    );
  };

  return (
    <>
      <div 
        className={styles['modal-overlay']} 
        onClick={onClose}
        style={{ zIndex: 1000000 }}
      >
        <div 
          className={styles['profile-modal-card']} 
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1b1b24',
            overflow: 'hidden',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #282833'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#fff' }}>Контакты</h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                type="button" 
                onClick={() => setShowAddModal(true)}
                style={{
                  background: 'rgba(135, 116, 225, 0.15)',
                  border: '1px solid rgba(135, 116, 225, 0.3)',
                  borderRadius: '8px',
                  color: '#9d7bf6',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                <UserPlus size={15} />
                <span>Добавить</span>
              </button>

              <button 
                type="button" 
                onClick={onClose} 
                style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', padding: '4px', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div style={{ padding: '12px 16px', position: 'relative', borderBottom: '1px solid #24242e' }}>
            <Search size={16} style={{ position: 'absolute', left: '26px', top: '22px', color: '#8e8e93' }} />
            <input 
              type="text"
              placeholder="Поиск по контактам..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                backgroundColor: '#13131a',
                border: '1px solid #282833',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
            {filteredContacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 16px', color: '#636366', fontSize: '14px' }}>
                {searchQuery ? 'Контакты не найдены' : 'Список контактов пуст'}
              </div>
            ) : (
              filteredContacts.map((c: any) => {
                const onlineInfo = formatUserOnlineStatus(c.updatedAt, c.privacyOnline);

                return (
                  <div 
                    key={c.contactId || c.uuid || c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#232330'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div 
                      onClick={() => {
                        onClose();
                        ctx.openOrCreateDirectChat?.(c);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1, minWidth: 0 }}
                    >
                      <SmartAvatar 
                        size={42} 
                        avatarUrl={c.avatarUrl} 
                        avatarColor={c.avatarColor} 
                        name={c.displayName} 
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: 500, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.displayName}
                        </div>
                        <div style={{ fontSize: '12px', color: onlineInfo.isOnline ? '#007aff' : '#8e8e93' }}>
                          {onlineInfo.text}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button 
                        type="button"
                        // title="Написать"
                        onClick={() => {
                          onClose();
                          ctx.openOrCreateDirectChat?.(c);
                        }}
                        style={{ background: 'none', border: 'none', color: '#9d7bf6', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}
                      >
                        <MessageSquare size={17} />
                      </button>

                      <button 
                        type="button"
                        // title="Редактировать"
                        onClick={() => setEditingContact(c)}
                        style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}
                      >
                        <Edit3 size={17} />
                      </button>

                      <button 
                        type="button"
                        // title="Удалить контакт"
                        onClick={() => handleDeleteContact(c)}
                        style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <AddContactModal 
        show={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />

      <EditContactModal 
        show={Boolean(editingContact)} 
        contact={editingContact} 
        onClose={() => setEditingContact(null)} 
      />
    </>
  );
}