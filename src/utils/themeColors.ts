// ============================================================================
// ТЕМЫ ОФОРМЛЕНИЯ ПРОФИЛЯ (8 однотонных + 8 градиентных к аватарке)
// ============================================================================
export interface ProfileTheme {
  id: string;
  name: string;
  type: 'solid' | 'gradient';
  circleColor: string | [string, string];
  background: string;
  avatarRingColor?: string;
  sidebarColors?: [string, string];
}

export const PROFILE_THEMES: ProfileTheme[] = [
  // ---------------- ВЕРХНИЙ РЯД: ОДНОТОННЫЕ ЦВЕТА ----------------
  {
    id: 'solid-red',
    name: 'Красный',
    type: 'solid',
    circleColor: '#ba4c47',
    background: '#9c4540',
    avatarRingColor: '#fc8252',
    sidebarColors: ['#ba4c47', '#732622']
  },
  {
    id: 'solid-orange',
    name: 'Оранжевый',
    type: 'solid',
    circleColor: '#c36f24',
    background: '#945e2c',
    avatarRingColor: '#f9c75b',
    sidebarColors: ['#c36f24', '#6e3810']
  },
  {
    id: 'solid-purple',
    name: 'Фиолетовый',
    type: 'solid',
    circleColor: '#8957ca',
    background: '#715099',
    avatarRingColor: '#e894e8',
    sidebarColors: ['#8957ca', '#4e2a7e']
  },
  {
    id: 'solid-green',
    name: 'Зелёный',
    type: 'solid',
    circleColor: '#3c9c22',
    background: '#33713b',
    avatarRingColor: '#a6cd6d',
    sidebarColors: ['#3c9c22', '#1f5513']
  },
  {
    id: 'solid-cyan',
    name: 'Бирюзовый',
    type: 'solid',
    circleColor: '#37a5b1',
    background: '#387e87',
    avatarRingColor: '#35f9d5',
    sidebarColors: ['#37a5b1', '#1e5d65']
  },
  {
    id: 'solid-blue',
    name: 'Синий',
    type: 'solid',
    circleColor: '#3380c1',
    background: '#477194',
    avatarRingColor: '#77f4fe',
    sidebarColors: ['#3380c1', '#1f486e']
  },
  {
    id: 'solid-pink',
    name: 'Розовый',
    type: 'solid',
    circleColor: '#b64c82',
    background: '#944763',
    avatarRingColor: '#ff9381',
    sidebarColors: ['#b64c82', '#6b254a']
  },
  {
    id: 'solid-steel',
    name: 'Стальной',
    type: 'solid',
    circleColor: '#798896',
    background: '#435261',
    avatarRingColor: '#aabbce',
    sidebarColors: ['#798896', '#3f4953']
  },

  // ---------------- НИЖНИЙ РЯД: ГРАДИЕНТЫ К АВАТАРКЕ ----------------
  {
    id: 'grad-red',
    name: 'Коралловый градиент',
    type: 'gradient',
    circleColor: ['#c9565d', '#fb9167'],
    background: 'radial-gradient(circle at 50% 36%, #a24d41 0%, #85322e 75%, #85322e 100%)',
    avatarRingColor: '#ff8678',
    sidebarColors: ['#945e2c', '#1d1612']
  },
  {
    id: 'grad-orange',
    name: 'Янтарный градиент',
    type: 'gradient',
    circleColor: ['#cf7244', '#e8a93d'],
    background: 'radial-gradient(circle at 50% 36%, #b87536 0%, #8a4c14 75%, #8a4c14 100%)',
    avatarRingColor: '#ffaa5b',
    sidebarColors: ['#fb9167', '#85322e']
  },
  {
    id: 'grad-purple',
    name: 'Неоновый градиент',
    type: 'gradient',
    circleColor: ['#9662d4', '#e87de4'],
    background: 'radial-gradient(circle at 50% 36%, #794b99 0%, #583688 75%, #583688 100%)',
    avatarRingColor: '#e580f4',
    sidebarColors: ['#e87de4', '#583688']
  },
  {
    id: 'grad-green',
    name: 'Изумрудный градиент',
    type: 'gradient',
    circleColor: ['#3d9755', '#a6cf57'],
    background: 'radial-gradient(circle at 50% 36%, #488648 0%, #296a43 75%, #296a43 100%)',
    avatarRingColor: '#75f750',
    sidebarColors: ['#a6cf57', '#296a43']
  },
  {
    id: 'grad-cyan',
    name: 'Морской градиент',
    type: 'gradient',
    circleColor: ['#3997c0', '#79ddc5'],
    background: 'radial-gradient(circle at 50% 36%, #409490 0%, #306c7c 75%, #306c7c 100%)',
    avatarRingColor: '#58ecff',
    sidebarColors: ['#79ddc5', '#306c7c']
  },
  {
    id: 'grad-blue',
    name: 'Лазурный градиент',
    type: 'gradient',
    circleColor: ['#4e8fcc', '#72d5ed'],
    background: 'radial-gradient(circle at 50% 36%, #4585a3 0%, #38618c 75%, #38618c 100%)',
    avatarRingColor: '#67c6ff',
    sidebarColors: ['#72d5ed', '#38618c']
  },
  {
    id: 'grad-pink',
    name: 'Малиновый градиент',
    type: 'gradient',
    circleColor: ['#c45082', '#f18c96'],
    background: 'radial-gradient(circle at 50% 36%, #97495d 0%, #884160 75%, #884160 100%)',
    avatarRingColor: '#ff77bb',
    sidebarColors: ['#f18c96', '#884160']
  },
  {
    id: 'grad-steel',
    name: 'Дымчатый градиент',
    type: 'gradient',
    circleColor: ['#6c7884', '#adb7c1'],
    background: 'radial-gradient(circle at 50% 36%, #465361 0%, #53606e 75%, #53606e 100%)',
    avatarRingColor: '#c5d8ea',
    sidebarColors: ['#adb7c1', '#465361']
  }
];

