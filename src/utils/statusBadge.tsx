import React from 'react';
import type { UserStatusType } from '../services/userService';

interface StatusBadgeProps {
  userStatus?: UserStatusType | null;
  className?: string;
}

// 🚀 Выносим конфиг наружу — создаётся 1 раз при старте приложения
const STATUS_CONFIG: Record<string, { title: string; icon: string }> = {
  administrator: { title: 'Разработчик', icon: '🛠️' },
  moderator:     { title: 'Модератор',     icon: '🪖' },
  test:          { title: 'Тестовый аккаунт',  icon: '🧱' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ userStatus, className }) => {
  if (!userStatus) return null;
  const config = STATUS_CONFIG[userStatus];
  if (!config) return null;

  return (
    <span
      className={className}
      title={config.title}
      style={{ cursor: 'help', userSelect: 'none', marginRight: '4px', display: 'inline-flex', verticalAlign: 'middle' }}
    >
      {config.icon}
    </span>
  );
};

// Оставляем хелпер для старых вызовов renderUserStatusBadge(user)
export function renderUserStatusBadge(userObj: { userStatus?: UserStatusType | null } | null | undefined) {
  if (!userObj?.userStatus) return null;
  return <StatusBadge userStatus={userObj.userStatus} />;
}