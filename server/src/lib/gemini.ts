import { GoogleGenerativeAI } from "@google/generative-ai";

// Singleton Gemini client — same reasoning as lib/prisma.ts.
// Throwing at module load gives us a fail-fast if the key is missing,
// matching the JWT_SECRET startup check in index.ts.
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(apiKey);

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});
