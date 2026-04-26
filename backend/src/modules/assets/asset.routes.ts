import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowPermissions } from "../../middlewares/rbac.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { validate } from "../../middlewares/validate.middleware";

const createAssetSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    serialNo: z.string().min(3),
    userId: z.string().optional()
  })
});

export const assetRouter = Router();
assetRouter.use(authenticate);

assetRouter.post(
  "/",
  allowPermissions("employee:write"),
  validate(createAssetSchema),
  asyncHandler(async (req, res) => {
    const data = await prisma.asset.create({
      data: {
        companyId: req.user!.companyId,
        name: req.body.name,
        serialNo: req.body.serialNo,
        userId: req.body.userId
      }
    });
    res.status(201).json({ success: true, data });
  })
);

assetRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await prisma.asset.findMany({ where: { companyId: req.user!.companyId } });
    res.json({ success: true, data });
  })
);
