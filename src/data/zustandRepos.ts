import type { Repos } from '@/data/repos';
import { useShopStore } from '@/stores/shopStore';

export const getZustandRepos = (): Repos => ({
  settings: {
    get settings() {
      return useShopStore.getState().settings;
    },
    updateSettings: (settings) => useShopStore.getState().updateSettings(settings),
  },
  customers: {
    get customers() {
      return useShopStore.getState().customers;
    },
    addCustomer: (customer) => useShopStore.getState().addCustomer(customer),
    updateCustomer: (id, customer) => useShopStore.getState().updateCustomer(id, customer),
    deactivateCustomer: (id) => useShopStore.getState().deactivateCustomer(id),
  },
  units: {
    get units() {
      return useShopStore.getState().units;
    },
    addUnit: (unit) => useShopStore.getState().addUnit(unit),
    updateUnit: (id, unit) => useShopStore.getState().updateUnit(id, unit),
    deactivateUnit: (id) => useShopStore.getState().deactivateUnit(id),
    getUnitsByCustomer: (customerId) => useShopStore.getState().getUnitsByCustomer(customerId),
  },
  vendors: {
    get vendors() {
      return useShopStore.getState().vendors;
    },
    addVendor: (vendor) => useShopStore.getState().addVendor(vendor),
    updateVendor: (id, vendor) => useShopStore.getState().updateVendor(id, vendor),
    deactivateVendor: (id) => useShopStore.getState().deactivateVendor(id),
  },
  categories: {
    get categories() {
      return useShopStore.getState().categories;
    },
    addCategory: (category) => useShopStore.getState().addCategory(category),
    updateCategory: (id, category) => useShopStore.getState().updateCategory(id, category),
    deactivateCategory: (id) => useShopStore.getState().deactivateCategory(id),
  },
  parts: {
    get parts() {
      return useShopStore.getState().parts;
    },
    addPart: (part) => useShopStore.getState().addPart(part),
    updatePart: (id, part) => useShopStore.getState().updatePart(id, part),
    deactivatePart: (id) => useShopStore.getState().deactivatePart(id),
  },
  technicians: {
    get technicians() {
      return useShopStore.getState().technicians;
    },
    addTechnician: (technician) => useShopStore.getState().addTechnician(technician),
    updateTechnician: (id, technician) => useShopStore.getState().updateTechnician(id, technician),
    deactivateTechnician: (id) => useShopStore.getState().deactivateTechnician(id),
  },
  timeEntries: {
    get timeEntries() {
      return useShopStore.getState().timeEntries;
    },
    clockIn: (technicianId, workOrderId) => useShopStore.getState().clockIn(technicianId, workOrderId),
    clockOut: (technicianId) => useShopStore.getState().clockOut(technicianId),
    getActiveTimeEntry: (technicianId) => useShopStore.getState().getActiveTimeEntry(technicianId),
    getTimeEntriesByWorkOrder: (workOrderId) =>
      useShopStore.getState().getTimeEntriesByWorkOrder(workOrderId),
  },
  salesOrders: {
    get salesOrders() {
      return useShopStore.getState().salesOrders;
    },
    get salesOrderLines() {
      return useShopStore.getState().salesOrderLines;
    },
    createSalesOrder: (customerId, unitId) =>
      useShopStore.getState().createSalesOrder(customerId, unitId),
    soAddPartLine: (orderId, partId, qty) =>
      useShopStore.getState().soAddPartLine(orderId, partId, qty),
    soUpdatePartQty: (lineId, newQty) => useShopStore.getState().soUpdatePartQty(lineId, newQty),
    soRemovePartLine: (lineId) => useShopStore.getState().soRemovePartLine(lineId),
    soToggleWarranty: (lineId) => useShopStore.getState().soToggleWarranty(lineId),
    soToggleCoreReturned: (lineId) => useShopStore.getState().soToggleCoreReturned(lineId),
    soInvoice: (orderId) => useShopStore.getState().soInvoice(orderId),
    updateSalesOrderNotes: (orderId, notes) =>
      useShopStore.getState().updateSalesOrderNotes(orderId, notes),
    getSalesOrderLines: (orderId) => useShopStore.getState().getSalesOrderLines(orderId),
    recalculateSalesOrderTotals: (orderId) =>
      useShopStore.getState().recalculateSalesOrderTotals(orderId),
  },
  workOrders: {
    get workOrders() {
      return useShopStore.getState().workOrders;
    },
    get workOrderPartLines() {
      return useShopStore.getState().workOrderPartLines;
    },
    get workOrderLaborLines() {
      return useShopStore.getState().workOrderLaborLines;
    },
    createWorkOrder: (customerId, unitId) =>
      useShopStore.getState().createWorkOrder(customerId, unitId),
    woAddPartLine: (orderId, partId, qty) => useShopStore.getState().woAddPartLine(orderId, partId, qty),
    woUpdatePartQty: (lineId, newQty) => useShopStore.getState().woUpdatePartQty(lineId, newQty),
    woRemovePartLine: (lineId) => useShopStore.getState().woRemovePartLine(lineId),
    woTogglePartWarranty: (lineId) => useShopStore.getState().woTogglePartWarranty(lineId),
    woToggleCoreReturned: (lineId) => useShopStore.getState().woToggleCoreReturned(lineId),
    woAddLaborLine: (orderId, description, hours, technicianId) =>
      useShopStore.getState().woAddLaborLine(orderId, description, hours, technicianId),
    woUpdateLaborLine: (lineId, description, hours) =>
      useShopStore.getState().woUpdateLaborLine(lineId, description, hours),
    woRemoveLaborLine: (lineId) => useShopStore.getState().woRemoveLaborLine(lineId),
    woToggleLaborWarranty: (lineId) => useShopStore.getState().woToggleLaborWarranty(lineId),
    woUpdateStatus: (orderId, status) => useShopStore.getState().woUpdateStatus(orderId, status),
    woInvoice: (orderId) => useShopStore.getState().woInvoice(orderId),
    updateWorkOrderNotes: (orderId, notes) =>
      useShopStore.getState().updateWorkOrderNotes(orderId, notes),
    getWorkOrderPartLines: (orderId) => useShopStore.getState().getWorkOrderPartLines(orderId),
    getWorkOrderLaborLines: (orderId) => useShopStore.getState().getWorkOrderLaborLines(orderId),
    recalculateWorkOrderTotals: (orderId) =>
      useShopStore.getState().recalculateWorkOrderTotals(orderId),
  },
  purchaseOrders: {
    get purchaseOrders() {
      return useShopStore.getState().purchaseOrders;
    },
    get purchaseOrderLines() {
      return useShopStore.getState().purchaseOrderLines;
    },
    get receivingRecords() {
      return useShopStore.getState().receivingRecords;
    },
    createPurchaseOrder: (vendorId) => useShopStore.getState().createPurchaseOrder(vendorId),
    poAddLine: (orderId, partId, quantity) =>
      useShopStore.getState().poAddLine(orderId, partId, quantity),
    poUpdateLineQty: (lineId, newQty) => useShopStore.getState().poUpdateLineQty(lineId, newQty),
    poRemoveLine: (lineId) => useShopStore.getState().poRemoveLine(lineId),
    poReceive: (lineId, quantity) => useShopStore.getState().poReceive(lineId, quantity),
    poClose: (orderId) => useShopStore.getState().poClose(orderId),
    updatePurchaseOrderNotes: (orderId, notes) =>
      useShopStore.getState().updatePurchaseOrderNotes(orderId, notes),
    getPurchaseOrderLines: (orderId) => useShopStore.getState().getPurchaseOrderLines(orderId),
    getReceivingRecords: (lineId) => useShopStore.getState().getReceivingRecords(lineId),
  },
});
