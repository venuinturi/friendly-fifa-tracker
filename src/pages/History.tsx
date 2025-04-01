import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase, logError } from "@/integrations/supabase/client";
import { downloadAsExcel } from "@/utils/excelUtils";
import { GameRecord } from "@/types/game";
import { GamesList } from "@/components/GamesList";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";
import RoomRequired from "@/components/RoomRequired";

const History = () => {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<GameRecord | null>(null);
  const { toast } = useToast();
  const { userEmail, userName, isAdmin } = useAuth();
  const { currentRoomId, currentRoomName, inRoom } = useRoom();

  // Helper function to ensure team names are properly formatted for 2v2 matches
  const formatTeamName = (game: GameRecord) => {
    if (game.type === "2v2") {
      if (game.team1_player1 && game.team1_player2) {
        const orderedNames = [game.team1_player1, game.team1_player2].sort();
        game.team1 = `${orderedNames[0]} and ${orderedNames[1]}`;
      }
      if (game.team2_player1 && game.team2_player2) {
        const orderedNames = [game.team2_player1, game.team2_player2].sort();
        game.team2 = `${orderedNames[0]} and ${orderedNames[1]}`;
      }
    }
    return game;
  };

  useEffect(() => {
    if (currentRoomId) {
      loadGamesHistory();
    }
  }, [currentRoomId]);

  const loadGamesHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('room_id', currentRoomId)
        .order('created_at', { ascending: false });

      if (error) throw logError(error, 'loadGamesHistory');

      const typedGames = (data || []).map(game => {
        // Format team names properly
        const formattedGame = formatTeamName({
          ...game,
          type: game.type as "1v1" | "2v2",
          score1: Number(game.score1),
          score2: Number(game.score2)
        });
        
        return formattedGame;
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
    if (!editForm || !isAdmin) return;

    try {
      // Format team names properly if it's a 2v2 match
      if (editForm.type === "2v2") {
        if (editForm.team1_player1 && editForm.team1_player2) {
          const orderedNames = [editForm.team1_player1, editForm.team1_player2].sort();
          editForm.team1 = `${orderedNames[0]} and ${orderedNames[1]}`;
        }
        if (editForm.team2_player1 && editForm.team2_player2) {
          const orderedNames = [editForm.team2_player1, editForm.team2_player2].sort();
          editForm.team2 = `${orderedNames[0]} and ${orderedNames[1]}`;
        }
      }

      const updatedGame: GameRecord = {
        ...editForm,
        score1: Number(editForm.score1),
        score2: Number(editForm.score2),
        type: editForm.type as "1v1" | "2v2",
        winner: Number(editForm.score1) === Number(editForm.score2) 
          ? "Draw" 
          : (Number(editForm.score1) > Number(editForm.score2) ? editForm.team1 : editForm.team2),
        updated_at: new Date().toISOString(),
        updated_by: userName || userEmail
      };

      const { error: updateError } = await supabase
        .from('games')
        .update(updatedGame)
        .eq('id', editForm.id);

      if (updateError) throw logError(updateError, 'saveEdit');

      const { data: updatedData, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', editForm.id)
        .single();

      if (fetchError) throw logError(fetchError, 'fetchUpdatedGame');

      const updatedGameRecord = formatTeamName({
        ...updatedData,
        type: updatedData.type as "1v1" | "2v2",
        score1: Number(updatedData.score1),
        score2: Number(updatedData.score2)
      }) as GameRecord;

      const updatedGames = games.map(game => 
        game.id === editForm.id ? updatedGameRecord : game
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
    if (!isAdmin) return;
    setEditingIndex(index);
    setEditForm({ ...games[index] });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const deleteRecord = async (index: number) => {
    if (!isAdmin) return;
    
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

  if (!inRoom) {
    return <RoomRequired />;
  }

  return (
    <div className="container mx-auto px-4 pt-28 md:pt-24">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">Match History</h1>
        {currentRoomName && (
          <h2 className="text-xl font-medium text-muted-foreground mb-4 md:mb-0">
            Room: {currentRoomName}
          </h2>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => downloadAsExcel()} className="bg-primary hover:bg-primary-hover">
            <FileDown className="mr-2 h-4 w-4" /> Export to Excel
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="1v1" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="1v1" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            1v1
          </TabsTrigger>
          <TabsTrigger value="2v2" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            2v2
          </TabsTrigger>
        </TabsList>
        <TabsContent value="1v1">
          <GamesList
            games={games}
            gameType="1v1"
            editingIndex={editingIndex}
            editForm={editForm}
            onStartEdit={startEditing}
            onDelete={deleteRecord}
            onSave={saveEdit}
            onCancel={cancelEditing}
            onEditFormChange={handleEditFormChange}
            canEdit={isAdmin}
            canDelete={isAdmin}
          />
        </TabsContent>
        <TabsContent value="2v2">
          <GamesList
            games={games}
            gameType="2v2"
            editingIndex={editingIndex}
            editForm={editForm}
            onStartEdit={startEditing}
            onDelete={deleteRecord}
            onSave={saveEdit}
            onCancel={cancelEditing}
            onEditFormChange={handleEditFormChange}
            canEdit={isAdmin}
            canDelete={isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default History;
