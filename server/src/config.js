import dotenv from "dotenv";

dotenv.config();

const required = ["MONGODB_URI", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Warning: ${key} is not set. Copy server/.env.example to server/.env`);
  }
}

export const config = {
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hospital_appointments",
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  /** When true, POST /api/auth/forgot-password includes resetToken in JSON (dev/demo only). */
  returnResetTokenInResponse: process.env.AUTH_RETURN_RESET_TOKEN === "true",
};
