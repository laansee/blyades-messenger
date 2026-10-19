import { useEffect, useState } from 'react';
import { BrowserRouter as Navigate, Link } from 'react-router-dom';
import { MessageSquare, ShieldAlert, Zap, Radio, ArrowRight, Activity, Server, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';


export default function LandingPage() {
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);
  const [dbPing, setDbPing] = useState<number | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    document.title = "Blyades Messenger";
  }, []);

  const checkSupabaseHealth = async () => {
    setChecking(true);
    const startTime = performance.now();
    try {
      // Быстрый замер пинга базы данных
      await supabase.from('users').select('id').limit(1);
      const endTime = performance.now();
      setDbPing(Math.round(endTime - startTime));
    } catch (err) {
      console.error('Supabase Ping Error:', err);
      setDbPing(-1);
    }

    if (supabase.channel && (supabase as any).realtime) {
      const isConnected = (supabase as any).realtime.isConnected();
      setIsRealtimeConnected(isConnected);
    } else {
      setIsRealtimeConnected(false);
    }
    setChecking(false);
  };

  useEffect(() => {
    if (isMonitorOpen) {
      checkSupabaseHealth();
      const interval = setInterval(checkSupabaseHealth, 15000);
      return () => clearInterval(interval);
    }
  }, [isMonitorOpen]);

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#0e0f11', color: '#fff',
      fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column',
      alignItems: 'center', overflowX: 'hidden', position: 'relative'
    }}>
      
      {/* 🔮 Задний неоновый фон (светящиеся сферы) */}
      <div style={{ position: 'absolute', top: '-10%', left: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(0, 122, 255, 0.15)', filter: 'blur(100px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '5%', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(46, 199, 97, 0.12)', filter: 'blur(120px)', zIndex: 0 }} />

      {/* 🧭 Верхний Хедер */}
      <header style={{ width: '100%', maxWidth: '1200px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#ff453a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', boxShadow: '0 4px 14px rgba(255, 69, 58, 0.4)' }}>Б</div>
          <span style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', background: 'linear-gradient(90deg, #ff453a, #007aff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Blyades</span>
        </div>
        <a href="https://github.com" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>
          {/* <Github size={18} /> GitHub */}
        </a>
      </header>

      {/* 🚀 Главный блок (Hero Section) */}
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, justifyContent: 'center', zIndex: 10, maxWidth: '965px', gap: '20px' }}>
        
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e1f22', border: '1px solid #2b2d31', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', color: '#2ec761', fontWeight: 600 }}>
          <Radio size={14} className="blink-anim" /> Релиз версии v1.48.8
        </div>

        <h1 style={{ fontSize: 'clamp(44px, 7vw, 76px)', fontWeight: 900, lineHeight: 1.1, margin: 0, letterSpacing: '-2px' }}>
          Хуйня, написанная через<br />
          <span style={{ background: 'linear-gradient(135deg, #ff453a 30%, #ff9f0a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>НЕЙРОНКУ.</span>
        </h1>

        <p style={{ fontSize: 'clamp(16px, 3vw, 20px)', color: '#9ca3af', maxWidth: '734px', margin: 0, lineHeight: 1.5 }}>
          У нашей хуйни, пока ты читаешь этот текст, по-любому <b>УЖЕ</b> что-то отвалилось нахуй.
          Встречай <strong>Blyades Messenger</strong> — монолитный кусок говна на чистом энтузиазме без нужных знаний языков и тупости автора.
        </p>

        <div style={{ marginTop: '16px' }}>
          <button type="button">
            <Link 
              to="/auth" 
              replace 
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '12px',
                transition: 'all 0.15s ease', color: '#fff',
                cursor: 'pointer', boxShadow: '0 8px 28px rgba(0, 122, 255, 0.4)',
                padding: '18px 36px', borderRadius: '14px', fontSize: '18px', fontWeight: 'bold',
                backgroundColor: '#007aff', border: 'none', textDecoration: 'none'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.backgroundColor = '#1a85ff'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.backgroundColor = '#007aff'; }}
            >
              Ворваться в чат <ArrowRight size={20} />
            </Link>
          </button>
        </div>
      </main>

      {/* 🛠️ Сетка преимуществ (Features Grid) */}
      <section style={{ width: '100%', maxWidth: '1100px', padding: '60px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', zIndex: 10 }}>
        
        {/* Фича 1 */}
        <div style={{ backgroundColor: '#111214', border: '1px solid #1e1f22', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(0,122,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#007aff' }}>
            <Zap size={22} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Рандом</h3>
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0, lineHeight: 1.4 }}>Если ты нашёл баг, то знай, либо нейронка опять написала хуйню, либо программист еблан.</p>
        </div>

        {/* Фича 2 */}
        <div style={{ backgroundColor: '#111214', border: '1px solid #1e1f22', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(46,199,97,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2ec761' }}>
            <MessageSquare size={22} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Современный Интерфейс</h3>
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0, lineHeight: 1.4 }}>
            Не соответствует всем нормам. Визуальная часть нашего мессенджера страдает очень сильно. Исправлять не собираемся.
          </p>
        </div>

        {/* Фича 3 */}
        <div style={{ backgroundColor: '#111214', border: '1px solid #1e1f22', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(255,69,58,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff453a' }}>
            <ShieldAlert size={22} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Безопасность</h3>
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0, lineHeight: 1.4 }}>
            Отсутствует напрочь. Наша база данных хранит всё без каких либо шифров. И как нехуй вашу переписку мы можем просматривать
          </p>
        </div>

      </section>

      {/* 📝 Подвал сайта */}
      <footer style={{ width: '100%', padding: '32px 24px', textAlign: 'center', color: '#636366', fontSize: '13px', borderTop: '1px solid #1c1d21', zIndex: 10, marginTop: 'auto' }}>
        &copy; {new Date().getFullYear()} Blyades Corporation. Сделано на коленке с болью и психическими травмами. Все права не защищены, ибо нахуй нехуй.
      </footer>

      {/* ======================================================== */}
      {/* 📊 АВТОНОМНАЯ КНОПКА МОНИТОРИНГА (ВРЕМЕННО ОТКРЫТА ВСЕМ!) */}
      {/* ======================================================== */}
      <button
        type="button"
        onClick={() => setIsMonitorOpen(true)}
        style={{
          position: 'fixed', bottom: '24px', left: '24px',
          backgroundColor: '#1e1f22', border: '1px solid #2b2d31',
          borderRadius: '50%', width: '52px', height: '52px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#2ec761', cursor: 'pointer', zIndex: 99999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)', transition: 'all 0.2s ease-in-out'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.borderColor = '#007aff'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = '#2b2d31'; }}
        title="Supabase Нагрузка и Статус"
      >
        <Activity size={22} className="infra-pulse-glow" />
      </button>

      {/* ======================================================== */}
      {/* 📊 МОДAЛЬНОЕ ОКНО ТЕЛЕМЕТРИИ ПОД СЕРВЕРА SUPABASE        */}
      {/* ======================================================== */}
      {isMonitorOpen && (
        <div
          onClick={() => setIsMonitorOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#111214', width: '100%', height: '100%', 
              border: '1px solid #2b2d31', padding: '24px',
              color: '#dbdee1', boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #2b2d31', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                <Server size={18} color="#007aff" />
                <span>Supabase Live Telemetry</span>
              </div>
              <button
                onClick={checkSupabaseHealth}
                disabled={checking}
                style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer' }}
              >
                <RefreshCw size={16} style={{ animation: checking ? 'spinInfra 1s linear infinite' : 'none' }} />
              </button>
            </div>

            {/* МЕТРИКА ПИНГА БАЗЫ ДАННЫХ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#18191c', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #232428' }}>
              <div>
                <span style={{ display: 'block', fontSize: '13px', color: '#fff', fontWeight: '500' }}>Database Latency</span>
                <span style={{ fontSize: '11px', color: '#8e8e93' }}>Скорость ответа PostgreSQL</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: dbPing === null ? '#8e8e93' : dbPing === -1 ? '#ff453a' : dbPing > 300 ? '#ff9f0a' : '#2ec761' }}>
                {dbPing === null ? 'Замер...' : dbPing === -1 ? 'ERROR / TIMEOUT' : `${dbPing} ms`}
              </span>
            </div>

            {/* МЕТРИКА СТАТУСА ВЕБ-СОКЕТА В РЕАЛТАЙМЕ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#18191c', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #232428' }}>
              <div>
                <span style={{ display: 'block', fontSize: '13px', color: '#fff', fontWeight: '500' }}>Realtime Gateway</span>
                <span style={{ fontSize: '11px', color: '#8e8e93' }}>Синхронизация WebSocket каналов</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: isRealtimeConnected ? '#2ec761' : '#ff453a' }}>
                {isRealtimeConnected ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}
              </span>
            </div>

            {/* ОФИЦИАЛЬНЫЙ СТАТУС АПТАЙМА КЛAСТЕРОВ SUPABASE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', height: '63%' }}>
              <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase' }}>Global Outage Status:</span>
              <iframe 
                src="https://supabase.com" 
                title="Supabase Uptime"
                style={{ width: '100%', height: 'stretch', border: '1px solid #2b2d31', borderRadius: '8px', backgroundColor: '#fff' }} 
              />
            </div>

            <button
              onClick={() => setIsMonitorOpen(false)}
              style={{ width: '100%', backgroundColor: '#1e1f22', border: '1px solid #2b2d31', color: '#fff', borderRadius: '8px', padding: '10px', marginTop: '16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              Закрыть телеметрию
            </button>
          </div>
        </div>
      )}

      {/* Локальные css-анимации */}
      <style>{`
        .blink-anim { animation: blinker 1.5s linear infinite; }
        @keyframes blinker { 50% { opacity: 0; } }
        
        .infra-pulse-glow { animation: pulseGlow 2s infinite; }
        @keyframes pulseGlow {
          0% { filter: drop-shadow(0 0 0px rgba(46, 199, 97, 0)); }
          50% { filter: drop-shadow(0 0 6px rgba(46, 199, 97, 0.6)); }
          100% { filter: drop-shadow(0 0 0px rgba(46, 199, 97, 0)); }
        }

        @keyframes spinInfra {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
