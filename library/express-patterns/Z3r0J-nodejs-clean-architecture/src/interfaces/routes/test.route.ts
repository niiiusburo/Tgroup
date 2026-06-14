import { TestController } from "@controllers/test.controller";
import { apiKeyMiddleware } from "@middlewares/apikey.middleware";
import { Router } from "express";
import type { DependencyContainer } from "tsyringe";

export const buildTestRoute = (container: DependencyContainer): Router => {
  const router = Router();
  const controller = container.resolve(TestController);

  router.get("/", controller.getAll);
  router.get("/authorized", apiKeyMiddleware, controller.getAll);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  router.post("/unique", controller.createUnique);
  router.put("/:id", controller.update);

  return router;
};
