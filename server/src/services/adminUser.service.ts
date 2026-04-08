import { prisma } from "../lib/prisma";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
};

const VALID_ROLES = ["learner", "instructor", "admin"] as const;

export async function listUsers(roleFilter?: string): Promise<AdminUser[]> {
  if (roleFilter !== undefined) {
    if (!VALID_ROLES.includes(roleFilter as (typeof VALID_ROLES)[number])) {
      throw new ValidationError(
        `role must be one of: ${VALID_ROLES.join(", ")}`
      );
    }
  }

  // CLAUDE.md rule #5: explicit select clause — NEVER include passwordHash.
  return prisma.user.findMany({
    where: roleFilter ? { role: roleFilter } : {},
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function deleteUser(
  callerId: number,
  targetId: number
): Promise<void> {
  // Self-delete guard — an admin deleting themselves mid-session is surprising
  // even if the last-admin guard would also catch it.
  if (callerId === targetId) {
    throw new ConflictError("admins cannot delete themselves");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true },
  });
  if (!target) {
    throw new NotFoundError("user not found");
  }

  // Last-admin guard — don't let the platform become unadministrable.
  if (target.role === "admin") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      throw new ConflictError("cannot delete the last admin");
    }
  }

  // Schema cascades (onDelete: Cascade) clean up related rows.
  await prisma.user.delete({ where: { id: targetId } });
}
