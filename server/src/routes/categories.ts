import { Router, type Request, type Response } from "express";

type Category = Record<string, any>;

let categoriesStore: Category[] = [];

export const categoriesRouter = Router();

/**
 * GET /categories
 * Returns all categories in memory.
 */
categoriesRouter.get("/categories", (req: Request, res: Response) => {
  res.json(categoriesStore);
});

/**
 * POST /categories
 * Creates a new category.
 * - Accepts arbitrary shape from the client.
 * - If id is missing, generates a simple string id.
 * - Adds created_at / updated_at timestamps if not present.
 */
categoriesRouter.post("/categories", (req: Request, res: Response) => {
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const now = new Date().toISOString();
  const id = (body as any).id ?? Date.now().toString();

  const category: Category = {
    ...body,
    id,
    created_at: (body as any).created_at ?? now,
    updated_at: now
  };

  categoriesStore.push(category);

  return res.status(201).json(category);
});

/**
 * PUT /categories/:id
 * Updates an existing category by id.
 * - Performs a shallow merge of the payload onto the existing category.
 * - Updates updated_at timestamp.
 */
categoriesRouter.put("/categories/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const index = categoriesStore.findIndex((c) => String((c as any).id) === String(id));

  if (index === -1) {
    return res.status(404).json({ error: "Category not found" });
  }

  const existing = categoriesStore[index];
  const now = new Date().toISOString();

  const updated: Category = {
    ...existing,
    ...body,
    id: (existing as any).id, // never change id
    updated_at: now
  };

  categoriesStore[index] = updated;

  return res.json(updated);
});
