import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

// Local error classes — promoted to a shared module if/when other services need them.
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

const BCRYPT_COST = 10; // matches seed.ts
const JWT_EXPIRES_IN = "7d";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: "learner" | "instructor" | "admin";
  location?: string; // optional postcode/town at registration
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SafeUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export async function registerUser(input: RegisterInput): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("Email already in use");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      location: input.location?.trim() || null,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return user;
}

export async function loginUser(
  input: LoginInput
): Promise<{ token: string; user: SafeUser }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Same error message for "user not found" and "wrong password" — don't leak which.
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
