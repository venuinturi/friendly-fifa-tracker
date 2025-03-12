
import { useState } from 'react';
import { supabase, logError } from '@/integrations/supabase/client';
import { Tournament, TournamentMatch } from '@/types/game';
import { useToast } from '@/components/ui/use-toast';
import { generateNextRoundMatches } from '@/utils/tournament/matchGeneration';
import { handleMatchWalkovers } from '@/utils/tournament/walkoverHandling';

export const useTournamentMutations = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .insert([tournamentData])
        .select();

      if (error) throw logError(error, 'createTournament');
      return data[0] as Tournament;
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Error",
        description: "Failed to create tournament",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createTournamentMatches = async (matches: Omit<TournamentMatch, 'id'>[]) => {
    setLoading(true);
    try {
      const { error, data } = await supabase
        .from('tournament_matches')
        .insert(matches)
        .select();

      if (error) throw logError(error, 'createTournamentMatches');
      
      if (data && data.length > 0) {
        await handleMatchWalkovers(data);
      }
      
      return true;
    } catch (error) {
      console.error('Error creating tournament matches:', error);
      toast({
        title: "Error",
        description: "Failed to create tournament matches",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveMatchResult = async (
    match: TournamentMatch,
    score1: number,
    score2: number,
    tournamentId: string,
    roomId: string,
    userEmail: string,
    userName: string = "Unknown"
  ) => {
    setLoading(true);
    try {
      let winner = '';
      if (score1 > score2) winner = match.team1;
      else if (score2 > score1) winner = match.team2;
      else winner = 'Draw';
      
      // Update the match
      const { error: matchError } = await supabase
        .from('tournament_matches')
        .update({
          score1,
          score2,
          winner,
          status: 'completed'
        })
        .eq('id', match.id);
      
      if (matchError) throw logError(matchError, 'saveMatchResult - updating match');
      
      // Create game record
      const { error: gameError } = await supabase
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
          created_by: userName || userEmail || 'Unknown',
          updated_by: userName || userEmail || 'Unknown',
          tournament_id: tournamentId,
          room_id: roomId
        }]);
      
      if (gameError) throw logError(gameError, 'saveMatchResult - creating game record');
      
      // Check if all matches in round are completed
      const { data: roundMatches, error: roundError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round', match.round);
      
      if (roundError) throw logError(roundError, 'saveMatchResult - checking round matches');
      
      const allCompleted = roundMatches.every(m => m.status === 'completed');
      
      if (allCompleted) {
        const { data: tournament, error: tournamentError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single();
        
        if (tournamentError) throw logError(tournamentError, 'saveMatchResult - checking tournament');
        
        if (tournament && tournament.auto_advance) {
          await generateNextRoundMatches(tournamentId, match.round);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error saving match result:', error);
      toast({
        title: "Error",
        description: "Failed to save match result",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteTournament = async (tournamentId: string) => {
    setLoading(true);
    try {
      const { error: matchesError } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentId);

      if (matchesError) throw logError(matchesError, 'deleteTournament');

      const { error: tournamentError } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);

      if (tournamentError) throw logError(tournamentError, 'deleteTournament');
      
      return true;
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: "Error",
        description: "Failed to delete tournament",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createTournament,
    createTournamentMatches,
    saveMatchResult,
    deleteTournament,
  };
};
