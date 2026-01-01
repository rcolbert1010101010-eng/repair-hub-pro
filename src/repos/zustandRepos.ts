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
  kitComponents: {
    get kitComponents() {
      return useShopStore.getState().kitComponents;
    },
    addKitComponent(component) {
      return useShopStore.getState().addKitComponent(component);
    },
    updateKitComponentQuantity(id, quantity) {
      return useShopStore.getState().updateKitComponentQuantity(id, quantity);
    },
    removeKitComponent(id) {
      return useShopStore.getState().removeKitComponent(id);
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
    get salesOrderChargeLines() {
      return useShopStore.getState().salesOrderChargeLines;
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
    soUpdateLineUnitPrice(lineId, newUnitPrice) {
      return useShopStore.getState().soUpdateLineUnitPrice(lineId, newUnitPrice);
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
    getSalesOrderChargeLines(orderId) {
      return useShopStore.getState().getSalesOrderChargeLines(orderId);
    },
    addSalesOrderChargeLine(line) {
      return useShopStore.getState().addSalesOrderChargeLine(line);
    },
    updateSalesOrderChargeLine(id, patch) {
      return useShopStore.getState().updateSalesOrderChargeLine(id, patch);
    },
    removeSalesOrderChargeLine(id) {
      return useShopStore.getState().removeSalesOrderChargeLine(id);
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
    get workOrderChargeLines() {
      return useShopStore.getState().workOrderChargeLines;
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
    woUpdateLineUnitPrice(lineId, newUnitPrice) {
      return useShopStore.getState().woUpdateLineUnitPrice(lineId, newUnitPrice);
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
    woConvertToOpen(orderId) {
      return useShopStore.getState().woConvertToOpen(orderId);
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
    getWorkOrderChargeLines(orderId) {
      return useShopStore.getState().getWorkOrderChargeLines(orderId);
    },
    updateWorkOrderNotes(orderId, notes) {
      return useShopStore.getState().updateWorkOrderNotes(orderId, notes);
    },
    addWorkOrderChargeLine(line) {
      return useShopStore.getState().addWorkOrderChargeLine(line);
    },
    updateWorkOrderChargeLine(id, patch) {
      return useShopStore.getState().updateWorkOrderChargeLine(id, patch);
    },
    removeWorkOrderChargeLine(id) {
      return useShopStore.getState().removeWorkOrderChargeLine(id);
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
    updatePurchaseOrderLinks(orderId, links) {
      return useShopStore.getState().updatePurchaseOrderLinks(orderId, links);
    },
    getPurchaseOrderLines(orderId) {
      return useShopStore.getState().getPurchaseOrderLines(orderId);
    },
    getReceivingRecords(lineId) {
      return useShopStore.getState().getReceivingRecords(lineId);
    },
  },
  returns: {
    get returns() {
      return useShopStore.getState().returns;
    },
    get returnLines() {
      return useShopStore.getState().returnLines;
    },
    createReturn(payload) {
      return useShopStore.getState().createReturn(payload);
    },
    updateReturn(id, patch) {
      return useShopStore.getState().updateReturn(id, patch);
    },
    setReturnStatus(id, status) {
      return useShopStore.getState().setReturnStatus(id, status);
    },
    addReturnLine(returnId, payload) {
      return useShopStore.getState().addReturnLine(returnId, payload);
    },
    updateReturnLine(lineId, patch) {
      return useShopStore.getState().updateReturnLine(lineId, patch);
    },
    removeReturnLine(lineId) {
      return useShopStore.getState().removeReturnLine(lineId);
    },
    getReturnLines(returnId) {
      return useShopStore.getState().getReturnLines(returnId);
    },
    getReturnsByPurchaseOrder(poId) {
      return useShopStore.getState().getReturnsByPurchaseOrder(poId);
    },
  },
  warranty: {
    get warrantyPolicies() {
      return useShopStore.getState().warrantyPolicies;
    },
    get warrantyClaims() {
      return useShopStore.getState().warrantyClaims;
    },
    get warrantyClaimLines() {
      return useShopStore.getState().warrantyClaimLines;
    },
    upsertWarrantyPolicy(vendorId, patch) {
      return useShopStore.getState().upsertWarrantyPolicy(vendorId, patch);
    },
    createWarrantyClaim(payload) {
      return useShopStore.getState().createWarrantyClaim(payload);
    },
    updateWarrantyClaim(id, patch) {
      return useShopStore.getState().updateWarrantyClaim(id, patch);
    },
    setWarrantyClaimStatus(id, status) {
      return useShopStore.getState().setWarrantyClaimStatus(id, status);
    },
    addWarrantyClaimLine(claimId, payload) {
      return useShopStore.getState().addWarrantyClaimLine(claimId, payload);
    },
    updateWarrantyClaimLine(lineId, patch) {
      return useShopStore.getState().updateWarrantyClaimLine(lineId, patch);
    },
    removeWarrantyClaimLine(lineId) {
      return useShopStore.getState().removeWarrantyClaimLine(lineId);
    },
    getWarrantyPolicyByVendor(vendorId) {
      return useShopStore.getState().getWarrantyPolicyByVendor(vendorId);
    },
    getClaimsByVendor(vendorId) {
      return useShopStore.getState().getClaimsByVendor(vendorId);
    },
    getClaimsByWorkOrder(workOrderId) {
      return useShopStore.getState().getClaimsByWorkOrder(workOrderId);
    },
    getWarrantyClaimLines(claimId) {
      return useShopStore.getState().getWarrantyClaimLines(claimId);
    },
  },
  cycleCounts: {
    get cycleCountSessions() {
      return useShopStore.getState().cycleCountSessions;
    },
    get cycleCountLines() {
      return useShopStore.getState().cycleCountLines;
    },
    createCycleCountSession(session) {
      return useShopStore.getState().createCycleCountSession(session);
    },
    updateCycleCountSession(id, session) {
      return useShopStore.getState().updateCycleCountSession(id, session);
    },
    cancelCycleCountSession(id) {
      return useShopStore.getState().cancelCycleCountSession(id);
    },
    addCycleCountLine(sessionId, partId) {
      return useShopStore.getState().addCycleCountLine(sessionId, partId);
    },
    updateCycleCountLine(id, updates) {
      return useShopStore.getState().updateCycleCountLine(id, updates);
    },
    postCycleCountSession(id, posted_by) {
      return useShopStore.getState().postCycleCountSession(id, posted_by);
    },
    getCycleCountLines(sessionId) {
      return useShopStore.getState().getCycleCountLines(sessionId);
    },
  },
  plasma: {
    get plasmaJobs() {
      return useShopStore.getState().plasmaJobs;
    },
    get plasmaJobLines() {
      return useShopStore.getState().plasmaJobLines;
    },
    get plasmaAttachments() {
      return useShopStore.getState().plasmaAttachments;
    },
    get plasmaTemplates() {
      return useShopStore.getState().plasmaTemplates;
    },
    get plasmaTemplateLines() {
      return useShopStore.getState().plasmaTemplateLines;
    },
    createForWorkOrder(workOrderId) {
      return useShopStore.getState().createPlasmaJobForWorkOrder(workOrderId);
    },
    getByWorkOrder(workOrderId) {
      return useShopStore.getState().getPlasmaJobByWorkOrder(workOrderId);
    },
    createStandalone(payload) {
      return useShopStore.getState().createStandalonePlasmaJob(payload);
    },
    get(plasmaJobId) {
      return useShopStore.getState().getPlasmaJob(plasmaJobId);
    },
    getPrintView(plasmaJobId) {
      return useShopStore.getState().getPlasmaPrintView(plasmaJobId);
    },
    listStandalone() {
      return useShopStore.getState().listStandalonePlasmaJobs();
    },
    linkToSalesOrder(plasmaJobId, salesOrderId) {
      return useShopStore.getState().linkPlasmaJobToSalesOrder(plasmaJobId, salesOrderId);
    },
    updateJob(id, patch) {
      return useShopStore.getState().updatePlasmaJob(id, patch);
    },
    upsertLine(jobId, line) {
      return useShopStore.getState().upsertPlasmaJobLine(jobId, line);
    },
    deleteLine(lineId) {
      return useShopStore.getState().deletePlasmaJobLine(lineId);
    },
    recalc(jobId, settingsOverride) {
      return useShopStore.getState().recalculatePlasmaJob(jobId, settingsOverride);
    },
    postToWorkOrder(plasmaJobId) {
      return useShopStore.getState().postPlasmaJobToWorkOrder(plasmaJobId);
    },
    postToSalesOrder(plasmaJobId) {
      return useShopStore.getState().postPlasmaJobToSalesOrder(plasmaJobId);
    },
    attachments: {
      list(plasmaJobId) {
        return useShopStore.getState().listPlasmaAttachments(plasmaJobId);
      },
      add(plasmaJobId, file, options) {
        return useShopStore.getState().addPlasmaAttachment(plasmaJobId, file, options);
      },
      remove(attachmentId) {
        return useShopStore.getState().removePlasmaAttachment(attachmentId);
      },
      update(attachmentId, patch) {
        return useShopStore.getState().updatePlasmaAttachment(attachmentId, patch);
      },
    },
    remnants: {
      list() {
        return useShopStore.getState().listRemnants();
      },
      create(remnant) {
        return useShopStore.getState().createRemnant(remnant);
      },
      update(id, patch) {
        return useShopStore.getState().updateRemnant(id, patch);
      },
      remove(id) {
        return useShopStore.getState().removeRemnant(id);
      },
      consume(id) {
        return useShopStore.getState().consumeRemnant(id);
      },
    },
    templates: {
      list() {
        return useShopStore.getState().listPlasmaTemplates();
      },
      get(templateId) {
        return useShopStore.getState().getPlasmaTemplate(templateId);
      },
      create(payload) {
        return useShopStore.getState().createPlasmaTemplate(payload);
      },
      update(templateId, patch) {
        return useShopStore.getState().updatePlasmaTemplate(templateId, patch);
      },
      remove(templateId) {
        return useShopStore.getState().removePlasmaTemplate(templateId);
      },
      addLine(templateId, line) {
        return useShopStore.getState().addPlasmaTemplateLine(templateId, line);
      },
      updateLine(lineId, patch) {
        return useShopStore.getState().updatePlasmaTemplateLine(lineId, patch);
      },
      removeLine(lineId) {
        return useShopStore.getState().removePlasmaTemplateLine(lineId);
      },
      applyToJob(templateId, plasmaJobId) {
        return useShopStore.getState().applyPlasmaTemplateToJob(templateId, plasmaJobId);
      },
    },
  },
};
