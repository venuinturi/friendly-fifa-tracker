
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Color palette for charts and data visualization
export const GAME_COLORS = [
  "#4CAF50", // Green for wins
  "#F44336", // Red for losses
  "#FFC107", // Amber for draws
  "#2196F3", // Blue for other metrics
  "#9C27B0", // Purple for additional metrics
  "#FF9800", // Orange for additional metrics
];