export const DEFAULT_PROFILE_COLOR = '#312b3a';

// ============================================================================
// СПЕЦИАЛЬНЫЕ ТЕМЫ ДЛЯ ТЕСТОВЫХ АККАУНТОВ (id === 'test')
// ============================================================================
export const TEST_PROFILE_THEME: ProfileTheme = {
  id: 'test',
  name: 'Тестовый аккаунт',
  type: 'gradient',
  circleColor: ['#000000', '#380858'],
  background: 'radial-gradient(circle at 50% 36%, #7e0000 0%, #220000 75%, #160000 100%)',
  avatarRingColor: '#170724',
  sidebarColors: ['#f70505', '#640909']
};

export function getProfileTheme(idOrHex?: string | null): ProfileTheme {
  if (!idOrHex) return PROFILE_THEMES[2];

  if (idOrHex.toLowerCase() === 'test') {
    return TEST_PROFILE_THEME;
  }

  const found = PROFILE_THEMES.find(
    t => t.id.toLowerCase() === idOrHex.toLowerCase() || 
         (typeof t.circleColor === 'string' && t.circleColor.toLowerCase() === idOrHex.toLowerCase())
  );
  if (found) return found;

  return {
    id: idOrHex,
    name: 'Пользовательский',
    type: 'solid',
    circleColor: idOrHex,
    background: idOrHex,
    avatarRingColor: idOrHex
  };
}

export function getProfileGradient(idOrHex?: string | null): string {
  return getProfileTheme(idOrHex).background;
}

/**
 * 🎯 Формула генерации фона шапки NavSidebar:
 * 1. Радиальное световое пятно со смещением на центр аватарки (circle at 48px 48px).
 * 2. Мягкое вертикальное затухание вниз в прозрачность (или цвет сайдбара), без резких стыков.
 */
