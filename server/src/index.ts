import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import theoryRoutes from "./routes/theory.routes";
import hazardRoutes from "./routes/hazard.routes";
import instructorRoutes from "./routes/instructor.routes";
import bookingRoutes from "./routes/booking.routes";

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set. Refusing to start.");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/theory", theoryRoutes);
app.use("/api/hazard", hazardRoutes);
app.use("/api/instructors", instructorRoutes);
app.use("/api/bookings", bookingRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
