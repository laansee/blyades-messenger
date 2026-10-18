import React from 'react';
import useMessengerContext from '../context/messengerContext';

const TESTER_LOGINS = ['qwe', 'mmd', 'test', 'zxczxc'];
const DEVELOPER_LOGINS = ['laansee', 'lonbloods'];

// 🚀 ХЕЛПЕР ЗНАЧКОВ СТАТУСА С ВСПЛЫВАЮЩИМИ ПОДСКАЗКАМИ
export function renderUserStatusBadge(userObj: any) {
  const ctx = useMessengerContext();
  if (!userObj) return null;

  const userLogin = String(userObj.uniqueId || userObj.unique_id || '').trim().toLowerCase();

  const adminBadge = <span title="Разработчик" style={{ marginRight: '6px', cursor: 'help', userSelect: 'none' }}>🛠️</span>;
  const moderBadge = <span title="Модер" style={{ marginRight: '6px', cursor: 'help', userSelect: 'none' }}>🪖</span>;
  const testBadge = <span title="Тестовый аккаунт" style={{ marginRight: '6px', cursor: 'help', userSelect: 'none' }}>🔧</span>;

  // 1. Проверяем твой тестовый аккаунт (по логину qwe или уникальному ID)
  if (ctx.currentUser?.userStatus === 'test') {
    return (
      <span 
        title="Тестовый аккаунт" 
        style={{ marginRight: '6px', cursor: 'help', userSelect: 'none' }}
      >
        🔧
      </span>
    );
  }

  // 2. Проверяем Администратора или Разработчика (по флагу или роли)
  if (DEVELOPER_LOGINS.includes(userLogin) || userObj.isAdmin || userObj.role === 'developer') {
    return (
      <span 
        title="Разработчик" 
        style={{ marginRight: '6px', cursor: 'help', userSelect: 'none' }}
      >
        🛠️
      </span>
    );
  }

  return null;
}
