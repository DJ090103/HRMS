import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowPermissions } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { cloudinaryService } from "../../services/cloudinary.service";

const uploadSchema = z.object({
  body: z.object({
    folder: z.string().min(2),
    filename: z.string().min(2),
    contentBase64: z.string().min(20)
  })
});

export const fileRouter = Router();
fileRouter.use(authenticate);

fileRouter.post(
  "/upload-base64",
  allowPermissions("employee:write"),
  validate(uploadSchema),
  asyncHandler(async (req, res) => {
    const buffer = Buffer.from(req.body.contentBase64, "base64");
    const url = await cloudinaryService.uploadBuffer(buffer, req.body.folder, req.body.filename);
    res.status(201).json({ success: true, data: { url } });
  })
);