export function getSidebarHeaderGradient(themeOrIdOrHex?: string | ProfileTheme | null): string {
  const theme = typeof themeOrIdOrHex === 'object' && themeOrIdOrHex !== null
    ? themeOrIdOrHex
    : getProfileTheme(themeOrIdOrHex);

  // Извлекаем цвета: либо заданный массив sidebarColors, либо circleColor, либо fallback
  let topGlow = '#8957ca';
  let midTone = '#583688';

  if (theme.sidebarColors) {
    [topGlow, midTone] = theme.sidebarColors;
  } else if (Array.isArray(theme.circleColor)) {
    [topGlow, midTone] = theme.circleColor;
  } else if (typeof theme.circleColor === 'string') {
    topGlow = theme.circleColor;
    midTone = theme.background.startsWith('#') ? theme.background : theme.circleColor;
  }

  // Сама формула (двухслойный градиент с фокусом на аватарке 48px 48px и затуханием в 0 к низу)
  return `
    linear-gradient(180deg, #13131700 0%, #13131773 60%, #171821 100%),
    radial-gradient(circle at 48px 48px, ${topGlow}ee 0%, ${midTone}aa 45%, #13131700 80%)
  `.replace(/\s+/g, ' ').trim();
}

// ============================================================================
// ПАЛИТРА ДЛЯ ИМЕНИ (3 РЯДА В СТИЛЕ TELEGRAM)
// ============================================================================
export interface NameTheme {
  id: string;
  name: string;
  nameColor: string;
  circleColor: string | [string, string];
  hasCenterBadge?: boolean;
  stripeBackground: string;
  row: 1 | 2 | 3;
}

