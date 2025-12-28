import { Router, type Request, type Response } from "express";

type Unit = Record<string, any>;

let unitsStore: Unit[] = [];

export const unitsRouter = Router();

/**
 * GET /units
 * Returns all units in memory.
 */
unitsRouter.get("/units", (req: Request, res: Response) => {
  res.json(unitsStore);
});

/**
 * POST /units
 * Creates a new unit.
 * - Accepts arbitrary shape from the client.
 * - If id is missing, generates a simple string id.
 * - Adds created_at / updated_at timestamps if not present.
 * - Enforces uniqueness:
 *   - vin (non-empty) globally unique
 *   - unit_name unique per customer_id
 */
unitsRouter.post("/units", (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const now = new Date().toISOString();
  const id = (body as any).id ?? Date.now().toString();

  const vin =
    typeof (body as any).vin === "string" ? (body as any).vin.trim() : "";
  const unitName =
    typeof (body as any).unit_name === "string"
      ? (body as any).unit_name.trim()
      : "";
  const customerId = (body as any).customer_id;

  // Enforce unique VIN (non-empty, global)
  if (
    vin &&
    unitsStore.some((u) => {
      const existingVin =
        typeof (u as any).vin === "string" ? (u as any).vin.trim() : "";
      return existingVin === vin;
    })
  ) {
    return res.status(409).json({ error: "UNIT_VIN_NOT_UNIQUE" });
  }

  // Enforce unique unit_name per customer_id (when both present)
  if (
    unitName &&
    customerId &&
    unitsStore.some((u) => {
      const existingName =
        typeof (u as any).unit_name === "string"
          ? (u as any).unit_name.trim()
          : "";
      const existingCustomerId = (u as any).customer_id;
      return (
        existingCustomerId != null &&
        String(existingCustomerId) === String(customerId) &&
        existingName === unitName
      );
    })
  ) {
    return res
      .status(409)
      .json({ error: "UNIT_NAME_NOT_UNIQUE_FOR_CUSTOMER" });
  }

  const unit: Unit = {
    ...body,
    id,
    created_at: (body as any).created_at ?? now,
    updated_at: now,
  };

  unitsStore.push(unit);

  return res.status(201).json(unit);
});

/**
 * PUT /units/:id
 * Updates an existing unit by id.
 * - Performs a shallow merge of the payload onto the existing unit.
 * - Updates updated_at timestamp.
 * - Enforces uniqueness:
 *   - vin (non-empty) globally unique (excluding self)
 *   - unit_name unique per customer_id (excluding self)
 */
unitsRouter.put("/units/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const index = unitsStore.findIndex(
    (u) => String((u as any).id) === String(id)
  );

  if (index === -1) {
    return res.status(404).json({ error: "Unit not found" });
  }

  const existing = unitsStore[index];

  const vinFromBody =
    typeof (body as any).vin === "string"
      ? (body as any).vin.trim()
      : undefined;
  const nameFromBody =
    typeof (body as any).unit_name === "string"
      ? (body as any).unit_name.trim()
      : undefined;

  const newVin =
    typeof vinFromBody === "string" ? vinFromBody : (existing as any).vin;
  const newUnitName =
    typeof nameFromBody === "string"
      ? nameFromBody
      : (existing as any).unit_name;
  const newCustomerId =
    (body as any).customer_id ?? (existing as any).customer_id;

  // Enforce unique VIN (if non-empty, excluding self)
  if (
    newVin &&
    unitsStore.some((u) => {
      if (String((u as any).id) === String(id)) return false;
      const existingVin =
        typeof (u as any).vin === "string" ? (u as any).vin.trim() : "";
      return existingVin === newVin;
    })
  ) {
    return res.status(409).json({ error: "UNIT_VIN_NOT_UNIQUE" });
  }

  // Enforce unique unit_name per customer_id (excluding self)
  if (
    newUnitName &&
    newCustomerId &&
    unitsStore.some((u) => {
      if (String((u as any).id) === String(id)) return false;
      const existingName =
        typeof (u as any).unit_name === "string"
          ? (u as any).unit_name.trim()
          : "";
      const existingCustomerId = (u as any).customer_id;
      return (
        existingCustomerId != null &&
        String(existingCustomerId) === String(newCustomerId) &&
        existingName === newUnitName
      );
    })
  ) {
    return res
      .status(409)
      .json({ error: "UNIT_NAME_NOT_UNIQUE_FOR_CUSTOMER" });
  }

  const now = new Date().toISOString();

  const updated: Unit = {
    ...existing,
    ...body,
    id: (existing as any).id, // never change id
    updated_at: now,
  };

  unitsStore[index] = updated;

  return res.json(updated);
});
