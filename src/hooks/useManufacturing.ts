import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchManufacturedProducts,
  fetchManufacturedProduct,
  createManufacturedProduct,
  updateManufacturedProduct,
  deactivateManufacturedProduct,
  fetchManufacturedProductOptions,
  createManufacturedProductOption,
  updateManufacturedProductOption,
  deactivateManufacturedProductOption,
  fetchManufacturingBuilds,
  fetchManufacturingBuild,
  createManufacturingBuild,
  updateManufacturingBuild,
  deactivateManufacturingBuild,
  fetchManufacturingBuildSelectedOptions,
  addManufacturingBuildSelectedOption,
  deactivateManufacturingBuildSelectedOption,
  ManufacturingBuildFilters,
  ManufacturedProductType,
} from '@/integrations/supabase/manufacturing';

export const useManufacturedProducts = (options?: {
  includeInactive?: boolean;
  productType?: ManufacturedProductType;
}) =>
  useQuery(
    ['manufactured-products', options?.includeInactive ?? false, options?.productType ?? null],
    () =>
      fetchManufacturedProducts({
        includeInactive: options?.includeInactive ?? false,
        productType: options?.productType,
      }),
    {
      keepPreviousData: true,
    }
  );

export const useManufacturedProduct = (id?: string | null) =>
  useQuery(['manufactured-product', id], () => fetchManufacturedProduct(id!), {
    enabled: Boolean(id),
  });

export const useCreateManufacturedProduct = () => {
  const queryClient = useQueryClient();
  return useMutation(createManufacturedProduct, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufactured-products'] });
    },
  });
};

export const useUpdateManufacturedProduct = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, patch }: Parameters<typeof updateManufacturedProduct>) => updateManufacturedProduct(id, patch),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['manufactured-products'] });
        queryClient.invalidateQueries({ queryKey: ['manufactured-product', data.id] });
      },
    }
  );
};

export const useDeactivateManufacturedProduct = () => {
  const queryClient = useQueryClient();
  return useMutation(deactivateManufacturedProduct, {
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manufactured-products'] });
      queryClient.invalidateQueries({ queryKey: ['manufactured-product', data.id] });
    },
  });
};

export const useManufacturedProductOptions = (productId?: string) =>
  useQuery(['manufactured-product-options', productId], () => fetchManufacturedProductOptions(productId!), {
    enabled: Boolean(productId),
  });

export const useCreateManufacturedProductOption = (productId?: string) => {
  const queryClient = useQueryClient();
  return useMutation(createManufacturedProductOption, {
    onSuccess: () => {
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['manufactured-product-options', productId] });
      }
    },
  });
};

export const useUpdateManufacturedProductOption = (productId?: string) => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, patch }: Parameters<typeof updateManufacturedProductOption>) => updateManufacturedProductOption(id, patch),
    {
      onSuccess: () => {
        if (productId) {
          queryClient.invalidateQueries({ queryKey: ['manufactured-product-options', productId] });
        }
      },
    }
  );
};

export const useDeactivateManufacturedProductOption = (productId?: string) => {
  const queryClient = useQueryClient();
  return useMutation(deactivateManufacturedProductOption, {
    onSuccess: () => {
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['manufactured-product-options', productId] });
      }
    },
  });
};

export const useManufacturingBuilds = (filters?: ManufacturingBuildFilters) =>
  useQuery(['manufacturing-builds', filters], () => fetchManufacturingBuilds(filters), {
    keepPreviousData: true,
  });

export const useManufacturingBuild = (id?: string | null) =>
  useQuery(['manufacturing-build', id], () => fetchManufacturingBuild(id!), {
    enabled: Boolean(id),
  });

export const useCreateManufacturingBuild = () => {
  const queryClient = useQueryClient();
  return useMutation(createManufacturingBuild, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturing-builds'] });
    },
  });
};

export const useUpdateManufacturingBuild = () => {
  const queryClient = useQueryClient();
  return useMutation(
    ({ id, patch }: Parameters<typeof updateManufacturingBuild>) => updateManufacturingBuild(id, patch),
    {
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['manufacturing-builds'] });
        queryClient.invalidateQueries({ queryKey: ['manufacturing-build', variables.id] });
      },
    }
  );
};

export const useDeactivateManufacturingBuild = () => {
  const queryClient = useQueryClient();
  return useMutation(deactivateManufacturingBuild, {
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manufacturing-builds'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturing-build', data.id] });
    },
  });
};

export const useManufacturingBuildSelectedOptions = (buildId?: string) =>
  useQuery(['manufacturing-build-selected-options', buildId], () => fetchManufacturingBuildSelectedOptions(buildId!), {
    enabled: Boolean(buildId),
  });

export const useSelectBuildOptions = (buildId?: string) => {
  const queryClient = useQueryClient();

  const addOption = useMutation(
    (input: Parameters<typeof addManufacturingBuildSelectedOption>[0]) =>
      addManufacturingBuildSelectedOption(input),
    {
      onSuccess: () => {
        if (buildId) {
          queryClient.invalidateQueries({ queryKey: ['manufacturing-build-selected-options', buildId] });
        }
      },
    }
  );

  const removeOption = useMutation(
    (id: Parameters<typeof deactivateManufacturingBuildSelectedOption>[0]) =>
      deactivateManufacturingBuildSelectedOption(id),
    {
      onSuccess: () => {
        if (buildId) {
          queryClient.invalidateQueries({ queryKey: ['manufacturing-build-selected-options', buildId] });
        }
      },
    }
  );

  return {
    addOption,
    removeOption,
    isAdding: addOption.isLoading,
    isRemoving: removeOption.isLoading,
  };
};
