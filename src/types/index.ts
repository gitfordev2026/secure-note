export type UserRole = "user" | "admin";
export type UserStatus = "active" | "disabled";

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string | null; // JSON string array
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  session_token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: string | null; // JSON string
  created_at: string;
}

export interface NoteWithUser extends Note {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Env {
  DB: any;
  SESSION_SECRET: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_SITE_NAME?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
