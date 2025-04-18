
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Game colors for charts and visualizations
export const GAME_COLORS = [
  "#4ade80", // green-400 - for wins
  "#f87171", // red-400 - for losses
  "#facc15", // yellow-400 - for draws
  "#60a5fa", // blue-400 - for general data
  "#c084fc", // purple-400 - for secondary data
  "#2dd4bf", // teal-400 - for tertiary data
  "#f472b6", // pink-400 - for quaternary data
  "#fb923c"  // orange-400 - for quinary data
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
