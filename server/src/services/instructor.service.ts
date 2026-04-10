import { prisma } from "../lib/prisma";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export type PublicInstructor = {
  id: number;
  name: string;
  profile: {
    bio: string | null;
    location: string;
    hourlyRate: number;
  };
};

export type AvailabilitySlot = {
  id: number;
  slotDate: string;
  startTime: string;
  endTime: string;
};

export type InstructorWithSlots = PublicInstructor & {
  availability: AvailabilitySlot[];
};

// Past-slot guard. slotDate/startTime are String columns in the schema
// (a known limitation), so we filter in JS rather than the DB. Slot counts
// per instructor are small enough that this is cheap.
function isFutureSlot(slotDate: string, startTime: string): boolean {
  const slotMoment = new Date(`${slotDate}T${startTime}`);
  return slotMoment.getTime() > Date.now();
}

// Optional location filter — case-insensitive partial match on profile location.
export async function listInstructors(
  locationFilter?: string
): Promise<PublicInstructor[]> {
  // The `instructorProfile: { isNot: null }` filter is defensive — protects
  // against an instructor row without a profile (shouldn't exist, but the
  // schema permits it because InstructorProfile.userId is unique-not-required).
  const profileWhere: Record<string, unknown> = { isNot: null };
  if (locationFilter && locationFilter.trim().length > 0) {
    profileWhere.location = {
      contains: locationFilter.trim(),
      mode: "insensitive",
    };
  }

  const rows = await prisma.user.findMany({
    where: { role: "instructor", instructorProfile: profileWhere },
    select: {
      id: true,
      name: true,
      instructorProfile: {
        select: { bio: true, location: true, hourlyRate: true },
      },
    },
  });

  return rows
    .filter((r) => r.instructorProfile !== null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      profile: {
        bio: r.instructorProfile!.bio,
        location: r.instructorProfile!.location,
        hourlyRate: r.instructorProfile!.hourlyRate,
      },
    }));
}

export async function getInstructorById(
  id: number
): Promise<InstructorWithSlots> {
  const row = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      role: true,
      instructorProfile: {
        select: { bio: true, location: true, hourlyRate: true },
      },
      availabilities: {
        where: { isBooked: false },
        select: {
          id: true,
          slotDate: true,
          startTime: true,
          endTime: true,
        },
        orderBy: [{ slotDate: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!row || row.role !== "instructor" || !row.instructorProfile) {
    throw new NotFoundError("instructor not found");
  }

  const futureSlots = row.availabilities.filter((s) =>
    isFutureSlot(s.slotDate, s.startTime)
  );

  return {
    id: row.id,
    name: row.name,
    profile: {
      bio: row.instructorProfile.bio,
      location: row.instructorProfile.location,
      hourlyRate: row.instructorProfile.hourlyRate,
    },
    availability: futureSlots,
  };
}

export type InstructorBookingRow = {
  id: number;
  status: string;
  createdAt: Date;
  learner: { id: number; name: string };
  availability: {
    id: number;
    slotDate: string;
    startTime: string;
    endTime: string;
  };
};

export async function listMyBookings(
  instructorId: number
): Promise<InstructorBookingRow[]> {
  return prisma.booking.findMany({
    where: { instructorId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      learner: { select: { id: true, name: true } },
      availability: {
        select: {
          id: true,
          slotDate: true,
          startTime: true,
          endTime: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });
}
