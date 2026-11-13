import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import useMessengerContext from '../../context/messengerContext';
import { 
  Activity, Bell, ShieldAlert, 
  Database, HardDrive, Copy, Trash2, Wifi,
  Smartphone, Globe, RefreshCw
} from 'lucide-react';
import styles from '../../components/css/admin.module.css';

interface PingResult {
  status: 'idle' | 'checking' | 'ok' | 'error';
  ms: number | null;
  detail: string;
}

type DumpTab = 'currentUser' | 'chats' | 'contacts' | 'users' | 'online' | 'calls';

export default function AdminDebugPanel() {
  const ctx = useMessengerContext();

  const [pings, setPings] = useState<{
    frontend: PingResult;
    supabaseDb: PingResult;
    supabaseAuth: PingResult;
  }>({
    frontend: { status: 'idle', ms: null, detail: 'Ожидание замера' },
    supabaseDb: { status: 'idle', ms: null, detail: 'Ожидание замера' },
    supabaseAuth: { status: 'idle', ms: null, detail: 'Ожидание замера' },
  });

  const [dumpTarget, setDumpTarget] = useState<DumpTab>('currentUser');
  const [localStorageKeys, setLocalStorageKeys] = useState<Array<{ key: string; value: string }>>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [viewport, setViewport] = useState({
    w: window.innerWidth,
    h: window.innerHeight,
  });
  const [micPermission, setMicPermission] = useState<string>('unknown');

  const refreshLocalStorage = () => {
    const items: Array<{ key: string; value: string }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        items.push({ key, value: localStorage.getItem(key) || '' });
      }
    }
    setLocalStorageKeys(items);
  };

  const runPingDiagnostics = async () => {
    setPings({
      frontend: { status: 'checking', ms: null, detail: 'Замер...' },
      supabaseDb: { status: 'checking', ms: null, detail: 'Замер...' },
      supabaseAuth: { status: 'checking', ms: null, detail: 'Замер...' },
    });

    try {
      const t0 = performance.now();
      const res = await fetch(`${window.location.origin}/?_ping=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store',
      });
      const ms = Math.round(performance.now() - t0);
      setPings(prev => ({
        ...prev,
        frontend: {
          status: res.ok ? 'ok' : 'error',
          ms,
          detail: `HTTP ${res.status} (${window.location.host})`,
        },
      }));
    } catch (err: any) {
      setPings(prev => ({
        ...prev,
        frontend: { status: 'error', ms: null, detail: err?.message || 'Ошибка сети' },
      }));
    }

    try {
      const t0 = performance.now();
      const { error } = await supabase
        .from('chats')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      const ms = Math.round(performance.now() - t0);
      setPings(prev => ({
        ...prev,
        supabaseDb: {
          status: error ? 'error' : 'ok',
          ms,
          detail: error ? error.message : 'PostgreSQL доступен',
        },
      }));
    } catch (err: any) {
      setPings(prev => ({
        ...prev,
        supabaseDb: { status: 'error', ms: null, detail: err?.message || 'Ошибка БД' },
      }));
    }

    try {
      const t0 = performance.now();
      const { error } = await supabase.auth.getSession();
      const ms = Math.round(performance.now() - t0);
      setPings(prev => ({
        ...prev,
        supabaseAuth: {
          status: error ? 'error' : 'ok',
          ms,
          detail: error ? error.message : 'Auth API доступен',
        },
      }));
    } catch (err: any) {
      setPings(prev => ({
        ...prev,
        supabaseAuth: { status: 'error', ms: null, detail: err?.message || 'Ошибка Auth' },
      }));
    }
  };

  useEffect(() => {
    runPingDiagnostics();
    refreshLocalStorage();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('resize', handleResize);

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then(res => setMicPermission(res.state))
        .catch(() => setMicPermission('n/a'));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getDumpJson = () => {
    if (dumpTarget === 'currentUser') return JSON.stringify(ctx.currentUser, null, 2);
    if (dumpTarget === 'chats') return JSON.stringify(ctx.chats, null, 2);
    if (dumpTarget === 'contacts') return JSON.stringify(ctx.contacts, null, 2);
    if (dumpTarget === 'users') return JSON.stringify(ctx.users, null, 2);
    if (dumpTarget === 'online') return JSON.stringify(Array.from(ctx.onlineUserIds || []), null, 2);
    if (dumpTarget === 'calls') return JSON.stringify(ctx.activeGroupCalls || {}, null, 2);
    return '{}';
  };

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let os = 'Неизвестная ОС';
    if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    let browser = 'Другой';
    if (/CriOS/i.test(ua)) browser = 'Chrome (iOS)';
    else if (/FxiOS/i.test(ua)) browser = 'Firefox (iOS)';
    else if (/Edg/i.test(ua)) browser = 'Edge';
    else if (/YaBrowser/i.test(ua)) browser = 'Yandex';
    else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const perfMemory = (performance as any).memory;
    const usedHeapMb = perfMemory?.usedJSHeapSize
      ? `${Math.round(perfMemory.usedJSHeapSize / 1024 / 1024)} МБ`
      : null;

    return {
      os,
      browser,
      isStandalone,
      usedHeapMb,
      touchPoints: navigator.maxTouchPoints || 0,
      dpr: window.devicePixelRatio || 1,
      screenRes: `${window.screen.width}×${window.screen.height}`,
      effectiveType: conn?.effectiveType ? String(conn.effectiveType).toUpperCase() : 'N/A',
      downlink: typeof conn?.downlink === 'number' ? `${conn.downlink} Мбит/с` : 'N/A',
      rtt: typeof conn?.rtt === 'number' ? `${conn.rtt} мс` : 'N/A',
      hasWebRTC: typeof RTCPeerConnection !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
      notificationPerm: typeof Notification !== 'undefined' ? Notification.permission : 'n/a',
    };
  };

  const realtimeChannels = supabase.getChannels();
  const deviceInfo = getDeviceInfo();
  const currentRoute = `${window.location.pathname}${window.location.search}`;

  const renderPingColor = (res: PingResult) => {
    if (res.status === 'checking') return '#9ca3af';
    if (res.status === 'error') return '#ff453a';
    if (res.ms !== null && res.ms > 600) return '#ff9f0a';
    return '#34c759';
  };

  const [, setRefreshTick] = useState(0);
  const forceRefresh = () => setRefreshTick(prev => prev + 1);

  const refreshMemoryAndStorage = async () => {
    refreshLocalStorage();
    forceRefresh();
    if (ctx.fetchAndMatchChats) {
      await ctx.fetchAndMatchChats();
    }
    ctx.showToast?.('Стейт и Storage обновлены', 'info');
  };

  const refreshNetworkCard = async () => {
    setIsOnline(navigator.onLine);
    if (navigator.permissions?.query) {
      try {
        const res = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPermission(res.state);
      } catch {
        setMicPermission('n/a');
      }
    }
    forceRefresh();
    ctx.showToast?.('Данные соединения обновлены', 'info');
  };

  return (
    <div className={styles['debug-container']}>
      <div className={styles['debug-grid']}>
        
        {/* 1. ПИНГ И СТАТУС СЕРВИСОВ */}
        <div className={styles['debug-card']}>
          <div className={styles['debug-card-header']}>
            <div className={styles['debug-card-title']}>
              <Activity size={16} color="#34c759" /> Пинг и статус сервисов
            </div>
            <button
              type="button"
              onClick={runPingDiagnostics}
              className={styles['debug-mini-btn']}
              title="Повторить замер пинга"
            >
              <RefreshCw size={12} /> Замерить
            </button>
          </div>

          <div className={styles['debug-list']}>
            <div className={styles['debug-row']}>
              <span>Frontend / Vercel:</span>
              <span style={{ color: renderPingColor(pings.frontend), fontWeight: 700 }}>
                {pings.frontend.ms !== null ? `${pings.frontend.ms} мс` : pings.frontend.detail}
              </span>
            </div>
            <div className={styles['debug-subrow']}>{pings.frontend.detail}</div>

            <div className={styles['debug-row']}>
              <span>Supabase PostgreSQL:</span>
              <span style={{ color: renderPingColor(pings.supabaseDb), fontWeight: 700 }}>
                {pings.supabaseDb.ms !== null ? `${pings.supabaseDb.ms} мс` : pings.supabaseDb.detail}
              </span>
            </div>
            <div className={styles['debug-subrow']}>{pings.supabaseDb.detail}</div>

            <div className={styles['debug-row']}>
              <span>Supabase Auth:</span>
              <span style={{ color: renderPingColor(pings.supabaseAuth), fontWeight: 700 }}>
                {pings.supabaseAuth.ms !== null ? `${pings.supabaseAuth.ms} мс` : pings.supabaseAuth.detail}
              </span>
            </div>

            <div className={styles['debug-row']} style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid #2b2d31' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wifi size={14} color="#9d7bf6" /> Realtime каналы:
              </span>
              <span style={{ color: '#9d7bf6', fontWeight: 700 }}>
                {realtimeChannels.length} акт.
              </span>
            </div>
          </div>
        </div>

        {/* 2. СОСТОЯНИЕ КОНТЕКСТА И LOCALSTORAGE */}
        <div className={styles['debug-card']}>
          <div className={styles['debug-card-header']}>
            <div className={styles['debug-card-title']}>
              <HardDrive size={16} color="#ffcc00" /> Стейт памяти и Storage
            </div>
            <button
              type="button"
              onClick={refreshMemoryAndStorage}
              className={styles['debug-mini-btn']}
              title="Обновить стейт, JS Heap и LocalStorage"
            >
              <RefreshCw size={12} /> Обновить
            </button>
          </div>

          <div className={styles['debug-list']}>
            <div className={styles['debug-row']}>
              <span>Чатов / Контактов:</span>
              <span className={styles['debug-val']}>
                {ctx.chats?.length ?? 0} / {ctx.contacts?.length ?? 0}
              </span>
            </div>
            <div className={styles['debug-row']}>
              <span>Пользователей онлайн:</span>
              <span className={styles['debug-val']}>{ctx.onlineUserIds?.size ?? 0}</span>
            </div>
            <div className={styles['debug-row']}>
              <span>Текущий URL:</span>
              <span className={styles['debug-val']} title={currentRoute} style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentRoute}
              </span>
            </div>
            {deviceInfo.usedHeapMb && (
              <div className={styles['debug-row']}>
                <span>JS Heap (Память):</span>
                <span className={styles['debug-val']}>{deviceInfo.usedHeapMb}</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid #2b2d31' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>
              LocalStorage ({localStorageKeys.length}):
            </div>
            <div className={styles['debug-storage-list']}>
              {localStorageKeys.map(item => (
                <div key={item.key} className={styles['debug-storage-item']}>
                  <span style={{ color: '#9d7bf6', fontFamily: 'monospace' }} title={item.key}>{item.key}:</span>
                  <span style={{ color: '#dbdee1', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }} title={item.value}>
                    {item.value}
                  </span>
                  {item.key !== 'blyades_user_id' && (
                    <button
                      type="button"
                      title="Удалить ключ"
                      onClick={() => {
                        localStorage.removeItem(item.key);
                        refreshLocalStorage();
                      }}
                      style={{ background: 'none', border: 'none', color: '#ff453a', cursor: 'pointer', padding: '2px', marginLeft: 'auto' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. ДАННЫЕ ОБ УСТРОЙСТВЕ */}
        <div className={styles['debug-card']}>
          <div className={styles['debug-card-header']}>
            <div className={styles['debug-card-title']}>
              <Smartphone size={16} color="#38bdf8" /> Устройство и экран
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(navigator.userAgent);
                  ctx.showToast?.('User-Agent скопирован', 'success');
                }}
                className={styles['debug-mini-btn']}
                title="Скопировать User-Agent"
              >
                <Copy size={12} /> Копировать
              </button>
            </div>
          </div>

          <div className={styles['debug-list']}>
            <div className={styles['debug-row']}>
              <span>ОС / Браузер:</span>
              <span className={styles['debug-val']}>{deviceInfo.os} · {deviceInfo.browser}</span>
            </div>
            <div className={styles['debug-row']}>
              <span>Viewport (окно):</span>
              <span className={styles['debug-val']}>{viewport.w}×{viewport.h}px</span>
            </div>
            <div className={styles['debug-row']}>
              <span>Экран / DPR:</span>
              <span className={styles['debug-val']}>{deviceInfo.screenRes} (@{deviceInfo.dpr}x)</span>
            </div>
            <div className={styles['debug-row']}>
              <span>Ввод (Touch):</span>
              <span className={styles['debug-val']}>
                {deviceInfo.touchPoints > 0 ? `Touch (${deviceInfo.touchPoints} точек)` : 'Мышь / Десктоп'}
              </span>
            </div>
            <div className={styles['debug-row']}>
              <span>Режим запуска:</span>
              <span className={styles['debug-val']}>{deviceInfo.isStandalone ? 'PWA (Standalone)' : 'Браузер'}</span>
            </div>
            <div className={styles['debug-subrow']} style={{ marginTop: '4px', wordBreak: 'break-all' }}>
              {navigator.userAgent}
            </div>
          </div>
        </div>

        {/* 4. СОЕДИНЕНИЕ И МЕДИА-API */}
        <div className={styles['debug-card']}>
          <div className={styles['debug-card-header']}>
            <div className={styles['debug-card-title']}>
              <Globe size={16} color="#34c759" /> Соединение и API
            </div>
            <button
              type="button"
              onClick={refreshNetworkCard}
              className={styles['debug-mini-btn']}
              title="Обновить статус сети и разрешений"
            >
              <RefreshCw size={12} /> Обновить
            </button>
          </div>

          <div className={styles['debug-list']}>
            <div className={styles['debug-row']}>
              <span>Статус сети:</span>
              <span style={{ color: isOnline ? '#34c759' : '#ff453a', fontWeight: 700 }}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className={styles['debug-row']}>
              <span>Тип сети / Канал:</span>
              <span className={styles['debug-val']}>
                {deviceInfo.effectiveType} {deviceInfo.downlink !== 'N/A' ? `(${deviceInfo.downlink})` : ''}
              </span>
            </div>
            <div className={styles['debug-row']}>
              <span>Сетевой RTT:</span>
              <span className={styles['debug-val']}>{deviceInfo.rtt}</span>
            </div>
            <div className={styles['debug-row']}>
              <span>WebRTC / Микрофон:</span>
              <span className={styles['debug-val']}>
                {deviceInfo.hasWebRTC ? `Доступен (${micPermission})` : 'Не поддерживается'}
              </span>
            </div>
            <div className={styles['debug-row']}>
              <span>Push-уведомления:</span>
              <span className={styles['debug-val']}>{deviceInfo.notificationPerm}</span>
            </div>
          </div>
        </div>

        {/* 5. ТЕСТ УВЕДОМЛЕНИЙ И МОДАЛОК */}
        <div className={styles['debug-card']}>
          <div className={styles['debug-card-header']}>
            <div className={styles['debug-card-title']}>
              <Bell size={16} color="#9d7bf6" /> Тест Toast и модалок
            </div>
          </div>

          <div className={styles['debug-btn-wrap']}>
            <button
              type="button"
              className={styles['debug-pill-btn']}
              onClick={() => ctx.showToast?.('Информационное уведомление', 'info')}
            >
              Toast: Info
            </button>
            <button
              type="button"
              className={styles['debug-pill-btn']}
              onClick={() => ctx.showToast?.('Операция выполнена успешно!', 'success')}
            >
              Toast: Success
            </button>
            <button
              type="button"
              className={styles['debug-pill-btn']}
              onClick={() => ctx.showToast?.('Предупреждение системы', 'warning')}
            >
              Toast: Warning
            </button>
            <button
              type="button"
              className={styles['debug-pill-btn']}
              onClick={() => ctx.showToast?.('Ошибка выполнения запроса', 'error')}
            >
              Toast: Error
            </button>
            <button
              type="button"
              className={styles['debug-pill-btn']}
              style={{ borderColor: '#9d7bf6', color: '#c4b5fd' }}
              onClick={() => ctx.showToast?.('Бесконечная загрузка...', 'loading')}
            >
              Toast: Loading (∞)
            </button>
            {ctx.hideToast && (
              <button
                type="button"
                className={styles['debug-pill-btn']}
                onClick={() => ctx.hideToast()}
              >
                Скрыть Toast
              </button>
            )}
          </div>

          <div className={styles['debug-btn-wrap']} style={{ marginTop: '8px', paddingTop: '10px', borderTop: '1px solid #2b2d31' }}>
            <button
              type="button"
              className={styles['debug-pill-btn']}
              onClick={() =>
                ctx.showConfirm?.(
                  'Тестовое подтверждение',
                  'Проверка работы стандартного ConfirmModal из отладки.',
                  () => ctx.showToast?.('Подтверждено!', 'success'),
                  false
                )
              }
            >
              <ShieldAlert size={13} /> Confirm (Обычный)
            </button>
            <button
              type="button"
              className={styles['debug-pill-btn']}
              style={{ borderColor: 'rgba(255, 69, 58, 0.4)', color: '#ff453a' }}
              onClick={() =>
                ctx.showConfirm?.(
                  'Опасное действие',
                  'Проверка красного ConfirmModal (isDanger = true).',
                  () => ctx.showToast?.('Выполнено!', 'warning'),
                  true
                )
              }
            >
              Confirm (Danger)
            </button>
          </div>
        </div>

        {/* 6. СЫРОЙ JSON-ИНСПЕКТОР */}
        <div className={`${styles['debug-card']} ${styles['debug-card-wide']}`}>
          <div className={styles['debug-card-header']}>
            <div className={styles['debug-card-title']}>
              <Database size={16} color="#38bdf8" /> Инспектор данных (JSON)
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['currentUser', 'chats', 'contacts', 'users', 'online', 'calls'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setDumpTarget(tab)}
                  className={`${styles['debug-mini-btn']} ${dumpTarget === tab ? styles['active'] : ''}`}
                >
                  {tab}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getDumpJson());
                  ctx.showToast?.('JSON скопирован', 'success');
                }}
                className={styles['debug-mini-btn']}
                title="Скопировать JSON"
              >
                <Copy size={12} />
              </button>
            </div>
          </div>

          <pre className={styles['debug-json-box']}>
            {getDumpJson()}
          </pre>
        </div>

      </div>
    </div>
  );
}