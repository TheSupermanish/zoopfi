import { Invoice } from '../models/Invoice';

/**
 * Generate invoice number in format: INV-YYYYMMDD-XXX
 * XXX is a daily counter per business that resets each day
 */
export async function generateInvoiceNumber(businessAddress: string): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  // Find today's invoices for this business
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const todayCount = await Invoice.countDocuments({
    businessAddress,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const counter = String(todayCount + 1).padStart(3, '0');
  return `INV-${datePrefix}-${counter}`;
}
