import { Prisma } from "@prisma/client";
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

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type BookingWithDetails = {
  id: number;
  status: string;
  createdAt: Date;
  instructor: { id: number; name: string };
  availability: {
    id: number;
    slotDate: string;
    startTime: string;
    endTime: string;
  };
};

const bookingDetailsSelect = {
  id: true,
  status: true,
  createdAt: true,
  instructor: { select: { id: true, name: true } },
  availability: {
    select: {
      id: true,
      slotDate: true,
      startTime: true,
      endTime: true,
    },
  },
} as const;

function isPastSlot(slotDate: string, startTime: string): boolean {
  const slotMoment = new Date(`${slotDate}T${startTime}`);
  return slotMoment.getTime() <= Date.now();
}

export async function createBooking(
  learnerId: number,
  availabilityId: number
): Promise<BookingWithDetails> {
  // Cheap pre-check: load the slot once outside the transaction so we can
  // fail fast on obvious problems (missing, already booked, in the past)
  // without paying the cost of opening a tx. The real defence is the
  // re-read inside the transaction below.
  const pre = await prisma.availability.findUnique({
    where: { id: availabilityId },
  });

  if (!pre) {
    throw new NotFoundError("availability slot not found");
  }
  if (pre.isBooked) {
    throw new ConflictError("slot already booked");
  }
  if (isPastSlot(pre.slotDate, pre.startTime)) {
    throw new ValidationError("cannot book a slot in the past");
  }

  try {
    // CLAUDE.md rule #3: re-check inside the transaction, then create the
    // booking and flip isBooked, all atomically.
    return await prisma.$transaction(async (tx) => {
      const fresh = await tx.availability.findUnique({
        where: { id: availabilityId },
      });
      if (!fresh) {
        throw new NotFoundError("availability slot not found");
      }
      if (fresh.isBooked) {
        throw new ConflictError("slot already booked");
      }

      const booking = await tx.booking.create({
        data: {
          learnerId,
          instructorId: fresh.instructorId,
          availabilityId,
          status: "confirmed",
        },
        select: bookingDetailsSelect,
      });

      await tx.availability.update({
        where: { id: availabilityId },
        data: { isBooked: true },
      });

      return booking;
    });
  } catch (err) {
    // Schema-level defence: Booking.availabilityId @unique. If two requests
    // race past both the cheap pre-check and the in-tx re-read, Postgres
    // itself rejects the second insert with P2002.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new ConflictError("slot already booked");
    }
    throw err;
  }
}

export async function listMyBookings(
  learnerId: number
): Promise<BookingWithDetails[]> {
  return prisma.booking.findMany({
    where: { learnerId },
    select: bookingDetailsSelect,
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function cancelBooking(
  learnerId: number,
  bookingId: number
): Promise<BookingWithDetails> {
  const existing = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, learnerId: true, status: true, availabilityId: true },
  });

  if (!existing) {
    throw new NotFoundError("booking not found");
  }
  // Resource-level auth lives in the service, not the controller — services
  // own business logic, controllers only validate HTTP-shaped input.
  if (existing.learnerId !== learnerId) {
    throw new ForbiddenError("you can only cancel your own bookings");
  }
  // Idempotency: rejecting double-cancels keeps us from flipping isBooked
  // back and forth on a re-clicked button.
  if (existing.status === "cancelled") {
    throw new ConflictError("booking already cancelled");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled" },
      select: bookingDetailsSelect,
    });

    await tx.availability.update({
      where: { id: existing.availabilityId },
      data: { isBooked: false },
    });

    return updated;
  });
}
