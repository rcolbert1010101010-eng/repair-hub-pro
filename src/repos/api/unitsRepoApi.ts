import { apiClient } from '@/api/client';
import { useShopStore } from '@/stores/shopStore';

import type { UnitsRepo } from '../repos';
import type { Unit } from '@/types';

export const unitsRepoApi: UnitsRepo = {
  get units() {
    return useShopStore.getState().units;
  },
  addUnit(unit) {
    const newUnit = useShopStore.getState().addUnit(unit);
    void apiClient.post<Unit>('/units', newUnit);
    return newUnit;
  },
  updateUnit(id, unit) {
    useShopStore.getState().updateUnit(id, unit);
    void apiClient.put<Unit>(`/units/${id}`, unit);
  },
  deactivateUnit(id) {
    useShopStore.getState().deactivateUnit(id);
    const state = useShopStore.getState();
    const unit = state.units.find((u) => u.id === id);
    if (unit) {
      void apiClient.put<Unit>(`/units/${id}`, {
        is_active: unit.is_active,
        updated_at: unit.updated_at,
      });
    }
  },
  getUnitsByCustomer(customerId) {
    return useShopStore.getState().getUnitsByCustomer(customerId);
  },
};
