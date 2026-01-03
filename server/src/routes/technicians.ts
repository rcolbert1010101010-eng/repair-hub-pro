import { Router, type Request, type Response } from "express";

type Technician = Record<string, any>;

let techniciansStore: Technician[] = [];

export const techniciansRouter = Router();

/**
 * GET /technicians
 * Returns all technicians in memory.
 */
techniciansRouter.get("/technicians", (req: Request, res: Response) => {
  res.json(techniciansStore);
});

/**
 * POST /technicians
 * Creates a new technician.
 * - Accepts arbitrary shape from the client.
 * - If id is missing, generates a simple string id.
 * - Adds created_at / updated_at timestamps if not present.
 */
techniciansRouter.post("/technicians", (req: Request, res: Response) => {
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const now = new Date().toISOString();
  const id = (body as any).id ?? Date.now().toString();

  const technician: Technician = {
    ...body,
    id,
    created_at: (body as any).created_at ?? now,
    updated_at: now
  };

  techniciansStore.push(technician);

  return res.status(201).json(technician);
});

/**
 * PUT /technicians/:id
 * Updates an existing technician by id.
 * - Performs a shallow merge of the payload onto the existing technician.
 * - Updates updated_at timestamp.
 */
techniciansRouter.put("/technicians/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const index = techniciansStore.findIndex((t) => String((t as any).id) === String(id));

  if (index === -1) {
    return res.status(404).json({ error: "Technician not found" });
  }

  const existing = techniciansStore[index];
  const now = new Date().toISOString();

  const updated: Technician = {
    ...existing,
    ...body,
    id: (existing as any).id, // never change id
    updated_at: now
  };

  techniciansStore[index] = updated;

  return res.json(updated);
});
