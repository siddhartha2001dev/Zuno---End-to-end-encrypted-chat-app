import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

export interface TokenPayload {
  userId: string;
  email: string;
}

export function generateToken(payload: TokenPayload, expiresIn: SignOptions["expiresIn"] = "7d"): string {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}
