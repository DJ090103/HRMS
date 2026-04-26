import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { allowPermissions, allowRoles } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { userController } from "./user.controller";
import { createEmployeeSchema, updateEmployeeAdminSchema, updateSelfProfileSchema } from "./user.validation";

export const userRouter = Router();

userRouter.use(authenticate);
userRouter.get("/me", asyncHandler(userController.me));
userRouter.patch("/me", validate(updateSelfProfileSchema), asyncHandler(userController.updateSelfProfile));
userRouter.get("/", allowPermissions("employee:read"), asyncHandler(userController.listEmployees));
userRouter.post(
  "/",
  allowRoles("SUPER_ADMIN", "HR_MANAGER"),
  allowPermissions("employee:write"),
  validate(createEmployeeSchema),
  asyncHandler(userController.createEmployee)
);
userRouter.patch(
  "/:id",
  allowRoles("SUPER_ADMIN", "HR_MANAGER"),
  allowPermissions("employee:write"),
  validate(updateEmployeeAdminSchema),
  asyncHandler(userController.updateEmployeeAdmin)
);
userRouter.delete(
  "/:id",
  allowRoles("SUPER_ADMIN", "HR_MANAGER"),
  allowPermissions("employee:write"),
  asyncHandler(userController.deleteEmployee)
);
