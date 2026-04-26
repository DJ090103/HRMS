import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../common/errors/AppError";

export const validate =
  (schema: ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!parsed.success) {
      return next(
        new AppError(StatusCodes.BAD_REQUEST, "VALIDATION_ERROR", "Request validation failed", parsed.error.flatten())
      );
    }
    next();
  };
