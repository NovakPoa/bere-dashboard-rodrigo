import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateForDatabase(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateFromDatabase(dateString: string | null | undefined): Date {
  // Handle null/undefined cases
  if (!dateString) {
    return new Date(); // Return current date as fallback
  }

  if (typeof dateString !== 'string') {
    return new Date();
  }

  // Case 1: Strict date-only format YYYY-MM-DD -> parse as local midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const localDate = new Date(dateString + 'T00:00:00');
    if (!isNaN(localDate.getTime())) return localDate;
  }

  // Case 2: ISO 8601 or other date strings -> let Date parse it
  const parsed = new Date(dateString);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Case 3: Try to fallback to the date prefix if available
  const match = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    const localDate = new Date(match[1] + 'T00:00:00');
    if (!isNaN(localDate.getTime())) return localDate;
  }

  console.warn('Invalid date format received:', dateString);
  return new Date();
}
