import { UserRole } from "@prisma/client";
import * as z from "zod";

export const userNameSchema = z.object({
  name: z.string().min(3).max(32),
});

export const userRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

// Book payload validation
export const bookSchema = z.object({
  title: z.string().min(1).max(120),
  // JSON payload for editor state
  data: z.any(),
})
