import { apiClient } from '@/api/client';
import { useShopStore } from '@/stores/shopStore';

import type { CustomersRepo } from '../repos';
import type { Customer } from '@/types';

export const customersRepoApi: CustomersRepo = {
  get customers() {
    return useShopStore.getState().customers;
  },
  addCustomer(customer) {
    const newCustomer = useShopStore.getState().addCustomer(customer);
    void apiClient.post<Customer>('/customers', newCustomer);
    return newCustomer;
  },
  updateCustomer(id, customer) {
    useShopStore.getState().updateCustomer(id, customer);
    void apiClient.put<Customer>(`/customers/${id}`, customer);
  },
  deactivateCustomer(id) {
    const success = useShopStore.getState().deactivateCustomer(id);
    if (success) {
      const state = useShopStore.getState();
      const customer = state.customers.find((c) => c.id === id);
      if (customer) {
        void apiClient.put<Customer>(`/customers/${id}`, {
          is_active: customer.is_active,
          updated_at: customer.updated_at,
        });
      }
    }
    return success;
  },
};
