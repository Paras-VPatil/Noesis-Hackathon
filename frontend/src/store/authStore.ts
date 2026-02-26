import { useSyncExternalStore } from "react";

interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

let state: AuthState = {
  isAuthenticated: true,
  user: {
    id: "user-1",
    name: "Aayush",
    avatarUrl: "https://i.pravatar.cc/80?img=13"
  }
};

const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const authStore = {
  getState: () => state,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  login(name: string) {
    state = {
      isAuthenticated: true,
      user: {
        id: "user-1",
        name,
        avatarUrl: "https://i.pravatar.cc/80?img=13"
      }
    };
    notify();
  },
  logout() {
    state = {
      isAuthenticated: false,
      user: null
    };
    notify();
  }
};

export const useAuthStore = () =>
  useSyncExternalStore(authStore.subscribe, authStore.getState, authStore.getState);
