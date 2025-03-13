import { useState } from 'react';
import { supabase, logError } from '@/integrations/supabase/client';
import { Tournament, TournamentMatch } from '@/types/game';
import { useToast } from '@/components/ui/use-toast';

export const useTournamentApi = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const { 
    loading: queriesLoading,
    fetchTournaments,
    fetchTournamentMatches 
  } = useTournamentQueries();

  const {
    createTournament,
    createTournamentMatches,
    updateTournamentMatch,
    saveMatchResult,
    deleteTournament,
    advanceToNextRound,
  } = useTournamentMutations();

  const generateNextRoundMatches = async (tournamentId: string, currentRound: number): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { data: completedMatches, error: fetchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round', currentRound)
        .eq('status', 'completed')
        .order('match_number', { ascending: true });
      
      if (fetchError) throw logError(fetchError, 'generateNextRoundMatches');
      if (!completedMatches || completedMatches.length === 0) return false;
      
      const { count, error: countError } = await supabase
        .from('tournament_matches')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('round', currentRound);
      
      if (countError) throw logError(countError, 'generateNextRoundMatches');
      
      if (completedMatches.length !== count) return false;
      
      const nextRound = currentRound + 1;
      const nextRoundMatches = [];

      const isSemiFinal = completedMatches.length <= 2;
      
      if (completedMatches.length === 3 && isSemiFinal) {
        const scoreDiffs = completedMatches.map(match => {
          const scoreDiff = Math.abs((match.score1 || 0) - (match.score2 || 0));
          return {
            match,
            scoreDiff,
            totalScore: (match.score1 || 0) + (match.score2 || 0),
            winner: match.winner
          };
        });
        
        scoreDiffs.sort((a, b) => {
          if (a.scoreDiff !== b.scoreDiff) return b.scoreDiff - a.scoreDiff;
          return b.totalScore - a.totalScore;
        });
        
        const byePlayer = scoreDiffs[0].winner;
        
        const remainingPlayers = scoreDiffs.slice(1).map(sd => sd.winner);
        
        nextRoundMatches.push({
          tournament_id: tournamentId,
          team1: byePlayer,
          team2: 'TBD',
          team1_player1: getPlayerIdFromMatch(scoreDiffs[0].match, byePlayer),
          team1_player2: getPlayerIdFromMatch(scoreDiffs[0].match, byePlayer, true),
          round: nextRound,
          match_number: 1,
          status: 'pending'
        });
        
        nextRoundMatches.push({
          tournament_id: tournamentId,
          team1: remainingPlayers[0],
          team2: remainingPlayers[1],
          team1_player1: getPlayerIdFromMatch(scoreDiffs[1].match, remainingPlayers[0]),
          team1_player2: getPlayerIdFromMatch(scoreDiffs[1].match, remainingPlayers[0], true),
          team2_player1: getPlayerIdFromMatch(scoreDiffs[2].match, remainingPlayers[1]),
          team2_player2: getPlayerIdFromMatch(scoreDiffs[2].match, remainingPlayers[1], true),
          round: nextRound,
          match_number: 2,
          status: 'pending'
        });
      } else if (completedMatches.length % 2 !== 0) {
        const firstWinner = completedMatches[0];
        
        if (firstWinner.winner !== 'BYE') {
          nextRoundMatches.push({
            tournament_id: tournamentId,
            team1: firstWinner.winner,
            team2: 'BYE',
            team1_player1: firstWinner.winner === firstWinner.team1 ? firstWinner.team1_player1 : firstWinner.team2_player1,
            team1_player2: firstWinner.winner === firstWinner.team1 ? firstWinner.team1_player2 : firstWinner.team2_player2,
            status: 'pending',
            round: nextRound,
            match_number: 1
          });
        }
        
        for (let i = 1; i < completedMatches.length; i += 2) {
          const match1 = completedMatches[i];
          const match2 = i + 1 < completedMatches.length ? completedMatches[i + 1] : null;
          
          if (match2 && !(match1.winner === 'BYE' && match2.winner === 'BYE')) {
            nextRoundMatches.push({
              tournament_id: tournamentId,
              team1: match1.winner,
              team2: match2.winner,
              team1_player1: match1.winner === match1.team1 ? match1.team1_player1 : match1.team2_player1,
              team1_player2: match1.winner === match1.team1 ? match1.team1_player2 : match1.team2_player2,
              team2_player1: match2.winner === match2.team1 ? match2.team1_player1 : match2.team2_player1,
              team2_player2: match2.winner === match2.team1 ? match2.team1_player2 : match2.team2_player2,
              status: 'pending',
              round: nextRound,
              match_number: nextRoundMatches.length + 1
            });
          }
        }
      } else {
        for (let i = 0; i < completedMatches.length; i += 2) {
          const match1 = completedMatches[i];
          const match2 = i + 1 < completedMatches.length ? completedMatches[i + 1] : null;
          
          if (match2 && !(match1.winner === 'BYE' && match2.winner === 'BYE')) {
            nextRoundMatches.push({
              tournament_id: tournamentId,
              team1: match1.winner,
              team2: match2.winner,
              team1_player1: match1.winner === match1.team1 ? match1.team1_player1 : match1.team2_player1,
              team1_player2: match1.winner === match1.team1 ? match1.team1_player2 : match1.team2_player2,
              team2_player1: match2.winner === match2.team1 ? match2.team1_player1 : match2.team2_player1,
              team2_player2: match2.winner === match2.team1 ? match2.team1_player2 : match2.team2_player2,
              status: 'pending',
              round: nextRound,
              match_number: Math.floor(i / 2) + 1
            });
          }
        }
      }
      
      if (nextRoundMatches.length > 0) {
        await advanceToNextRound({
          tournamentId, 
          currentRound, 
          nextRoundMatches
        });
        
        for (const match of nextRoundMatches) {
          if (match.team2 === 'BYE') {
            await updateTournamentMatch({
              matchId: match.id || '',
              updateData: {
                status: 'completed',
                winner: match.team1,
                score1: 3,
                score2: 0
              }
            });
          } else if (match.team1 === 'BYE') {
            await updateTournamentMatch({
              matchId: match.id || '',
              updateData: {
                status: 'completed',
                winner: match.team2,
                score1: 0,
                score2: 3
              }
            });
          }
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error generating next round matches:', error);
      logError(error, 'generateNextRoundMatches');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getPlayerIdFromMatch = (match: TournamentMatch, teamName: string, isSecondPlayer = false): string | null => {
    if (teamName === match.team1) {
      return isSecondPlayer ? match.team1_player2 : match.team1_player1;
    } else if (teamName === match.team2) {
      return isSecondPlayer ? match.team2_player2 : match.team2_player1;
    }
    return null;
  };

  const createNextRoundMatches = async (currentMatches: TournamentMatch[]) => {
    try {
      setLoading(true);
      
      const matchesByRound = currentMatches.reduce((acc, match) => {
        if (!acc[match.round]) acc[match.round] = [];
        acc[match.round].push(match);
        return acc;
      }, {} as Record<number, TournamentMatch[]>);
      
      const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
      
      for (const round of rounds) {
        const roundMatches = matchesByRound[round];
        const tournamentId = roundMatches[0]?.tournament_id;
        
        if (!tournamentId) continue;
        
        const matchesWithBye = roundMatches.filter(
          match => match.team1 === 'BYE' || match.team2 === 'BYE'
        );
        
        if (matchesWithBye.length > 0) {
          for (const match of matchesWithBye) {
            const winner = match.team1 === 'BYE' ? match.team2 : match.team1;
            const score1 = match.team1 === 'BYE' ? 0 : 3;
            const score2 = match.team2 === 'BYE' ? 0 : 3;
            
            await (supabase as any)
              .from('tournament_matches')
              .update({
                status: 'completed' as "pending" | "completed",
                winner,
                score1,
                score2
              })
              .eq('id', match.id);
            
            await (supabase as any)
              .from('games')
              .insert([{
                team1: match.team1,
                team2: match.team2,
                score1,
                score2,
                winner,
                type: match.team1_player2 ? "2v2" : "1v1",
                team1_player1: match.team1_player1,
                team1_player2: match.team1_player2,
                team2_player1: match.team2_player1,
                team2_player2: match.team2_player2,
                created_by: 'system',
                tournament_id: match.tournament_id,
                room_id: await getRoomIdForTournament(match.tournament_id)
              }]);
          }
          
          await generateNextRoundMatches(tournamentId, round);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error handling walkovers:', error);
      logError(error, 'createNextRoundMatches');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getRoomIdForTournament = async (tournamentId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('room_id')
        .eq('id', tournamentId)
        .single();
      
      if (error) throw logError(error, 'getRoomIdForTournament');
      return data?.room_id || null;
    } catch (error) {
      console.error('Error getting room ID for tournament:', error);
      return null;
    }
  };

  const handleSmall2v2Tournament = async (tournamentId: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      return true;
    } catch (error) {
      console.error('Error creating small 2v2 tournament:', error);
      logError(error, 'handleSmall2v2Tournament');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createTournament = async (
    tournamentData: {
      name: string;
      type: "1v1" | "2v2";
      room_id: string;
      created_by: string;
      status: "pending" | "active" | "completed";
      auto_advance?: boolean;
    }
  ): Promise<Tournament | null> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('tournaments')
        .insert([tournamentData])
        .select()
        .single();
      
      if (error) throw logError(error, 'createTournament');
      return data;
    } catch (error) {
      console.error('Error creating tournament:', error);
      logError(error, 'createTournament');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createTournamentMatches = async (matches: Omit<TournamentMatch, 'id'>[]) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('tournament_matches')
        .insert(matches)
        .select();
      
      if (error) throw logError(error, 'createTournamentMatches');
      return data;
    } catch (error) {
      console.error('Error creating tournament matches:', error);
      logError(error, 'createTournamentMatches');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateTournamentMatch = async (
    matchId: string, 
    updateData: Partial<TournamentMatch>
  ) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('tournament_matches')
        .update(updateData)
        .eq('id', matchId);

      if (error) throw logError(error, 'updateTournamentMatch');
      return true;
    } catch (error) {
      console.error('Error updating match:', error);
      toast({
        title: "Error",
        description: "Failed to update match",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading: loading || queriesLoading,
    fetchTournaments,
    fetchTournamentMatches,
    createTournament,
    createTournamentMatches,
    updateTournamentMatch,
    deleteTournament,
    saveMatchResult,
    createNextRoundMatches,
    generateNextRoundMatches,
    handleSmall2v2Tournament,
    advanceToNextRound
  };
};
