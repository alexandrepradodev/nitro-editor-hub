import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth";
import { createUserController, listUsersController } from "./users.controller";

export const usersRoutes = Router();

usersRoutes.use(authMiddleware);

usersRoutes.get("/", listUsersController);
usersRoutes.post("/", createUserController);
