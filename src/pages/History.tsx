
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Trash2, Edit2, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { downloadAsExcel } from "@/utils/excelUtils";
import { useNavigate } from "react-router-dom";
import { useUser, useAuth } from "@clerk/clerk-react";

interface GameRecord {
  id: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  winner: string;
  created_at: string;
  updated_at?: string;
  updated_by?: string;
  type: "1v1" | "2v2";
  team1_player1?: string | null;
  team1_player2?: string | null;
  team2_player1?: string | null;
  team2_player2?: string | null;
}

const History = () => {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<GameRecord | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isSignedIn) {
      navigate('/auth');
      return;
    }
    loadGamesHistory();
  }, [isSignedIn, navigate]);

  const loadGamesHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Type assertion to ensure the data matches our GameRecord type
      const typedGames = (data || []).map(game => ({
        ...game,
        type: game.type as "1v1" | "2v2", // Ensure type is correctly typed
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
    if (!editForm || !user) return;

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
        updated_by: user.emailAddresses[0]?.emailAddress || user.id
      };

      const { error: updateError } = await supabase
        .from('games')
        .update(updatedGame)
        .eq('id', editForm.id);

      if (updateError) throw updateError;

      // Fetch the updated record to ensure we have the latest data
      const { data: updatedData, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('id', editForm.id)
        .single();

      if (fetchError) throw fetchError;

      // Update the local state with the fresh data, ensuring proper type casting
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
        .neq('id', 'none'); // This deletes all records

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

  const renderGames = (gameType: "1v1" | "2v2") => {
    const filteredGames = games.filter(game => game.type === gameType);
    
    return (
      <div className="space-y-4">
        {filteredGames.map((game, index) => {
          const originalIndex = games.findIndex(g => g.id === game.id);
          return (
            <Card key={game.id} className="p-4 animate-fade-in">
              {editingIndex === originalIndex ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Team 1</label>
                      <Input
                        value={editForm?.team1 || ""}
                        onChange={(e) => setEditForm(prev => prev ? ({ ...prev, team1: e.target.value }) : null)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Team 2</label>
                      <Input
                        value={editForm?.team2 || ""}
                        onChange={(e) => setEditForm(prev => prev ? ({ ...prev, team2: e.target.value }) : null)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Score 1</label>
                      <Input
                        type="number"
                        value={editForm?.score1 || ""}
                        onChange={(e) => setEditForm(prev => prev ? ({ ...prev, score1: Number(e.target.value) }) : null)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Score 2</label>
                      <Input
                        type="number"
                        value={editForm?.score2 || ""}
                        onChange={(e) => setEditForm(prev => prev ? ({ ...prev, score2: Number(e.target.value) }) : null)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => saveEdit(originalIndex)} size="sm" className="bg-primary hover:bg-primary-hover">
                      <Save className="mr-2 h-4 w-4" /> Save
                    </Button>
                    <Button onClick={cancelEditing} size="sm" variant="outline">
                      <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {new Date(game.created_at).toLocaleDateString()}
                    </p>
                    <p className="font-medium">
                      {game.team1} vs {game.team2}
                    </p>
                    <p className="text-lg font-bold">
                      {game.score1} - {game.score2}
                    </p>
                    {game.updated_by && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Last updated by {game.updated_by} on {new Date(game.updated_at || '').toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-sm text-muted-foreground">Winner</p>
                    <p className="font-medium text-primary">{game.winner}</p>
                    <div className="flex gap-2">
                      <Button onClick={() => startEditing(originalIndex)} size="sm" variant="outline">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => deleteRecord(originalIndex)} size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {filteredGames.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No {gameType} games recorded yet</p>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto pt-24 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Match History</h1>
        <div className="flex gap-2">
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
          {renderGames("1v1")}
        </TabsContent>
        <TabsContent value="2v2">
          {renderGames("2v2")}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default History;
