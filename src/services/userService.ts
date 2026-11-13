import { supabase } from './supabaseClient';

export type PrivacyType = 'all' | 'contacts' | 'none';
export type NameFormatType = 'username' | 'full_name';
export type UserStatusType = 'default' | 'moderator' | 'administrator' | 'test' | string;

export interface UserStatusBadgeInfo {
  title: string;
  icon: string;
}

export const USER_STATUS_BADGES: Record<string, UserStatusBadgeInfo> = {
  administrator: { title: 'Разработчик', icon: '🛠️' },
  moderator: { title: 'Модератор', icon: '🪖' },
  test: { title: 'Тестовый аккаунт', icon: '🧱' },
};

export function getUserStatusBadge(
  userOrStatus: Partial<AppUser> | UserStatusType | null | undefined
): UserStatusBadgeInfo | null {
  if (!userOrStatus) return null;
  const status = typeof userOrStatus === 'string' ? userOrStatus : userOrStatus.userStatus;
  if (!status || status === 'default') return null;
  return USER_STATUS_BADGES[status] || null;
}

export interface UserPrivacySettings {
  phone: PrivacyType;
  email: PrivacyType;
  online: PrivacyType;
  fullName: PrivacyType;
  privacyNameFormat: NameFormatType;
  search: PrivacyType;
}

export interface UserAppearance {
  avatarColor?: string;
  nameColor?: string;
  profileColor?: string;
}

export const DEFAULT_USER_PRIVACY: UserPrivacySettings = {
  phone: 'all',
  email: 'all',
  online: 'all',
  fullName: 'all',
  privacyNameFormat: 'username',
  search: 'all',
};

export const DEFAULT_USER_APPEARANCE: Required<UserAppearance> = {
  avatarColor: '#5865F2',
  nameColor: '#5eaddf',
  profileColor: '#312b3a',
};

export interface AppUser {
  uuid: string;
  id: number | null;
  publicId: string | null;
  /** @deprecated Используйте publicId */
  uniqueId?: string | null;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  aboutMe: string | null;

  appearance: UserAppearance;
  avatarColor: string;
  nameColor: string;
  profileColor: string;

  privacy: UserPrivacySettings;
  privacyPhone?: PrivacyType;
  privacyEmail?: PrivacyType;
  privacyOnline?: PrivacyType;
  privacyNameFormat?: NameFormatType;
  privacyFullName?: PrivacyType;
  privacySearch?: PrivacyType;

