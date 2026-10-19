export function renderUserStatusBadge(userObj: any) {
  const config = ( {
    administrator: { title: 'Разработчик', icon: '🛠️' },
    moderator:     { title: 'Модератор',     icon: '🪖' },
    test:          { title: 'Тестовый аккаунт',  icon: '🧱' },
  } as Record<string, any> )[userObj?.userStatus]; 

  if (!config) return null; 

  return <span title={config.title} style={{ cursor: 'help', userSelect: 'none' }}>{config.icon}</span>;
}