
import { format, parseISO } from 'date-fns';

export const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy h:mm a');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};
