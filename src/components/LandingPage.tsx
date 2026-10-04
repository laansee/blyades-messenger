import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { MessageSquare, ShieldAlert, Zap, Radio, ArrowRight, 
  // Github 
} from 'lucide-react';

export default function LandingPage() {

  useEffect(() => {
    document.title = "Blyades Messenger"
  }, []);

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
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1, justifyContent: 'center', padding: '40px 24px', zIndex: 10, maxWidth: '800px', gap: '24px' }}>
        
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e1f22', border: '1px solid #2b2d31', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', color: '#2ec761', fontWeight: 600 }}>
          <Radio size={14} className="blink-anim" /> Релиз версии v1.48.8
        </div>

        <h1 style={{ fontSize: 'clamp(44px, 7vw, 76px)', fontWeight: 900, lineHeight: 1.1, margin: 0, letterSpacing: '-2px' }}>
          Хуйня, написанная через<br />
          <span style={{ background: 'linear-gradient(135deg, #ff453a 30%, #ff9f0a 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>НЕЙРОНКУ.</span>
        </h1>

        <p style={{ fontSize: 'clamp(16px, 3vw, 20px)', color: '#9ca3af', maxWidth: '640px', margin: 0, lineHeight: 1.5 }}>
          У нашей хуйни, пока ты читаешь этот текст, по-любому <b>УЖЕ</b> что-то отвалилось нахуй.
          Встречай <strong>Blyades Messenger</strong> — монолитный кусок говна на чистом энтузиазме без знаний нужных знаний языков и тупости автора.
        </p>

        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '12px',
              backgroundColor: '#007aff', color: '#fff', border: 'none',
              padding: '18px 36px', borderRadius: '14px', fontSize: '18px', fontWeight: 'bold',
              cursor: 'pointer', boxShadow: '0 8px 28px rgba(0, 122, 255, 0.4)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.backgroundColor = '#1a85ff'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.backgroundColor = '#007aff'; }}
          >
            <Link 
              to="/auth" 
              replace 
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '12px',
                transition: 'all 0.15s ease'
              }}
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
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0, lineHeight: 1.4 }}>Если ты нашёл баг, то знай, либо найронка опять написала хуйню, либо программист еблан.</p>
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

      {/* Локальные css-анимации */}
      <style>{`
        .blink-anim { animation: blinker 1.5s linear infinite; }
        @keyframes blinker { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
