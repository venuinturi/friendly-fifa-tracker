import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Game colors for charts and visualizations
export const GAME_COLORS = [
  "#4CAF50", // Green for wins
  "#F44336", // Red for losses
  "#FFC107", // Amber for draws
  "#2196F3", // Blue for other stats
  "#9C27B0", // Purple
  "#FF9800", // Orange
  "#795548", // Brown
  "#607D8B"  // Blue Grey
];

// Format date helper
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date);
};

// Create team name helper
export const createTeamName = (player1: string, player2?: string | null) => {
  if (!player2) return player1;
  return `${player1} & ${player2}`;
};

export const getWinner = (score1: number, score2: number, team1: string, team2: string) => {
  if (score1 > score2) return team1;
  if (score2 > score1) return team2;
  return "Draw";
};

// Game statistics helpers
export const calculateWinPercentage = (wins: number, totalGames: number) => {
  if (totalGames === 0) return 0;
  return (wins / totalGames) * 100;
};

export const calculateGoalsAverage = (goals: number, games: number) => {
  if (games === 0) return 0;
  return goals / games;
};

export const getPlayerDisplayName = (playerIdOrName: string, playersList: any[]) => {
  if (!playerIdOrName) return "Unknown";
  
  // Check if it's a UUID (player ID)
  if (playerIdOrName.includes("-") && playerIdOrName.length > 30) {
    const player = playersList.find(p => p.id === playerIdOrName);
    return player ? player.name : playerIdOrName;
  }
  
  // Otherwise return the name directly
  return playerIdOrName;
};
