import { apiClient } from "@/api/client";
import type { SystemSettings } from "@/types";

type SettingsRepo = {
  settings: () => Promise<SystemSettings>;
  updateSettings: (settings: Partial<SystemSettings>) => Promise<SystemSettings>;
};

export const settingsRepoApi: SettingsRepo = {
  async settings() {
    return apiClient.get<SystemSettings>("/settings");
  },

  async updateSettings(settings) {
    return apiClient.put<SystemSettings, Partial<SystemSettings>>("/settings", settings);
  }
};
