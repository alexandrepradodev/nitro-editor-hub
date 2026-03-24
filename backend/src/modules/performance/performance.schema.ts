import { z } from "zod";

export const performanceSummaryQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  editorIds: z.string().optional(),
  types: z.string().optional(),
});

export type PerformanceSummaryQuery = z.infer<typeof performanceSummaryQuerySchema>;

