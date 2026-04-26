import { Router } from "express";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowRoles } from "../../middlewares/rbac.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";

export const auditRouter = Router();
auditRouter.use(authenticate);

auditRouter.get(
  "/",
  allowRoles("SUPER_ADMIN", "HR_MANAGER"),
  asyncHandler(async (req, res) => {
    const module = req.query.module as string | undefined;
    const data = await prisma.auditLog.findMany({
      where: {
        companyId: req.user!.companyId,
        ...(module ? { module } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });
    res.json({ success: true, data });
  })
);
