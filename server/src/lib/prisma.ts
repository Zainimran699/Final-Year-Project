import { PrismaClient } from "@prisma/client";

// Singleton PrismaClient — nodemon hot-reloads spawn many instances otherwise,
// exhausting the Supabase pooler in dev. Every service should import from here.
export const prisma = new PrismaClient();
