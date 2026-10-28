import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'admin' | 'write' | 'read';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  token?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (userData: AuthUser) => void;
  quickLogin: (role: UserRole) => void;
  logout: () => void;
  updateRole: (role: UserRole) => void;
  updateProfile: (name: string, email: string, avatar?: string) => void;
}

export const DEMO_USERS: Record<UserRole, AuthUser> = {
  admin: {
    id: 'usr-admin-01',
    name: 'Souheil Bichiou',
    email: 'souheil@dotdeck.io',
    avatar: '👑',
    role: 'admin',
    token: 'jwt-admin-token-dotdeck',
  },
  write: {
    id: 'usr-operator-02',
    name: 'Alex Rivera',
    email: 'alex.rivera@dotdeck.io',
    avatar: '⚡',
    role: 'write',
    token: 'jwt-operator-token-dotdeck',
  },
  read: {
    id: 'usr-observer-03',
    name: 'Morgan Vance',
    email: 'morgan.vance@dotdeck.io',
    avatar: '👁️',
    role: 'read',
    token: 'jwt-observer-token-dotdeck',
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (userData: AuthUser) => {
        set({
          user: userData,
          isAuthenticated: true,
        });
      },

      quickLogin: (role: UserRole) => {
        const demoUser = DEMO_USERS[role];
        set({
          user: demoUser,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      updateRole: (role: UserRole) => {
        set((state) => ({
          user: state.user ? { ...state.user, role } : null,
        }));
      },

      updateProfile: (name: string, email: string, avatar?: string) => {
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                name: name.trim() || state.user.name,
                email: email.trim() || state.user.email,
                avatar: avatar || state.user.avatar,
              }
            : null,
        }));
      },
    }),
    {
      name: 'dotdeck_auth_user',
    }
  )
);
