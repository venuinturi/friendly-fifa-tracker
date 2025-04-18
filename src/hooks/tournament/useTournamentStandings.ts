
import { useState, useEffect } from "react";
import { TournamentMatch, TournamentStanding } from "@/types/game";

export const useTournamentStandings = (matches: TournamentMatch[]): TournamentStanding[] => {
  const [standings, setStandings] = useState<TournamentStanding[]>([]);

  useEffect(() => {
    if (!matches || matches.length === 0) {
      setStandings([]);
      return;
    }

    // Get all unique teams/players from the matches
    const teams = new Set<string>();
    matches.forEach(match => {
      if (match.team1 !== 'BYE') teams.add(match.team1);
      if (match.team2 !== 'BYE') teams.add(match.team2);
    });

    // Initialize standings for each team
    const standingsMap = new Map<string, TournamentStanding>();
    
    teams.forEach(team => {
      const playerId = matches.find(m => m.team1 === team)?.team1_player1 || 
                      matches.find(m => m.team2 === team)?.team2_player1 || 
                      'unknown';
                      
      standingsMap.set(team, {
        name: team,
        id: playerId,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        winPercentage: 0
      });
    });

    // Calculate standings based on completed matches
    matches
      .filter(match => match.status === 'completed' && match.score1 !== null && match.score2 !== null)
      .forEach(match => {
        const team1 = standingsMap.get(match.team1);
        const team2 = standingsMap.get(match.team2);
        
        if (!team1 || !team2 || match.team1 === 'BYE' || match.team2 === 'BYE') return;

        // Update match counts
        team1.matches += 1;
        team2.matches += 1;

        // Update goals
        const score1 = match.score1 || 0;
        const score2 = match.score2 || 0;
        
        team1.goalsFor += score1;
        team1.goalsAgainst += score2;
        team1.goalDifference = team1.goalsFor - team1.goalsAgainst;
        
        team2.goalsFor += score2;
        team2.goalsAgainst += score1;
        team2.goalDifference = team2.goalsFor - team2.goalsAgainst;

        // Update wins/draws/losses and points
        if (score1 > score2) {
          // Team 1 wins
          team1.wins += 1;
          team1.points += 3;
          team2.losses += 1;
        } else if (score1 < score2) {
          // Team 2 wins
          team2.wins += 1;
          team2.points += 3;
          team1.losses += 1;
        } else {
          // Draw
          team1.draws += 1;
          team1.points += 1;
          team2.draws += 1;
          team2.points += 1;
        }
      });

    // Calculate win percentages
    standingsMap.forEach(standing => {
      standing.winPercentage = standing.matches > 0 
        ? ((standing.wins + standing.draws * 0.5) / standing.matches) * 100 
        : 0;
    });

    setStandings(Array.from(standingsMap.values()));
  }, [matches]);

  return standings;
};
