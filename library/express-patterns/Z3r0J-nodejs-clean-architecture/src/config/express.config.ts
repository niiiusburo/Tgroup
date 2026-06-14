import { Logger } from "@helpers/logger";
import type { ILogger } from "@interfaces/common/ILogger";
import { ErrorHandler } from "@middlewares/error.handler.middleware";
import { buildTestRoute } from "@routes/test.route";
import cors from "cors";
import express, { type Express } from "express";
import type { DependencyContainer } from "tsyringe";

const parsePort = (raw: string | undefined): number => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3000;
};

export class ExpressConfig {
  private app: Express;
  private port = parsePort(process.env.PORT);
  _logger: ILogger<ExpressConfig> = new Logger<ExpressConfig>();

  constructor(express: Express) {
    this.app = express;
  }

  public async init(container: DependencyContainer): Promise<void> {
    try {
      this.app.use(express.json());
      this.app.use(express.urlencoded({ extended: false }));
      this.app.use(cors());
      this.app.use(buildTestRoute(container));
      this.app.use(ErrorHandler);
      this.app.listen(this.port, () => {
        this._logger.logInformation(
          `🚀 Server is running on port ${this.port}... 🔗 Click here to access http://localhost:${this.port}`
        );
      });
    } catch (error) {
      console.error(error);
    }
  }
}
