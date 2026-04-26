import { Request, Response } from "express";
import { userService } from "./user.service";

export const userController = {
  createEmployee: async (req: Request, res: Response) => {
    const user = await userService.createEmployee(req.user!.companyId, req.user!.id, req.body);
    res.status(201).json({ success: true, data: user });
  },
  listEmployees: async (req: Request, res: Response) => {
    const users = await userService.listEmployees(req.user!.companyId);
    res.json({ success: true, data: users });
  },
  updateEmployeeAdmin: async (req: Request, res: Response) => {
    const data = await userService.updateEmployeeAdmin(req.user!.companyId, req.user!.id, req.params.id, req.body);
    res.json({ success: true, data });
  },
  deleteEmployee: async (req: Request, res: Response) => {
    await userService.deleteEmployee(req.user!.companyId, req.user!.id, req.params.id);
    res.json({ success: true, message: "Employee deleted successfully" });
  },
  updateSelfProfile: async (req: Request, res: Response) => {
    const data = await userService.updateSelfProfile(req.user!.companyId, req.user!.id, req.body);
    res.json({ success: true, data });
  },
  me: async (req: Request, res: Response) => {
    const data = await userService.getSelfProfile(req.user!.companyId, req.user!.id);
    res.json({ success: true, data });
  }
};
