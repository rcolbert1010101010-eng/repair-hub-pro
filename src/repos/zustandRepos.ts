import { useShopStore } from '@/stores/shopStore';

import type { Repos } from './repos';

export const zustandRepos: Repos = {
  settings: {
    get settings() {
      return useShopStore.getState().settings;
    },
    updateSettings(settings) {
      return useShopStore.getState().updateSettings(settings);
    },
  },
  customers: {
    get customers() {
      return useShopStore.getState().customers;
    },
    addCustomer(customer) {
      return useShopStore.getState().addCustomer(customer);
    },
    updateCustomer(id, customer) {
      return useShopStore.getState().updateCustomer(id, customer);
    },
    deactivateCustomer(id) {
      return useShopStore.getState().deactivateCustomer(id);
    },
  },
  units: {
    get units() {
      return useShopStore.getState().units;
    },
    addUnit(unit) {
      return useShopStore.getState().addUnit(unit);
    },
    updateUnit(id, unit) {
      return useShopStore.getState().updateUnit(id, unit);
    },
    deactivateUnit(id) {
      return useShopStore.getState().deactivateUnit(id);
    },
    getUnitsByCustomer(customerId) {
      return useShopStore.getState().getUnitsByCustomer(customerId);
    },
  },
  vendors: {
    get vendors() {
      return useShopStore.getState().vendors;
    },
    addVendor(vendor) {
      return useShopStore.getState().addVendor(vendor);
    },
    updateVendor(id, vendor) {
      return useShopStore.getState().updateVendor(id, vendor);
    },
    deactivateVendor(id) {
      return useShopStore.getState().deactivateVendor(id);
    },
  },
  categories: {
    get categories() {
      return useShopStore.getState().categories;
    },
    addCategory(category) {
      return useShopStore.getState().addCategory(category);
    },
    updateCategory(id, category) {
      return useShopStore.getState().updateCategory(id, category);
    },
    deactivateCategory(id) {
      return useShopStore.getState().deactivateCategory(id);
    },
  },
  parts: {
    get parts() {
      return useShopStore.getState().parts;
    },
    addPart(part) {
      return useShopStore.getState().addPart(part);
    },
    updatePart(id, part) {
      return useShopStore.getState().updatePart(id, part);
    },
    updatePartWithQohAdjustment(id, part, meta) {
      return useShopStore.getState().updatePartWithQohAdjustment(id, part, meta);
    },
    deactivatePart(id) {
      return useShopStore.getState().deactivatePart(id);
    },
  },
  technicians: {
    get technicians() {
      return useShopStore.getState().technicians;
    },
    addTechnician(technician) {
      return useShopStore.getState().addTechnician(technician);
    },
    updateTechnician(id, technician) {
      return useShopStore.getState().updateTechnician(id, technician);
    },
    deactivateTechnician(id) {
      return useShopStore.getState().deactivateTechnician(id);
    },
  },
  timeEntries: {
    get timeEntries() {
      return useShopStore.getState().timeEntries;
    },
    clockIn(technicianId, workOrderId) {
      return useShopStore.getState().clockIn(technicianId, workOrderId);
    },
    clockOut(technicianId) {
      return useShopStore.getState().clockOut(technicianId);
    },
    getActiveTimeEntry(technicianId) {
      return useShopStore.getState().getActiveTimeEntry(technicianId);
    },
    getTimeEntriesByWorkOrder(workOrderId) {
      return useShopStore.getState().getTimeEntriesByWorkOrder(workOrderId);
    },
  },
  vendorCostHistory: {
    get vendorCostHistory() {
      return useShopStore.getState().vendorCostHistory;
    },
  },
  salesOrders: {
    get salesOrders() {
      return useShopStore.getState().salesOrders;
    },
    get salesOrderLines() {
      return useShopStore.getState().salesOrderLines;
    },
    createSalesOrder(customerId, unitId) {
      return useShopStore.getState().createSalesOrder(customerId, unitId);
    },
    soAddPartLine(orderId, partId, qty) {
      return useShopStore.getState().soAddPartLine(orderId, partId, qty);
    },
    soUpdatePartQty(lineId, newQty) {
      return useShopStore.getState().soUpdatePartQty(lineId, newQty);
    },
    soRemovePartLine(lineId) {
      return useShopStore.getState().soRemovePartLine(lineId);
    },
    soToggleWarranty(lineId) {
      return useShopStore.getState().soToggleWarranty(lineId);
    },
    soToggleCoreReturned(lineId) {
      return useShopStore.getState().soToggleCoreReturned(lineId);
    },
    soConvertToOpen(orderId) {
      return useShopStore.getState().soConvertToOpen(orderId);
    },
    soInvoice(orderId) {
      return useShopStore.getState().soInvoice(orderId);
    },
    updateSalesOrderNotes(orderId, notes) {
      return useShopStore.getState().updateSalesOrderNotes(orderId, notes);
    },
    getSalesOrderLines(orderId) {
      return useShopStore.getState().getSalesOrderLines(orderId);
    },
    recalculateSalesOrderTotals(orderId) {
      return useShopStore.getState().recalculateSalesOrderTotals(orderId);
    },
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
    createWorkOrder(customerId, unitId) {
      return useShopStore.getState().createWorkOrder(customerId, unitId);
    },
    woAddPartLine(orderId, partId, qty) {
      return useShopStore.getState().woAddPartLine(orderId, partId, qty);
    },
    woUpdatePartQty(lineId, newQty) {
      return useShopStore.getState().woUpdatePartQty(lineId, newQty);
    },
    woRemovePartLine(lineId) {
      return useShopStore.getState().woRemovePartLine(lineId);
    },
    woTogglePartWarranty(lineId) {
      return useShopStore.getState().woTogglePartWarranty(lineId);
    },
    woToggleCoreReturned(lineId) {
      return useShopStore.getState().woToggleCoreReturned(lineId);
    },
    woAddLaborLine(orderId, description, hours, technicianId) {
      return useShopStore.getState().woAddLaborLine(orderId, description, hours, technicianId);
    },
    woUpdateLaborLine(lineId, description, hours) {
      return useShopStore.getState().woUpdateLaborLine(lineId, description, hours);
    },
    woRemoveLaborLine(lineId) {
      return useShopStore.getState().woRemoveLaborLine(lineId);
    },
    woToggleLaborWarranty(lineId) {
      return useShopStore.getState().woToggleLaborWarranty(lineId);
    },
    woUpdateStatus(orderId, status) {
      return useShopStore.getState().woUpdateStatus(orderId, status);
    },
    woInvoice(orderId) {
      return useShopStore.getState().woInvoice(orderId);
    },
    getWorkOrderPartLines(orderId) {
      return useShopStore.getState().getWorkOrderPartLines(orderId);
    },
    getWorkOrderLaborLines(orderId) {
      return useShopStore.getState().getWorkOrderLaborLines(orderId);
    },
    updateWorkOrderNotes(orderId, notes) {
      return useShopStore.getState().updateWorkOrderNotes(orderId, notes);
    },
    recalculateWorkOrderTotals(orderId) {
      return useShopStore.getState().recalculateWorkOrderTotals(orderId);
    },
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
    createPurchaseOrder(vendorId) {
      return useShopStore.getState().createPurchaseOrder(vendorId);
    },
    poAddLine(orderId, partId, quantity) {
      return useShopStore.getState().poAddLine(orderId, partId, quantity);
    },
    poUpdateLineQty(lineId, newQty) {
      return useShopStore.getState().poUpdateLineQty(lineId, newQty);
    },
    poRemoveLine(lineId) {
      return useShopStore.getState().poRemoveLine(lineId);
    },
    poReceive(lineId, quantity) {
      return useShopStore.getState().poReceive(lineId, quantity);
    },
    poClose(orderId) {
      return useShopStore.getState().poClose(orderId);
    },
    updatePurchaseOrderNotes(orderId, notes) {
      return useShopStore.getState().updatePurchaseOrderNotes(orderId, notes);
    },
    getPurchaseOrderLines(orderId) {
      return useShopStore.getState().getPurchaseOrderLines(orderId);
    },
    getReceivingRecords(lineId) {
      return useShopStore.getState().getReceivingRecords(lineId);
    },
  },
};
