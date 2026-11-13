import React from 'react';

export function renderMessageWithLinks(
  text: string, 
  onTagClick?: (tag: string) => void
): React.ReactNode[] {
  if (!text) return [text];

  // Регулярное выражение для поиска URL и тегов @username
  const regex = /(https?:\/\/[^\s]+|@[a-zA-Z0-9_]+)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Проверяем, ссылка ли это
    if (part.match(/^https?:\/\//)) {
      return (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#5eaddf', textDecoration: 'underline', wordBreak: 'break-all' }}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }

    // Проверяем, тег ли это (@username)
    if (part.match(/^@[a-zA-Z0-9_]+/)) {
      const tagValue = part.slice(1); // убираем символ '@'
      return (
        <span 
          key={index}
          style={{ color: '#5eaddf', cursor: 'pointer', fontWeight: 500 }}
          onClick={(e) => {
            e.stopPropagation();
            if (onTagClick) onTagClick(tagValue);
          }}
          title={`Открыть @${tagValue}`}
        >
          {part}
        </span>
      );
    }

    // Обычный текст
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}