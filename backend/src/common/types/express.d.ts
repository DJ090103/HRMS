import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      role: Role;
      permissions: string[];
      companyId: string;
      sessionId: string;
    }

    interface Request {
      user?: UserContext;
      requestId?: string;
    }
  }
}

export {};
