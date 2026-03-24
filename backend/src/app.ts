import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/error-handler";
import { authRoutes } from "./modules/auth/auth.routes";
import { deliveriesRoutes } from "./modules/deliveries/deliveries.routes";
import { editorsRoutes } from "./modules/editors/editors.routes";
import { adCreativesRoutes } from "./modules/ad-creatives/ad-creatives.routes";
import { ratesRoutes } from "./modules/rates/rates.routes";
import { qualityRoutes } from "./modules/quality/quality.routes";
import { closingRoutes } from "./modules/closing/closing.routes";
import { performanceRoutes } from "./modules/performance/performance.routes";
import { prisma } from "./lib/prisma";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Quando a requisição vem de um navegador, `origin` vem preenchido.
      // Em chamadas server-to-server, `origin` pode ser `undefined`.
      if (!origin) return callback(null, true);

      // Sempre permita a origem configurada
      if (origin === env.FRONTEND_URL) return callback(null, true);

      // Facilita dev quando o Vite muda para outra porta (ex.: 5174).
      if (origin.startsWith("http://localhost:")) return callback(null, true);

      return callback(new Error(`Origem nao permitida: ${origin}`), false);
    },
  })
);
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (_req, res) => {
  return res.status(200).json({ service: "nitro-hub-editor-backend", status: "ok" });
});

app.get("/db-check", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ database: "connected", status: "ok" });
  } catch (error) {
    console.error("Erro no db-check:", error);
    return res.status(500).json({ database: "disconnected", status: "error" });
  }
});

app.use("/auth", authRoutes);
app.use("/editors", editorsRoutes);
app.use("/rates", ratesRoutes);
app.use("/deliveries", deliveriesRoutes);
app.use("/ad-creatives", adCreativesRoutes);
app.use("/quality", qualityRoutes);
app.use("/closing", closingRoutes);
app.use("/performance", performanceRoutes);

app.use(errorHandler);
