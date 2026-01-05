import { apiClient } from '@/api/client';
import { useShopStore } from '@/stores/shopStore';

import type { PartsRepo } from '../repos';
import type { Part } from '@/types';

export const partsRepoApi: PartsRepo = {
  get parts() {
    return useShopStore.getState().parts;
  },
  addPart(part) {
    const newPart = useShopStore.getState().addPart(part);
    void apiClient.post<Part>('/parts', newPart);
    return newPart;
  },
  updatePart(id, part) {
    useShopStore.getState().updatePart(id, part);
    void apiClient.put<Part>(`/parts/${id}`, part);
  },
  updatePartWithQohAdjustment(id, part, meta) {
    const result = useShopStore.getState().updatePartWithQohAdjustment(id, part, meta);
    if (result.success) {
      void apiClient.put<Part>(`/parts/${id}`, part);
    }
    return result;
  },
  receiveInventory(payload) {
    const result = useShopStore.getState().receiveInventory?.(payload);
    if (!result) return { success: false, error: 'Receive not available' };
    if (!result.success) return result;
    // If a backend endpoint exists, call it here. For now, rely on local store update only.
    return result;
  },
  deactivatePart(id) {
    useShopStore.getState().deactivatePart(id);
    const state = useShopStore.getState();
    const part = state.parts.find((p) => p.id === id);
    if (part) {
      void apiClient.put<Part>(`/parts/${id}`, {
        is_active: part.is_active,
        updated_at: part.updated_at,
      });
    }
  },
  async reactivatePart(id) {
    useShopStore.getState().reactivatePart(id);
    await apiClient.put<Part>(`/parts/${id}`, { is_active: true });
  },
};
