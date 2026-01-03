import { Router, Request, Response } from "express";

export interface SystemSettings {
  id: string;
  shop_name: string;
  default_labor_rate: number;
  default_tax_rate: number;
  currency: string;
  units: string;
}

// In-memory store for now (per-process, non-persistent)
let settingsStore: SystemSettings | null = null;

const DEFAULT_SETTINGS: SystemSettings = {
  id: "1",
  shop_name: "Heavy-Duty Repair Shop",
  default_labor_rate: 125,
  default_tax_rate: 0.07,
  currency: "USD",
  units: "imperial"
};

const router = Router();

// GET /api/v1/settings
router.get("/settings", (req: Request, res: Response) => {
  const current = settingsStore ?? DEFAULT_SETTINGS;
  // Seed the store on first read so subsequent PUTs have a base to merge into
  settingsStore = current;
  res.json(current);
});

// PUT /api/v1/settings
router.put("/settings", (req: Request, res: Response) => {
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid settings payload" });
  }

  const current = settingsStore ?? DEFAULT_SETTINGS;
  const payload = body as Partial<SystemSettings>;

  const updated: SystemSettings = {
    ...current,
    ...payload,
    id: current.id // keep id stable
  };

  settingsStore = updated;

  return res.json(updated);
});

export { router as settingsRouter };
