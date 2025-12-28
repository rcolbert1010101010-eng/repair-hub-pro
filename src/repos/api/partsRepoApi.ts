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
    useShopStore.getState().updatePartWithQohAdjustment(id, part, meta);
    void apiClient.put<Part>(`/parts/${id}`, part);
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
};
