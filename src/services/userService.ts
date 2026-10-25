import { supabase } from './supabaseClient';

export type PrivacyType = 'all' | 'contacts' | 'none';
export type NameFormatType = 'username' | 'full_name';
export type UserStatusType = 'default' | 'moderator' | 'administrator' | string;

export interface AppUser {
  uuid: string;
  id: number | null;
  uniqueId: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  password?: string | null;
  avatarColor: string;
  avatarUrl: string | null;
  nameColor: string;
  aboutMe: string | null;
  privacyPhone: PrivacyType;
  privacyEmail: PrivacyType;
  privacyOnline: PrivacyType;
  privacyNameFormat: NameFormatType;
  privacyFullName: PrivacyType;
  privacySearch: PrivacyType;
  userStatus: UserStatusType;
  isBanned: boolean;
  bannedAt: string | null;
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

export const userService = {
  /**
   * Получить пользователя по UUID (строгому или строковому)
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
    return data as AppUser;
  },

  /**
   * Получить пользователя по числу id (int8) или уникальному логину (uniqueId)
   */
  async getUserByIdentifier(identifier: string | number): Promise<AppUser | null> {
    const str = String(identifier || '').trim();
    if (!str) return null;

    if (str.includes('-')) {
      return this.getUserByUuid(str);
    }

    const isNumeric = !isNaN(Number(str));
    const query = supabase.from('users').select('*');

    const { data, error } = isNumeric
      ? await query.eq('id', Number(str)).maybeSingle()
      : await query.eq('uniqueId', str).maybeSingle();

    if (error) {
      console.error(`[userService.getUserByIdentifier] Ошибка для ${str}:`, error.message);
      return null;
    }
    return data as AppUser;
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

    return (data || []) as AppUser[];
  },

  /**
   * Поиск пользователей по имени / логину с учётом privacySearch
   */
  async searchUsers(queryText: string, currentUuid?: string): Promise<AppUser[]> {
    // Убираем спецсимволы, ломающие PostgREST-фильтр
    const sanitizedQuery = queryText.replace(/[,()]/g, '').trim().toLowerCase();
    if (!sanitizedQuery) return [];

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.ilike.%${sanitizedQuery}%,uniqueId.ilike.%${sanitizedQuery}%,firstName.ilike.%${sanitizedQuery}%,lastName.ilike.%${sanitizedQuery}%`)
      .neq('isBanned', true)
      .limit(30);

    if (error) {
      console.error('[userService.searchUsers] Ошибка поиска:', error.message);
      return [];
    }

    const allFound = (data || []) as AppUser[];

    return allFound.filter(u => {
      if (currentUuid && u.uuid === currentUuid) return false;
      if (u.privacySearch === 'none') return false;
      return true;
    });
  },

  /**
   * 👤 1. Имя, которое видит НЕЗНАКОМЕЦ
   * Незнакомец никогда не видит ваши локальные заметки/имена контактов.
   * Настоящее имя видит ТОЛЬКО если privacyFullName === 'all' И privacyNameFormat === 'full_name'.
   */
  getDisplayNameAsStranger(user: Partial<AppUser> | null | undefined): string {
    if (!user) return 'Пользователь';

    const userFirst = user.firstName ? user.firstName.trim() : '';
    const userLast = user.lastName ? user.lastName.trim() : '';
    const userFullName = `${userFirst} ${userLast}`.trim();

    // Незнакомцу видно полное имя только при публичной настройке 'all'
    const canStrangerSeeFullName = 
      user.privacyNameFormat === 'full_name' && 
      user.privacyFullName === 'all';

    if (canStrangerSeeFullName && userFullName) {
      return userFullName;
    }

    return user.username?.trim() || user.uniqueId?.trim() || 'Пользователь';
  },

  /**
   * 👥 2. Имя, которое видит КОНТАКТ
   * Контакт в первую очередь видит то, как вы его записали у себя.
   * Если не записали — видит полное имя, если разрешено ('all' или 'contacts').
   */
  getDisplayNameAsContact(
    user: Partial<AppUser> | null | undefined,
    contact?: UserContactContext | null
  ): string {
    if (!user) return 'Пользователь';

    // 1. Имя из записной книги (контактов)
    const contactFirst = contact?.firstName && contact.firstName !== 'EMPTY' ? contact.firstName.trim() : '';
    const contactLast = contact?.lastName && contact.lastName !== 'EMPTY' ? contact.lastName.trim() : '';
    const contactFullName = `${contactFirst} ${contactLast}`.trim();

    if (contactFullName) {
      return contactFullName;
    }

    // 2. Имя из профиля (для контакта доступно и при 'all', и при 'contacts')
    const userFirst = user.firstName ? user.firstName.trim() : '';
    const userLast = user.lastName ? user.lastName.trim() : '';
    const userFullName = `${userFirst} ${userLast}`.trim();

    const canContactSeeFullName = 
      user.privacyNameFormat === 'full_name' && 
      user.privacyFullName !== 'none';

    if (canContactSeeFullName && userFullName) {
      return userFullName;
    }

    return user.username?.trim() || user.uniqueId?.trim() || 'Пользователь';
  },

  /**
   * 🎯 3. Универсальный метод вычисления имени
   */
  resolveDisplayName(user: AppUser | any, context?: any): string {
    if (!user) return 'Пользователь';

    // 1. Если это контакт и у него задано локальное имя в записной книжке
    if (context?.isContact && (context.contactFirstName || context.contactLastName)) {
      return `${context.contactFirstName || ''} ${context.contactLastName || ''}`.trim();
    }

    const realFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const isFullNamePreferred = 
      user.privacyNameFormat === 'full_name' || 
      user.privacyNameFormat === 'name';

    // 2. Если в настройках выбрано "Имя и Фамилия" и они заполнены
    if (isFullNamePreferred && realFullName) {
      return realFullName;
    }

    // 3. Иначе дефолтный никнейм
    return user.username || realFullName || 'Пользователь';
  },

  /**
   * Проверка видимости закрытых полей (телефон, email, полное имя)
   */
  isFieldVisible(privacy: PrivacyType | undefined, isAmHisContact: boolean): boolean {
    if (!privacy || privacy === 'all') return true;
    if (privacy === 'contacts') return Boolean(isAmHisContact);
    return false;
  },

  /**
   * Обновление любых полей профиля с фиксацией updatedAt
   */
  async updateProfile(
    uuid: string, 
    updates: Partial<Omit<AppUser, 'uuid' | 'id' | 'createdAt'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

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
   * Сохранение новой аватарки и базового цвета
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
   * Сохранение цвета имени
   */
  async updateNameColor(uuid: string, nameColor: string): Promise<{ success: boolean; error?: string }> {
    return this.updateProfile(uuid, { nameColor });
  },

  /**
   * Быстрое обновление конкретной настройки приватности
   */
  async updatePrivacySetting(
    uuid: string,
    key: 'privacyPhone' | 'privacyEmail' | 'privacyOnline' | 'privacyNameFormat' | 'privacyFullName' | 'privacySearch',
    value: PrivacyType | NameFormatType
  ): Promise<{ success: boolean; error?: string }> {
    return this.updateProfile(uuid, { [key]: value } as any);
  }
};