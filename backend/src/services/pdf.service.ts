import PDFDocument from "pdfkit";
import { PayrollLineItem, PayrollRun, User } from "@prisma/client";

export const pdfService = {
  generatePayslipBuffer: async (employee: User, run: PayrollRun, line: PayrollLineItem): Promise<Buffer> =>
    new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk as Buffer));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(18).text("Salary Slip", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Employee: ${employee.firstName} ${employee.lastName}`);
      doc.text(`Period: ${run.month}/${run.year}`);
      doc.text(`Gross: INR ${line.grossAmount}`);
      doc.text(`Deductions: INR ${line.deductionAmount}`);
      doc.text(`Reimbursements: INR ${line.reimbursementAmount}`);
      doc.text(`Net Pay: INR ${line.netAmount}`);
      doc.end();
    })
};
