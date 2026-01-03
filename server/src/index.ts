import type { Request, Response } from "express";

import { tenantMiddleware } from "./middleware/tenant";
import { authStubMiddleware } from "./middleware/authStub";
import { settingsRouter } from "./routes/settings";
import { customersRouter } from "./routes/customers";
import { unitsRouter } from "./routes/units";
import { vendorsRouter } from "./routes/vendors";
import { categoriesRouter } from "./routes/categories";
import { partsRouter } from "./routes/parts";
import { techniciansRouter } from "./routes/technicians";

const express = require("express") as typeof import("express");
const cors = require("cors") as typeof import("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use(authStubMiddleware);
app.use(tenantMiddleware);

const API_PREFIX = "/api/v1";

// Mount settings router under the API prefix
app.use(API_PREFIX, settingsRouter);
app.use(API_PREFIX, customersRouter);
app.use(API_PREFIX, unitsRouter);
app.use(API_PREFIX, vendorsRouter);
app.use(API_PREFIX, categoriesRouter);
app.use(API_PREFIX, partsRouter);
app.use(API_PREFIX, techniciansRouter);

app.get(`${API_PREFIX}/health`, (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "repair-hub-pro-api",
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${PORT}${API_PREFIX}/health`);
});
