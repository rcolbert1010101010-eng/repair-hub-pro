import { apiClient } from '@/api/client';
import { useShopStore } from '@/stores/shopStore';

import type { SettingsRepo } from '../repos';
import type { SystemSettings } from '@/types';

export const settingsRepoApi: SettingsRepo = {
  get settings() {
    return useShopStore.getState().settings;
  },
  async updateSettings(settings: Partial<SystemSettings>) {
    const updatedSettings = await apiClient.put<SystemSettings>('/settings', settings);
    useShopStore.getState().updateSettings(updatedSettings);
  },
};
