/**
 * Convert a local date string (YYYY-MM-DD) to UTC midnight date for database storage
 * @param dateString - Date string in format 'YYYY-MM-DD'
 * @returns Date object set to UTC midnight of the selected date
 */
export function localDateToUTC(dateString: string): Date {
  // Parse date components directly from string to avoid timezone conversion issues
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Convert a UTC date from database to local timezone date for UI display
 * @param utcDate - UTC Date object from database
 * @returns Date object adjusted to local timezone
 */
export function utcDateToLocal(utcDate: Date | string): Date {
  let dateObj: Date;
  if (typeof utcDate === "string") {
    // If it's a date-only string like 'YYYY-MM-DD' (from to_char), parse as local date directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(utcDate)) {
      const [year, month, day] = utcDate.split('-').map(Number);
      dateObj = new Date(year, month - 1, day);
    } else {
      dateObj = new Date(utcDate);
    }
  } else if (utcDate instanceof Date) {
    dateObj = new Date(utcDate.getTime());
  } else {
    return new Date(NaN);
  }

  if (isNaN(dateObj.getTime())) return new Date(NaN);
  // Return a Date set to local midnight of that UTC-derived instant
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
}

/**
 * Format a UTC date to local date string (YYYY-MM-DD) for input fields
 * @param utcDate - UTC Date object from database
 * @returns Formatted date string 'YYYY-MM-DD' in local timezone
 */
export function formatUTCDateForInput(utcDate: Date | string): string {
  const localDate = utcDateToLocal(utcDate);
  if (isNaN(localDate.getTime())) return "";
  const yyyy = localDate.getFullYear();
  const mm = String(localDate.getMonth() + 1).padStart(2, '0');
  const dd = String(localDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Format a UTC date to human readable local date string
 * @param utcDate - UTC Date object from database
 * @returns Formatted date string like 'April 29, 2026' in local timezone
 */
export function formatUTCDateForDisplay(utcDate: Date | string): string {
  const localDate = utcDateToLocal(utcDate);
  if (isNaN(localDate.getTime())) return "—";
  return localDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}