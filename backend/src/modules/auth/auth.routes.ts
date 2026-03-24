import { Router } from "express";
import { meController, loginController } from "./auth.controller";
import { authMiddleware } from "../../middlewares/auth";

export const authRoutes = Router();

authRoutes.post("/login", loginController);
authRoutes.get("/me", authMiddleware, meController);
