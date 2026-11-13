import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ArrowRight, ShieldCheck, MessageSquare, Users } from 'lucide-react';
import styles from '../../css/profile.module.css';
import useMessengerContext from '../../../context/messengerContext';
import { supabase } from '../../../services/supabaseClient';
import SmartAvatar from '../../common/SmartAvatar';

interface WelcomeModalProps {
  show: boolean;
  onClose: () => void;
}

export default function WelcomeModal({ show, onClose }: WelcomeModalProps) {
  const ctx = useMessengerContext();
  const [step, setStep] = useState(1);

  if (!show || !ctx.currentUser) return null;

  const displayName = ctx.currentUser.username || 'Пользователь';

  const handleFinish = async () => {
    try {
      const userUuid = ctx.currentUser.uuid || ctx.currentUser.id;
      const currentSettings = ctx.currentUser.settings || {};
      
      const updatedSettings = {
        ...currentSettings,
        welcomed: true
      };

      // Сохраняем в базу данных в jsonb-колонку settings
      await supabase
        .from('users')
        .update({ settings: updatedSettings, updatedAt: new Date().toISOString() })
        .eq('uuid', userUuid);

      // Обновляем локальный стейт пользователя в контексте
      if (ctx.setCurrentUser) {
        ctx.setCurrentUser((prev: any) => ({
          ...prev,
          settings: updatedSettings
        }));
      }
    } catch (err) {
      console.error('Ошибка сохранения статуса приветствия:', err);
    } finally {
      onClose();
    }
  };

  return createPortal(
    <div className={styles['modal-overlay']} style={{ zIndex: 1000005 }}>
      <div 
        className={styles['profile-modal-card']} 
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '420px', backgroundColor: '#1c1c24',
          borderRadius: '20px', padding: '32px 24px', textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)', border: '1px solid #2f2f3d',
          color: '#fff', display: 'flex', flexDirection: 'column', gap: '20px'
        }}
      >
        {step === 1 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
              <div style={{ padding: '4px', borderRadius: '50%', background: 'linear-gradient(135deg, #9d7bf6, #007aff)' }}>
                <SmartAvatar
                  size={88}
                  avatarUrl={ctx.currentUser.avatarUrl}
                  avatarColor={ctx.currentUser.avatarColor || '#5865F2'}
                  name={displayName}
                />
              </div>
            </div>

            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 800 }}>
                Добро пожаловать, {displayName}! 🎉
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#9a9ca6', lineHeight: 1.5 }}>
                Вы успешно зарегистрировались в <strong>Blyades Messenger</strong>. Давайте быстро познакомимся с тем, что здесь есть.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#13131a', padding: '12px', borderRadius: '12px' }}>
                <div style={{ color: '#007aff', background: 'rgba(0,122,255,0.1)', padding: '8px', borderRadius: '8px' }}><MessageSquare size={20} /></div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Быстрые чаты</div>
                  <div style={{ fontSize: '12px', color: '#8e8e93' }}>Общайтесь с друзьями в личных сообщениях</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#13131a', padding: '12px', borderRadius: '12px' }}>
                <div style={{ color: '#2ec761', background: 'rgba(46,199,97,0.1)', padding: '8px', borderRadius: '8px' }}><Users size={20} /></div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Группы и каналы</div>
                  <div style={{ fontSize: '12px', color: '#8e8e93' }}>Создавайте беседы и вещайте новости</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#13131a', padding: '12px', borderRadius: '12px' }}>
                <div style={{ color: '#9d7bf6', background: 'rgba(157,123,246,0.1)', padding: '8px', borderRadius: '8px' }}><ShieldCheck size={20} /></div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Гибкая настройка</div>
                  <div style={{ fontSize: '12px', color: '#8e8e93' }}>Меняйте цвета профиля и приватность в один клик</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              style={{
                backgroundColor: '#007aff', color: '#fff', border: 'none',
                borderRadius: '12px', padding: '14px', fontWeight: 600, fontSize: '15px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', marginTop: '8px', boxShadow: '0 6px 20px rgba(0,122,255,0.4)'
              }}
            >
              <span>Далее</span> <ArrowRight size={18} />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(157,123,246,0.15)', color: '#9d7bf6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Sparkles size={32} />
            </div>

            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 700 }}>
                Всё готово к общению!
              </h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#9a9ca6', lineHeight: 1.5 }}>
                Вы можете найти пользователей через глобальный поиск по тегам (`@username`) в разделе контактов или сразу открыть новостной канал.
              </p>
            </div>

            <div style={{ backgroundColor: '#13131a', padding: '16px', borderRadius: '12px', textAlign: 'left', fontSize: '13px', color: '#dbdee1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontWeight: 600, color: '#9d7bf6' }}>💡 Совет от разработчика:</span>
              <span>Не забудьте заглянуть в настройки, чтобы выбрать уникальный публичный тег и настроить цвета подложки профиля под свой вкус.</span>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              style={{
                backgroundColor: '#2ec761', color: '#000', border: 'none',
                borderRadius: '12px', padding: '14px', fontWeight: 700, fontSize: '15px',
                cursor: 'pointer', marginTop: '8px', boxShadow: '0 6px 20px rgba(46,199,97,0.3)'
              }}
            >
              Начать общение 🚀
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}