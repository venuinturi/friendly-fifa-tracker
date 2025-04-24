
import { useState, useCallback } from "react";
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
  const formatTeamName = (game: GameRecord): GameRecord => {
    if (game.type === "2v2") {
      // For team names in 2v2 matches, use the format "Player1 & Player2"
      if (game.team1_player1 && game.team1_player2) {
        // First, try to get player names directly
        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        
        // If team1_player1 and team1_player2 are not UUIDs (they're actual names), use them directly
        if (!isUuid(game.team1_player1) && !isUuid(game.team1_player2)) {
          const names = [game.team1_player1, game.team1_player2].sort();
          game.team1 = `${names[0]} & ${names[1]}`;
        }
        // If they appear to be UUIDs, try to fetch player names from database
        // This is handled in the loadGamesHistory function
      }
      
      if (game.team2_player1 && game.team2_player2) {
        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        
        if (!isUuid(game.team2_player1) && !isUuid(game.team2_player2)) {
          const names = [game.team2_player1, game.team2_player2].sort();
          game.team2 = `${names[0]} & ${names[1]}`;
        }
      }
    }
    return game;
  };

  const loadGamesHistory = useCallback(async () => {
    if (!roomId) {
      console.log("No room ID provided, skipping game history load");
      return;
    }
    
    console.log("Loading game history for room:", roomId);
    
    try {
      // Fetch all games for the room
      const { data: gamesData, error } = await supabase
        .from('games')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (error) throw logError(error, 'loadGamesHistory');
      
      console.log(`Loaded ${gamesData?.length || 0} games`);
      
      // Get all player IDs referenced in games
      const playerIds = new Set<string>();
      gamesData?.forEach(game => {
        [game.team1_player1, game.team1_player2, game.team2_player1, game.team2_player2]
          .filter(id => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
          .forEach(id => id && playerIds.add(id));
      });
      
      console.log(`Found ${playerIds.size} unique player IDs in games`);
      
      // If there are player IDs, fetch their names
      let playerMap: Record<string, string> = {};
      if (playerIds.size > 0) {
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, name')
          .in('id', Array.from(playerIds));
          
        if (playersError) throw logError(playersError, 'loadPlayersForGames');
        
        if (playersData) {
          playerMap = playersData.reduce((acc, player) => {
            acc[player.id] = player.name.toLowerCase();
            return acc;
          }, {} as Record<string, string>);
          
          console.log(`Loaded ${playersData.length} player names`);
        }
      }
      
      // Process each game
      const typedGames = (gamesData || []).map(game => {
        let updatedGame = {
          ...game,
          type: game.type as "1v1" | "2v2",
          score1: Number(game.score1),
          score2: Number(game.score2)
        } as GameRecord;
        
        // Replace player IDs with names if available
        if (playerMap[game.team1_player1]) {
          updatedGame.team1_player1 = playerMap[game.team1_player1];
        }
        if (playerMap[game.team1_player2]) {
          updatedGame.team1_player2 = playerMap[game.team1_player2];
        }
        if (playerMap[game.team2_player1]) {
          updatedGame.team2_player1 = playerMap[game.team2_player1];
        }
        if (playerMap[game.team2_player2]) {
          updatedGame.team2_player2 = playerMap[game.team2_player2];
        }
        
        // Format team names for 2v2 games
        if (game.type === "2v2") {
          if (updatedGame.team1_player1 && updatedGame.team1_player2) {
            const team1Names = [updatedGame.team1_player1, updatedGame.team1_player2].sort();
            updatedGame.team1 = `${team1Names[0]} & ${team1Names[1]}`;
          }
          
          if (updatedGame.team2_player1 && updatedGame.team2_player2) {
            const team2Names = [updatedGame.team2_player1, updatedGame.team2_player2].sort();
            updatedGame.team2 = `${team2Names[0]} & ${team2Names[1]}`;
          }
        }
        
        // Ensure all text fields are lowercase for case-insensitive comparisons
        updatedGame.team1 = updatedGame.team1.toLowerCase();
        updatedGame.team2 = updatedGame.team2.toLowerCase();
        updatedGame.winner = updatedGame.winner.toLowerCase();

        return updatedGame;
      });

      setGames(typedGames);
      console.log("Game history loaded and processed successfully");
    } catch (error) {
      console.error('Error loading games:', error);
      toast({
        title: "Error",
        description: "Failed to load game history",
        variant: "destructive",
      });
    }
  }, [roomId, toast]);

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
        team1: updatedGame.team1.toLowerCase(),
        team2: updatedGame.team2.toLowerCase(),
        winner: Number(updatedGame.score1) === Number(updatedGame.score2) 
          ? "draw" 
          : (Number(updatedGame.score1) > Number(updatedGame.score2) ? updatedGame.team1.toLowerCase() : updatedGame.team2.toLowerCase()),
        updated_at: new Date().toISOString(),
        updated_by: userName || userEmail
      };

      const { error: updateError } = await supabase
        .from('games')
        .update(updatedGame)
        .eq('id', updatedGame.id);

      if (updateError) throw logError(updateError, 'saveEdit');

      // Reload the game history to ensure we get correctly formatted data
      await loadGamesHistory();
      
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
