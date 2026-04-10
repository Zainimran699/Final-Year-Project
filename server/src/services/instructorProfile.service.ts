import { prisma } from "../lib/prisma";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export type ProfileData = {
  bio: string | null;
  location: string;
  hourlyRate: number;
};

// Returns the calling instructor's profile, or null if not yet created.
export async function getMyProfile(
  userId: number
): Promise<ProfileData | null> {
  const row = await prisma.instructorProfile.findUnique({
    where: { userId },
    select: { bio: true, location: true, hourlyRate: true },
  });
  return row;
}

// Creates or updates the instructor profile (upsert).
export async function upsertProfile(
  userId: number,
  input: { bio?: string; location: string; hourlyRate: number }
): Promise<ProfileData> {
  const { bio, location, hourlyRate } = input;

  if (typeof location !== "string" || location.trim().length === 0) {
    throw new ValidationError("location is required");
  }
  if (typeof hourlyRate !== "number" || hourlyRate <= 0) {
    throw new ValidationError("hourlyRate must be a positive number");
  }

  const profile = await prisma.instructorProfile.upsert({
    where: { userId },
    update: { bio: bio ?? null, location: location.trim(), hourlyRate },
    create: {
      userId,
      bio: bio ?? null,
      location: location.trim(),
      hourlyRate,
    },
    select: { bio: true, location: true, hourlyRate: true },
  });

  return profile;
}
