
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

// Add the missing function for next round matches
export const generateNextRoundMatches = (
  tournamentId: string,
  previousMatches: TournamentMatch[],
  nextRound: number
): Omit<TournamentMatch, 'id'>[] => {
  const winners: Omit<TournamentMatch, 'id'>[] = [];
  
  // Group matches by match number in previous round
  const matchPairs: TournamentMatch[][] = [];
  const sortedMatches = [...previousMatches].sort((a, b) => a.match_number - b.match_number);
  
  // For a single elimination tournament, winners of adjacent matches face each other
  for (let i = 0; i < sortedMatches.length; i += 2) {
    if (i + 1 < sortedMatches.length) {
      matchPairs.push([sortedMatches[i], sortedMatches[i + 1]]);
    } else {
      // If there's an odd number of matches, create a walkover for the remaining team
      const winnerTeam = getMatchWinner(sortedMatches[i]);
      if (winnerTeam) {
        const player1Id = sortedMatches[i].team1 === winnerTeam 
          ? sortedMatches[i].team1_player1 
          : sortedMatches[i].team2_player1;
          
        const player2Id = sortedMatches[i].team1 === winnerTeam 
          ? sortedMatches[i].team1_player2 
          : sortedMatches[i].team2_player2;
          
        if (player1Id) {
          winners.push(generateWalkover(
            tournamentId,
            nextRound,
            Math.floor(i / 2) + 1,
            winnerTeam,
            player1Id,
            player2Id || undefined
          ));
        }
      }
    }
  }
  
  // Create next round matches from pairs
  matchPairs.forEach((pair, index) => {
    const winner1 = getMatchWinner(pair[0]);
    const winner2 = getMatchWinner(pair[1]);
    
    if (!winner1 || !winner2) return; // Both matches must have winners
    
    const team1 = winner1;
    const team2 = winner2;
    
    const team1Player1 = pair[0].team1 === winner1 
      ? pair[0].team1_player1 
      : pair[0].team2_player1;
      
    const team1Player2 = pair[0].team1 === winner1 
      ? pair[0].team1_player2 
      : pair[0].team2_player2;
      
    const team2Player1 = pair[1].team1 === winner2 
      ? pair[1].team1_player1 
      : pair[1].team2_player1;
      
    const team2Player2 = pair[1].team1 === winner2 
      ? pair[1].team1_player2 
      : pair[1].team2_player2;
    
    winners.push({
      tournament_id: tournamentId,
      team1,
      team2,
      team1_player1: team1Player1 || null,
      team1_player2: team1Player2 || null,
      team2_player1: team2Player1 || null,
      team2_player2: team2Player2 || null,
      round: nextRound,
      match_number: index + 1,
      status: 'pending'
    });
  });
  
  return winners;
};

// Helper to get the winner of a match
function getMatchWinner(match: TournamentMatch): string | null {
  if (match.status !== 'completed' || !match.winner) {
    return null;
  }
  return match.winner;
}
