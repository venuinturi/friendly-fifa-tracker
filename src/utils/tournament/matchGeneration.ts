
import { TournamentPlayer, TournamentMatch } from "@/types/game";

export const generateMatchups = (
  players: TournamentPlayer[], 
  tournamentId: string, 
  type: "1v1" | "2v2"
): Omit<TournamentMatch, 'id'>[] => {
  // Filter out any players with empty names
  const validPlayers = players.filter(p => p.name && p.name.trim() !== '');
  
  if (validPlayers.length < 2) {
    return [];
  }
  
  const matches: Omit<TournamentMatch, 'id'>[] = [];
  const round = 0; // Round robin starts with round 0
  
  // Generate all possible matchups (round robin style)
  for (let i = 0; i < validPlayers.length; i++) {
    for (let j = i + 1; j < validPlayers.length; j++) {
      const player1 = validPlayers[i];
      const player2 = validPlayers[j];
      
      let matchNumber = matches.length + 1;
      
      if (type === "1v1") {
        matches.push({
          tournament_id: tournamentId,
          team1: player1.name,
          team2: player2.name,
          team1_player1: player1.id,
          team2_player1: player2.id,
          round,
          match_number: matchNumber,
          status: 'pending'
        });
      } else {
        // For 2v2, assume players[i] and players[i+1] form a team
        // This is a simplified approach - for a real implementation you'd need
        // to define teams explicitly
        if (i + 1 < validPlayers.length && j + 1 < validPlayers.length) {
          const player1Partner = validPlayers[i + 1];
          const player2Partner = validPlayers[j + 1];
          
          const team1Name = `${player1.name} & ${player1Partner.name}`;
          const team2Name = `${player2.name} & ${player2Partner.name}`;
          
          matches.push({
            tournament_id: tournamentId,
            team1: team1Name,
            team2: team2Name,
            team1_player1: player1.id,
            team1_player2: player1Partner.id,
            team2_player1: player2.id,
            team2_player2: player2Partner.id,
            round,
            match_number: matchNumber,
            status: 'pending'
          });
          
          // Skip the next player since we used them as a partner
          i++;
          j++;
        }
      }
    }
  }
  
  return matches;
};

export const generateWalkover = (
  tournamentId: string,
  round: number,
  matchNumber: number,
  advancingTeam: string,
  advancingPlayer1: string,
  advancingPlayer2?: string
): Omit<TournamentMatch, 'id'> => {
  return {
    tournament_id: tournamentId,
    team1: advancingTeam,
    team2: 'BYE',
    team1_player1: advancingPlayer1,
    team1_player2: advancingPlayer2 || null,
    round,
    match_number: matchNumber,
    status: 'completed',
    score1: 1,
    score2: 0,
    winner: advancingTeam
  };
};
