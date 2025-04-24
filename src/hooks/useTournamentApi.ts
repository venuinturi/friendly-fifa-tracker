
import { useState } from "react";
import { supabase, logError } from "@/integrations/supabase/client";
import { Tournament, TournamentMatch, TournamentPlayer } from "@/types/game";
import { generateMatchups, generateWalkover } from "@/utils/tournament/matchGeneration";

export const useTournamentApi = () => {
  const [loading, setLoading] = useState(false);

  const fetchTournaments = async (roomId: string): Promise<Tournament[]> => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (error) throw logError(error, 'fetchTournaments');
      return data || [];
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      return [];
    }
  };

  const fetchTournamentMatches = async (tournamentId: string): Promise<TournamentMatch[]> => {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round')
        .order('match_number');

      if (error) throw logError(error, 'fetchTournamentMatches');
      return data || [];
    } catch (error) {
      console.error('Error fetching tournament matches:', error);
      return [];
    }
  };

  const createTournament = async (
    name: string,
    type: "1v1" | "2v2",
    players: TournamentPlayer[],
    roomId: string,
    createdBy: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      // Determine tournament format based on number of players
      const hasRoundRobin = players.length < 8;

      // Insert tournament record
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert([
          {
            name,
            type,
            room_id: roomId,
            has_round_robin: hasRoundRobin,
            round_robin_round: hasRoundRobin ? 0 : null,
            created_by: createdBy
          }
        ])
        .select()
        .single();

      if (tournamentError) throw logError(tournamentError, 'createTournament');

      // Generate matches
      let matches = [];
      
      if (hasRoundRobin) {
        // Round robin format
        matches = generateMatchups(players, tournament.id, type);
      } else {
        // Knockout format (not implemented yet, placeholder)
        matches = generateMatchups(players, tournament.id, type);
      }

      // Insert matches
      if (matches.length > 0) {
        const { error: matchesError } = await supabase
          .from('tournament_matches')
          .insert(matches);

        if (matchesError) throw logError(matchesError, 'createTournamentMatches');
      }

      setLoading(false);
      return true;
    } catch (error) {
      console.error('Error creating tournament:', error);
      setLoading(false);
      return false;
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
  ): Promise<boolean> => {
    try {
      // Determine the winner
      let winner = score1 > score2 ? match.team1 : (score2 > score1 ? match.team2 : 'Draw');
      
      // Update match record
      const { error: matchError } = await supabase
        .from('tournament_matches')
        .update({
          score1,
          score2,
          winner,
          status: 'completed'
        })
        .eq('id', match.id);
      
      if (matchError) throw logError(matchError, 'updateTournamentMatch');
      
      // Also insert into games table for history tracking
      const { error: gameError } = await supabase
        .from('games')
        .insert([{
          tournament_id: tournamentId,
          room_id: roomId,
          team1: match.team1,
          team2: match.team2,
          score1,
          score2,
          winner,
          type: match.team1_player2 ? '2v2' : '1v1',
          created_by: userName,
          updated_by: userName,
          updated_by_email: userEmail,
          team1_player1: match.team1_player1,
          team1_player2: match.team1_player2,
          team2_player1: match.team2_player1,
          team2_player2: match.team2_player2
        }]);
        
      if (gameError) throw logError(gameError, 'insertGameRecord');
      
      return true;
    } catch (error) {
      console.error('Error saving match result:', error);
      return false;
    }
  };

  const updateTournamentMatch = async (match: Partial<TournamentMatch>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('tournament_matches')
        .update(match)
        .eq('id', match.id);
        
      if (error) throw logError(error, 'updateTournamentMatch');
      return true;
    } catch (error) {
      console.error('Error updating tournament match:', error);
      return false;
    }
  };
  
  const createFinalMatch = async (
    tournamentId: string,
    player1Id: string,
    player2Id: string,
    round: number
  ): Promise<boolean> => {
    try {
      // Get tournament details
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();
        
      if (tournamentError) throw logError(tournamentError, 'getTournament');
      
      // Get player details
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name')
        .in('id', [player1Id, player2Id]);
        
      if (playersError) throw logError(playersError, 'getPlayers');
      
      // Create team names based on tournament type
      const player1 = playersData.find(p => p.id === player1Id);
      const player2 = playersData.find(p => p.id === player2Id);
      
      if (!player1 || !player2) {
        throw new Error('Players not found');
      }
      
      let team1: string, team2: string;
      let team1Player2 = null, team2Player2 = null;
      
      if (tournament.type === '2v2') {
        // For 2v2, the playerIds might contain team info
        // This needs to be handled based on how you're tracking teams
        // This is a placeholder implementation
        const [team1Name1, team1Name2] = player1.name.split(' & ');
        const [team2Name1, team2Name2] = player2.name.split(' & ');
        
        team1 = player1.name;
        team2 = player2.name;
        team1Player2 = team1Name2;
        team2Player2 = team2Name2;
      } else {
        team1 = player1.name;
        team2 = player2.name;
      }
      
      // Create the final match
      const { error: matchError } = await supabase
        .from('tournament_matches')
        .insert([{
          tournament_id: tournamentId,
          round,
          match_number: 1,
          team1,
          team2,
          team1_player1: player1.id,
          team1_player2: team1Player2,
          team2_player1: player2.id,
          team2_player2: team2Player2,
          status: 'pending'
        }]);
        
      if (matchError) throw logError(matchError, 'createFinalMatch');
      
      return true;
    } catch (error) {
      console.error('Error creating final match:', error);
      return false;
    }
  };

  const updateTournamentStatus = async (
    tournamentId: string, 
    status: string,
    winner?: string
  ): Promise<boolean> => {
    try {
      const updateData: any = { status };
      if (winner) updateData.winner = winner;
      
      const { error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', tournamentId);
        
      if (error) throw logError(error, 'updateTournamentStatus');
      return true;
    } catch (error) {
      console.error('Error updating tournament status:', error);
      return false;
    }
  };

  const deleteTournament = async (tournamentId: string): Promise<boolean> => {
    setLoading(true);
    try {
      // First, delete all matches for this tournament
      const { error: matchError } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentId);
        
      if (matchError) throw logError(matchError, 'deleteTournamentMatches');
      
      // Then delete the tournament itself
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);
        
      if (error) throw logError(error, 'deleteTournament');
      
      return true;
    } catch (error) {
      console.error('Error deleting tournament:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchTournaments,
    fetchTournamentMatches,
    createTournament,
    saveMatchResult,
    updateTournamentMatch,
    createFinalMatch,
    updateTournamentStatus,
    deleteTournament,
    loading
  };
};
