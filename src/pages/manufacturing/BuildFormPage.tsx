import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useShopStore } from '@/stores/shopStore';
import { apiClient } from '@/api/client';
import type { ManufacturingBuildStatus, ManufacturedProductOption } from '@/types';
import {
  useManufacturingBuild,
  useCreateManufacturingBuild,
  useUpdateManufacturingBuild,
  useManufacturedProducts,
  useManufacturedProductOptions,
  useManufacturingBuildSelectedOptions,
  useSelectBuildOptions,
} from '@/hooks/useManufacturing';

const BUILD_STATUS_OPTIONS: ManufacturingBuildStatus[] = [
  'ENGINEERING',
  'FABRICATION',
  'ASSEMBLY',
  'PAINT',
  'QA',
  'READY',
  'DELIVERED',
  'CANCELLED',
];

const buildFormSchema = z.object({
  customer_id: z.string().optional(),
  unit_id: z.string().optional(),
  product_id: z.string().min(1, 'Product is required'),
  status: z.enum([
    'ENGINEERING',
    'FABRICATION',
    'ASSEMBLY',
    'PAINT',
    'QA',
    'READY',
    'DELIVERED',
    'CANCELLED',
  ]),
  notes: z.string().optional().nullable(),
  is_active: z.boolean(),
});

type BuildFormValues = z.infer<typeof buildFormSchema>;

