
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
  if (!dateString) return "";
  
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

// Create team name helper
export const createTeamName = (player1: string, player2?: string | null) => {
  if (!player1) return "Unknown Player";
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
  
  // Handle null or undefined playersList
  if (!playersList || !Array.isArray(playersList)) {
    return playerIdOrName;
  }
  
  // Check if it's a UUID (player ID)
  if (playerIdOrName.includes("-") && playerIdOrName.length > 30) {
    const player = playersList.find(p => p.id === playerIdOrName);
    return player ? player.name : playerIdOrName;
  }
  
  // Otherwise return the name directly
  return playerIdOrName;
};

// Helper function to safely parse player IDs from different formats
export const parsePlayerId = (playerInput: string | null | undefined): string | null => {
  if (!playerInput) return null;
  
  // If it's already a UUID, return it
  if (typeof playerInput === 'string' && playerInput.includes('-') && playerInput.length > 30) {
    return playerInput;
  }
  
  return null;
};

// Get player statistics from game history
export const calculatePlayerStats = (games: any[], playerId: string) => {
  if (!games || !Array.isArray(games) || games.length === 0) {
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winPercentage: 0,
      goalsScored: 0,
      goalsConceded: 0,
      goalDifference: 0,
      averageGoalsScored: 0,
      averageGoalsConceded: 0,
      highestWin: null,
      worstLoss: null
    };
  }
  
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let goalsScored = 0;
  let goalsConceded = 0;
  let highestWin: any = null;
  let worstLoss: any = null;
  let highestWinMargin = -1;
  let worstLossMargin = -1;
  
  games.forEach(game => {
    // Determine if player is in team1 or team2
    const inTeam1 = [game.team1_player1, game.team1_player2].includes(playerId);
    const inTeam2 = [game.team2_player1, game.team2_player2].includes(playerId);
    
    if (!inTeam1 && !inTeam2) return; // Skip if player not in this game
    
    const playerScore = inTeam1 ? game.score1 : game.score2;
    const opponentScore = inTeam1 ? game.score2 : game.score1;
    
    goalsScored += playerScore;
    goalsConceded += opponentScore;
    
    if (playerScore > opponentScore) {
      wins++;
      
      // Check if this is the highest win
      const margin = playerScore - opponentScore;
      if (margin > highestWinMargin) {
        highestWinMargin = margin;
        highestWin = {
          ...game,
          margin
        };
      }
    } else if (playerScore < opponentScore) {
      losses++;
      
      // Check if this is the worst loss
      const margin = opponentScore - playerScore;
      if (margin > worstLossMargin) {
        worstLossMargin = margin;
        worstLoss = {
          ...game,
          margin
        };
      }
    } else {
      draws++;
    }
  });
  
  const totalGames = wins + losses + draws;
  const winPercentage = calculateWinPercentage(wins, totalGames);
  const goalDifference = goalsScored - goalsConceded;
  const averageGoalsScored = calculateGoalsAverage(goalsScored, totalGames);
  const averageGoalsConceded = calculateGoalsAverage(goalsConceded, totalGames);
  
  return {
    totalGames,
    wins,
    losses,
    draws,
    winPercentage,
    goalsScored,
    goalsConceded,
    goalDifference,
    averageGoalsScored,
    averageGoalsConceded,
    highestWin,
    worstLoss
  };
};

// Function to identify player opponents and their frequency
export const getPlayerOpponents = (games: any[], playerId: string) => {
  if (!games || !Array.isArray(games) || games.length === 0) {
    return [];
  }
  
  const opponents: Record<string, { 
    id: string, 
    name: string, 
    count: number,
    wins: number,
    losses: number,
    draws: number
  }> = {};
  
  games.forEach(game => {
    // Determine if player is in team1 or team2
    const inTeam1 = [game.team1_player1, game.team1_player2].includes(playerId);
    const inTeam2 = [game.team2_player1, game.team2_player2].includes(playerId);
    
    if (!inTeam1 && !inTeam2) return; // Skip if player not in this game
    
    // Get opponent player IDs
    const opponentIds = inTeam1 
      ? [game.team2_player1, game.team2_player2].filter(Boolean) 
      : [game.team1_player1, game.team1_player2].filter(Boolean);
    
    // For each opponent, update their stats
    opponentIds.forEach(opponentId => {
      if (!opponentId || opponentId === playerId) return;
      
      if (!opponents[opponentId]) {
        opponents[opponentId] = {
          id: opponentId,
          name: opponentId, // Will be replaced with actual name later
          count: 0,
          wins: 0,
          losses: 0,
          draws: 0
        };
      }
      
      opponents[opponentId].count++;
      
      // Update win/loss/draw stats
      const playerScore = inTeam1 ? game.score1 : game.score2;
      const opponentScore = inTeam1 ? game.score2 : game.score1;
      
      if (playerScore > opponentScore) {
        opponents[opponentId].wins++;
      } else if (playerScore < opponentScore) {
        opponents[opponentId].losses++;
      } else {
        opponents[opponentId].draws++;
      }
    });
  });
  
  // Convert to array and sort by frequency
  return Object.values(opponents).sort((a, b) => b.count - a.count);
};
