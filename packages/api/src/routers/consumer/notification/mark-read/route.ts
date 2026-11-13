import { z } from "zod";
import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

const notificationMarkReadInputSchema = z.object({ id: z.string().min(1) });
const notificationMarkReadOutputSchema = z.object({ isRead: z.boolean() });
export type NotificationMarkReadInput = z.infer<typeof notificationMarkReadInputSchema>;

export const notificationMarkReadRoute = protectedProcedure
  .input(notificationMarkReadInputSchema)
  .output(notificationMarkReadOutputSchema)
  .mutation(handler);
