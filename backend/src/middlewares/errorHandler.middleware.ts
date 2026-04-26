import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../common/errors/AppError";
import { logger } from "../config/logger";

const statusMessage: Record<number, string> = {
  [StatusCodes.BAD_REQUEST]: "Invalid request. Please verify your input and try again.",
  [StatusCodes.UNAUTHORIZED]: "Authentication required or session expired. Please login again.",
  [StatusCodes.FORBIDDEN]: "You do not have permission to perform this action.",
  [StatusCodes.NOT_FOUND]: "The requested resource was not found.",
  [StatusCodes.CONFLICT]: "This operation conflicts with existing data.",
  [StatusCodes.UNPROCESSABLE_ENTITY]: "Unable to process the request due to validation issues.",
  [StatusCodes.TOO_MANY_REQUESTS]: "Too many requests. Please wait and retry.",
  [StatusCodes.INTERNAL_SERVER_ERROR]: "Unexpected server error. Please try again in a moment.",
  [StatusCodes.SERVICE_UNAVAILABLE]: "Service is temporarily unavailable. Please retry shortly."
};

const sendError = (res: Response, req: Request, input: { statusCode: number; code: string; message?: string; details?: unknown }) => {
  const message = input.message || statusMessage[input.statusCode] || statusMessage[StatusCodes.INTERNAL_SERVER_ERROR];
  res.status(input.statusCode).json({
    success: false,
    statusCode: input.statusCode,
    code: input.code,
    message,
    details: input.details,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, req, {
    statusCode: StatusCodes.NOT_FOUND,
    code: "ROUTE_NOT_FOUND",
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

export const errorHandler = (error: Error, req: Request, res: Response, _next: NextFunction): void => {
  logger.error("Unhandled error", {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    error
  });

  if (error instanceof AppError) {
    sendError(res, req, {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      sendError(res, req, {
        statusCode: StatusCodes.CONFLICT,
        code: "DUPLICATE_RESOURCE",
        message: "A record with these values already exists.",
        details: error.meta
      });
      return;
    }
    if (error.code === "P2025") {
      sendError(res, req, {
        statusCode: StatusCodes.NOT_FOUND,
        code: "RESOURCE_NOT_FOUND",
        message: "The requested record does not exist."
      });
      return;
    }
    if (error.code === "P2003") {
      sendError(res, req, {
        statusCode: StatusCodes.BAD_REQUEST,
        code: "FOREIGN_KEY_CONSTRAINT",
        message: "Related resource not found or invalid relationship.",
        details: error.meta
      });
      return;
    }
    sendError(res, req, {
      statusCode: StatusCodes.BAD_REQUEST,
      code: "DATABASE_REQUEST_ERROR",
      message: "Database rejected this request.",
      details: error.meta
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    sendError(res, req, {
      statusCode: StatusCodes.BAD_REQUEST,
      code: "DATABASE_VALIDATION_ERROR",
      message: "Request data format is invalid for database operation."
    });
    return;
  }

  sendError(res, req, {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    code: "INTERNAL_SERVER_ERROR"
  });
};
