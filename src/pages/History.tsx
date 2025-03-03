
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { downloadAsExcel } from "@/utils/excelUtils";
import { GameRecord } from "@/types/game";
import { GamesList } from "@/components/GamesList";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";

const History = () => {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<GameRecord | null>(null);
  const { toast } = useToast();
  const { userEmail } = useAuth();
  const { currentRoomId, currentRoomName } = useRoom();

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

      if (error) throw error;

      const typedGames = (data || []).map(game => ({
        ...game,
        type: game.type as "1v1" | "2v2",
        score1: Number(game.score1),
        score2: Number(game.score2)
      })) as GameRecord[];

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
      const updatedGame: GameRecord = {
        ...editForm,
        score1: Number(editForm.score1),
        score2: Number(editForm.score2),
        type: editForm.type as "1v1" | "2v2",
        winner: Number(editForm.score1) === Number(editForm.score2) 
          ? "Draw" 
          : (Number(editForm.score1) > Number(editForm.score2) ? editForm.team1 : editForm.team2),
        updated_at: new Date().toISOString(),
        updated_by: userEmail
      };

      const { error: updateError } = await supabase
        .from('games')
        .update(updatedGame)
        .eq('id', editForm.id);

      if (updateError) throw updateError;

      const { data: updatedData, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', editForm.id)
        .single();

      if (fetchError) throw fetchError;

      const updatedGameRecord: GameRecord = {
        ...updatedData,
        type: updatedData.type as "1v1" | "2v2",
        score1: Number(updatedData.score1),
        score2: Number(updatedData.score2)
      };

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

  const clearHistory = async () => {
    try {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('room_id', currentRoomId);

      if (error) throw error;
      
      setGames([]);
      toast({
        title: "Success",
        description: "Game history has been cleared",
      });
    } catch (error) {
      console.error('Error clearing history:', error);
      toast({
        title: "Error",
        description: "Failed to clear game history",
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

      if (error) throw error;

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

  return (
    <div className="container mx-auto pt-24 px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Match History</h1>
        {currentRoomName && (
          <h2 className="text-xl font-medium text-muted-foreground mb-4 md:mb-0">
            Room: {currentRoomName}
          </h2>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => downloadAsExcel()} className="bg-primary hover:bg-primary-hover">
            <FileDown className="mr-2 h-4 w-4" /> Export to Excel
          </Button>
          <Button onClick={clearHistory} variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Clear History
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
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default History;
