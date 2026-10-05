import React from 'react';

const TESTER_LOGINS = ['qwe', 'mmd', 'test', 'zxczxc'];
const DEVELOPER_LOGINS = ['laansee', 'lonbloods'];

// 🚀 ХЕЛПЕР ЗНАЧКОВ СТАТУСА С ВСПЛЫВАЮЩИМИ ПОДСКАЗКАМИ
export function renderUserStatusBadge(userObj: any) {
  if (!userObj) return null;

  const userLogin = String(userObj.uniqueId || userObj.unique_id || '').trim().toLowerCase();

  // 1. Проверяем твой тестовый аккаунт (по логину qwe или уникальному ID)
  if (TESTER_LOGINS.includes(userLogin) || userObj.isTester) {
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
