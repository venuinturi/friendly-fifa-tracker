
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TournamentMatch } from '@/types/game';
import { useToast } from '@/components/ui/use-toast';

export const useMatchResults = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const saveMatchResult = async (
    match: TournamentMatch,
    score1: number,
    score2: number, 
    tournamentId: string,
    roomId: string,
    userEmail: string,
    userName: string
  ) => {
    setLoading(true);
    try {
      // Determine the winner
      let winner = 'Draw';
      if (score1 > score2) {
        winner = match.team1;
      } else if (score2 > score1) {
        winner = match.team2;
      }
      
      // Update the match result
      const { data: updatedMatch, error: updateError } = await supabase
        .from('tournament_matches')
        .update({
          score1,
          score2,
          winner,
          status: 'completed' as const
        })
        .eq('id', match.id)
        .select();
        
      if (updateError) throw updateError;
      
      // Create a game record for the match
      const { error: gameError } = await supabase
        .from('games')
        .insert([{
          team1: match.team1,
          team2: match.team2,
          score1,
          score2,
          winner,
          type: match.team1_player2 !== null ? '2v2' : '1v1',
          team1_player1: match.team1_player1,
          team1_player2: match.team1_player2,
          team2_player1: match.team2_player1,
          team2_player2: match.team2_player2,
          tournament_id: tournamentId,
          room_id: roomId,
          created_by: userName,
          updated_by: userName
        }]);
        
      if (gameError) throw gameError;
      
      toast({
        title: "Success",
        description: "Match result saved successfully",
      });
      
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

  return {
    loading,
    saveMatchResult
  };
};
