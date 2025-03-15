
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tournament, TournamentMatch } from '@/types/game';

export const useTournamentApi = () => {
  // Queries
  const fetchTournaments = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Tournament[];
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      throw error;
    }
  };

  const fetchTournamentMatches = async (tournamentId: string) => {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;
      return data as TournamentMatch[];
    } catch (error) {
      console.error('Error fetching tournament matches:', error);
      throw error;
    }
  };

  // Mutations
  const createTournament = async (tournament: Omit<Tournament, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .insert([tournament])
        .select()
        .single();

      if (error) throw error;
      return data as Tournament;
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  };

  const createTournamentMatches = async (matches: Omit<TournamentMatch, 'id'>[]) => {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .insert(matches);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating tournament matches:', error);
      throw error;
    }
  };

  const updateTournamentMatch = async (matchId: string, updates: Partial<TournamentMatch>) => {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .update(updates)
        .eq('id', matchId)
        .select();

      if (error) throw error;
      return data[0] as TournamentMatch;
    } catch (error) {
      console.error('Error updating tournament match:', error);
      throw error;
    }
  };

  const deleteTournament = async (tournamentId: string) => {
    try {
      // First, delete all matches associated with the tournament
      const { error: matchesError } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentId);

      if (matchesError) throw matchesError;

      // Then, delete the tournament itself
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);

      if (tournamentError) throw tournamentError;

      return true;
    } catch (error) {
      console.error('Error deleting tournament:', error);
      throw error;
    }
  };
  
  const saveMatchResult = async (
    match: TournamentMatch,
    score1: number,
    score2: number, 
    tournamentId: string,
    roomId: string,
    userEmail: string,
    userName: string
  ) => {
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
          updated_by: userName,
          updated_by_email: userEmail
        }]);
        
      if (gameError) throw gameError;
      
      return true;
    } catch (error) {
      console.error('Error saving match result:', error);
      throw error;
    }
  };

  return {
    // Queries
    fetchTournaments,
    fetchTournamentMatches,
    
    // Mutations
    createTournament,
    createTournamentMatches,
    updateTournamentMatch,
    deleteTournament,
    saveMatchResult
  };
};
