import { format, parseISO } from "date-fns";

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
  let d: Date;
  if (typeof date === "string") {
    d = parseISO(date);
    if (isNaN(d.getTime())) d = new Date(date);
  } else {
    d = date;
  }
  if (isNaN(d.getTime())) return "—";
  return format(d, "MMM dd, yyyy");
}

export function formatDateISO(date: Date | string): string {
  if (!date) return "";
  let d: Date;
  if (typeof date === "string") {
    d = parseISO(date);
    if (isNaN(d.getTime())) d = new Date(date);
  } else {
    d = date;
  }
  if (isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}
