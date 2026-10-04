import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './css/chat-window.module.css'; // Используем твои оригинальные стили модалок
import { X, Users, Check } from 'lucide-react';
import useMessengerContext from '../context/messengerContext';

interface CreateGroupModalProps {
  show: boolean;
  onClose: () => void;
}

export default function CreateGroupModal({ show, onClose }: CreateGroupModalProps) {
  const ctx = useMessengerContext();
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUserIds] = useState<string[]>([]);

  if (!show) return null;

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      ctx.showToast('Введите название беседы', 'warning');
      return;
    }

    if (ctx.handleCreateGroupChat) {
      await ctx.handleCreateGroupChat(groupName, selectedUsers);
      setGroupName('');
      setSelectedUserIds([]);
      onClose();
    }
  };

  return createPortal(
    <div 
      onClick={onClose} 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)', // Плотное красивое затемнение заднего фона
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 999999,
        transition: 'opacity 0.2s ease'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          backgroundColor: '#1c1c24', // Фирменный глубокий темный цвет карточки
          border: '1px solid #2b2d31',
          borderRadius: '16px',
          padding: '24px', 
          maxWidth: '420px', 
          width: '100%',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        
        {/* Шапка модалки */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2b2d31', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
            <Users size={20} color="#007aff" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', fontFamily: 'sans-serif' }}>Создание беседы</h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Инпут названия */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Название беседы</label>
            <input 
              type="text" 
              placeholder="Например: Конференция..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{ width: '100%', backgroundColor: '#1e1f22', color: '#fff', border: '1px solid #2b2d31', borderRadius: '6px', padding: '12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              autoComplete="off"
            />
          </div>

          {/* Список контактов с чекбоксами */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Пригласить участников ({selectedUsers.length})</label>
            <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#1e1f22', border: '1px solid #2b2d31', borderRadius: '6px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {ctx.chats.length === 0 ? (
                <div style={{ color: '#636366', fontSize: '13px', textAlign: 'center', padding: '20px', fontFamily: 'sans-serif' }}>У вас пока нет контактов</div>
              ) : (
                ctx.chats.map((user: any) => {
                  const isChecked = selectedUsers.includes(user.id);
                  return (
                    <div 
                      key={user.id} 
                      onClick={() => toggleUserSelection(user.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderRadius: '4px', cursor: 'pointer', backgroundColor: isChecked ? 'rgba(0, 122, 255, 0.08)' : 'transparent', transition: 'background-color 0.15s ease' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: user.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '12px', fontFamily: 'sans-serif' }}>
                          {user.name.substring(0, 1).toUpperCase()}
                        </div>
                        <span style={{ color: isChecked ? '#fff' : '#dbdee1', fontSize: '14px', fontWeight: isChecked ? '600' : '500', fontFamily: 'sans-serif' }}>{user.name}</span>
                      </div>
                      
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: isChecked ? 'none' : '2px solid #3a3a3c', backgroundColor: isChecked ? '#007aff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}>
                        {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Кнопки футера */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px', borderTop: '1px solid #2b2d31', paddingTop: '16px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ flex: 1, backgroundColor: 'transparent', color: '#fff', border: '1px solid #3a3a3c', borderRadius: '6px', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', fontFamily: 'sans-serif' }}
            >
              Отмена
            </button>
            <button 
              type="submit"
              style={{ flex: 1, backgroundColor: '#007aff', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'sans-serif' }}
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