export const NAME_THEMES: NameTheme[] = [
  // ---------------- РЯД 1: ОДНОТОННЫЕ ЦВЕТА ----------------
  {
    id: '#5eaddf',
    name: 'Синий',
    nameColor: '#5eaddf',
    circleColor: '#5eaddf',
    stripeBackground: '#5eaddf',
    row: 1
  },
  {
    id: '#7aca7c',
    name: 'Зелёный',
    nameColor: '#7aca7c',
    circleColor: '#7aca7c',
    stripeBackground: '#7aca7c',
    row: 1
  },
  {
    id: '#e49553',
    name: 'Оранжевый',
    nameColor: '#e49553',
    circleColor: '#e49553',
    stripeBackground: '#e49553',
    row: 1
  },
  {
    id: '#e45a63',
    name: 'Красный',
    nameColor: '#e45a63',
    circleColor: '#e45a63',
    stripeBackground: '#e45a63',
    row: 1
  },
  {
    id: '#5bc1d1',
    name: 'Бирюзовый',
    nameColor: '#5bc1d1',
    circleColor: '#5bc1d1',
    stripeBackground: '#5bc1d1',
    row: 1
  },
  {
    id: '#e8508a',
    name: 'Малиновый',
    nameColor: '#e8508a',
    circleColor: '#e8508a',
    stripeBackground: '#e8508a',
    row: 1
  },
  {
    id: '#a580de',
    name: 'Фиолетовый',
    nameColor: '#a580de',
    circleColor: '#a580de',
    stripeBackground: '#a580de',
    row: 1
  },

  // ---------------- РЯД 2: ШТРИХОВАННАЯ ЗЕБРА (PATTERN) ----------------
  {
    id: 'stripe-blue',
    name: 'Лазурный штрих',
    nameColor: '#4ea5de',
    circleColor: ['#56b4f4', '#1f6db3'],
    stripeBackground: 'repeating-linear-gradient(-45deg, #56b4f4, #56b4f4 4px, #1f6db3 4px, #1f6db3 8px)',
    row: 2
  },
  {
    id: 'stripe-green',
    name: 'Травяной штрих',
    nameColor: '#72c74d',
    circleColor: ['#86dd5a', '#2d841f'],
    stripeBackground: 'repeating-linear-gradient(-45deg, #86dd5a, #86dd5a 4px, #2d841f 4px, #2d841f 8px)',
    row: 2
  },
  {
    id: 'stripe-orange',
    name: 'Огненный штрих',
    nameColor: '#e6903f',
    circleColor: ['#f4a84d', '#b05315'],
    stripeBackground: 'repeating-linear-gradient(-45deg, #f4a84d, #f4a84d 4px, #b05315 4px, #b05315 8px)',
    row: 2
  },
  {
    id: 'stripe-red',
    name: 'Бордовый штрих',
    nameColor: '#e5645a',
    circleColor: ['#f17d74', '#9e2d27'],
    stripeBackground: 'repeating-linear-gradient(-45deg, #f17d74, #f17d74 4px, #9e2d27 4px, #9e2d27 8px)',
    row: 2
  },
  {
    id: 'stripe-cyan',
    name: 'Морской штрих',
    nameColor: '#4dc2c4',
    circleColor: ['#5de0e2', '#1f7b88'],
    stripeBackground: 'repeating-linear-gradient(-45deg, #5de0e2, #5de0e2 4px, #1f7b88 4px, #1f7b88 8px)',
    row: 2
  },
  {
    id: 'stripe-pink',
    name: 'Ягодный штрих',
    nameColor: '#e2598f',
    circleColor: ['#f876a9', '#932753'],
    stripeBackground: 'repeating-linear-gradient(-45deg, #f876a9, #f876a9 4px, #932753 4px, #932753 8px)',
    row: 2
  },
  {
    id: 'stripe-purple',
    name: 'Аметистовый штрих',
    nameColor: '#9d76e4',
    circleColor: ['#af8cf7', '#5f3ba8'],
    stripeBackground: 'repeating-linear-gradient(-45deg, #af8cf7, #af8cf7 4px, #5f3ba8 4px, #5f3ba8 8px)',
    row: 2
  },

  // ---------------- РЯД 3: КОНТРАСТНЫЙ ДВУХЦВЕТНЫЙ / BARBERSHOP ----------------
  {
    id: 'barber-blue-red',
    name: 'Леденец красно-синий',
    nameColor: '#499fe4',
    circleColor: ['#3e99e4', '#e2434b'],
    hasCenterBadge: true,
    stripeBackground: 'repeating-linear-gradient(-45deg, #3e99e4, #3e99e4 5px, #ffffff 5px, #ffffff 7px, #e2434b 7px, #e2434b 12px, #ffffff 12px, #ffffff 14px)',
    row: 3
  },
  {
    id: 'barber-lime-red',
    name: 'Арбузный микс',
    nameColor: '#53be46',
    circleColor: ['#65d053', '#db3f49'],
    hasCenterBadge: true,
    stripeBackground: 'repeating-linear-gradient(-45deg, #65d053, #65d053 5px, #ffffff 5px, #ffffff 7px, #db3f49 7px, #db3f49 12px, #ffffff 12px, #ffffff 14px)',
    row: 3
  },
  {
    id: 'barber-orange-green',
    name: 'Мандарин и лайм',
    nameColor: '#e78c38',
    circleColor: ['#f29b43', '#40a93b'],
    hasCenterBadge: true,
    stripeBackground: 'repeating-linear-gradient(-45deg, #f29b43, #f29b43 5px, #ffffff 5px, #ffffff 7px, #40a93b 7px, #40a93b 12px, #ffffff 12px, #ffffff 14px)',
    row: 3
  },
  {
    id: 'barber-cyan-forest',
    name: 'Океан и хвоя',
    nameColor: '#36c0ce',
    circleColor: ['#3ecce0', '#257f43'],
    hasCenterBadge: true,
    stripeBackground: 'repeating-linear-gradient(-45deg, #3ecce0, #3ecce0 5px, #ffffff 5px, #ffffff 7px, #257f43 7px, #257f43 12px, #ffffff 12px, #ffffff 14px)',
    row: 3
  },
  {
    id: 'barber-cyan-orange',
    name: 'Бирюза и коралл',
    nameColor: '#40c4e0',
    circleColor: ['#4ecfe8', '#f38947'],
    hasCenterBadge: true,
    stripeBackground: 'repeating-linear-gradient(-45deg, #4ecfe8, #4ecfe8 5px, #f38947 5px, #f38947 10px)',
    row: 3
  },
  {
    id: 'barber-sky-gold',
    name: 'Небо и золото',
    nameColor: '#3ea2e7',
    circleColor: ['#4bb2f5', '#e9941a'],
    hasCenterBadge: true,
    stripeBackground: 'repeating-linear-gradient(-45deg, #4bb2f5, #4bb2f5 5px, #e9941a 5px, #e9941a 10px)',
    row: 3
  },
  {
    id: 'barber-violet-amber',
    name: 'Фиолетовый янтарь',
    nameColor: '#9676e2',
    circleColor: ['#a98cf2', '#e67c29'],
    hasCenterBadge: true,
    stripeBackground: 'repeating-linear-gradient(-45deg, #a98cf2, #a98cf2 5px, #e67c29 5px, #e67c29 10px)',
    row: 3
  }
];

