
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Trash2, Edit2, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveGamesToExcel, loadGamesFromExcel } from "@/utils/excelUtils";

interface GameRecord {
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  winner: string;
  date: string;
  type: "1v1" | "2v2";
}

const History = () => {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<GameRecord | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadedGames = loadGamesFromExcel();
    setGames(loadedGames);
  }, []);

  const exportToExcel = () => {
    saveGamesToExcel(games);
    toast({
      title: "Success",
      description: "Games exported to Excel successfully",
    });
  };

  const clearHistory = () => {
    setGames([]);
    saveGamesToExcel([]);
    toast({
      title: "Success",
      description: "Game history has been cleared",
    });
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...games[index] });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const saveEdit = (index: number) => {
    if (!editForm) return;

    const score1 = parseInt(editForm.score1);
    const score2 = parseInt(editForm.score2);
    const winner = score1 === score2 ? "Draw" : (score1 > score2 ? editForm.team1 : editForm.team2);
    
    const updatedGames = [...games];
    updatedGames[index] = { ...editForm, winner };
    
    setGames(updatedGames);
    saveGamesToExcel(updatedGames);
    setEditingIndex(null);
    setEditForm(null);
    
    toast({
      title: "Success",
      description: "Game record updated successfully",
    });
  };

  const deleteRecord = (index: number) => {
    const updatedGames = games.filter((_, i) => i !== index);
    setGames(updatedGames);
    saveGamesToExcel(updatedGames);
    
    toast({
      title: "Success",
      description: "Game record deleted successfully",
    });
  };

  const renderGames = (gameType: "1v1" | "2v2") => {
    const filteredGames = games.filter(game => game.type === gameType);
    
    return (
      <div className="space-y-4">
        {filteredGames.map((game, index) => {
          const originalIndex = games.findIndex(g => g === game);
          return (
            <Card key={index} className="p-4 animate-fade-in">
              {editingIndex === originalIndex ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Team 1</label>
                      <Input
                        value={editForm?.team1 || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev!, team1: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Team 2</label>
                      <Input
                        value={editForm?.team2 || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev!, team2: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Score 1</label>
                      <Input
                        type="number"
                        value={editForm?.score1 || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev!, score1: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Score 2</label>
                      <Input
                        type="number"
                        value={editForm?.score2 || ""}
                        onChange={(e) => setEditForm(prev => ({ ...prev!, score2: e.target.value }))}
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
                    <p className="text-sm text-muted-foreground">{new Date(game.date).toLocaleDateString()}</p>
                    <p className="font-medium">
                      {game.team1} vs {game.team2}
                    </p>
                    <p className="text-lg font-bold">
                      {game.score1} - {game.score2}
                    </p>
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
          <Button onClick={exportToExcel} className="bg-primary hover:bg-primary-hover">
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
