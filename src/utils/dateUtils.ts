
/**
 * Utility functions for date formatting
 */

/**
 * Format a date string into a more readable format
 * @param dateString The date string to format
 * @returns A formatted date string
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }
  
  // Format: "MMM DD, YYYY, HH:MM AM/PM"
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};
