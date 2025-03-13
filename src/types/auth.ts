
export type UserRole = 'admin' | 'basic';

export interface UserWithRole {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}
