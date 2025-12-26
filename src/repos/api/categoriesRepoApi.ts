import { apiClient } from '@/api/client';
import { useShopStore } from '@/stores/shopStore';

import type { CategoriesRepo } from '../repos';
import type { PartCategory } from '@/types';

export const categoriesRepoApi: CategoriesRepo = {
  get categories() {
    return useShopStore.getState().categories;
  },
  addCategory(category) {
    const newCategory = useShopStore.getState().addCategory(category);
    void apiClient.post<PartCategory>('/categories', newCategory);
    return newCategory;
  },
  updateCategory(id, category) {
    useShopStore.getState().updateCategory(id, category);
    void apiClient.put<PartCategory>(`/categories/${id}`, category);
  },
  deactivateCategory(id) {
    useShopStore.getState().deactivateCategory(id);
    const state = useShopStore.getState();
    const category = state.categories.find((c) => c.id === id);
    if (category) {
      void apiClient.put<PartCategory>(`/categories/${id}`, {
        is_active: category.is_active,
        updated_at: category.updated_at,
      });
    }
  },
};
