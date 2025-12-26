import type { Request, Response } from "express";

import { tenantMiddleware } from "./middleware/tenant";
import { authStubMiddleware } from "./middleware/authStub";
import { settingsRouter } from "./routes/settings";

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
