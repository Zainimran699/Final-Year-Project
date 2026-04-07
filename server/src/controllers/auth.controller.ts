import { Request, Response } from "express";
import {
  registerUser,
  loginUser,
  ConflictError,
  UnauthorizedError,
} from "../services/auth.service";

const ALLOWED_ROLES = ["learner", "instructor", "admin"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, role } = req.body ?? {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof role !== "string"
    ) {
      return res
        .status(400)
        .json({ error: "name, email, password and role are required" });
    }

    if (!name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    if (!email.includes("@")) {
      return res.status(400).json({ error: "email is invalid" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "password must be at least 6 characters" });
    }

    if (!ALLOWED_ROLES.includes(role as AllowedRole)) {
      return res
        .status(400)
        .json({ error: "role must be learner, instructor or admin" });
    }

    const user = await registerUser({
      name: name.trim(),
      email,
      password,
      role: role as AllowedRole,
    });

    return res.status(201).json({ user });
  } catch (err) {
    if (err instanceof ConflictError) {
      return res.status(409).json({ error: err.message });
    }
    console.error("register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res
        .status(400)
        .json({ error: "email and password are required" });
    }

    const result = await loginUser({ email, password });
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return res.status(401).json({ error: err.message });
    }
    console.error("login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