export const DEFAULT_NAME_THEME = NAME_THEMES[0];

export const TEST_NAME_THEME: NameTheme = {
  id: 'test',
  name: 'Тестовый аккаунт',
  nameColor: '#ff0000', // Задаём контрастный фиолетовый оттенок, чтобы текст читался на тёмном фоне
  circleColor: ['#000000', '#1a0429'],
  hasCenterBadge: true,
  stripeBackground: 'repeating-linear-gradient(-45deg, #531980, #531980 4px, #000000 4px, #000000 8px)',
  row: 2
};

export function getNameTheme(idOrHex?: string | null): NameTheme {
  if (!idOrHex) return DEFAULT_NAME_THEME;

  if (idOrHex.toLowerCase() === 'test') {
    return TEST_NAME_THEME;
  }

  const found = NAME_THEMES.find(
    t => t.id.toLowerCase() === idOrHex.toLowerCase() || 
         t.nameColor.toLowerCase() === idOrHex.toLowerCase()
  );
  if (found) return found;

  return {
    id: idOrHex,
    name: 'Пользовательский',
    nameColor: idOrHex,
    circleColor: idOrHex,
    stripeBackground: idOrHex,
    row: 1
  };
}

// ---------------- СОВМЕСТИМОСТЬ ДЛЯ ДРУГИХ ФАЙЛОВ ----------------
export const PROFILE_COLOR_PALETTE = PROFILE_THEMES.map(t => ({
  hex: typeof t.circleColor === 'string' ? t.circleColor : t.circleColor[0],
  name: t.name,
  gradient: t.background
}));

export const NAME_COLOR_PALETTE = NAME_THEMES.map(t => t.nameColor);











// Цвета только первого ряда (7 базовых)
export const FIRST_ROW_NAME_COLORS = NAME_THEMES.filter(t => t.row === 1);

/**
 * Случайный выбор цвета из 1-го ряда (для формы регистрации / создания аккаунта)
 */
export function getRandomDefaultNameColor(): string {
  const index = Math.floor(Math.random() * FIRST_ROW_NAME_COLORS.length);
  return FIRST_ROW_NAME_COLORS[index].nameColor;
}

/**
 * Детерминированный выбор по ID / UUID (как в Telegram: userId % 7).
 */
export function getDefaultNameColorForUser(idOrUuid?: string | number | null): string {
  if (!idOrUuid) return FIRST_ROW_NAME_COLORS[0].nameColor;

  if (typeof idOrUuid === 'number') {
    return FIRST_ROW_NAME_COLORS[Math.abs(idOrUuid) % FIRST_ROW_NAME_COLORS.length].nameColor;
  }

  let hash = 0;
  for (let i = 0; i < idOrUuid.length; i++) {
    hash = (hash << 5) - hash + idOrUuid.charCodeAt(i);
    hash |= 0;
  }
  return FIRST_ROW_NAME_COLORS[Math.abs(hash) % FIRST_ROW_NAME_COLORS.length].nameColor;
}

/**
 * Извлекает настоящий HEX-цвет для текста имени по ID или HEX из базы.
 */
export function getNameColor(idOrHex?: string | null): string {
  if (!idOrHex) return DEFAULT_NAME_THEME.nameColor;
  return getNameTheme(idOrHex).nameColor;
}

/**
 * Извлекает базовый HEX-цвет профиля (для индикаторов, точек и кружков).
 */
export function getProfileColor(idOrHex?: string | null): string {
  if (!idOrHex) return DEFAULT_PROFILE_COLOR;
  const theme = getProfileTheme(idOrHex);
  return Array.isArray(theme.circleColor) ? theme.circleColor[0] : theme.circleColor;
}

/**
 * Универсальное извлечение цветов оформления из пользователя или чата (из JSONB appearance с фолбэком)
 */
export function resolveAppearance(entity: any) {
  const app = entity?.appearance || {};
  return {
    avatarColor: app.avatarColor || entity?.avatarColor || '#5865F2',
    nameColor: app.nameColor || entity?.nameColor || DEFAULT_NAME_THEME.nameColor,
    profileColor: app.profileColor || entity?.profileColor || DEFAULT_PROFILE_COLOR,
  };
}