export default function ManufacturingBuildFormPage() {
  const navigate = useNavigate();
  const params = useParams();
  const buildId = params.id;
  const isNew = buildId === 'new';
  const { toast } = useToast();
  const customers = useShopStore((state) => state.customers);
  const units = useShopStore((state) => state.units);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  const { data: build, isFetching: isBuildLoading } = useManufacturingBuild(isNew ? undefined : buildId ?? undefined);
  const productsQuery = useManufacturedProducts();
  const createBuild = useCreateManufacturingBuild();
  const updateBuild = useUpdateManufacturingBuild();

  const form = useForm<BuildFormValues>({
    resolver: zodResolver(buildFormSchema),
    defaultValues: {
      customer_id: '',
      unit_id: '',
      product_id: '',
      status: 'ENGINEERING',
      notes: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (build) {
      form.reset({
        customer_id: build.customer_id ?? '',
        unit_id: build.unit_id ?? '',
        product_id: build.product_id,
        status: build.status,
        notes: build.notes ?? '',
        is_active: build.is_active,
      });
      setSelectedCustomerId(build.customer_id ?? '');
      setSelectedUnitId(build.unit_id ?? '');
    }
  }, [build, form]);

  const selectedProductId = form.watch('product_id');
  const productOptionsQuery = useManufacturedProductOptions(
    selectedProductId ?? undefined
  );
  const selectedOptionsQuery = useManufacturingBuildSelectedOptions(build?.id ?? undefined);
  const selectOptions = useSelectBuildOptions(build?.id ?? undefined);

  const availableUnits = useMemo(
    () =>
      units
        .filter((unit) => selectedCustomerId && unit.customer_id === selectedCustomerId)
        .sort((a, b) => a.unit_name.localeCompare(b.unit_name)),
    [selectedCustomerId, units]
  );

  const selectedProduct = useMemo(
    () => productsQuery.data?.find((product) => product.id === selectedProductId) ?? build?.product,
    [productsQuery.data, selectedProductId, build]
  );

  const configuredPrice = useMemo(() => {
    const basePrice = selectedProduct?.base_price ?? 0;
    const optionDeltas = selectedOptionsQuery.data?.reduce(
      (sum, option) => sum + option.price_delta_snapshot,
      0
    ) ?? 0;
    return basePrice + optionDeltas;
  }, [selectedProduct, selectedOptionsQuery.data]);

  const handleFormSubmit = async (values: BuildFormValues) => {
    try {
      if (isNew) {
        const newBuild = await createBuild.mutateAsync({
          build_number: `MB-${Date.now()}`,
          product_id: values.product_id,
          customer_id: values.customer_id || null,
          unit_id: values.unit_id || null,
          status: values.status,
          notes: values.notes || null,
        });
        toast({ title: 'Build created' });
        navigate(`/manufacturing/builds/${newBuild.id}`);
      } else if (build) {
        await updateBuild.mutateAsync({
          id: build.id,
          patch: {
            customer_id: values.customer_id || null,
            unit_id: values.unit_id || null,
            status: values.status,
            notes: values.notes || null,
            is_active: values.is_active,
          },
        });
        toast({ title: 'Build updated' });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message ?? 'Unable to save build',
        variant: 'destructive',
      });
    }
  };

  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');

  const handleGenerateSerial = async () => {
    if (!build) return;
    const serial = `SN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    try {
      await updateBuild.mutateAsync({
        id: build.id,
        patch: { serial_number: serial },
      });
      toast({ title: 'Serial generated', description: serial });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message ?? 'Unable to generate serial',
        variant: 'destructive',
      });
    }
  };

  const handleConvertToUnit = async () => {
    if (!build || !build.status || build.status !== 'DELIVERED' || !selectedProduct) return;
    const unitName = `${selectedProduct.name} - ${build.serial_number ?? build.build_number}`;
    try {
      const unit = await apiClient.post('/units', {
        customer_id: build.customer_id ?? undefined,
        unit_name: unitName,
        vin: build.serial_number ?? undefined,
        notes: `Manufacturing build ${build.build_number}`,
      });
      await updateBuild.mutateAsync({
        id: build.id,
        patch: { unit_id: unit.id },
      });
      toast({ title: 'Unit created', description: unit.unit_name });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message ?? 'Unable to convert to unit',
        variant: 'destructive',
      });
    }
  };

  const handleAddSelectedOption = async () => {
    if (!build || !selectedOptionId) return;
    const option = productOptionsQuery.data?.find((opt) => opt.id === selectedOptionId);
    if (!option) return;
    try {
      await selectOptions.addOption.mutateAsync({
        build_id: build.id,
        option_id: option.id,
        option_name_snapshot: option.name,
        price_delta_snapshot: option.price_delta,
      });
      toast({ title: 'Option added' });
      setOptionDialogOpen(false);
      setSelectedOptionId('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message ?? 'Unable to add option',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveSelectedOption = async (id: string) => {
    try {
      await selectOptions.removeOption.mutateAsync(id);
      toast({ title: 'Option removed' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message ?? 'Unable to remove option',
        variant: 'destructive',
      });
    }
  };

  const selectedOptions = selectedOptionsQuery.data ?? [];

  return (
    <div className="page-container space-y-6">
      <PageHeader
        backTo="/manufacturing/builds"
        title={isNew ? 'New Build' : build?.build_number ?? 'Build'}
        subtitle="Configure the build lifecycle"
        actions={
          <Button type="submit" form="build-form">
            Save Build
          </Button>
        }
      />

      <form id="build-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Product *</Label>
            <Controller
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {productsQuery.data?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label>Customer</Label>
            <Controller
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <Select
                  value={field.value === '' ? undefined : field.value}
                  onValueChange={(value) => {
                    field.onChange(value ?? '');
                    setSelectedCustomerId(value ?? '');
                    setSelectedUnitId('');
                    form.setValue('unit_id', '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign customer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Unit</Label>
            <Controller
              control={form.control}
              name="unit_id"
              render={({ field }) => (
                <Select
                  value={field.value === '' ? undefined : field.value}
                  onValueChange={(value) => {
                    field.onChange(value ?? '');
                    setSelectedUnitId(value ?? '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.unit_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(value) => field.onChange(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUILD_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea {...form.register('notes')} rows={4} />
        </div>
        <div className="flex items-center gap-2">
          <Label>Active</Label>
          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={(value) => field.onChange(value)}
              />
            )}
          />
        </div>
      </form>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Selected Options</h2>
          <div className="flex gap-2">
            <Button onClick={() => setOptionDialogOpen(true)} disabled={!build}>
              <Plus className="w-4 h-4 mr-1" />
              Add Option
            </Button>
            <Button variant="outline" onClick={handleGenerateSerial} disabled={!build}>
              Generate Serial
            </Button>
            <Button
              variant="secondary"
              onClick={handleConvertToUnit}
              disabled={!build || build.status !== 'DELIVERED'}
            >
              Convert to Unit
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Serial Number</p>
            <p className="font-medium">{build?.serial_number ?? 'Not generated'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Configured Price</p>
            <p className="font-medium">${configuredPrice.toFixed(2)}</p>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Delta</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedOptions.map((option) => (
              <TableRow key={option.id}>
                <TableCell>{option.option_name_snapshot}</TableCell>
                <TableCell>${option.price_delta_snapshot.toFixed(2)}</TableCell>
                <TableCell>{option.is_active ? 'Yes' : 'No'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveSelectedOption(option.id)}>
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {selectedOptions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                  No options selected
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Build Option</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Select Option</Label>
            <Select value={selectedOptionId} onValueChange={setSelectedOptionId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an option" />
              </SelectTrigger>
              <SelectContent>
                {productOptionsQuery.data?.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name} (${option.price_delta.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setOptionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSelectedOption}>Add Option</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
