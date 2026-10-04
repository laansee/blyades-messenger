import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ToastNotification, type ToastState } from '../../components/GlobalUI';
import Image from '../../assets/img/auth-backImg.jpg'; // Картинка из общей папки assets
import styles from '../../components/css/auth.module.css';
import uiStyles from '../../components/css/global-ui.module.css';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  // Стейты для полей авторизации и регистрации
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegisterPass, setShowRegisterPass] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });

  document.title = "Авторизация | Blyades"

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
    setLoading(true); // Включаем наш красивый лоадер на кнопке!

    if (!login.trim() || !password.trim()) {
      setErrorMsg('Пожалуйста, заполните все поля');
      setLoading(false);
      return;
    }

    try {
      // Ищем пользователя в твоей оригинальной таблице Users по uniqueId (логину)
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('uniqueId', login.trim())
        .single();

      if (error || !user) {
        setErrorMsg('Неверное имя пользователя или пароль');
        setLoading(false);
        return;
      }

      // Сверяем пароль напрямую из твоего дампа (пока без хэширования, как и было в исходнике)
      if (user.password !== password.trim()) {
        setErrorMsg('Неверное имя пользователя или пароль');
        setLoading(false);
        return;
      }

      // Если всё верно — сохраняем ID вошедшего юзера в LocalStorage, чтобы сессия не слетала при обновлении F5
      localStorage.setItem('blyades_user_id', user.id.toString());
      localStorage.setItem('blyades_username', user.username);
      localStorage.setItem('blyades_unique_id', user.uniqueId);

      // Принудительно перезагружаем страницу, чтобы App.tsx увидел сессию и пустил нас в /chat
      window.location.reload();

    } catch (err) {
      console.error(err);
      setErrorMsg('Произошла системная ошибка при входе');
    } finally {
      setLoading(false); // Выключаем лоадер, если произошла ошибка
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!login.trim() || !password.trim()) {
      setErrorMsg('Пожалуйста, заполните все поля');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Пароли не совпадают!');
      return;
    }

    const cleanLogin = login.trim();
    setLoading(true); // Включаем красивый лоадер создания

    try {
      // 🚀 1. ПРЯМОЙ ИНСЕРТ: Создаем пользователя без каких-либо email
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{ 
          uniqueId: cleanLogin, 
          username: cleanLogin, 
          password: password.trim(),
          avatarColor: `#${Math.floor(Math.random()*16777215).toString(16)}` // Рандомный цвет аватарки
        }])
        .select()
        .single();

      if (error) {
        setErrorMsg('Логин уже занят или ошибка базы: ' + error.message);
        return;
      }

      if (newUser) {
        // 🚀 2. АВТО-ВХОД: Мгновенно сохраняем данные созданного аккаунта в LocalStorage!
        localStorage.setItem('blyades_user_id', newUser.id.toString());
        localStorage.setItem('blyades_username', newUser.username);
        localStorage.setItem('blyades_unique_id', newUser.uniqueId);

        setToast({
          show: true,
          message: 'Аккаунт успешно создан! Входим...',
          type: 'success',
        });

        // 🚀 3. Принудительно перезагружаем страницу, чтобы App.tsx увидел сессию и сразу пустил в чаты!
        setTimeout(() => {
          window.location.reload();
        }, 1000); // Даем 1 секунду, чтобы пользователь успел увидеть зеленый тост успеха
      }

    } catch (err) {
      console.error(err);
      setErrorMsg('Произошла ошибка при записи в базу данных');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPageContainer}>
      <div className={styles.authMainCard}>
       
        <div className={`${styles.authTrack} ${isRegister ? styles.showRegister : ''}`}>
          
          {/* БЛОК 1: Форма Авторизации */}
          <div className={styles.authFormSide}>
            <div className={styles.authFormWrapper}>
              <div className={styles.authHeaderText}>
                <h1 className={styles.authTitle}>Войти в аккаунт</h1>
                <p className={styles.authSubtitle}>Добро пожаловать обратно</p>
              </div>
              {errorMsg && !isRegister && <div className={styles.authErrorAlert}>⚠️ {errorMsg}</div>}
              <form onSubmit={handleSignIn} className={styles.authFormFields}>
                <div className={styles.inputGroup}>
                  <label htmlFor='auth-login'>Ваш Логин</label>
                  <input 
                    type="text" 
                    value={login} 
                    onChange={e => setLogin(e.target.value)} 
                    placeholder="ivan" 
                    required 
                    id='auth-login'
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor='auth-pass'>Пароль</label>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '320px', display: 'flex' }}>
                    <input 
                      // id="password"
                      type={showLoginPass ? "text" : "password"} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="••••••••" 
                      autoComplete="current-password"
                      required
                      id='auth-pass'
                      style={{ width: '100%', boxSizing: 'border-box', paddingRight: '46px' }}
                    />
                    <button
                      type="button"
                      aria-label="Показать пароль"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', padding: 0, zIndex: 10 }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 5c-6 0-10 7-10 7s4 7 10 7 10-7 10-7-4-7-10-7Zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9Z" fill={showLoginPass ? "#aa3bff" : "#AFA7A8"} />
                        <circle cx="12" cy="12" r="2.2" fill={showLoginPass ? "#aa3bff" : "#AFA7A8"} />
                      </svg>
                    </button>
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className={styles.authSubmitBtn}
                >
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
                      setErrorMsg(''); 
                      setShowLoginPass(false);
                      setShowRegisterPass(false);
                      document.title = "Регистрация | Blyades"
                    }} 
                    className={styles.authSwitchLink}
                  >
                    Зарегистрироваться
                  </span>
                </p>
              </form>
            </div>
          </div>

          {/* БЛОК 2: Центральная Картинка */}
          <div className={styles.authGraphicSide}>
            <div className={styles.authMockImage}>
              <img src={Image} alt="Logo" className="auth-backImg" />
            </div> 
          </div>

          {/* БЛОК 3: Форма Регистрации */}
          <div className={styles.authFormSide}>
            <div className={styles.authFormWrapper}>
              <div className={styles.authHeaderText}>
                <h1 className={styles.authTitle}>Регистрация</h1>
                <p className={styles.authSubtitle}>Создайте новый профиль в системе</p>
              </div>
              {errorMsg && isRegister && <div className={styles.authErrorAlert}>⚠️ {errorMsg}</div>}
              <form onSubmit={handleSignUp} className={styles.authFormFields}>
                <div className={styles.inputGroup}>
                  <label htmlFor='reg-login'>Придумайте Логин</label>
                  <input 
                    type="text" 
                    value={login} 
                    onChange={e => setLogin(e.target.value)} 
                    placeholder="ivan" 
                    required
                    id='reg-login'
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor='reg-pass'>Пароль</label>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '320px', display: 'flex' }}>
                    <input 
                      type={showRegisterPass ? "text" : "password"}
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      placeholder="••••••••" 
                      required
                      id='reg-pass'
                      style={{ width: '100%', boxSizing: 'border-box', paddingRight: '46px' }}
                    />
                    <button
                      type="button"
                      aria-label="Показать пароль"
                      onClick={() => setShowRegisterPass(!showRegisterPass)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', padding: 0, zIndex: 10 }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 5c-6 0-10 7-10 7s4 7 10 7 10-7 10-7-4-7-10-7Zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9Z" fill={showRegisterPass ? "#aa3bff" : "#AFA7A8"} />
                        <circle cx="12" cy="12" r="2.2" fill={showRegisterPass ? "#aa3bff" : "#AFA7A8"} />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor='reg-pass-confirm'>Повторите пароль</label>
                  <input 
                    type={showRegisterPass ? "text" : "password"}
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="••••••••" 
                    required
                    id='reg-pass-confirm'
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
                      setErrorMsg(''); 
                      setShowLoginPass(false);
                      setShowRegisterPass(false);
                      document.title = "Авторизация | Blyades"
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
      {/* <ToastNotification toast={toast} /> */}
    </div>
  );
}
