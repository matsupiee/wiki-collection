import { z } from "zod";
import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

const notificationListInputSchema = z.void();
const notificationListOutputSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    body: z.string(),
    createdAt: z.string(),
    isRead: z.boolean(),
  }),
);

export const notificationListRoute = protectedProcedure
  .input(notificationListInputSchema)
  .output(notificationListOutputSchema)
  .query(handler);
