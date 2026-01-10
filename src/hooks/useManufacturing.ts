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
  fetchProductBom,
  upsertProductBom,
  computeProductMaterialCost,
} from '@/integrations/supabase/manufacturing';
import type { ManufacturingBuildFilters } from '@/integrations/supabase/manufacturing';
import type {
  ManufacturingProductBomItem,
  ManufacturingProductCostSummary,
  ManufacturedProduct,
  ManufacturingBuildStatus,
  ManufacturedProductType,
} from '@/types';
import type { ManufacturingBuildWithRelations } from '@/integrations/supabase/manufacturing';
import type { Part } from '@/types';
import { fetchParts } from '@/integrations/supabase/catalog';

const toNumber = (value: number | string | null | undefined) => {
  const numeric = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(numeric) ? numeric : 0;
};

export type BuildBoardGroups = {
  queued: ManufacturingBuildWithRelations[];
  inProgress: ManufacturingBuildWithRelations[];
  waitingParts: ManufacturingBuildWithRelations[];
  onHold: ManufacturingBuildWithRelations[];
  complete: ManufacturingBuildWithRelations[];
};

export type BomAvailabilityItem = {
  bomItemId: string;
  partId: string;
  partNumber?: string;
  description?: string;
  requiredQty: number;
  qoh: number;
  shortage: number;
};

export type BomAvailabilitySummary = {
  items: BomAvailabilityItem[];
  ready: boolean;
  unknown: boolean;
  shortages: BomAvailabilityItem[];
};

export const computeBomAvailabilitySummary = (
  bomItems: ManufacturingProductBomItem[] | undefined,
  parts: Part[] | undefined
): BomAvailabilitySummary => {
  if (!bomItems || bomItems.length === 0 || !parts || parts.length === 0) {
    return { items: [], ready: false, unknown: true, shortages: [] };
  }

  const items: BomAvailabilityItem[] = bomItems.map((item) => {
    const part = parts.find((p) => p.id === item.partId);
    const requiredQty = toNumber(item.quantity);
    const qoh = toNumber(part?.quantity_on_hand);
    const shortage = Math.max(requiredQty - qoh, 0);

    return {
      bomItemId: item.id,
      partId: item.partId,
      partNumber: part?.part_number ?? item.partNumber,
      description: part?.description ?? item.description,
      requiredQty,
      qoh,
      shortage,
    };
  });

  const shortages = items.filter((item) => item.shortage > 0);
  const ready = items.length > 0 && shortages.length === 0;

  return {
    items,
    ready,
    unknown: false,
    shortages,
  };
};

export const groupBuildsByStatus = (
  builds: ManufacturingBuildWithRelations[]
): BuildBoardGroups => {
  const groups: BuildBoardGroups = {
    queued: [],
    inProgress: [],
    waitingParts: [],
    onHold: [],
    complete: [],
  };

  const toBucket = (status: ManufacturingBuildStatus | undefined) => {
    switch (status) {
      case 'ENGINEERING':
        return 'queued' as const;
      case 'FABRICATION':
      case 'ASSEMBLY':
      case 'PAINT':
      case 'QA':
        return 'inProgress' as const;
      case 'READY':
        return 'waitingParts' as const;
      case 'CANCELLED':
        return 'onHold' as const;
      case 'DELIVERED':
        return 'complete' as const;
      default:
        return 'queued' as const;
    }
  };

  builds.forEach((build) => {
    const bucket = toBucket(build.status);
    groups[bucket].push(build);
  });

  return groups;
};

export const useBomAvailability = (productId?: string) => {
  const hasProduct = Boolean(productId);

  const bomQuery = useQuery({
    queryKey: ['manufacturing-product-bom', productId ?? 'none'],
    queryFn: () => fetchProductBom(productId ?? ''),
    enabled: hasProduct,
  });

  const partsQuery = useQuery({
    queryKey: ['parts-all'],
    queryFn: () => fetchParts(),
    enabled: hasProduct,
    staleTime: 1000 * 60 * 5,
  });

  const summary = hasProduct
    ? computeBomAvailabilitySummary(bomQuery.data, partsQuery.data)
    : { items: [] as BomAvailabilityItem[], ready: false, unknown: true, shortages: [] as BomAvailabilityItem[] };

  const isLoading = hasProduct ? bomQuery.isLoading || partsQuery.isLoading : false;
  const isError = hasProduct ? Boolean(bomQuery.error || partsQuery.error) : false;

  return {
    ...summary,
    isLoading,
    isError,
  };
};

export const useManufacturedProducts = (options?: {
  includeInactive?: boolean;
  productType?: ManufacturedProductType;
}) =>
  useQuery({
    queryKey: ['manufactured-products', options?.includeInactive ?? false, options?.productType ?? null],
    queryFn: () =>
      fetchManufacturedProducts({
        includeInactive: options?.includeInactive ?? false,
        productType: options?.productType,
      }),
    placeholderData: (previousData) => previousData,
  });

export const useManufacturedProduct = (id?: string | null) =>
  useQuery({
    queryKey: ['manufactured-product', id],
    queryFn: () => fetchManufacturedProduct(id!),
    enabled: Boolean(id),
  });

export const useCreateManufacturedProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createManufacturedProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufactured-products'] });
    },
  });
};

export const useUpdateManufacturedProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; patch: Parameters<typeof updateManufacturedProduct>[1] }) =>
      updateManufacturedProduct(args.id, args.patch),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manufactured-products'] });
      queryClient.invalidateQueries({ queryKey: ['manufactured-product', data.id] });
    },
  });
};

