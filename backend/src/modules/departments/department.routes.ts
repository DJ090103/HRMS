import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowPermissions } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";

const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional()
  })
});

const updateDepartmentSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional()
  })
});

export const departmentRouter = Router();
departmentRouter.use(authenticate);

departmentRouter.get(
  "/",
  allowPermissions("employee:read"),
  asyncHandler(async (req, res) => {
    const data = await prisma.department.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { name: "asc" }
    });
    res.json({ success: true, data });
  })
);

departmentRouter.post(
  "/",
  allowPermissions("employee:write"),
  validate(createDepartmentSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.department.create({
      data: {
        companyId: req.user!.companyId,
        name: req.body.name,
        description: req.body.description
      }
    });
    res.status(201).json({ success: true, data });
  })
);

departmentRouter.patch(
  "/:id",
  allowPermissions("employee:write"),
  validate(updateDepartmentSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.department.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId }
    });
    if (!existing) {
      res.status(404).json({ success: false, code: "DEPARTMENT_NOT_FOUND", message: "Department not found" });
      return;
    }
    const data = await prisma.department.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        description: req.body.description
      }
    });
    res.json({ success: true, data });
  })
);

departmentRouter.delete(
  "/:id",
  allowPermissions("employee:write"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.department.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId }
    });
    if (!existing) {
      res.status(404).json({ success: false, code: "DEPARTMENT_NOT_FOUND", message: "Department not found" });
      return;
    }

    await prisma.employeeProfile.updateMany({
      where: { departmentId: req.params.id },
      data: { departmentId: null }
    });
    await prisma.recruitmentOpening.updateMany({
      where: { departmentId: req.params.id },
      data: { departmentId: null }
    });
    await prisma.department.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: "Department deleted successfully" });
  })
);
