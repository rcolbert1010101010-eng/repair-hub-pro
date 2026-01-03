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
 * - Enforces uniqueness:
 *   - company_name unique
 *   - phone (non-empty) unique
 */
customersRouter.post("/customers", (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const now = new Date().toISOString();
  const id = (body as any).id ?? Date.now().toString();

  const companyName =
    typeof (body as any).company_name === "string"
      ? (body as any).company_name.trim()
      : "";
  const phone =
    typeof (body as any).phone === "string"
      ? (body as any).phone.trim()
      : "";

  // Enforce unique company_name
  if (
    companyName &&
    customersStore.some((c) => {
      const existingName =
        typeof (c as any).company_name === "string"
          ? (c as any).company_name.trim()
          : "";
      return existingName === companyName;
    })
  ) {
    return res
      .status(409)
      .json({ error: "CUSTOMER_COMPANY_NAME_NOT_UNIQUE" });
  }

  // Enforce unique phone (non-empty)
  if (
    phone &&
    customersStore.some((c) => {
      const existingPhone =
        typeof (c as any).phone === "string"
          ? (c as any).phone.trim()
          : "";
      return existingPhone === phone;
    })
  ) {
    return res.status(409).json({ error: "CUSTOMER_PHONE_NOT_UNIQUE" });
  }

  const customer: Customer = {
    ...body,
    id,
    created_at: (body as any).created_at ?? now,
    updated_at: now,
  };

  customersStore.push(customer);

  return res.status(201).json(customer);
});

/**
 * PUT /customers/:id
 * Updates an existing customer by id.
 * - Performs a shallow merge of the payload onto the existing customer.
 * - Updates updated_at timestamp.
 * - Enforces uniqueness:
 *   - company_name unique (excluding self)
 *   - phone (non-empty) unique (excluding self)
 */
customersRouter.put("/customers/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be an object" });
  }

  const index = customersStore.findIndex(
    (c) => String((c as any).id) === String(id)
  );

  if (index === -1) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const existing = customersStore[index];

  const companyName =
    typeof (body as any).company_name === "string"
      ? (body as any).company_name.trim()
      : undefined;
  const phone =
    typeof (body as any).phone === "string"
      ? (body as any).phone.trim()
      : undefined;

  // Enforce unique company_name (if provided)
  if (
    typeof companyName === "string" &&
    companyName &&
    customersStore.some((c) => {
      if (String((c as any).id) === String(id)) return false;
      const existingName =
        typeof (c as any).company_name === "string"
          ? (c as any).company_name.trim()
          : "";
      return existingName === companyName;
    })
  ) {
    return res
      .status(409)
      .json({ error: "CUSTOMER_COMPANY_NAME_NOT_UNIQUE" });
  }

  // Enforce unique phone (if provided and non-empty)
  if (
    typeof phone === "string" &&
    phone &&
    customersStore.some((c) => {
      if (String((c as any).id) === String(id)) return false;
      const existingPhone =
        typeof (c as any).phone === "string"
          ? (c as any).phone.trim()
          : "";
      return existingPhone === phone;
    })
  ) {
    return res.status(409).json({ error: "CUSTOMER_PHONE_NOT_UNIQUE" });
  }

  const now = new Date().toISOString();

  const updated: Customer = {
    ...existing,
    ...body,
    id: (existing as any).id, // never change id
    updated_at: now,
  };

  customersStore[index] = updated;

  return res.json(updated);
});
