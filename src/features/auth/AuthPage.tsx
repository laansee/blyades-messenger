import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { userService } from '../../services/userService';
import { ToastNotification, type ToastState } from '../../components/common/GlobalUI';
import Image from '../../assets/img/auth-backImg.jpg';
import styles from '../../components/css/auth.module.css';
import uiStyles from '../../components/css/global-ui.module.css';
import { getRandomDefaultNameColor } from '../../utils/themeColors';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegisterPass, setShowRegisterPass] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });

  useEffect(() => {
    document.title = isRegister ? 'Регистрация | Blyades' : 'Авторизация | Blyades';
  }, [isRegister]);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const handleSignIn = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Пожалуйста, заполните Email и Пароль');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        setErrorMsg('Неверный email или пароль: ' + error.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        const publicUser = await userService.getUserByUuid(data.user.id);

        localStorage.setItem('blyades_user_id', data.user.id);
        localStorage.setItem('blyades_username', publicUser?.username || 'user');
        if (publicUser?.publicId) {
          localStorage.setItem('blyades_unique_id', publicUser.publicId);
        } else {
          localStorage.removeItem('blyades_unique_id');
        }

        window.location.reload();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Произошла системная ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg('Пожалуйста, заполните все поля');
      return;
    }
    if (cleanPassword !== confirmPassword.trim()) {
      setErrorMsg('Пароли не совпадают!');
      return;
    }

    setLoading(true);

    try {
      const generatedNameColor = getRandomDefaultNameColor();
      const defaultUsername = cleanEmail.split('@')[0]?.trim() || 'Пользователь';

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            username: defaultUsername,
            nameColor: generatedNameColor,
            profileColor: '#312b3a',
          },
        },
      });

      if (error) {
        setErrorMsg('Ошибка регистрации: ' + error.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        localStorage.setItem('blyades_user_id', data.user.id);
        localStorage.setItem('blyades_username', defaultUsername);
        localStorage.removeItem('blyades_unique_id');

        setToast({
          show: true,
          message: 'Аккаунт успешно создан! Входим...',
          type: 'success',
        });

        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Произошла ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPageContainer}>
      <div className={styles.authMainCard}>
        <div className={`${styles.authTrack} ${isRegister ? styles.showRegister : ''}`}>
          
          {/* Форма Авторизации */}
          <div className={styles.authFormSide}>
            <div className={styles.authFormWrapper}>
              <div className={styles.authHeaderText}>
                <h1 className={styles.authTitle}>Войти в аккаунт</h1>
                <p className={styles.authSubtitle}>Добро пожаловать обратно</p>
              </div>
              {errorMsg && !isRegister && (
                <div className={styles.authErrorAlert} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              <form onSubmit={handleSignIn} className={styles.authFormFields}>
                <div className={styles.inputGroup}>
                  <label htmlFor="auth-email">Электронная почта</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="ivan@example.com" 
                    required 
                    id="auth-email"
                    autoComplete="email"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="auth-pass">Пароль</label>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '320px', display: 'flex' }}>
                    <input 
                      type={showLoginPass ? 'text' : 'password'} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="••••••••" 
                      autoComplete="current-password"
                      required
                      id="auth-pass"
                      style={{ width: '100%', boxSizing: 'border-box', paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      aria-label="Показать пароль"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0,
                        zIndex: 10,
                        color: showLoginPass ? '#aa3bff' : '#9ca3af',
                      }}
                    >
                      {showLoginPass ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className={styles.authSubmitBtn}>
                  {loading ? (
                    <div className={uiStyles['button-loader-content']}>
                      <div className={uiStyles['button-spinner']}></div>
                      <span>Проверка...</span>
                    </div>
                  ) : (
                    'Авторизоваться'
                  )}
                </button>

                <p className={styles.authSwitchText}>
                  Еще нет аккаунта?{' '}
                  <span 
                    onClick={() => { 
                      setIsRegister(true); 
                      setTimeout(() => setErrorMsg(''), 600);
                    }} 
                    className={styles.authSwitchLink}
                  >
                    Зарегистрироваться
                  </span>
                </p>
              </form>
            </div>
          </div>

          {/* Центральная Картинка */}
          <div className={styles.authGraphicSide}>
            <div className={styles.authMockImage}>
              <img src={Image} alt="Logo" className="auth-backImg" />
            </div> 
          </div>

          {/* Форма Регистрации */}
          <div className={styles.authFormSide}>
            <div className={styles.authFormWrapper}>
              <div className={styles.authHeaderText}>
                <h1 className={styles.authTitle}>Регистрация</h1>
                <p className={styles.authSubtitle}>Создайте новый профиль в системе</p>
              </div>
              {errorMsg && isRegister && (
                <div className={styles.authErrorAlert} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              <form onSubmit={handleSignUp} className={styles.authFormFields}>
                <div className={styles.inputGroup}>
                  <label htmlFor="reg-email">Электронная почта</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="ivan@example.com" 
                    required
                    id="reg-email"
                    autoComplete="email"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="reg-pass">Пароль</label>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '320px', display: 'flex' }}>
                    <input 
                      type={showRegisterPass ? 'text' : 'password'}
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="••••••••" 
                      required
                      id="reg-pass"
                      autoComplete="new-password"
                      style={{ width: '100%', boxSizing: 'border-box', paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      aria-label="Показать пароль"
                      onClick={() => setShowRegisterPass(!showRegisterPass)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0,
                        zIndex: 10,
                        color: showRegisterPass ? '#aa3bff' : '#9ca3af',
                      }}
                    >
                      {showRegisterPass ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="reg-pass-confirm">Повторите пароль</label>
                  <input 
                    type={showRegisterPass ? 'text' : 'password'}
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="••••••••" 
                    required
                    id="reg-pass-confirm"
                    autoComplete="new-password"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className={`${styles.authSubmitBtn} ${styles.registerBtnColor}`}
                >
                  {loading ? (
                    <div className={uiStyles['button-loader-content']}>
                      <div className={uiStyles['button-spinner']}></div>
                      <span>Создание...</span>
                    </div>
                  ) : (
                    'Создать аккаунт'
                  )}
                </button>

                <p className={styles.authSwitchText}>
                  Уже зарегистрированы?{' '}
                  <span 
                    onClick={() => { 
                      setIsRegister(false); 
                      setTimeout(() => setErrorMsg(''), 600);
                    }} 
                    className={styles.authSwitchLink}
                  >
                    Войти
                  </span>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 999999 }}>
        <ToastNotification toast={toast} />
      </div>
    </div>
  );
}