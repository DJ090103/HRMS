import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../db/prisma";

class UserRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  findByCompanyEmail(companyId: string, email: string) {
    return this.client.user.findUnique({
      where: { companyId_email: { companyId, email } },
      include: { rolePermissions: true }
    });
  }

  findById(id: string) {
    return this.client.user.findUnique({ where: { id }, include: { rolePermissions: true } });
  }

  create(input: Prisma.UserCreateArgs["data"]) {
    return this.client.user.create({ data: input, include: { employeeProfile: true } });
  }
}

export const userRepository = new UserRepository();
