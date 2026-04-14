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

  // Seeded users are marked as isVerified: true so they can log in
  // immediately without needing to go through the OTP email flow.
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@test.com",
      passwordHash: adminHash,
      role: "admin",
      isVerified: true,
    },
  });

  const instructor = await prisma.user.create({
    data: {
      name: "Sarah Instructor",
      email: "instructor@test.com",
      passwordHash: instructorHash,
      role: "instructor",
      isVerified: true,
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
      isVerified: true,
    },
  });

  // --- Theory questions (45 across 4 categories) ---
  await prisma.theoryQuestion.createMany({
    data: [
      // road signs (12)
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
      {
        questionText: "What shape is a UK give way sign?",
        optionA: "Circular",
        optionB: "Octagonal",
        optionC: "Inverted triangle",
        optionD: "Square",
        correctOption: "c",
        category: "road signs",
      },
      {
        questionText: "What does a blue rectangular sign usually provide?",
        optionA: "Warning information",
        optionB: "Motorway information",
        optionC: "Speed restriction",
        optionD: "No stopping order",
        correctOption: "b",
        category: "road signs",
      },
      {
        questionText: "What does a red circular sign with a white horizontal bar mean?",
        optionA: "No parking",
        optionB: "No entry",
        optionC: "Stop",
        optionD: "One-way street",
        correctOption: "b",
        category: "road signs",
      },
      {
        questionText: "What does a sign showing children crossing warn you about?",
        optionA: "Playground only",
        optionB: "School or children nearby",
        optionC: "Pedestrian zone ends",
        optionD: "No pedestrians allowed",
        correctOption: "b",
        category: "road signs",
      },
      {
        questionText: "What does a sign with falling rocks warn you about?",
        optionA: "Loose chippings",
        optionB: "Quarry ahead",
        optionC: "Risk of rocks falling onto the road",
        optionD: "Tunnel entrance",
        correctOption: "c",
        category: "road signs",
      },
      {
        questionText: "What does a sign with two children and a lollipop symbol often mean?",
        optionA: "School crossing patrol",
        optionB: "Pedestrian underpass",
        optionC: "No children allowed",
        optionD: "Play area closed",
        correctOption: "a",
        category: "road signs",
      },
      {
        questionText: "A sign showing a hill sloping downwards warns of…",
        optionA: "Steep descent",
        optionB: "Bumpy road",
        optionC: "Bridge ahead",
        optionD: "Road narrows",
        correctOption: "a",
        category: "road signs",
      },
      {
        questionText: "What does a sign with traffic signals symbol ahead mean?",
        optionA: "No overtaking",
        optionB: "Traffic lights ahead",
        optionC: "Railway crossing ahead",
        optionD: "Roundabout ahead",
        correctOption: "b",
        category: "road signs",
      },

      // speed limits (11)
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
      {
        questionText: "What is the national speed limit on a motorway for cars?",
        optionA: "50 mph",
        optionB: "60 mph",
        optionC: "70 mph",
        optionD: "80 mph",
        correctOption: "c",
        category: "speed limits",
      },
      {
        questionText: "What is the speed limit in most built-up areas unless signs show otherwise?",
        optionA: "20 mph",
        optionB: "30 mph",
        optionC: "40 mph",
        optionD: "50 mph",
        correctOption: "b",
        category: "speed limits",
      },
      {
        questionText: "What is the maximum speed for cars towing a trailer on a dual carriageway?",
        optionA: "50 mph",
        optionB: "60 mph",
        optionC: "70 mph",
        optionD: "40 mph",
        correctOption: "b",
        category: "speed limits",
      },
      {
        questionText: "A car is on a single carriageway while towing a trailer. What is the speed limit?",
        optionA: "40 mph",
        optionB: "50 mph",
        optionC: "60 mph",
        optionD: "70 mph",
        correctOption: "b",
        category: "speed limits",
      },
      {
        questionText: "When variable speed limit signs are blank on a smart motorway, what usually applies?",
        optionA: "20 mph",
        optionB: "40 mph",
        optionC: "National speed limit",
        optionD: "50 mph",
        correctOption: "c",
        category: "speed limits",
      },
      {
        questionText: "What should you do if road conditions are poor even though the speed limit is high?",
        optionA: "Drive at the maximum limit anyway",
        optionB: "Adjust your speed to the conditions",
        optionC: "Stop immediately",
        optionD: "Only use hazard lights",
        correctOption: "b",
        category: "speed limits",
      },
      {
        questionText: "What does a circular sign showing 20 mean?",
        optionA: "Recommended speed",
        optionB: "Minimum speed",
        optionC: "Maximum speed limit",
        optionD: "School crossing zone only",
        correctOption: "c",
        category: "speed limits",
      },

      // safety (13)
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
      {
        questionText: "What should you do if you feel tired while driving?",
        optionA: "Open a window and continue",
        optionB: "Stop in a safe place and rest",
        optionC: "Drive faster to get home sooner",
        optionD: "Turn the radio louder",
        correctOption: "b",
        category: "safety",
      },
      {
        questionText: "Why should you keep both hands ready on the steering wheel?",
        optionA: "To signal faster",
        optionB: "To maintain better control",
        optionC: "To reduce fuel use",
        optionD: "To improve visibility",
        correctOption: "b",
        category: "safety",
      },
      {
        questionText: "What should you do before opening your car door on the road side?",
        optionA: "Check mirrors and blind spot",
        optionB: "Sound the horn",
        optionC: "Turn on full beam",
        optionD: "Open it quickly",
        correctOption: "a",
        category: "safety",
      },
      {
        questionText: "What is the main danger of driving too close to the vehicle in front?",
        optionA: "Higher fuel economy",
        optionB: "Reduced stopping distance",
        optionC: "Not enough time to react",
        optionD: "Better road position",
        correctOption: "c",
        category: "safety",
      },
      {
        questionText: "What should you do if dazzled by oncoming headlights at night?",
        optionA: "Look directly at them",
        optionB: "Close your eyes briefly",
        optionC: "Slow down and look towards the left edge of the road",
        optionD: "Flash your headlights repeatedly",
        correctOption: "c",
        category: "safety",
      },
      {
        questionText: "Why is it dangerous to drive through deep flood water?",
        optionA: "It cleans the tyres",
        optionB: "It can damage the engine and affect braking",
        optionC: "It improves grip",
        optionD: "It reduces stopping distance",
        correctOption: "b",
        category: "safety",
      },
      {
        questionText: "What is the main purpose of anti-lock brakes (ABS)?",
        optionA: "To increase top speed",
        optionB: "To prevent wheel lock during braking",
        optionC: "To reduce fuel use",
        optionD: "To make steering heavier",
        correctOption: "b",
        category: "safety",
      },
      {
        questionText: "What should you do if your vehicle starts to skid?",
        optionA: "Brake harshly immediately",
        optionB: "Steer sharply in the opposite direction",
        optionC: "Ease off and steer into the skid",
        optionD: "Accelerate hard",
        correctOption: "c",
        category: "safety",
      },
      {
        questionText: "Why is regular vehicle maintenance important?",
        optionA: "It makes the car louder",
        optionB: "It helps keep the vehicle safe and roadworthy",
        optionC: "It removes speed limits",
        optionD: "It avoids needing insurance",
        correctOption: "b",
        category: "safety",
      },

      // motorway rules (9)
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
      {
        questionText: "What should you do before joining a motorway?",
        optionA: "Stop at the end of the slip road",
        optionB: "Match your speed to the traffic on the motorway",
        optionC: "Use the hard shoulder",
        optionD: "Drive in the right lane immediately",
        correctOption: "b",
        category: "motorway rules",
      },
      {
        questionText: "When should you use the hard shoulder on a motorway?",
        optionA: "For overtaking",
        optionB: "When you want to stop for a break",
        optionC: "Only in an emergency or when directed",
        optionD: "To avoid traffic",
        correctOption: "c",
        category: "motorway rules",
      },
      {
        questionText: "What does a flashing amber light on a motorway sign usually mean?",
        optionA: "No entry",
        optionB: "Leave motorway immediately",
        optionC: "Warning or advisory information",
        optionD: "National speed limit applies",
        correctOption: "c",
        category: "motorway rules",
      },
      {
        questionText: "Why should you avoid staying in the middle lane of a motorway unnecessarily?",
        optionA: "It is illegal in all cases",
        optionB: "It can obstruct other traffic",
        optionC: "It uses more fuel only",
        optionD: "It is reserved for vans",
        correctOption: "b",
        category: "motorway rules",
      },
      {
        questionText: "What is the safest action if you miss your motorway exit?",
        optionA: "Reverse back carefully",
        optionB: "Use the hard shoulder to return",
        optionC: "Continue to the next exit",
        optionD: "Stop and wait",
        correctOption: "c",
        category: "motorway rules",
      },
      {
        questionText: "On a smart motorway, what should you do if lane signals show a lower speed limit?",
        optionA: "Ignore it if the road looks clear",
        optionB: "Follow the displayed speed limit",
        optionC: "Only slow down in the right lane",
        optionD: "Move to the hard shoulder",
        correctOption: "b",
        category: "motorway rules",
      },
    ],
  });

  // --- Hazard questions (5) ---
  // Unsplash image URLs using specific driving/road-scene photos.
  // The ?w=800&q=80 suffix requests a resized JPEG — fast to load, no auth.
  await prisma.hazardQuestion.createMany({
    data: [
      {
        imageUrl:
          "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80",
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
        imageUrl:
          "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80",
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
        imageUrl:
          "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80",
        questionText: "What should you do approaching this junction?",
        optionA: "Speed up",
        optionB: "Cover the brake and check mirrors",
        optionC: "Sound horn",
        optionD: "Change lanes",
        correctOption: "b",
        description:
          "Always cover the brake and scan when approaching a junction.",
      },
      {
        imageUrl:
          "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&q=80",
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
        imageUrl:
          "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80",
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
        slotDate: "2026-06-15",
        startTime: "09:00",
        endTime: "10:00",
      },
      {
        instructorId: instructor.id,
        slotDate: "2026-06-15",
        startTime: "11:00",
        endTime: "12:00",
      },
      {
        instructorId: instructor.id,
        slotDate: "2026-06-16",
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