export const useDeactivateManufacturedProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivateManufacturedProduct,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manufactured-products'] });
      queryClient.invalidateQueries({ queryKey: ['manufactured-product', data.id] });
    },
  });
};

export const useManufacturedProductOptions = (productId?: string) =>
  useQuery({
    queryKey: ['manufactured-product-options', productId],
    queryFn: () => fetchManufacturedProductOptions(productId!),
    enabled: Boolean(productId),
  });

export const useCreateManufacturedProductOption = (productId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createManufacturedProductOption,
    onSuccess: () => {
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['manufactured-product-options', productId] });
      }
    },
  });
};

export const useUpdateManufacturedProductOption = (productId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; patch: Parameters<typeof updateManufacturedProductOption>[1] }) =>
      updateManufacturedProductOption(args.id, args.patch),
    onSuccess: () => {
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['manufactured-product-options', productId] });
      }
    },
  });
};

export const useDeactivateManufacturedProductOption = (productId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivateManufacturedProductOption,
    onSuccess: () => {
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['manufactured-product-options', productId] });
      }
    },
  });
};

export const useManufacturingBuilds = (filters?: ManufacturingBuildFilters) =>
  useQuery({
    queryKey: ['manufacturing-builds', filters],
    queryFn: () => fetchManufacturingBuilds(filters),
    placeholderData: (previousData) => previousData,
  });

export const useManufacturingBuild = (id?: string | null) =>
  useQuery({
    queryKey: ['manufacturing-build', id],
    queryFn: () => fetchManufacturingBuild(id!),
    enabled: Boolean(id),
  });

export const useCreateManufacturingBuild = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createManufacturingBuild,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturing-builds'] });
    },
  });
};

export const useUpdateManufacturingBuild = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; patch: Parameters<typeof updateManufacturingBuild>[1] }) =>
      updateManufacturingBuild(args.id, args.patch),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manufacturing-builds'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturing-build', variables.id] });
    },
  });
};

export const useDeactivateManufacturingBuild = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivateManufacturingBuild,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manufacturing-builds'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturing-build', data.id] });
    },
  });
};

export const useManufacturingBuildSelectedOptions = (buildId?: string) =>
  useQuery({
    queryKey: ['manufacturing-build-selected-options', buildId],
    queryFn: () => fetchManufacturingBuildSelectedOptions(buildId!),
    enabled: Boolean(buildId),
  });

export const useSelectBuildOptions = (buildId?: string) => {
  const queryClient = useQueryClient();

  const addOption = useMutation({
    mutationFn: (input: Parameters<typeof addManufacturingBuildSelectedOption>[0]) =>
      addManufacturingBuildSelectedOption(input),
    onSuccess: () => {
      if (buildId) {
        queryClient.invalidateQueries({ queryKey: ['manufacturing-build-selected-options', buildId] });
      }
    },
  });

  const removeOption = useMutation({
    mutationFn: (id: Parameters<typeof deactivateManufacturingBuildSelectedOption>[0]) =>
      deactivateManufacturingBuildSelectedOption(id),
    onSuccess: () => {
      if (buildId) {
        queryClient.invalidateQueries({ queryKey: ['manufacturing-build-selected-options', buildId] });
      }
    },
  });

  return {
    addOption,
    removeOption,
    isAdding: addOption.isPending,
    isRemoving: removeOption.isPending,
  };
};

export const useProductBom = (productId?: string) => {
  const enabled = Boolean(productId);
  const query = useQuery({
    queryKey: ['manufacturing-product-bom', productId],
    queryFn: () => fetchProductBom(productId!),
    enabled,
  });

  return {
    bom: enabled ? query.data ?? [] : ([] as ManufacturingProductBomItem[]),
    isLoading: enabled ? query.isLoading : false,
    error: enabled ? query.error : null,
  };
};

export const useSaveProductBom = (productId?: string) => {
  const queryClient = useQueryClient();
  const enabled = Boolean(productId);
  return useMutation({
    mutationFn: (items: ManufacturingProductBomItem[]) => {
      if (!enabled || !productId) {
        return Promise.reject(new Error('Product ID required to save BOM'));
      }
      return upsertProductBom(productId, items);
    },
    onSuccess: () => {
      if (productId) {
        queryClient.invalidateQueries({ queryKey: ['manufacturing-product-bom', productId] });
        queryClient.invalidateQueries({ queryKey: ['manufacturing-product-material-cost', productId] });
      }
    },
  });
};

export const useProductCostSummary = (
  productId?: string,
  product?: ManufacturedProduct | null,
  laborRate = 125
) => {
  const queryProductId = productId ?? 'none';
  const hasProduct = Boolean(productId);
  const laborHours = toNumber(product?.estimatedLaborHours);
  const overhead = toNumber(product?.estimatedOverhead);
  const safeLaborRate = toNumber(laborRate);

  const materialCostQuery = useQuery({
    queryKey: ['manufacturing-product-material-cost', queryProductId],
    queryFn: () => computeProductMaterialCost(productId ?? ''),
    enabled: hasProduct,
  });

  const materialCost = toNumber(materialCostQuery.data);
  const laborCost = laborHours * safeLaborRate;
  const totalEstimatedCost = materialCost + laborCost + overhead;

  const summary: ManufacturingProductCostSummary = {
    productId: productId ?? '',
    materialCost,
    laborHours,
    laborRate: safeLaborRate,
    laborCost,
    overhead,
    totalEstimatedCost,
  };

  return {
    summary,
    isLoading: hasProduct ? materialCostQuery.isLoading : false,
    error: hasProduct ? materialCostQuery.error : null,
  };
};
