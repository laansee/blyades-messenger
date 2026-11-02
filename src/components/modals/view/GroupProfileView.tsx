import { useState, useEffect, useMemo } from 'react';
import styles from '../../css/profile.module.css';
import { supabase } from '../../../services/supabaseClient';
import { userService, type AppUser } from '../../../services/userService';
import { Search, UserPlus, Users, X, Hash, AudioLines, SlidersHorizontal, Bell, Ellipsis, LogOut } from 'lucide-react';
import { renderUserStatusBadge } from '../../../utils/statusBadge';
import { formatUserOnlineStatus } from '../../../context/messengerContext';
import { AddParticipantsModal } from '../../common/GlobalUI';
import SmartAvatar from '../../common/SmartAvatar';

interface GroupProfileViewProps {
  currentChatUser: any;
  baseName: string;
  onClose: () => void;
  ctx: any;
}

export default function GroupProfileView({ 
  currentChatUser,
  baseName,
  onClose,
  ctx
}: GroupProfileViewProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [menuState, setMenuState] = useState<'main' | 'folders'>('main');
  const [menuCoords, setMenuCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [groupMembers, setGroupMembers] = useState<AppUser[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [existingUsers, setExistingUsers] = useState<string[]>([]);

  const chatIdNumeric = Number(currentChatUser.internalChatId || currentChatUser.id);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    ctx.showToast?.(`${label} скопирован в буфер`, 'success');
  };

  const fetchGroupMembers = async () => {
    if (!chatIdNumeric) return;
    setLoadingMembers(true);
    try {
      const { data: membersData, error: mError } = await supabase
        .from('chat_members')
        .select('userId')
        .eq('chatId', chatIdNumeric);

      if (!mError && membersData) {
        const userUuids = membersData.map((m: any) => String(m.userId));
        const users = await userService.getUsersByUuids(userUuids);
        setGroupMembers(users);
      }
    } catch (err) {
      console.error('Ошибка загрузки участников группы:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchGroupMembers();
  }, [chatIdNumeric]);

  const handleOpenAddModal = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_members')
        .select('userId')
        .eq('chatId', chatIdNumeric);

      if (!error && data) {
        setExistingUsers(data.map((m: any) => String(m.userId)));
      }
      setShowAddModal(true);
    } catch (err) {
      console.error('Ошибка при получении участников группы:', err);
    }
  };

  const filteredMembers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return groupMembers;

    return groupMembers.filter((member) => {
      const name = (member.username || '').toLowerCase();
      const uniqueId = (member.uniqueId || '').toLowerCase();
      const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();

      return name.includes(query) || uniqueId.includes(query) || fullName.includes(query);
    });
  }, [groupMembers, searchQuery]);

  function formatMembersCountUpper(count: number): string {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod100 >= 11 && mod100 <= 19) return `${count} УЧАСТНИКОВ`;
    if (mod10 === 1) return `${count} УЧАСТНИК`;
    if (mod10 >= 2 && mod10 <= 4) return `${count} УЧАСТНИКА`;
    return `${count} УЧАСТНИКОВ`;
  }
  
  const myId = String(ctx.currentUser?.id || '');
  const myUuid = String(ctx.currentUser?.uuid || '');
  
  const creatorId = String(currentChatUser.createdBy || currentChatUser.created_by || currentChatUser.ownerId || '');
  const userRole = currentChatUser.role || currentChatUser.myRole;

  const isOwner = Boolean(
    (creatorId && (creatorId === myId || creatorId === myUuid)) ||
    userRole === 'owner' || 
    userRole === 'admin'
  );

  const isAdmin = Boolean(userRole === 'admin')

  const handleToggleMore = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (showMoreMenu) {
      setShowMoreMenu(false);
      setMenuState('main');
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 260;
    let targetX = rect.right - menuWidth;
    if (targetX < 10) targetX = 10;
    const targetY = rect.bottom + 8;

    setMenuCoords({ x: targetX, y: targetY });
    setMenuState('main');
    setShowMoreMenu(true);
  };

  return (
    <div className={styles['view-mode']}> 
      <div className={styles['profile-header-gradient']}>
        <div className={styles['profile-header-actions']}>
          <button
            type="button"
            onClick={onClose}
            title="Закрыть"
            className={styles['close-modal-btn']}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles['profile-avatar-wrapper']}>
          <SmartAvatar
            size={84}
            avatarUrl={currentChatUser.avatarUrl}
            avatarColor={currentChatUser.avatarColor || '#5865F2'}
            name={baseName}
            isChannel={false}
          />
        </div>

        <h2 className={styles['profile-name']}>{baseName}</h2>
        <span className={styles['profile-status']}>
          {groupMembers.length} {groupMembers.length === 1 ? 'участник' : (groupMembers.length >= 2 && groupMembers.length <= 4) ? 'участника' : 'участников'}
        </span>

        <div className={styles['action-top-buttons-row']}>
          <button 
            type="button" 
            className={styles['action-top-btn']}
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
            onClick={() => ctx.showToast('Настройки уведомлений в разработке', 'info')}
          >
            <span className={styles['btn-icon']}><Bell size={20} /></span>
            <span className={styles['btn-text']}>Звук</span>
          </button>

          {isOwner ? (
            <>
              <button 
                type="button" 
                className={styles['action-top-btn']} 
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                // onClick={onEditToggle}
              >
                <span className={styles['btn-icon']}><SlidersHorizontal size={20} /></span>
                <span className={styles['btn-text']}>Настройки</span>
              </button>

              <button
                type="button"
                className={styles['action-top-btn']}
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                onClick={() => ctx.showToast?.('Трансляция в разработке', 'info')}
              >
                <span className={styles['btn-icon']}><AudioLines size={20} /></span>
                <span className={styles['btn-text']}>Трансляция</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles['action-top-btn']}
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                onClick={() => ctx.showToast?.('Трансляция в разработке', 'info')}
              >
                <span className={styles['btn-icon']}><LogOut size={20} /></span>
                <span className={styles['btn-text']}>Покинуть</span>
              </button>
            </>
          )}

          <button 
            // ref={moreBtnRef}
            type="button" 
            className={styles['action-top-btn']}
            // style={{ opacity: 0.5, cursor: 'not-allowed' }}
            onClick={handleToggleMore}
          >
            <span className={styles['btn-icon']}><Ellipsis size={20} /></span>
            <span className={styles['btn-text']}>Ещё</span>
          </button>
        </div>
      </div>

      <div>
        <div className={styles['info-section']}>
          {(currentChatUser.aboutMe || currentChatUser.description) && (
            <div className={styles['info-item']} style={{ cursor: 'default' }}>
              <div className={styles['info-item-content']}>
                <span className={`${styles['info-value']} ${styles['multiline']}`}>
                  {currentChatUser.aboutMe || currentChatUser.description}
                </span>
                <span className={styles['info-label']}>Описание группы</span>
              </div>
            </div>
          )}

          <div 
            onClick={() => handleCopy(String(chatIdNumeric), 'ID комнаты')}
            className={styles['info-item']}
          >
            <div className={styles['info-item-content']}>
              <span className={`${styles['info-value']} ${styles['mono']}`}>#{chatIdNumeric}</span>
              <span className={styles['info-label']}>Идентификатор комнаты</span>
            </div>
            <Hash size={16} className={styles['info-icon']} />
          </div>
        </div>

        {/* <div className={styles['info-divider']}/>

        <div className={styles['action-bottom-buttons-row']}>
          <div className={styles['action-bottom-btn']} aria-disabled>
            <Copy size={20}/>
            <span>2 сообщения в Избранном</span>
          </div>
          
          <div className={styles['action-bottom-btn']} aria-disabled>
            <Copy size={20}/>
            <span>1943 фотографии</span>
          </div>
          
          <div className={styles['action-bottom-btn']} aria-disabled>
            <Copy size={20}/>
            <span>624 видео</span>
          </div>
          
          <div className={styles['action-bottom-btn']} aria-disabled>
            <Copy size={20}/>
            <span>37 файлов</span>
          </div>
          
          <div className={styles['action-bottom-btn']} aria-disabled>
            <Copy size={20}/>
            <span>4 аудиофайла</span>
          </div>
          
          <div className={styles['action-bottom-btn']} aria-disabled>
            <Copy size={20}/>
            <span>421 ссылка</span>
          </div>
          
          <div className={styles['action-bottom-btn']} aria-disabled>
            <Copy size={20}/>
            <span>5 опросов</span>
          </div>
          
          <div className={styles['action-bottom-btn']} aria-disabled>
            <Copy size={20}/>
            <span>1785 голосовых сообщений</span>
          </div>
          
          <div className={styles['action-bottom-btn']} aria-disabled>
            <Copy size={20}/>
            <span>81 GIF</span>
          </div>
        </div> */}

        <div className={styles['info-divider']} />
        
        <div className={styles['info-users']}>
          <div className={styles['info-users-header']}>
            <div className={styles['info-users-header-icon']}>
              <Users size={22} />
            </div>

            <span className={styles['info-users-title']}>
              {formatMembersCountUpper(groupMembers.length)}
            </span>
            
            <div className={styles['info-users-header-actions']}>
              <button
                type="button"
                className={styles['info-users-action-btn']}
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  if (isSearchOpen) setSearchQuery('');
                }}
                title="Поиск участников"
              >
                <Search size={20} />
              </button>

              <button
                type="button"
                className={styles['info-users-action-btn']}
                onClick={handleOpenAddModal}
                title="Добавить участников"
              >
                <UserPlus size={20} />
              </button>
            </div>
          </div>

          {isSearchOpen && (
            <div style={{ width: '100%', marginBottom: '10px', position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по участникам..."
                style={{
                  width: '100%', padding: '8px 12px', backgroundColor: '#18181e',
                  border: '1px solid #383842', borderRadius: '8px', color: '#fff',
                  fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                }}
                autoComplete="off"
                autoFocus
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#636366', cursor: 'pointer', fontSize: '14px' }}
                >
                  <X size={20} />
                </button>
              )}
            </div>
          )}

          {loadingMembers ? (
            <span style={{ color: '#636366', fontSize: '13px', padding: '8px 0' }}>
              Синхронизация участников...
            </span>
          ) : (
            <div className={styles['info-users-list']}>
              {filteredMembers.length === 0 ? (
                <span style={{ color: '#636366', fontSize: '13px', textAlign: 'center', padding: '14px 0' }}>
                  Никого не найдено
                </span>
              ) : (
                filteredMembers.map((member) => {
                  const isOwner = member.uuid === String(currentChatUser.ownerId);
                  const displayName = userService.resolveDisplayName(member);
                  const isOnline = ctx.isUserOnline ? ctx.isUserOnline(member) : false;
                  const statusInfo = formatUserOnlineStatus(member.updatedAt, member.privacyOnline);

                  return (
                    <div 
                      key={member.uuid} 
                      className={styles['info-users-item']}
                      onClick={() => ctx.setShowUserModal(member.uuid)}
                    >
                      <div className={styles['info-users-avatar-col']}>
                        <SmartAvatar
                          size={42}
                          avatarUrl={member.avatarUrl}
                          avatarColor={member.avatarColor}
                          name={displayName}
                        />
                      </div>

                      <div className={styles['info-users-text-col']}>
                        <span className={styles['info-users-name']}>
                          {renderUserStatusBadge(member)}
                          {displayName}
                        </span>
                        <span className={`${styles['info-users-status']} ${isOnline ? styles['online'] : ''}`}>
                          {isOnline ? 'в сети' : statusInfo.text}
                        </span>
                      </div>
                      
                      <div className={styles['info-users-badge-col']}>
                        {isOwner ? (
                          <span className={styles['role-badge-owner']}>
                            владелец
                          </span>
                        ) : (isAdmin) ? (
                          <span className={styles['role-badge-admin']}>
                            модер
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      


      <AddParticipantsModal
        show={showAddModal}
        existingUserIds={existingUsers}
        onClose={() => setShowAddModal(false)}
        onAdd={async (selectedUuids) => {
          if (ctx.handleAddUsersToGroup) {
            await ctx.handleAddUsersToGroup(currentChatUser.id, selectedUuids);
            await fetchGroupMembers();
            ctx.showToast('Пользователи успешно приглашены!', 'success');
          }
        }}
      />
    </div>
  );
}