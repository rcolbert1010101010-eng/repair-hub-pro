import { apiClient } from '@/api/client';
import { useShopStore } from '@/stores/shopStore';

import type { VendorsRepo } from '../repos';
import type { Vendor } from '@/types';

export const vendorsRepoApi: VendorsRepo = {
  get vendors() {
    return useShopStore.getState().vendors;
  },
  addVendor(vendor) {
    const newVendor = useShopStore.getState().addVendor(vendor);
    void apiClient.post<Vendor>('/vendors', newVendor);
    return newVendor;
  },
  updateVendor(id, vendor) {
    useShopStore.getState().updateVendor(id, vendor);
    void apiClient.put<Vendor>(`/vendors/${id}`, vendor);
  },
  deactivateVendor(id) {
    useShopStore.getState().deactivateVendor(id);
    const state = useShopStore.getState();
    const vendor = state.vendors.find((v) => v.id === id);
    if (vendor) {
      void apiClient.put<Vendor>(`/vendors/${id}`, {
        is_active: vendor.is_active,
        updated_at: vendor.updated_at,
      });
    }
  },
};
