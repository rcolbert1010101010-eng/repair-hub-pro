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
 */
unitsRouter.post("/units", (req: Request, res: Response) => {
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const now = new Date().toISOString();
  const id = (body as any).id ?? Date.now().toString();

  const unit: Unit = {
    ...body,
    id,
    created_at: (body as any).created_at ?? now,
    updated_at: now
  };

  unitsStore.push(unit);

  return res.status(201).json(unit);
});

/**
 * PUT /units/:id
 * Updates an existing unit by id.
 * - Performs a shallow merge of the payload onto the existing unit.
 * - Updates updated_at timestamp.
 */
unitsRouter.put("/units/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const index = unitsStore.findIndex((u) => String((u as any).id) === String(id));

  if (index === -1) {
    return res.status(404).json({ error: "Unit not found" });
  }

  const existing = unitsStore[index];
  const now = new Date().toISOString();

  const updated: Unit = {
    ...existing,
    ...body,
    id: (existing as any).id, // never change id
    updated_at: now
  };

  unitsStore[index] = updated;

  return res.json(updated);
});
