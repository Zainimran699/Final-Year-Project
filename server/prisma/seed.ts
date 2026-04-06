import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Wipe in FK-safe order so re-running the seed is idempotent.
  await prisma.booking.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.aIExplanation.deleteMany();
  await prisma.testResult.deleteMany();
  await prisma.instructorProfile.deleteMany();
  await prisma.theoryQuestion.deleteMany();
  await prisma.hazardQuestion.deleteMany();
  await prisma.user.deleteMany();

  // --- Users ---
  const adminHash = await bcrypt.hash("admin123", 10);
  const instructorHash = await bcrypt.hash("test123", 10);
  const learnerHash = await bcrypt.hash("test123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@test.com",
      passwordHash: adminHash,
      role: "admin",
    },
  });

  const instructor = await prisma.user.create({
    data: {
      name: "Sarah Instructor",
      email: "instructor@test.com",
      passwordHash: instructorHash,
      role: "instructor",
      instructorProfile: {
        create: {
          bio: "Friendly ADI with 8 years of experience.",
          location: "Manchester",
          hourlyRate: 35.0,
        },
      },
    },
  });

  const learner = await prisma.user.create({
    data: {
      name: "Liam Learner",
      email: "learner@test.com",
      passwordHash: learnerHash,
      role: "learner",
    },
  });

  // --- Theory questions (15 across 4 categories) ---
  await prisma.theoryQuestion.createMany({
    data: [
      // road signs (4)
      {
        questionText: "What does a red triangular sign indicate?",
        optionA: "Order",
        optionB: "Warning",
        optionC: "Information",
        optionD: "Direction",
        correctOption: "b",
        category: "road signs",
      },
      {
        questionText: "A circular sign with a red border means…",
        optionA: "Warning",
        optionB: "Prohibition",
        optionC: "Mandatory",
        optionD: "Information",
        correctOption: "b",
        category: "road signs",
      },
      {
        questionText: "What does a blue circular sign indicate?",
        optionA: "Warning",
        optionB: "Prohibition",
        optionC: "Mandatory instruction",
        optionD: "Tourist info",
        correctOption: "c",
        category: "road signs",
      },
      {
        questionText: "An octagonal sign always means…",
        optionA: "Give way",
        optionB: "Stop",
        optionC: "No entry",
        optionD: "Roundabout",
        correctOption: "b",
        category: "road signs",
      },

      // speed limits (4)
      {
        questionText:
          "Default speed limit on a single carriageway for cars in the UK?",
        optionA: "50 mph",
        optionB: "60 mph",
        optionC: "70 mph",
        optionD: "40 mph",
        correctOption: "b",
        category: "speed limits",
      },
      {
        questionText:
          "Default speed limit in a built-up area with street lighting?",
        optionA: "20 mph",
        optionB: "30 mph",
        optionC: "40 mph",
        optionD: "50 mph",
        correctOption: "b",
        category: "speed limits",
      },
      {
        questionText: "Default speed limit on a dual carriageway for cars?",
        optionA: "60 mph",
        optionB: "70 mph",
        optionC: "80 mph",
        optionD: "50 mph",
        correctOption: "b",
        category: "speed limits",
      },
      {
        questionText: "Speed limit when towing a trailer on a motorway?",
        optionA: "50 mph",
        optionB: "60 mph",
        optionC: "70 mph",
        optionD: "40 mph",
        correctOption: "b",
        category: "speed limits",
      },

      // safety (4)
      {
        questionText:
          "What is the safe stopping distance at 30 mph in good conditions?",
        optionA: "9 metres",
        optionB: "23 metres",
        optionC: "53 metres",
        optionD: "73 metres",
        correctOption: "b",
        category: "safety",
      },
      {
        questionText: "When should you use hazard warning lights while driving?",
        optionA: "When parking illegally",
        optionB: "To warn of a hazard ahead on a motorway",
        optionC: "In fog",
        optionD: "When reversing",
        correctOption: "b",
        category: "safety",
      },
      {
        questionText:
          "What is the minimum legal tyre tread depth for cars in the UK?",
        optionA: "1.0 mm",
        optionB: "1.6 mm",
        optionC: "2.0 mm",
        optionD: "3.0 mm",
        correctOption: "b",
        category: "safety",
      },
      {
        questionText:
          "When are you allowed to use a handheld mobile phone while driving?",
        optionA: "At traffic lights",
        optionB: "Never while the engine is running on a public road",
        optionC: "On quiet roads",
        optionD: "Only for navigation",
        correctOption: "b",
        category: "safety",
      },

      // motorway rules (3)
      {
        questionText:
          "Which lane should you normally drive in on a motorway?",
        optionA: "Right",
        optionB: "Left",
        optionC: "Middle",
        optionD: "Any",
        correctOption: "b",
        category: "motorway rules",
      },
      {
        questionText: "What does a red X above a motorway lane mean?",
        optionA: "Lane closed — do not use",
        optionB: "Slow down",
        optionC: "Lane for buses",
        optionD: "Overtaking only",
        correctOption: "a",
        category: "motorway rules",
      },
      {
        questionText: "Are learner drivers allowed on motorways?",
        optionA: "Never",
        optionB: "Only with an approved instructor in a dual-control car",
        optionC: "Only at night",
        optionD: "Only on weekends",
        correctOption: "b",
        category: "motorway rules",
      },
    ],
  });

  // --- Hazard questions (5) ---
  // Placeholder image URLs from Unsplash (public, no auth needed)
  await prisma.hazardQuestion.createMany({
    data: [
      {
        imageUrl: "https://images.unsplash.com/photo-1502877338535-766e1452684a",
        questionText: "What is the developing hazard in this scene?",
        optionA: "Parked car",
        optionB: "Pedestrian about to cross",
        optionC: "Traffic light",
        optionD: "Road sign",
        correctOption: "b",
        description:
          "A pedestrian near the kerb is the developing hazard you should react to.",
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d",
        questionText: "Which hazard requires immediate action?",
        optionA: "Cyclist ahead",
        optionB: "Sunlight",
        optionC: "Roadworks sign",
        optionD: "Bus stop",
        correctOption: "a",
        description:
          "The cyclist may swerve, so reduce speed and prepare to give space.",
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70",
        questionText: "What should you do approaching this junction?",
        optionA: "Speed up",
        optionB: "Cover the brake and check mirrors",
        optionC: "Sound horn",
        optionD: "Change lanes",
        correctOption: "b",
        description: "Always cover the brake and scan when approaching a junction.",
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8",
        questionText: "What is the main hazard on a wet road like this?",
        optionA: "Aquaplaning risk",
        optionB: "Bright reflections",
        optionC: "Tyre noise",
        optionD: "Cold engine",
        correctOption: "a",
        description:
          "Wet roads increase stopping distance and risk of aquaplaning.",
      },
      {
        imageUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800",
        questionText:
          "Which is the safest reaction to oncoming headlights at night?",
        optionA: "Stare at them",
        optionB: "Look to the left edge of the road",
        optionC: "Flash your lights",
        optionD: "Brake hard",
        correctOption: "b",
        description:
          "Looking to the nearside edge avoids being dazzled by oncoming beams.",
      },
    ],
  });

  // --- Availability slots for the instructor (3) ---
  await prisma.availability.createMany({
    data: [
      {
        instructorId: instructor.id,
        slotDate: "2026-04-10",
        startTime: "09:00",
        endTime: "10:00",
      },
      {
        instructorId: instructor.id,
        slotDate: "2026-04-10",
        startTime: "11:00",
        endTime: "12:00",
      },
      {
        instructorId: instructor.id,
        slotDate: "2026-04-11",
        startTime: "14:00",
        endTime: "15:00",
      },
    ],
  });

  console.log("Seed complete:", {
    admin: admin.email,
    instructor: instructor.email,
    learner: learner.email,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
