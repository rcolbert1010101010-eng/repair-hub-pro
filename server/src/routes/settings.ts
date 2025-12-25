import { Router, Request, Response } from "express";

interface Settings {
  id: string;
  shop_name: string;
  default_labor_rate: number;
  default_tax_rate: number;
  currency: string;
  units: string;
}

const router = Router();

// In-memory settings store (global for now; can be made per-tenant later)
let currentSettings: Settings | null = null;

function getDefaultSettings(): Settings {
  return {
    id: "default",
    shop_name: "Heavy-Duty Repair Shop",
    default_labor_rate: 125,
    default_tax_rate: 8.25,
    currency: "USD",
    units: "imperial"
  };
}

router.get("/settings", (req: Request, res: Response) => {
  // tenantId is available at res.locals.tenantId if needed later
  const settings = currentSettings ?? getDefaultSettings();
  return res.json(settings);
});

router.put("/settings", (req: Request, res: Response) => {
  // tenantId is available at res.locals.tenantId if needed later
  const payload = req.body;

  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ error: "Invalid settings payload" });
  }

  currentSettings = payload as Settings;
  return res.json(currentSettings);
});

export { router as settingsRouter };
