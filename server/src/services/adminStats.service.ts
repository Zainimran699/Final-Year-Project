import { prisma } from "../lib/prisma";

export type AdminStats = {
  users: {
    total: number;
    learners: number;
    instructors: number;
    admins: number;
  };
  questions: {
    theory: number;
    hazard: number;
  };
  tests: {
    theoryAttempts: number;
    theoryPassed: number;
    hazardAttempts: number;
    hazardPassed: number;
  };
  bookings: {
    total: number;
    confirmed: number;
    cancelled: number;
  };
  availability: {
    total: number;
    booked: number;
  };
};

export async function getStats(): Promise<AdminStats> {
  // Fire all count queries in parallel via a Prisma read transaction.
  // 15 cheap count()s in one round-trip to the pooler.
  const [
    totalUsers,
    learners,
    instructors,
    admins,
    theoryQs,
    hazardQs,
    theoryAttempts,
    theoryPassed,
    hazardAttempts,
    hazardPassed,
    bookingsTotal,
    bookingsConfirmed,
    bookingsCancelled,
    availTotal,
    availBooked,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { role: "learner" } }),
    prisma.user.count({ where: { role: "instructor" } }),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.theoryQuestion.count(),
    prisma.hazardQuestion.count(),
    prisma.testResult.count({ where: { type: "theory" } }),
    prisma.testResult.count({ where: { type: "theory", passed: true } }),
    prisma.testResult.count({ where: { type: "hazard" } }),
    prisma.testResult.count({ where: { type: "hazard", passed: true } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "confirmed" } }),
    prisma.booking.count({ where: { status: "cancelled" } }),
    prisma.availability.count(),
    prisma.availability.count({ where: { isBooked: true } }),
  ]);

  return {
    users: {
      total: totalUsers,
      learners,
      instructors,
      admins,
    },
    questions: {
      theory: theoryQs,
      hazard: hazardQs,
    },
    tests: {
      theoryAttempts,
      theoryPassed,
      hazardAttempts,
      hazardPassed,
    },
    bookings: {
      total: bookingsTotal,
      confirmed: bookingsConfirmed,
      cancelled: bookingsCancelled,
    },
    availability: {
      total: availTotal,
      booked: availBooked,
    },
  };
}
