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

export type AvailabilitySlot = {
  id: number;
  instructorId: number;
  slotDate: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

// Third duplication of this helper across services (instructor, booking, now
// availability). Still local rather than promoted to a shared module — the
// three services don't otherwise share anything, so a shared lib would be
// more boilerplate than value. Promote on the fourth duplication.
function isFutureSlot(slotDate: string, startTime: string): boolean {
  const slotMoment = new Date(`${slotDate}T${startTime}`);
  if (isNaN(slotMoment.getTime())) return false;
  return slotMoment.getTime() > Date.now();
}

export async function createAvailability(
  instructorId: number,
  input: { slotDate: string; startTime: string; endTime: string }
): Promise<AvailabilitySlot> {
  const { slotDate, startTime, endTime } = input;

  if (!DATE_RE.test(slotDate)) {
    throw new ValidationError("slotDate must be formatted as YYYY-MM-DD");
  }
  if (!TIME_RE.test(startTime)) {
    throw new ValidationError("startTime must be formatted as HH:MM");
  }
  if (!TIME_RE.test(endTime)) {
    throw new ValidationError("endTime must be formatted as HH:MM");
  }
  // Lex compare is safe here because the regex guarantees both sides are
  // zero-padded HH:MM. Do NOT relax the regex without revisiting this check.
  if (endTime <= startTime) {
    throw new ValidationError("endTime must be after startTime");
  }
  if (!isFutureSlot(slotDate, startTime)) {
    throw new ValidationError("cannot create a slot in the past");
  }

  const created = await prisma.availability.create({
    data: { instructorId, slotDate, startTime, endTime, isBooked: false },
    select: {
      id: true,
      instructorId: true,
      slotDate: true,
      startTime: true,
      endTime: true,
      isBooked: true,
    },
  });

  return created;
}

// Returns all availability slots for this instructor, newest first.
export async function listMyAvailability(
  instructorId: number
): Promise<AvailabilitySlot[]> {
  return prisma.availability.findMany({
    where: { instructorId },
    select: {
      id: true,
      instructorId: true,
      slotDate: true,
      startTime: true,
      endTime: true,
      isBooked: true,
    },
    orderBy: [{ slotDate: "desc" }, { startTime: "desc" }],
  });
}

export async function deleteAvailability(
  instructorId: number,
  availabilityId: number
): Promise<void> {
  const row = await prisma.availability.findUnique({
    where: { id: availabilityId },
    select: { id: true, instructorId: true, isBooked: true },
  });

  if (!row) {
    throw new NotFoundError("availability slot not found");
  }
  // Resource-level auth in the service, matching booking cancellation.
  if (row.instructorId !== instructorId) {
    throw new ForbiddenError("you can only delete your own slots");
  }
  // Guard: don't let an instructor yank a slot out from under a confirmed
  // booking. The workaround is the Phase 6 cancel flow (learner cancels).
  if (row.isBooked) {
    throw new ConflictError("cannot delete a slot that has been booked");
  }

  await prisma.availability.delete({ where: { id: availabilityId } });
}
