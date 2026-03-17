export function calculateEarningsCAD(hours: number, hourlyRate: number): number {
  return hours * hourlyRate;
}

export function calculateEarningsINR(cad: number, conversionRate: number): number {
  return cad * conversionRate;
}

export function calculateTotalHours(entries: { hours: number | string }[]): number {
  return entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
}
