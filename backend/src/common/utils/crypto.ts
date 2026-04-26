import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, 12);
export const comparePassword = (password: string, hash: string): Promise<boolean> => bcrypt.compare(password, hash);

export const signAccessToken = (payload: object): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL
  } as SignOptions);

export const signRefreshToken = (payload: object): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL
  } as SignOptions);

export const verifyAccessToken = <T>(token: string): T =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as T;

export const verifyRefreshToken = <T>(token: string): T =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as T;
