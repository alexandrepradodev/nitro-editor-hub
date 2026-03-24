import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import {
  createEditorController,
  listEditorsController,
  updateEditorStatusController,
  updateEditorController,
} from "./editors.controller";

export const editorsRoutes = Router();

editorsRoutes.use(authMiddleware);

editorsRoutes.get("/", listEditorsController);
editorsRoutes.post("/", createEditorController);
editorsRoutes.patch("/:id", updateEditorController);
editorsRoutes.patch("/:id/status", updateEditorStatusController);
