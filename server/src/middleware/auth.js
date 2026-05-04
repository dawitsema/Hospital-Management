import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { User } from "../models/User.js";

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (user.isActive === false) {
      return res.status(401).json({ error: "This account has been deactivated" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
