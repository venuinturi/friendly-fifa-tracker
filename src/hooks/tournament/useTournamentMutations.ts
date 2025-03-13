
import { useToast } from "@/components/ui/use-toast";
import { Tournament, TournamentMatch } from "@/types/game";
import { supabase, logError } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";

// Define a type for creating a tournament with required fields
interface CreateTournamentData {
  name: string;
  type: "1v1" | "2v2";
  room_id: string;
  created_by?: string;
  status?: string;
  auto_advance?: boolean;
  has_round_robin?: boolean;
}

// Define a type for tournament match data with required fields
interface TournamentMatchData {
  tournament_id: string;
  team1: string;
  team2: string;
  round: number;
  match_number: number;
  team1_player1?: string | null;
  team1_player2?: string | null;
  team2_player1?: string | null;
  team2_player2?: string | null;
  status?: string;
  score1?: number | null;
  score2?: number | null;
  winner?: string | null;
}

export const useTournamentMutations = () => {
  const { toast } = useToast();

  const createTournamentMutation = useMutation({
    mutationFn: async (tournamentData: CreateTournamentData): Promise<Tournament | null> => {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .insert(tournamentData)
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
      }
    }
  });

  const createTournamentMatchesMutation = useMutation({
    mutationFn: async (matchesData: TournamentMatchData[]): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('tournament_matches')
          .insert(matchesData);

        if (error) throw logError(error, 'createTournamentMatches');
        return true;
      } catch (error) {
        console.error('Error creating tournament matches:', error);
        toast({
          title: "Error",
          description: "Failed to create tournament matches",
          variant: "destructive",
        });
        return false;
      }
    }
  });

  const updateTournamentMatchMutation = useMutation({
    mutationFn: async ({
      matchId,
      updateData
    }: {
      matchId: string,
      updateData: Partial<TournamentMatch>
    }): Promise<boolean> => {
      try {
        const { error } = await supabase
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
      }
    }
  });

  const saveMatchResultMutation = useMutation({
    mutationFn: async ({
      match,
      score1,
      score2,
      tournamentId,
      roomId,
      userEmail,
      userName = "Unknown"
    }: {
      match: TournamentMatch,
      score1: number,
      score2: number,
      tournamentId: string,
      roomId: string,
      userEmail: string,
      userName?: string
    }): Promise<boolean> => {
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
        
        console.log('Saving match result with user:', {
          team1: match.team1,
          team2: match.team2,
          score1,
          score2,
          winner,
          type: match.team1_player2 ? "2v2" : "1v1",
          tournament_id: tournamentId,
          room_id: roomId,
          created_by: userName || userEmail || 'Unknown',
          updated_by: userName || userEmail || 'Unknown'
        });
        
        // Create a game record that will show in match history and affect leaderboard
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
        
        return true;
      } catch (error) {
        console.error('Error saving match result:', error);
        toast({
          title: "Error",
          description: "Failed to save match result",
          variant: "destructive",
        });
        return false;
      }
    }
  });

  const deleteTournamentMutation = useMutation({
    mutationFn: async (tournamentId: string): Promise<boolean> => {
      try {
        // First delete associated games to avoid foreign key constraint violation
        const { error: gamesError } = await supabase
          .from('games')
          .delete()
          .eq('tournament_id', tournamentId);

        if (gamesError) throw logError(gamesError, 'deleteTournament - deleting games');

        // Then delete matches
        const { error: matchesError } = await supabase
          .from('tournament_matches')
          .delete()
          .eq('tournament_id', tournamentId);

        if (matchesError) throw logError(matchesError, 'deleteTournament - deleting matches');

        // Finally delete the tournament
        const { error: tournamentError } = await supabase
          .from('tournaments')
          .delete()
          .eq('id', tournamentId);

        if (tournamentError) throw logError(tournamentError, 'deleteTournament - deleting tournament');
        
        return true;
      } catch (error) {
        console.error('Error deleting tournament:', error);
        toast({
          title: "Error",
          description: "Failed to delete tournament",
          variant: "destructive",
        });
        return false;
      }
    }
  });

  const advanceToNextRoundMutation = useMutation({
    mutationFn: async ({
      tournamentId,
      currentRound,
      nextRoundMatches,
    }: {
      tournamentId: string;
      currentRound: number;
      nextRoundMatches: TournamentMatchData[];
    }): Promise<boolean> => {
      try {
        if (nextRoundMatches.length === 0) {
          throw new Error('No matches to create for next round');
        }

        const { error } = await supabase
          .from('tournament_matches')
          .insert(nextRoundMatches);

        if (error) throw logError(error, 'advanceToNextRound');
        return true;
      } catch (error) {
        console.error('Error advancing to next round:', error);
        toast({
          title: "Error",
          description: "Failed to advance to next round",
          variant: "destructive",
        });
        return false;
      }
    }
  });

  return {
    createTournament: createTournamentMutation.mutateAsync,
    createTournamentMatches: createTournamentMatchesMutation.mutateAsync,
    updateTournamentMatch: updateTournamentMatchMutation.mutateAsync,
    saveMatchResult: saveMatchResultMutation.mutateAsync,
    deleteTournament: deleteTournamentMutation.mutateAsync,
    advanceToNextRound: advanceToNextRoundMutation.mutateAsync,
  };
};
