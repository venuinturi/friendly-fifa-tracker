
import { useToast } from "@/components/ui/use-toast";
import { TournamentMatch, Tournament } from "@/types/game";
import { supabase, logError } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";

export const useTournamentMutations = () => {
  const { toast } = useToast();

  const createTournamentMutation = useMutation({
    mutationFn: async (tournamentData: Partial<Tournament>): Promise<Tournament | null> => {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .insert([tournamentData])
          .select('*')
          .single();

        if (error) throw error;
        return data as Tournament;
      } catch (error) {
        logError(error, 'createTournament');
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
    mutationFn: async (matchesData: Partial<TournamentMatch>[]): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('tournament_matches')
          .insert(matchesData);

        if (error) throw error;
        return true;
      } catch (error) {
        logError(error, 'createTournamentMatches');
        toast({
          title: "Error",
          description: "Failed to create tournament matches",
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
      userName
    }: {
      match: TournamentMatch;
      score1: number;
      score2: number;
      tournamentId: string;
      roomId: string;
      userEmail: string;
      userName: string;
    }): Promise<boolean> => {
      try {
        const winner = score1 > score2 ? match.team1 : (score2 > score1 ? match.team2 : 'Draw');
        
        // Update tournament match
        const { error: matchError } = await supabase
          .from('tournament_matches')
          .update({
            score1,
            score2,
            winner,
            status: 'completed'
          })
          .eq('id', match.id);

        if (matchError) throw matchError;

        // Also create a record in the games table
        const { error: gameError } = await supabase
          .from('games')
          .insert([{
            team1: match.team1,
            team2: match.team2,
            score1,
            score2,
            winner,
            created_by: userName,
            type: match.team1_player2 ? '2v2' : '1v1',
            team1_player1: match.team1_player1,
            team1_player2: match.team1_player2,
            team2_player1: match.team2_player1,
            team2_player2: match.team2_player2,
            room_id: roomId,
            tournament_id: tournamentId
          }]);

        if (gameError) throw gameError;
        
        return true;
      } catch (error) {
        logError(error, 'saveMatchResult');
        return false;
      }
    }
  });

  const deleteTournamentMutation = useMutation({
    mutationFn: async (tournamentId: string): Promise<boolean> => {
      try {
        // First delete all matches
        const { error: matchesError } = await supabase
          .from('tournament_matches')
          .delete()
          .eq('tournament_id', tournamentId);

        if (matchesError) throw matchesError;

        // Then delete the tournament
        const { error: tournamentError } = await supabase
          .from('tournaments')
          .delete()
          .eq('id', tournamentId);

        if (tournamentError) throw tournamentError;

        return true;
      } catch (error) {
        logError(error, 'deleteTournament');
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
      nextRoundMatches
    }: {
      tournamentId: string;
      currentRound: number;
      nextRoundMatches: Partial<TournamentMatch>[];
    }): Promise<boolean> => {
      try {
        if (nextRoundMatches.length === 0) {
          throw new Error('No matches to create for next round');
        }

        const { error } = await supabase
          .from('tournament_matches')
          .insert(nextRoundMatches);

        if (error) throw error;
        return true;
      } catch (error) {
        logError(error, 'advanceToNextRound');
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
    saveMatchResult: saveMatchResultMutation.mutateAsync,
    deleteTournament: deleteTournamentMutation.mutateAsync,
    advanceToNextRound: advanceToNextRoundMutation.mutateAsync,
  };
};
