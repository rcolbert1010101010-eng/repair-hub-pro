import { Router, type Request, type Response } from "express";

type Vendor = Record<string, any>;

let vendorsStore: Vendor[] = [];

export const vendorsRouter = Router();

/**
 * GET /vendors
 * Returns all vendors in memory.
 */
vendorsRouter.get("/vendors", (req: Request, res: Response) => {
  res.json(vendorsStore);
});

/**
 * POST /vendors
 * Creates a new vendor.
 * - Accepts arbitrary shape from the client.
 * - If id is missing, generates a simple string id.
 * - Adds created_at / updated_at timestamps if not present.
 */
vendorsRouter.post("/vendors", (req: Request, res: Response) => {
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const now = new Date().toISOString();
  const id = (body as any).id ?? Date.now().toString();

  const vendor: Vendor = {
    ...body,
    id,
    created_at: (body as any).created_at ?? now,
    updated_at: now
  };

  vendorsStore.push(vendor);

  return res.status(201).json(vendor);
});

/**
 * PUT /vendors/:id
 * Updates an existing vendor by id.
 * - Performs a shallow merge of the payload onto the existing vendor.
 * - Updates updated_at timestamp.
 */
vendorsRouter.put("/vendors/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const index = vendorsStore.findIndex((v) => String((v as any).id) === String(id));

  if (index === -1) {
    return res.status(404).json({ error: "Vendor not found" });
  }

  const existing = vendorsStore[index];
  const now = new Date().toISOString();

  const updated: Vendor = {
    ...existing,
    ...body,
    id: (existing as any).id, // never change id
    updated_at: now
  };

  vendorsStore[index] = updated;

  return res.json(updated);
});
