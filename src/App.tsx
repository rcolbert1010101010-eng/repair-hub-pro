import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import CustomerDetail from "@/pages/CustomerDetail";
import Units from "@/pages/Units";
import UnitForm from "@/pages/UnitForm";
import Vendors from "@/pages/Vendors";
import VendorDetail from "@/pages/VendorDetail";
import Categories from "@/pages/Categories";
import CategoryDetail from "@/pages/CategoryDetail";
import Inventory from "@/pages/Inventory";
import PartForm from "@/pages/PartForm";
import SalesOrders from "@/pages/SalesOrders";
import SalesOrderDetail from "@/pages/SalesOrderDetail";
import WorkOrders from "@/pages/WorkOrders";
import WorkOrderDetail from "@/pages/WorkOrderDetail";
import PurchaseOrders from "@/pages/PurchaseOrders";
import PurchaseOrderDetail from "@/pages/PurchaseOrderDetail";
import Technicians from "@/pages/Technicians";
import TechnicianDetail from "@/pages/TechnicianDetail";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import CycleCounts from "@/pages/CycleCounts";
import CycleCountDetail from "@/pages/CycleCountDetail";
import Returns from "@/pages/Returns";
import ReturnDetail from "@/pages/ReturnDetail";
import WarrantyClaims from "@/pages/WarrantyClaims";
import WarrantyClaimDetail from "@/pages/WarrantyClaimDetail";
import ReturnsWarrantyReport from "@/pages/ReturnsWarrantyReport";
import PlasmaProjects from "@/pages/PlasmaProjects";
import PlasmaProjectDetail from "@/pages/PlasmaProjectDetail";
import PlasmaPrint from "@/pages/PlasmaPrint";
import PlasmaTemplates from "@/pages/PlasmaTemplates";
import PlasmaTemplateDetail from "@/pages/PlasmaTemplateDetail";
import Scheduling from "@/pages/Scheduling";
import ReceiveInventory from "@/pages/ReceiveInventory";
import ReceivingHistory from "@/pages/ReceivingHistory";
import ReceivingReceiptDetail from "@/pages/ReceivingReceiptDetail";
import InvoiceDetail from "@/pages/InvoiceDetail";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/units" element={<Units />} />
              <Route path="/units/:id" element={<UnitForm />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/vendors/:id" element={<VendorDetail />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/categories/:id" element={<CategoryDetail />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/receiving" element={<ReceiveInventory />} />
              <Route path="/receiving-history" element={<ReceivingHistory />} />
              <Route path="/receiving-history/:id" element={<ReceivingReceiptDetail />} />
              <Route path="/inventory/:id" element={<PartForm />} />
              <Route path="/sales-orders" element={<SalesOrders />} />
              <Route path="/sales-orders/:id" element={<SalesOrderDetail />} />
              <Route path="/plasma" element={<PlasmaProjects />} />
              <Route path="/plasma/:id" element={<PlasmaProjectDetail />} />
              <Route path="/plasma/:id/print" element={<PlasmaPrint />} />
              <Route path="/plasma/templates" element={<PlasmaTemplates />} />
              <Route path="/plasma/templates/:id" element={<PlasmaTemplateDetail />} />
              <Route path="/work-orders" element={<WorkOrders />} />
              <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
              <Route path="/invoices" element={<div className="p-6">Invoices (coming soon)</div>} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/scheduling" element={<Scheduling />} />
              <Route path="/purchase-orders" element={<PurchaseOrders />} />
              <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/returns/:id" element={<ReturnDetail />} />
              <Route path="/warranty" element={<WarrantyClaims />} />
              <Route path="/warranty/:id" element={<WarrantyClaimDetail />} />
              <Route path="/reports/returns-warranty" element={<ReturnsWarrantyReport />} />
              <Route path="/cycle-counts" element={<CycleCounts />} />
              <Route path="/cycle-counts/:id" element={<CycleCountDetail />} />
              <Route path="/technicians" element={<Technicians />} />
              <Route path="/technicians/:id" element={<TechnicianDetail />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
