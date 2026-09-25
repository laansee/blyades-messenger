import React, { useState, useEffect, useRef } from 'react';
import styles from '../../components/css/chat-window.module.css';
import ContextMenu from '../../components/context-menu';
import useMessengerContext from '../../context/messengerContext';
import DropdownMenu from '../../components/dropdown-menu';
import { supabase } from '../../services/supabaseClient';
import { Search, EllipsisVertical, X, Check, CheckCheck, Pencil, Paperclip, 
  Send, FaceSlightlySmiling, ArrowUp, ArrowDown, User, 
  BellOff, MessageSquare, Trash, Phone, Clock, 
  Pin, PinOff } from 'lucide-react';

function formatHoursAndMinutes(isoString: string | undefined): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    return '';
  }
}

export default function ChatWindow() {
  const ctx = useMessengerContext();
  const messagesBodyRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  
  const previousChatIdRef = useRef<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const currentChatUser = ctx.chats.find((c: any) => String(c.id) === String(ctx.activeChatId));
  const myId = String(ctx.currentUser?.id);
  const partnerId = String(ctx.activeChatId);

  // 🚀 МЕГА-ФИКС РЕАЛТАЙМА ДЛЯ БЕСЕД: НаучилиuseMemo правильно определять ID комнаты группы!
  const displayedMessages = React.useMemo(() => {
    if (!myId || !partnerId) return [];

    // 🎯 ВАЖНО: Если активный ID чата начинается со слова 'group_', то имя комнаты — это напрямую partnerId!
    const isGroupChat = partnerId.startsWith('group_');
    const currentJoinedRoom = isGroupChat 
      ? partnerId 
      : (Number(myId) < Number(partnerId) ? `${myId}_${partnerId}` : `${partnerId}_${myId}`);

    // Фильтруем сообщения строго из живого массива контекста
    const roomMessages = ctx.allMessages.filter((m: any) => m.chatId === currentJoinedRoom);

    return roomMessages
      .filter((m: any) => {
        if (!ctx.showMsgSearch || !ctx.messageSearchQuery.trim()) return true;
        return m.text.toLowerCase().includes(ctx.messageSearchQuery.toLowerCase());
      })
      .sort((a: any, b: any) => {
        if (String(a.id).startsWith('temp-')) return 1;
        if (String(b.id).startsWith('temp-')) return -1;
        return Number(a.id) - Number(b.id);
      });
  }, [ctx.allMessages, ctx.activeChatId, ctx.showMsgSearch, ctx.messageSearchQuery, myId, partnerId]);

  // Вычисляем сообщения комнаты для логики прочтения и докрутки скролла
  const currentMessages = React.useMemo(() => {
    if (!myId || !partnerId) return [];
    const isGroupChat = partnerId.startsWith('group_');
    const currentJoinedRoom = isGroupChat 
      ? partnerId 
      : (Number(myId) < Number(partnerId) ? `${myId}_${partnerId}` : `${partnerId}_${myId}`);
    
    return ctx.allMessages.filter((m: any) => m.chatId === currentJoinedRoom);
  }, [ctx.allMessages, ctx.activeChatId, myId, partnerId]);

  // Умный автоматический скролл вниз и авто-прочтение
  useEffect(() => {
    if (messagesBodyRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesBodyRef.current;
      const isChatChanged = previousChatIdRef.current !== ctx.activeChatId;
      const isUserNearBottom = scrollHeight - scrollTop - clientHeight < 250;

      // ---- НАЧАЛО ЛОГИКИ ПРОЧТЕНИЯ ----
      const markMessagesAsRead = async () => {
        if (!ctx.activeChatId || !myId) return;

        const unreadIncomingMessages = currentMessages.filter(
          (m: any) => String(m.senderId) !== myId && m.status === 'sent'
        );

        if (unreadIncomingMessages.length > 0) {
          const currentRoomId = Number(myId) < Number(partnerId) ? `${myId}_${partnerId}` : `${partnerId}_${myId}`;
          
          await supabase
            .from('messages')
            .update({ status: 'read' })
            .eq('chatId', currentRoomId)
            .neq('senderId', myId)
            .eq('status', 'sent');
        }
      };

      markMessagesAsRead();

      if (isChatChanged) {
        messagesBodyRef.current.scrollTop = messagesBodyRef.current.scrollHeight;
        previousChatIdRef.current = ctx.activeChatId;

        if (messageInputRef.current) {
          messageInputRef.current.focus();
        }
      } else if (isUserNearBottom || currentMessages.length <= 1) {
        messagesBodyRef.current.scrollTo({
          top: messagesBodyRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [ctx.activeChatId, ctx.allMessages]); // 🎯 МЕГА-ТРИГГЕР: Скролл реагирует на массив, а не длину

  useEffect(() => {
    if (ctx.setEditingMessage) ctx.setEditingMessage(null);
    if (ctx.setMessageText) ctx.setMessageText('');

    const timer = setTimeout(() => {
      if (messagesBodyRef.current) {
        messagesBodyRef.current.scrollTop = messagesBodyRef.current.scrollHeight;
      }
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [ctx.activeChatId, ctx.allMessages]);

  if (!ctx.activeChatId) {
    return (
      <main className={styles['chat-window']}>
        <div className={styles['chat-placeholder']}>
          <div className={styles['placeholder-content']}>
            <div className={styles['placeholder-icon']}>
              <MessageSquare size={64}/>
            </div>
            <p>Выберите чат, чтобы начать общение</p>
          </div>
        </div>
      </main>
    );
  }

  const scrollInToTop = () => {
    if (messagesBodyRef.current) {
      messagesBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollInToBottom = () => {
    if (messagesBodyRef.current) {
      messagesBodyRef.current.scrollTo({ top: messagesBodyRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const handleOpenDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setShowMenu((prev) => !prev);
  };

  return (
    <main className={styles['chat-window']}>
      <header className={styles['chat-header']}>
        <div 
          className={styles['chat-header-user']} 
          /* 🚀 Разрешаем вызов модалки для всех типов чатов, так как теперь она адаптивная! */
          onClick={() => ctx.setShowUserModal(true)}
        >
          {/* Подстраховали вывод аватарки и имени через безопасный оператор ?. */}
          <div 
            className={styles['chat-avatar']} 
            style={{ backgroundColor: currentChatUser?.avatarColor || '#5865F2' }}
          >
            {currentChatUser?.name?.substring(0, 1).toUpperCase() || '?'}
          </div>
          <div>
            <h3 className={styles['chat-header-user-name']}>
              {currentChatUser?.name || currentChatUser?.username || 'Загрузка...'}
            </h3>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>
              {currentChatUser?.isGroup ? 'группа беседы' : 'был(а) недавно'}
            </span>
          </div>
        </div>
        <div className={styles['chat-header-actions']}>
          {currentChatUser && (
            <button 
              type="button" 
              className={styles['header-action-btn']} 
              onClick={() => ctx.handleStartAudioCall(currentChatUser.id)} 
              title={currentChatUser.isGroup ? "Начать групповой созвон" : "Позвонить пользователю"}
            >
              <Phone size={20} color="#aaa8a8" />
            </button>
          )}
          <button 
            className={styles['header-btn']} 
            onClick={() => { 
              ctx.setShowMsgSearch(!ctx.showMsgSearch); 
              ctx.setMessageSearchQuery(''); 
            }}
          >
            <Search />
          </button>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button 
              className={`${styles['header-btn']} dropdown-trigger-btn`} 
              onClick={handleOpenDropdown}
            >
              <EllipsisVertical />
            </button>
            
            <DropdownMenu 
              show={showMenu} 
              onClose={() => setShowMenu(false)} 
              x={0} y={0}
              items={[
                { id: 'notifications', text: 'Выключить уведомления (заглушка)', icon: BellOff, onClick: scrollInToTop},
                { id: 'pin-chat', text: 'Закрепить переписку (заглушка)', icon: Pin, onClick: scrollInToTop},
                { id: 'profile', text: 'Профиль пользователя', icon: User, onClick: () => ctx.setShowUserModal(true) },
                { id: 'to-top', text: 'Наверх', icon: ArrowUp,
                  isSeparatorBefore: true, onClick: scrollInToTop },
                { 
                  id: 'delete-chat', 
                  text: 'Удалить чат', 
                  icon: Trash, 
                  danger: true,
                  onClick: () => {
                    ctx.showConfirm(
                      'Удаление чата', 
                      `Вы действительно хотите полностью удалить чат с пользователем ${currentChatUser?.name || ''}? Это действие сотрет всю историю переписки у обоих участников насовсем.`, 
                      async () => {
                        const currentRoomId = Number(myId) < Number(partnerId) ? `${myId}_${partnerId}` : `${partnerId}_${myId}`;
                        
                        const { error } = await supabase
                          .from('messages')
                          .delete()
                          .eq('chatId', currentRoomId);

                        if (error) {
                          ctx.showToast('Не удалось очистить чат', 'error');
                          console.error(error.message);
                          return;
                        }

                        ctx.setAllMessages((prev: any[]) => prev.filter(m => m.chatId !== currentRoomId));
                        ctx.setActiveChatId(null);
                        ctx.showToast('Чат успешно удален', 'success');
                      },
                      true
                    );
                  }
                }
              ]} 
            />
          </div>
          <button 
            className={styles['header-btn']} 
            onClick={() => {
              ctx.setActiveChatId(null);
              if (ctx.setEditingMessage) ctx.setEditingMessage(null);
              if (ctx.setMessageText) ctx.setMessageText('');
            }}
          >
            <X size={30}/>
          </button>
        </div>
      </header>

      {ctx.showMsgSearch && (
        <div className={styles['message-search-bar']}>
          <input  
            type="text" 
            placeholder="Поиск по истории сообщений..." 
            value={ctx.messageSearchQuery}
            id='messageSearchQuery-input'
            onChange={e => ctx.setMessageSearchQuery(e.target.value)} 
            className={styles['message-search-input']}
          />
        </div>
      )}

      <div 
        className={styles['messages-body']} ref={messagesBodyRef}
        onScroll={() => {
          if (!messagesBodyRef.current) return;
          const { scrollTop, scrollHeight, clientHeight } = messagesBodyRef.current;
          setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 300);
        }}
      >
        {displayedMessages.map((msg: any, index: number) => {
          const isMyMsg = String(msg.senderId) === myId;
          const currentMsgDate = new Date(msg.createdAt);
          const currentDayStr = currentMsgDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long'
          });
          let showDateDivider = false;
          if (index === 0) showDateDivider = true;
          else {
            const prevMsgDate = new Date(displayedMessages[index - 1].createdAt);
            const prevDayStr = prevMsgDate.toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long'
            });
            if (currentDayStr !== prevDayStr) showDateDivider = true;
          }
          const getSmartDateText = (dateObj: Date, rawDayStr: string) => {
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(today.getDate() - 1);
            const isSameDay = (d1: Date, d2: Date) => 
              d1.getDate() === d2.getDate() &&
              d1.getMonth() === d2.getMonth() &&
              d1.getFullYear() === d2.getFullYear();
            if (isSameDay(dateObj, today)) return 'Сегодня';
            if (isSameDay(dateObj, yesterday)) return 'Вчера';
            return rawDayStr;
          };        
            return (
            <React.Fragment key={`msg-group-${msg.id}`}>
              {showDateDivider && (
                <div className={styles['chat-date-divider']}>
                  <span className={styles['chat-date-text']}>
                    {getSmartDateText(currentMsgDate, currentDayStr)}
                  </span>
                </div>
              )}

              {/* ======================================================== */}
              {/* 🎯 ПУНКТ 1: РЕНДЕР СИСТЕМНЫХ СООБЩЕНИЙ ПО ЦЕНТРУ ЭКРАНА */}
              {/* ======================================================== */}
              {msg.senderId === 'system' ? (
                <div className={styles['system-message-container']}>
                  <div 
                    className={styles['system-message-bubble']}
                    dangerouslySetInnerHTML={{ __html: msg.text }} // Безопасно рендерим <b> теги из базы
                  />
                </div>
              ) : (
                /* ======================================================== */
                /* 👥 ОБЫЧНЫЕ ТЕКСТОВЫЕ СООБЩЕНИЯ (ЛС ИЛИ БЕСЕДА)          */
                /* ======================================================== */
                (() => {
                  const isMyMsg = String(msg.senderId) === myId;
                  const isGroupChat = partnerId.startsWith('group_');
                  
                  // Ищем объект автора сообщения среди всех чатов/пользователей, чтобы забрать его аватарку и настоящее имя
                  const senderUserObj = ctx.chats.find((c: any) => String(c.id) === String(msg.senderId));
                  const senderDisplayName = senderUserObj ? senderUserObj.name : `Юзер #${msg.senderId}`;
                  const senderAvatarColor = senderUserObj ? senderUserObj.avatarColor : '#007aff';

                  // Умное скрытие аватарок: показываем аватарку только если предыдущее сообщение было написано ДРУГИМ человеком
                  const isFirstInRow = index === 0 || displayedMessages[index - 1].senderId !== msg.senderId || displayedMessages[index - 1].senderId === 'system';

                  const messageBubbleContent = (
                    <div 
                      className={`${styles.message} ${isMyMsg ? styles['message-outgoing'] : styles['message-incoming']}`}
                      style={{ marginTop: isFirstInRow ? '8px' : '2px' }} // Меньше отступ, если пишет один и тот же человек подряд
                      onContextMenu={(e) => {
                        e.preventDefault();              
                        const menuItems = [
                          { 
                            label: 'Копировать текст', 
                            icon: '📋', 
                            onClick: () => {
                              if (ctx.handleCopyMessageText) ctx.handleCopyMessageText(msg.text);
                              else navigator.clipboard.writeText(msg.text);
                            } 
                          }
                        ];
                        if (isMyMsg) {
                          menuItems.unshift({
                            label: 'Редактировать',
                            icon: '✏️',
                            onClick: () => {
                              ctx.setEditingMessage(msg);
                              ctx.setMessageText(msg.text);
                              if (messageInputRef.current) messageInputRef.current.focus();
                            }
                          });
                        }
                        menuItems.push(
                          { isDivider: true } as any,
                          { 
                            label: 'Удалить', 
                            icon: '🗑️', 
                            isDanger: true, 
                            onClick: () => {
                              if (ctx.closeContextMenu) ctx.closeContextMenu();
                              ctx.showConfirm('Удаление сообщения', 'Удалить это сообщение?', () => {
                                if (ctx.setAllMessages) ctx.setAllMessages((prev: any[]) => prev.filter(m => m.id !== msg.id));
                                if (ctx.setConfirm) ctx.setConfirm((prev: any) => ({ ...prev, show: false }));
                                supabase.from('messages').delete().eq('id', msg.id).then(() => ctx.showToast('Сообщение удалено', 'success'));
                              }, true);
                            }
                          }
                        );
                        ctx.setCtxMenu({ show: true, x: e.clientX, y: e.clientY, items: menuItems });
                      }}
                    >
                      <div className={styles['message-bubble']}>
                        <div className={styles['message-text']}>
                          {/* 🎯 ПУНКТ 2: ПОДПИСЬ ИМЕНИ ОТПРАВИТЕЛЯ (Только для входящих сообщений внутри бесед!) */}
                          {isGroupChat && !isMyMsg && isFirstInRow && (
                            <span 
                              className={styles['group-msg-sender-name']} 
                              style={{ color: senderAvatarColor }}
                              onClick={(e) => {
                                e.stopPropagation();
                                ctx.setShowUserModal(String(msg.senderId)); // Передаем ID конкретного человека!
                              }}
                            >
                              {senderDisplayName}
                            </span>
                          )}

                          {msg.text}
                          
                          <span className={styles['message-meta']}>
                            <span className={styles['message-time']}>
                              {msg.isEdited && <i>ред. </i>}
                              {formatHoursAndMinutes(msg.createdAt)}
                            </span>
                            {isMyMsg && (
                              <span className={styles['message-status']}>
                                {msg.status === 'sending' && <Clock size={12} style={{ color: '#9ca3af' }} />}
                                {msg.status === 'sent' && <Check size={14} style={{ color: '#9ca3af' }} />}
                                {msg.status === 'read' && <CheckCheck size={14} style={{ color: '#007aff' }} />}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );

                  // 🎯 ПУНКТ 2.1: ОТРИСОВКА КРУГЛОЙ АВАТАРКИ ОТПРАВИТЕЛЯ СЛЕВА ОТ БАББЛА
                  if (isGroupChat && !isMyMsg) {
                    return (
                      <div className={styles['message-with-avatar']} key={`msg-avatar-group-${msg.id}`}>
                        {/* Оставляем пустое место шириной в 32px, если человек пишет подряд, чтобы бабблы стояли ровно в ряд */}
                        {isFirstInRow ? (
                          <div 
                            className={styles['group-msg-avatar']} 
                            style={{ backgroundColor: senderAvatarColor, cursor: 'pointer' }}
                            onClick={() => ctx.setShowUserModal(String(msg.senderId))}
                          >
                            {senderDisplayName.substring(0, 1).toUpperCase()}
                          </div>
                        ) : (
                          <div style={{ width: '32px', flexShrink: 0 }} />
                        )}
                        {messageBubbleContent}
                      </div>
                    );
                  }

                  return messageBubbleContent;
                })()
              )}
            </React.Fragment>
          );

        })}
      </div>


      {ctx.editingMessage && (
        <div className={styles['block-editing']}>
          <Pencil size={24}/>
          <div><span>Редактирование</span><p>{ctx.editingMessage.text}</p></div>
          <button onClick={() => { ctx.setEditingMessage(null); ctx.setMessageText(''); }}><X size={24}/></button>
        </div>
      )}

      <button 
        type="button"
        onClick={scrollInToBottom}
        className={`${styles['scroll-bottom-btn']} ${showScrollBtn ? styles['visible'] : ''}`}
      >
        <ArrowDown size={20} />
      </button>

      <form className={styles['chat-input-zone']} onSubmit={ctx.handleSendMessage}>
        <button type="button" className={styles['input-action-btn']} disabled style={{cursor:'not-allowed'}}><Paperclip color='#585757'/></button>
        <textarea 
          placeholder="Напишите сообщение..." 
          ref={messageInputRef} 
          value={ctx.messageText}
          id='messageText-input'
          onChange={e => ctx.setMessageText(e.target.value)} 
          onKeyDown={ctx.handleKeyDown}
          className={styles['main-message-input']} 
          autoComplete="off"
        />
        <button type="submit" className={styles['send-message-btn']}><Send color='#aaa8a8'/></button>
      </form>

      <ContextMenu show={ctx.ctxMenu.show} x={ctx.ctxMenu.x} y={ctx.ctxMenu.y} onClose={ctx.closeContextMenu} items={ctx.ctxMenu.items} />
    </main>
  );
}
