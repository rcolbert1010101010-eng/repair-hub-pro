import { Router, type Request, type Response } from "express";

type Part = Record<string, any>;

let partsStore: Part[] = [];

export const partsRouter = Router();

/**
 * GET /parts
 * Returns all parts in memory.
 */
partsRouter.get("/parts", (req: Request, res: Response) => {
  res.json(partsStore);
});

/**
 * POST /parts
 * Creates a new part.
 * - Accepts arbitrary shape from the client.
 * - If id is missing, generates a simple string id.
 * - Adds created_at / updated_at timestamps if not present.
 */
partsRouter.post("/parts", (req: Request, res: Response) => {
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const now = new Date().toISOString();
  const id = (body as any).id ?? Date.now().toString();

  const part: Part = {
    ...body,
    id,
    created_at: (body as any).created_at ?? now,
    updated_at: now
  };

  partsStore.push(part);

  return res.status(201).json(part);
});

/**
 * PUT /parts/:id
 * Updates an existing part by id.
 * - Performs a shallow merge of the payload onto the existing part.
 * - Updates updated_at timestamp.
 */
partsRouter.put("/parts/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const index = partsStore.findIndex((p) => String((p as any).id) === String(id));

  if (index === -1) {
    return res.status(404).json({ error: "Part not found" });
  }

  const existing = partsStore[index];
  const now = new Date().toISOString();

  const updated: Part = {
    ...existing,
    ...body,
    id: (existing as any).id, // never change id
    updated_at: now
  };

  partsStore[index] = updated;

  return res.json(updated);
});
