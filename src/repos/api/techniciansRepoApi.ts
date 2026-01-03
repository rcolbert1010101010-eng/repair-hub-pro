import { apiClient } from '@/api/client';
import { useShopStore } from '@/stores/shopStore';

import type { TechniciansRepo } from '../repos';
import type { Technician } from '@/types';

export const techniciansRepoApi: TechniciansRepo = {
  get technicians() {
    return useShopStore.getState().technicians;
  },
  addTechnician(technician) {
    const newTechnician = useShopStore.getState().addTechnician(technician);
    void apiClient.post<Technician>('/technicians', newTechnician);
    return newTechnician;
  },
  updateTechnician(id, technician) {
    useShopStore.getState().updateTechnician(id, technician);
    void apiClient.put<Technician>(`/technicians/${id}`, technician);
  },
  deactivateTechnician(id) {
    useShopStore.getState().deactivateTechnician(id);
    const state = useShopStore.getState();
    const tech = state.technicians.find((t) => t.id === id);
    if (tech) {
      void apiClient.put<Technician>(`/technicians/${id}`, {
        is_active: tech.is_active,
        updated_at: tech.updated_at,
      });
    }
  },
};
