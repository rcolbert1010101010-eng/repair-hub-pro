import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Part, Vendor, PartCategory } from "@/types";
import { cn } from "@/lib/utils";
import { useRepos } from "@/data";

export default function Inventory() {
  const navigate = useNavigate();

  const parts = useRepos().parts.parts as Part[];
  const vendors = useRepos().vendors.vendors as Vendor[];
  const categories = useRepos().categories.categories as PartCategory[];

  const vendorById = useMemo(() => new Map(vendors.map((x) => [x.id, x])), [vendors]);
  const categoryById = useMemo(() => new Map(categories.map((x) => [x.id, x])), [categories]);

  const columns: Column<Part>[] = [
    { key: "part_number", header: "Part #", sortable: true, className: "font-mono" },
    { key: "description", header: "Description", sortable: true },
    {
      key: "category_id",
      header: "Category",
      sortable: true,
      render: (item) => categoryById.get(item.category_id)?.category_name || "-",
    },
    {
      key: "vendor_id",
      header: "Vendor",
      sortable: true,
      render: (item) => vendorById.get(item.vendor_id)?.vendor_name || "-",
    },
    {
      key: "cost",
      header: "Cost",
      sortable: true,
      render: (item) => `$${item.cost.toFixed(2)}`,
      className: "text-right",
    },
    {
      key: "selling_price",
      header: "Price",
      sortable: true,
      render: (item) => `$${item.selling_price.toFixed(2)}`,
      className: "text-right",
    },
    {
      key: "quantity_on_hand",
      header: "QOH",
      sortable: true,
      render: (item) => (
        <span
          className={cn(
            "font-medium",
            item.quantity_on_hand < 0 && "text-destructive",
            item.quantity_on_hand === 0 && "text-warning"
          )}
        >
          {item.quantity_on_hand}
        </span>
      ),
      className: "text-right",
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory"
        subtitle="Manage parts and stock levels"
        actions={
          <Button onClick={() => navigate("/inventory/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Add Part
          </Button>
        }
      />

      <DataTable
        data={parts}
        columns={columns}
        searchKeys={["part_number", "description"]}
        searchPlaceholder={"Search parts..."}
        onRowClick={(part) => navigate(`/inventory/${part.id}`)}
        emptyMessage={"No parts found. Add your first part to get started."}
      />
    </div>
  );
}
