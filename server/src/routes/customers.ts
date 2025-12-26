import { Router, type Request, type Response } from "express";

type Customer = Record<string, any>;

let customersStore: Customer[] = [];

export const customersRouter = Router();

/**
 * GET /customers
 * Returns all customers in memory.
 */
customersRouter.get("/customers", (req: Request, res: Response) => {
  res.json(customersStore);
});

/**
 * POST /customers
 * Creates a new customer.
 * - Accepts arbitrary shape from the client.
 * - If id is missing, generates a simple string id.
 * - Adds created_at / updated_at timestamps if not present.
 */
customersRouter.post("/customers", (req: Request, res: Response) => {
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const now = new Date().toISOString();
  const id = (body as any).id ?? Date.now().toString();

  const customer: Customer = {
    ...body,
    id,
    created_at: (body as any).created_at ?? now,
    updated_at: now
  };

  customersStore.push(customer);

  return res.status(201).json(customer);
});

/**
 * PUT /customers/:id
 * Updates an existing customer by id.
 * - Performs a shallow merge of the payload onto the existing customer.
 * - Updates updated_at timestamp.
 */
customersRouter.put("/customers/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const index = customersStore.findIndex((c) => String((c as any).id) === String(id));

  if (index === -1) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const existing = customersStore[index];
  const now = new Date().toISOString();

  const updated: Customer = {
    ...existing,
    ...body,
    id: (existing as any).id, // never change id
    updated_at: now
  };

  customersStore[index] = updated;

  return res.json(updated);
});
