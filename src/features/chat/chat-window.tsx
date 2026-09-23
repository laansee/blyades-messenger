import React, { useState, useEffect, useRef } from 'react';
import styles from '../../components/css/chat-window.module.css';
/* Найди старый импорт ContextMenu и замени путь на общий компонент: */
import ContextMenu from '../../components/context-menu';
import useMessengerContext from '../../context/messengerContext';
import DropdownMenu from '../../components/dropdown-menu';
import { supabase } from '../../services/supabaseClient';
import { Search, EllipsisVertical, X, Check, CheckCheck, Pencil, Paperclip, 
  Send, FaceSlightlySmiling, ArrowBigDown, ArrowUp, ArrowDown, User, 
  BellOff, MessageSquare, Trash, LogOut, Phone } from 'lucide-react';

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
  const triggerBtnRef = useRef<HTMLButtonElement>(null);
  
  const previousChatIdRef = useRef<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const currentChatUser = ctx.chats.find((c: any) => String(c.id) === String(ctx.activeChatId));
  const myId = String(ctx.currentUser?.id);
  const partnerId = String(ctx.activeChatId);
  const currentJoinedRoom = Number(myId) < Number(partnerId) ? `${myId}_${partnerId}` : `${partnerId}_${myId}`;

  const currentMessages = ctx.allMessages.filter((m: any) => m.chatId === currentJoinedRoom);
  // 🚀 ЛОКАЛЬНЫЙ ПОИСК: Фильтруем сообщения для вывода на экран, если активирован поиск в шапке
  const displayedMessages = currentMessages
    .filter((m: any) => {
      if (!ctx.showMsgSearch || !ctx.messageSearchQuery.trim()) return true;
      return m.text.toLowerCase().includes(ctx.messageSearchQuery.toLowerCase());
    })
    // Сортируем от самых старых к самым новым, чтобы хронология никогда не ломалась
    .sort((a: any, b: any) => {
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    });

  
  // Умный автоматический скролл вниз
  useEffect(() => {
    if (messagesBodyRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesBodyRef.current;
      const isChatChanged = previousChatIdRef.current !== ctx.activeChatId;
      const isUserNearBottom = scrollHeight - scrollTop - clientHeight < 250;

      // ---- НАЧАЛО ЛОГИКИ ПРОЧТЕНИЯ ----
      const markMessagesAsRead = async () => {
        if (!ctx.activeChatId || !myId) return;

        // Ищем все сообщения в текущей комнате, которые отправил НАШ СОБЕСЕДНИК (senderId !== myId) 
        // и у которых статус до сих пор равен 'sent'
        const unreadIncomingMessages = currentMessages.filter(
          (m: any) => String(m.senderId) !== myId && m.status === 'sent'
        );

        // Если есть хотя бы одно непрочитанное входящее сообщение — обновляем их в базе данных
        if (unreadIncomingMessages.length > 0) {
          const currentRoomId = Number(myId) < Number(partnerId) ? `${myId}_${partnerId}` : `${partnerId}_${myId}`;
          
          await supabase
            .from('messages')
            .update({ status: 'read' })
            .eq('chatId', currentRoomId)
            .neq('senderId', myId) // Защита: обновляем только чужие сообщения, а не свои
            .eq('status', 'sent');
        }
      };

      markMessagesAsRead();

      if (isChatChanged) {
        messagesBodyRef.current.scrollTop = messagesBodyRef.current.scrollHeight;
        previousChatIdRef.current = ctx.activeChatId;
      } else if (isUserNearBottom || currentMessages.length <= 1) {
        messagesBodyRef.current.scrollTo({
          top: messagesBodyRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [ctx.activeChatId, currentMessages.length]);

  useEffect(() => {
    // Подстраховка: если чат сменился, даем базе 50мс выгрузить строки и докручиваем вниз
    const timer = setTimeout(() => {
      if (messagesBodyRef.current) {
        messagesBodyRef.current.scrollTop = messagesBodyRef.current.scrollHeight;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [ctx.activeChatId]);

  if (!currentChatUser) {
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

  // Скролл в самый верх чата
  const scrollInToTop = () => {
    if (messagesBodyRef.current) {
      messagesBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Скролл в самый низ чата
  const scrollInToBottom = () => {
    if (messagesBodyRef.current) {
      messagesBodyRef.current.scrollTo({ top: messagesBodyRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  // Функция для открытия выпадающего списка
    const handleOpenDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setShowMenu((prev) => !prev);
  };

  return (
    <main className={styles['chat-window']}>
      <header className={styles['chat-header']}>
        <div 
          className={styles['chat-header-user']} 
          onClick={() => {
            ctx.setShowUserModal(true);
          }}
          // style={{ cursor: 'pointer' }}
        >
          <div className={styles['chat-avatar']} style={{ backgroundColor: currentChatUser.avatarColor }}>
            {currentChatUser.name.substring(0, 1)}
          </div>
          <div>
            <h3 className={styles['chat-header-user-name']}>{currentChatUser.name}</h3>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>был(а) недавно</span>
          </div>
        </div>
        <div className={styles['chat-header-actions']}>
          <button 
            className={styles['header-btn']} 
            onClick={() => ctx.handleStartAudioCall(partnerId)}
            title="Позвонить"
          >
            <Phone size={20} style={{ color: '#2ec761' }} />
          </button>
          <button 
            className={styles['header-btn']} 
            onClick={() => { 
              ctx.setShowMsgSearch(!ctx.showMsgSearch); 
              ctx.setMessageSearchQuery(''); }}
          >
            <Search />
          </button>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button 
              className={`${styles['header-btn']} dropdown-trigger-btn`} // Добавили класс-маркер
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
                { id: 'profile', text: 'Профиль пользователя', icon: User, onClick: () => ctx.setShowUserModal(true) },
                { id: 'to-top', text: 'Наверх', icon: ArrowUp, onClick: scrollInToTop },
                { 
                  id: 'delete-chat', 
                  text: 'Удалить чат', 
                  icon: Trash, 
                  danger: true,
                  onClick: () => {
                    ctx.showConfirm(
                      'Удаление чата', 
                      `Вы действительно хотите полностью удалить чат с пользователем ${currentChatUser.name}? Это действие сотрет всю историю переписки у обоих участников насовсем.`, 
                      async () => {
                        // Вычисляем точный chatId этой комнаты (например, "1_10")
                        const currentRoomId = Number(myId) < Number(partnerId) ? `${myId}_${partnerId}` : `${partnerId}_${myId}`;
                        
                        // 1. Удаляем абсолютно все сообщения этого чата из таблицы messages
                        const { error } = await supabase
                          .from('messages')
                          .delete()
                          .eq('chatId', currentRoomId);

                        if (error) {
                          ctx.showToast('Не удалось очистить чат', 'error');
                          console.error(error.message);
                          return;
                        }

                        // 2. Локально очищаем массив сообщений в контексте, чтобы они мгновенно пропали с экрана
                        ctx.setAllMessages((prev: any[]) => prev.filter(m => m.chatId !== currentRoomId));
                        
                        // 3. Закрываем окно чата, переводя activeChatId в null (возвращаем заглушку)
                        ctx.setActiveChatId(null);
                        
                        // 4. Показываем красивый сочный тост об успехе
                        ctx.showToast('Чат успешно удален', 'success');
                      },
                      true // Передаем isDanger=true, чтобы кнопка в модалке подтверждения тоже загорелась красным
                    );
                  }
                }
              ]} 
            />
          </div>
          <button 
            className={styles['header-btn']} 
            onClick={() => ctx.setActiveChatId(null)}
          >
            <X size={30}/>
            </button>
        </div>
      </header>

      {ctx.showMsgSearch && (
        <div className={styles['message-search-bar']}>
          <input 
            type="text" placeholder="Поиск по истории сообщений..." value={ctx.messageSearchQuery}
            onChange={e => ctx.setMessageSearchQuery(e.target.value)} className={styles['message-search-input']}
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

          // 📅 Вычисляем дату для плашек группировки суток
          const currentMsgDate = new Date(msg.createdAt);
          const currentDayStr = currentMsgDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long'
          });

          let showDateDivider = false;

          if (index === 0) {
            showDateDivider = true;
          } else {
            const prevMsgDate = new Date(displayedMessages[index - 1].createdAt);
            const prevDayStr = prevMsgDate.toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long'
            });

            if (currentDayStr !== prevDayStr) {
              showDateDivider = true;
            }
          }

          return (
            /* 🚀 ИСПРАВЛЕНИЕ: Даем фрагменту уникальный ключ, чтобы React железно изолировал контекст каждого сообщения */
            <React.Fragment key={`msg-group-${msg.id}`}>
              
              {/* 📅 ВСТАВКА ПЛАШКИ ДАТЫ */}
              {showDateDivider && (
                <div className={styles['chat-date-divider']}>
                  <span className={styles['chat-date-text']}>{currentDayStr}</span>
                </div>
              )}

              {/* 💬 ОБЛАЧКО СООБЩЕНИЯ С ИСПРАВЛЕННЫМ КОНТЕКСТОМ ПКМ */}
              <div 
                className={`${styles.message} ${isMyMsg ? styles['message-outgoing'] : styles['message-incoming']}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  
                  // Базовый массив пунктов
                  const menuItems = [
                    { label: 'Копировать текст', icon: '📋', onClick: () => ctx.handleCopyMessageText(msg.text) }
                  ];

                  // 🎯 ПРОВЕРКА АВТОРА: Теперь она снова железно видит твои сообщения!
                  if (isMyMsg) {
                    menuItems.unshift({
                      label: 'Редактировать',
                      icon: '✏️',
                      onClick: () => {
                        ctx.setEditingMessage(msg);
                        ctx.setMessageText(msg.text);
                        if (messageInputRef.current) {
                          messageInputRef.current.focus();
                        }
                      }
                    });
                  }

                  // Пункт удаления
                  menuItems.push(
                    { isDivider: true } as any,
                    { 
                      label: 'Удалить', 
                      icon: '🗑️', 
                      isDanger: true, 
                      onClick: async () => {
                        ctx.showConfirm('Удаление', 'Удалить это сообщение?', async () => {
                          await supabase.from('messages').delete().eq('id', msg.id);
                          ctx.setConfirm((prev: any) => ({ ...prev, show: false }));
                          ctx.showToast('Сообщение удалено', 'success');
                        }, true);
                      }
                    }
                  );

                  ctx.setCtxMenu({
                    show: true,
                    x: e.clientX,
                    y: e.clientY,
                    items: menuItems
                  });
                }}
              >
                <div className={styles['message-bubble']}>
                  <div className={styles['message-text']}>
                    {msg.text}
                    <span className={styles['message-meta']}>
                      <span className={styles['message-time']}>
                        {msg.isEdited && <i>ред. </i>}
                        {formatHoursAndMinutes(msg.createdAt)}
                      </span>
                      {isMyMsg && (
                        <span className={styles['message-status']}>
                          {msg.status === 'read' ? <CheckCheck size={14}/> : <Check size={14}/>}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
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
          placeholder="Напишите сообщение..." ref={messageInputRef} value={ctx.messageText}
          onChange={e => ctx.setMessageText(e.target.value)} onKeyDown={ctx.handleKeyDown}
          className={styles['main-message-input']} autoComplete="off"
        />
        <button type="submit" className={styles['send-message-btn']}><Send color='#aaa8a8'/></button>
      </form>

      <ContextMenu show={ctx.ctxMenu.show} x={ctx.ctxMenu.x} y={ctx.ctxMenu.y} onClose={ctx.closeContextMenu} items={ctx.ctxMenu.items} />
    </main>
  );
}
