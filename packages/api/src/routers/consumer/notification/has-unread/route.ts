import { z } from "zod";
import { protectedProcedure } from "../../../../index";
import { handler } from "./handler";

export const notificationHasUnreadRoute = protectedProcedure
  .input(z.void())
  .output(z.boolean())
  .query(handler);
