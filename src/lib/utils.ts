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
  
  // Ensure we have a valid date string format
  if (typeof dateString !== 'string' || !dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    console.warn('Invalid date format received:', dateString);
    return new Date(); // Return current date as fallback
  }
  
  // Parse "YYYY-MM-DD" as local date by adding "T00:00:00" to ensure local timezone
  const localDate = new Date(dateString + "T00:00:00");
  
  // Check if the resulting date is valid
  if (isNaN(localDate.getTime())) {
    console.warn('Invalid date value:', dateString);
    return new Date(); // Return current date as fallback
  }
  
  return localDate;
}
