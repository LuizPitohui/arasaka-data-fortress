import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- TIPOS ---
interface User {
  id: string;
  username: string;
  corp_id: string;
  clearance_level: number;
  avatar_url?: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'upload';
  title: string;
  message?: string;
  progress?: number; // 0 a 100 (Progresso Real)
}

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;

  // Sistema de Notificações
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  updateNotificationProgress: (id: string, progress: number) => void;
}

// --- STORE ---
export const useAuthStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),

      // Notificações
      notifications: [],
      
      addNotification: (notif) => {
        const id = Math.random().toString(36).substring(7);
        const newNotif = { ...notif, id, progress: notif.type === 'upload' ? 0 : undefined };
        
        set((state) => ({ notifications: [...state.notifications, newNotif] }));

        // Remove automaticamente se NÃO for upload (uploads somem só quando terminam)
        if (notif.type !== 'upload') {
          setTimeout(() => {
            get().removeNotification(id);
          }, 4000); // 4 segundos de vida
        }
        return id;
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      updateNotificationProgress: (id, progress) => {
        set((state) => ({
          notifications: state.notifications.map((n) => 
            n.id === id ? { ...n, progress } : n
          ),
        }));
      }
    }),
    {
      name: 'arasaka-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }), // Não salva notificações no F5
    }
  )
);