import { GoogleGenerativeAI } from "@google/generative-ai";

// Singleton Gemini client — same reasoning as lib/prisma.ts.
// Throwing at module load gives us a fail-fast if the key is missing,
// matching the JWT_SECRET startup check in index.ts.
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Note: the original spec called for "gemini-1.5-flash", but Google retired
// that model from the v1beta API. "gemini-2.0-flash" is the current free-tier
// flash model and the natural successor.
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});
