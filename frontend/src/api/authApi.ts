import type { AxiosResponse } from "axios";
import apiClient from "./axios";

interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<AxiosResponse | { ok: true }> {
    if (import.meta.env.VITE_USE_REAL_API === "true") {
      return apiClient.post("/auth/login", payload);
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
    return { ok: true };
  }
};
