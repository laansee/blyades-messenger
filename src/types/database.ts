export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  updated_at: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
}
