
import { useState } from "react";
import { supabase, logError } from "@/integrations/supabase/client";
import { GameRecord } from "@/types/game";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";

export const useGameHistory = (roomId?: string) => {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<GameRecord | null>(null);
  const { toast } = useToast();
  const { userEmail, userName } = useAuth();

  // Helper function to ensure team names are properly formatted for 2v2 matches
  const formatTeamName = (game: GameRecord) => {
    if (game.type === "2v2") {
      if (game.team1_player1 && game.team1_player2) {
        // Check if player names are UUIDs (this happens with some player references)
        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        
        // If they look like UUIDs, leave the team name as is, otherwise generate from player names
        if (!isUuid(game.team1_player1) && !isUuid(game.team1_player2)) {
          const orderedNames = [game.team1_player1, game.team1_player2].sort();
          game.team1 = `${orderedNames[0]} and ${orderedNames[1]}`;
        }
      }
      if (game.team2_player1 && game.team2_player2) {
        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        
        if (!isUuid(game.team2_player1) && !isUuid(game.team2_player2)) {
          const orderedNames = [game.team2_player1, game.team2_player2].sort();
          game.team2 = `${orderedNames[0]} and ${orderedNames[1]}`;
        }
      }
    }
    return game;
  };

  const loadGamesHistory = async () => {
    if (!roomId) return;
    
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (error) throw logError(error, 'loadGamesHistory');

      const typedGames = (data || []).map(game => {
        // Format team names properly
        return formatTeamName({
          ...game,
          type: game.type as "1v1" | "2v2",
          score1: Number(game.score1),
          score2: Number(game.score2)
        });
      }) as GameRecord[];

      setGames(typedGames);
    } catch (error) {
      console.error('Error loading games:', error);
      toast({
        title: "Error",
        description: "Failed to load game history",
        variant: "destructive",
      });
    }
  };

  const saveEdit = async (index: number) => {
    if (!editForm) return;

    try {
      // Format team names properly if it's a 2v2 match
      let updatedGame = { ...editForm };
      if (editForm.type === "2v2") {
        updatedGame = formatTeamName(updatedGame);
      }

      updatedGame = {
        ...updatedGame,
        score1: Number(updatedGame.score1),
        score2: Number(updatedGame.score2),
        winner: Number(updatedGame.score1) === Number(updatedGame.score2) 
          ? "Draw" 
          : (Number(updatedGame.score1) > Number(updatedGame.score2) ? updatedGame.team1 : updatedGame.team2),
        updated_at: new Date().toISOString(),
        updated_by: userName || userEmail
      };

      const { error: updateError } = await supabase
        .from('games')
        .update(updatedGame)
        .eq('id', updatedGame.id);

      if (updateError) throw logError(updateError, 'saveEdit');

      const { data: updatedData, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', updatedGame.id)
        .single();

      if (fetchError) throw logError(fetchError, 'fetchUpdatedGame');

      const updatedGameRecord = formatTeamName({
        ...updatedData,
        type: updatedData.type as "1v1" | "2v2",
        score1: Number(updatedData.score1),
        score2: Number(updatedData.score2)
      }) as GameRecord;

      const updatedGames = games.map(game => 
        game.id === updatedGame.id ? updatedGameRecord : game
      );

      setGames(updatedGames);
      setEditingIndex(null);
      setEditForm(null);
      
      toast({
        title: "Success",
        description: "Game record updated successfully",
      });
    } catch (error) {
      console.error('Error updating game:', error);
      toast({
        title: "Error",
        description: "Failed to update game record",
        variant: "destructive",
      });
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...games[index] });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const deleteRecord = async (index: number) => {
    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', games[index].id);

      if (error) throw logError(error, 'deleteRecord');

      const updatedGames = games.filter((_, i) => i !== index);
      setGames(updatedGames);
      toast({
        title: "Success",
        description: "Game record deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting game:', error);
      toast({
        title: "Error",
        description: "Failed to delete game record",
        variant: "destructive",
      });
    }
  };

  const handleEditFormChange = (updates: Partial<GameRecord>) => {
    setEditForm(prev => prev ? { ...prev, ...updates } : null);
  };

  return {
    games,
    editingIndex,
    editForm,
    startEditing,
    cancelEditing,
    saveEdit,
    deleteRecord,
    handleEditFormChange,
    loadGamesHistory
  };
};
