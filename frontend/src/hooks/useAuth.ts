import { authStore, useAuthStore } from "../store/authStore";

export const useAuth = () => {
  const auth = useAuthStore();

  return {
    ...auth,
    login: authStore.login,
    logout: authStore.logout
  };
};
