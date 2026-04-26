import { z } from "zod";

export const createEmployeeSchema = z.object({
  body: z.object({
    email: z.string().email(),
    firstName: z.string().min(2),
    lastName: z.string().min(1),
    role: z.enum(["HR_MANAGER", "EMPLOYEE"]),
    password: z.string().min(8),
    departmentId: z.string().optional(),
    designation: z.string().min(2),
    joiningDate: z.string().datetime(),
    employeeCode: z.string().min(2),
    baseCtc: z.number().positive(),
    basicPercent: z.number().min(10).max(80),
    hraPercent: z.number().min(5).max(60),
    allowancesMonthly: z.number().min(0).default(0),
    professionalTax: z.number().min(0).optional(),
    pfEnabled: z.boolean().optional(),
    esiEnabled: z.boolean().optional()
  })
});

export const updateEmployeeAdminSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(1).optional(),
    designation: z.string().min(2).optional(),
    departmentId: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    baseCtc: z.number().positive().optional(),
    basicPercent: z.number().min(10).max(80).optional(),
    hraPercent: z.number().min(5).max(60).optional(),
    allowancesMonthly: z.number().min(0).optional(),
    professionalTax: z.number().min(0).optional(),
    pfEnabled: z.boolean().optional(),
    esiEnabled: z.boolean().optional(),
    bankAccountNumber: z.string().max(64).optional(),
    bankIfsc: z.string().max(32).optional(),
    bankName: z.string().max(128).optional(),
    bankAccountHolderName: z.string().max(128).optional()
  })
});

export const updateSelfProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(1).optional(),
    designation: z.string().min(2).optional(),
    profileImageUrl: z.string().url().optional()
  })
});
