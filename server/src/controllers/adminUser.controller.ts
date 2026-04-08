import { Request, Response } from "express";
import {
  listUsers as listUsersService,
  deleteUser as deleteUserService,
  ValidationError,
  NotFoundError,
  ConflictError,
} from "../services/adminUser.service";

export async function listUsers(req: Request, res: Response) {
  try {
    const roleFilter =
      typeof req.query.role === "string" ? req.query.role : undefined;
    const users = await listUsersService(roleFilter);
    return res.status(200).json({ users });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error("adminUser listUsers error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const callerId = req.user!.id;
    await deleteUserService(callerId, id);
    return res.status(204).send();
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof ConflictError) {
      return res.status(409).json({ error: err.message });
    }
    console.error("adminUser deleteUser error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