  userStatus: UserStatusType;
  statusBadge: UserStatusBadgeInfo | null;
  bannedAt: string | null;
  isBanned: boolean;
  isConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserContactContext {
  firstName?: string | null;
  lastName?: string | null;
  note?: string | null;
  isContact?: boolean;
}

export interface ResolveNameOptions {
  viewerType?: 'contact' | 'stranger';
  contact?: UserContactContext | null;
  isAmHisContact?: boolean;
}

export function getUserPrivacy(user: Partial<AppUser> | null | undefined): UserPrivacySettings {
  const p = (user?.privacy || {}) as any;
  return {
    phone: p.phone || p.privacyPhone || user?.privacyPhone || DEFAULT_USER_PRIVACY.phone,
    email: p.email || user?.privacyEmail || DEFAULT_USER_PRIVACY.email,
    online: p.online || user?.privacyOnline || DEFAULT_USER_PRIVACY.online,
    fullName: p.fullName || user?.privacyFullName || DEFAULT_USER_PRIVACY.fullName,
    privacyNameFormat: p.privacyNameFormat || user?.privacyNameFormat || DEFAULT_USER_PRIVACY.privacyNameFormat,
    search: p.search || user?.privacySearch || DEFAULT_USER_PRIVACY.search,
  };
}

/**
 * Единый нормализатор записи пользователя из Supabase в структуру AppUser
 */
export function normalizeUser(raw: any): AppUser {
  const rawAppearance = (raw?.appearance || {}) as UserAppearance;
  const avatarColor = rawAppearance.avatarColor || raw?.avatarColor || DEFAULT_USER_APPEARANCE.avatarColor;
  const nameColor = rawAppearance.nameColor || raw?.nameColor || DEFAULT_USER_APPEARANCE.nameColor;
  const profileColor = rawAppearance.profileColor || raw?.profileColor || DEFAULT_USER_APPEARANCE.profileColor;

  const privacy = getUserPrivacy(raw);
  const publicId = raw?.publicId ?? raw?.uniqueId ?? null;
  const bannedAt = raw?.bannedAt ?? null;

  return {
    ...raw,
    uuid: String(raw?.uuid || ''),
    id: raw?.id != null ? Number(raw.id) : null,
    publicId,
    uniqueId: publicId,
    username: raw?.username || 'Пользователь',
    firstName: raw?.firstName ?? null,
    lastName: raw?.lastName ?? null,
    email: raw?.email ?? null,
    phone: raw?.phone ?? null,
    avatarUrl: raw?.avatarUrl ?? null,
    aboutMe: raw?.aboutMe ?? null,

    appearance: {
      avatarColor,
      nameColor,
      profileColor,
    },
    avatarColor,
    nameColor,
    profileColor,

    privacy,
    privacyPhone: privacy.phone,
    privacyEmail: privacy.email,
    privacyOnline: privacy.online,
    privacyNameFormat: privacy.privacyNameFormat,
    privacyFullName: privacy.fullName,
    privacySearch: privacy.search,

    userStatus: raw?.userStatus || 'default',
    statusBadge: getUserStatusBadge(raw?.userStatus),
    bannedAt,
    isBanned: Boolean(bannedAt),
    isConfirmed: Boolean(raw?.isConfirmed),
    createdAt: raw?.createdAt || '',
    updatedAt: raw?.updatedAt || '',
  };
}

export const userService = {
  normalizeUser,

  /**
   * Получить пользователя по UUID
   */
  async getUserByUuid(uuid: string): Promise<AppUser | null> {
    const cleanUuid = String(uuid || '').trim();
    if (!cleanUuid || cleanUuid === 'null' || cleanUuid === 'undefined') return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uuid', cleanUuid)
      .maybeSingle();

    if (error) {
      console.error(`[userService.getUserByUuid] Ошибка для ${cleanUuid}:`, error.message);
      return null;
    }
    return data ? normalizeUser(data) : null;
  },

  /**
   * Получить пользователя по UUID, числовому id (int8) или публичному тегу (publicId)
   */
  async getUserByIdentifier(identifier: string | number): Promise<AppUser | null> {
    const str = String(identifier || '').replace(/^@/, '').trim();
    if (!str) return null;

    if (str.includes('-')) {
      return this.getUserByUuid(str);
    }

    const isNumeric = !isNaN(Number(str));
    const query = supabase.from('users').select('*');

    const { data, error } = isNumeric
      ? await query.eq('id', Number(str)).maybeSingle()
      : await query.eq('publicId', str.toLowerCase()).maybeSingle();

    if (error) {
      console.error(`[userService.getUserByIdentifier] Ошибка для ${str}:`, error.message);
      return null;
    }
    return data ? normalizeUser(data) : null;
  },

  /**
   * Пакетная загрузка пользователей по списку UUID
   */
  async getUsersByUuids(uuids: string[]): Promise<AppUser[]> {
    if (!uuids || uuids.length === 0) return [];

    const cleanUuids = Array.from(
      new Set(
        uuids
          .map(u => String(u || '').trim())
          .filter(u => u && u.includes('-'))
      )
    );

    if (cleanUuids.length === 0) return [];

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('uuid', cleanUuids);

    if (error) {
      console.error('[userService.getUsersByUuids] Ошибка загрузки:', error.message);
      return [];
    }

    return (data || []).map(normalizeUser);
  },

  /**
   * Поиск пользователей по имени / публичному тегу с учётом privacySearch и бана
   */
  async searchUsers(queryText: string, currentUuid?: string): Promise<AppUser[]> {
    const sanitizedQuery = queryText.replace(/^@/, '').replace(/[,()]/g, '').trim().toLowerCase();
    if (!sanitizedQuery) return [];

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.ilike.%${sanitizedQuery}%,publicId.ilike.%${sanitizedQuery}%,firstName.ilike.%${sanitizedQuery}%,lastName.ilike.%${sanitizedQuery}%`)
      .is('bannedAt', null)
      .limit(30);

    if (error) {
      console.error('[userService.searchUsers] Ошибка поиска:', error.message);
      return [];
    }

    return (data || [])
      .map(normalizeUser)
      .filter(u => {
        if (currentUuid && u.uuid === currentUuid) return false;
        return getUserPrivacy(u).search !== 'none';
      });
  },

  /**
   * Имя, которое видит НЕЗНАКОМЕЦ
   */
  getDisplayNameAsStranger(user: Partial<AppUser> | null | undefined): string {
    if (!user) return 'Пользователь';

    const privacy = getUserPrivacy(user);
    const userFirst = user.firstName ? user.firstName.trim() : '';
    const userLast = user.lastName ? user.lastName.trim() : '';
    const userFullName = `${userFirst} ${userLast}`.trim();

    const canStrangerSeeFullName =
      privacy.privacyNameFormat === 'full_name' &&
      privacy.fullName === 'all';

    if (canStrangerSeeFullName && userFullName) {
      return userFullName;
    }

    return user.username?.trim() || user.publicId?.trim() || user.uniqueId?.trim() || 'Пользователь';
  },

  /**
   * Имя, которое видит КОНТАКТ
   */
  getDisplayNameAsContact(
    user: Partial<AppUser> | null | undefined,
    contact?: UserContactContext | null
  ): string {
    if (!user) return 'Пользователь';

    const contactFirst = contact?.firstName && contact.firstName !== 'EMPTY' ? contact.firstName.trim() : '';
    const contactLast = contact?.lastName && contact.lastName !== 'EMPTY' ? contact.lastName.trim() : '';
    const contactFullName = `${contactFirst} ${contactLast}`.trim();

    if (contactFullName) return contactFullName;

    const privacy = getUserPrivacy(user);
    const userFirst = user.firstName ? user.firstName.trim() : '';
    const userLast = user.lastName ? user.lastName.trim() : '';
    const userFullName = `${userFirst} ${userLast}`.trim();

    const canContactSeeFullName =
      privacy.privacyNameFormat === 'full_name' &&
      privacy.fullName !== 'none';

    if (canContactSeeFullName && userFullName) {
      return userFullName;
    }

    return user.username?.trim() || user.publicId?.trim() || user.uniqueId?.trim() || 'Пользователь';
  },

  /**
   * Универсальный метод вычисления имени
   */
  resolveDisplayName(user: AppUser | any, context?: any): string {
    if (!user) return 'Пользователь';

    if (context?.isContact && (context.contactFirstName || context.contactLastName)) {
      return `${context.contactFirstName || ''} ${context.contactLastName || ''}`.trim();
    }

    const privacy = getUserPrivacy(user);
    const realFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const isFullNamePreferred = privacy.privacyNameFormat === 'full_name';

    if (isFullNamePreferred && realFullName) {
      return realFullName;
    }

    return user.username || realFullName || user.publicId || 'Пользователь';
  },

  /**
   * Обновление любых полей профиля с автоматической упаковкой цветов в appearance
   */
  async updateProfile(
    uuid: string,
    updates: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        avatarColor,
        nameColor,
        profileColor,
        appearance,
        uniqueId,
        isBanned,
        privacyPhone,
        privacyEmail,
        privacyOnline,
        privacyNameFormat,
        privacyFullName,
        privacySearch,
        ...rest
      } = updates;

      const payload: Record<string, any> = {
        ...rest,
        updatedAt: new Date().toISOString(),
      };

      // Если передали uniqueId по старинке — маппим в publicId
      if (uniqueId !== undefined && payload.publicId === undefined) {
        payload.publicId = uniqueId;
      }

      // Если передали плоские цвета или объект appearance — аккуратно мержим с текущим appearance в БД
      if (
        appearance !== undefined ||
        avatarColor !== undefined ||
        nameColor !== undefined ||
        profileColor !== undefined
      ) {
        let baseAppearance: UserAppearance = {};
        if (!appearance) {
          const { data: currentRow } = await supabase
            .from('users')
            .select('appearance')
            .eq('uuid', uuid)
            .maybeSingle();
          baseAppearance = (currentRow?.appearance || {}) as UserAppearance;
        }

        payload.appearance = {
          ...baseAppearance,
          ...(appearance || {}),
          ...(avatarColor !== undefined ? { avatarColor } : {}),
          ...(nameColor !== undefined ? { nameColor } : {}),
          ...(profileColor !== undefined ? { profileColor } : {}),
        };
      }

      const { error } = await supabase
        .from('users')
        .update(payload)
        .eq('uuid', uuid);

      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      console.error('[userService.updateProfile] Ошибка:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Сохранение новой аватарки и цвета фона аватарки в appearance
   */
  async updateAvatar(
    uuid: string,
    avatarUrl: string | null,
    avatarColor?: string
  ): Promise<{ success: boolean; error?: string }> {
    const payload: Record<string, any> = { avatarUrl };
    if (avatarColor) payload.avatarColor = avatarColor;
    return this.updateProfile(uuid, payload);
  },

  /**
   * Сохранение цвета имени в appearance
   */
  async updateNameColor(uuid: string, nameColor: string): Promise<{ success: boolean; error?: string }> {
    return this.updateProfile(uuid, { nameColor });
  },

  /**
   * Сохранение цвета шапки профиля в appearance
   */
  async updateProfileColor(uuid: string, profileColor: string): Promise<{ success: boolean; error?: string }> {
    return this.updateProfile(uuid, { profileColor });
  },

  /**
   * Обновление публичного тега с проверкой занятости в общем реестре public_tags
   */
  async updatePublicTag(
    uuid: string,
    rawTag: string | null
  ): Promise<{ success: boolean; tag?: string | null; error?: string }> {
    const cleanTag = rawTag ? rawTag.replace(/^@/, '').trim().toLowerCase() : null;

    if (cleanTag && !/^[a-z0-9_]{3,32}$/.test(cleanTag)) {
      return {
        success: false,
        error: 'Тег должен содержать от 3 до 32 символов (латиница, цифры или _)',
      };
    }

    const res = await this.updateProfile(uuid, { publicId: cleanTag || null });
    if (!res.success) {
      if (res.error?.includes('duplicate key') || res.error?.includes('unique')) {
        return { success: false, error: 'Этот публичный тег уже занят' };
      }
      return { success: false, error: res.error };
    }

    return { success: true, tag: cleanTag };
  },

  /**
   * Обновление настройки приватности внутри JSONB
   */
  async updatePrivacySetting(
    uuid: string,
    key: keyof UserPrivacySettings,
    value: PrivacyType | NameFormatType,
    currentPrivacy?: UserPrivacySettings
  ): Promise<{ success: boolean; updatedPrivacy?: UserPrivacySettings; error?: string }> {
    try {
      const basePrivacy = currentPrivacy || DEFAULT_USER_PRIVACY;
      const updatedPrivacy: UserPrivacySettings = {
        ...basePrivacy,
        [key]: value,
      };

      const res = await this.updateProfile(uuid, { privacy: updatedPrivacy });
      if (!res.success) throw new Error(res.error);

      return { success: true, updatedPrivacy };
    } catch (e: any) {
      console.error('[userService.updatePrivacySetting] Ошибка:', e);
      return { success: false, error: e.message };
    }
  },
};