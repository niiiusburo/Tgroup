import "reflect-metadata";
import { config } from "dotenv";

// In production (Docker / hosted) env vars are injected by the platform.
// In development we load src/.env for convenience.
if (process.env.NODE_ENV !== "production") {
  config({ path: "src/.env", encoding: "latin1" });
}

import { buildContainer } from "@container/index";
import { ExpressConfig } from "@express-config";
import { Logger } from "@helpers/logger";
import type { ILogger } from "@interfaces/common/ILogger";
import { AppDataSource } from "@typeorm-config";
import express from "express";

const main = async () => {
  const typeORM = await AppDataSource.initialize();
  if (!typeORM.isInitialized) return;

  const logger: ILogger<ExpressConfig> = new Logger<ExpressConfig>();
  logger.logInformation("🔗 Connected to database using TypeORM. Starting server... 🚀");

  const container = buildContainer(typeORM);
  const app = express();
  await new ExpressConfig(app).init(container);
};

main();
