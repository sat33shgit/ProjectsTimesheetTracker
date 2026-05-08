import { format, parseISO } from "date-fns";
import { utcDateToLocal } from "./date";

export function formatCurrency(amount: number, currency: "CAD" | "INR" = "CAD"): string {
  if (currency === "INR") {
    return "₹" + formatINR(amount);
  }
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatINR(amount: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return formatted;
}

export function formatHours(hours: number): string {
  return hours.toFixed(2) + " hrs";
}

export function formatDate(date: Date | string): string {
  if (!date) return "—";
  // Convert UTC date from database to local timezone before formatting
  const localDate = utcDateToLocal(date);
  if (isNaN(localDate.getTime())) return "—";
  return format(localDate, "MMM dd, yyyy");
}

export function formatDateISO(date: Date | string): string {
  if (!date) return "";
  // Convert UTC date from database to local timezone before formatting
  const localDate = utcDateToLocal(date);
  if (isNaN(localDate.getTime())) return "";
  return format(localDate, "yyyy-MM-dd");
}
