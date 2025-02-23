
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/ui/use-toast";

const History = () => {
  const [games, setGames] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const savedGames = JSON.parse(localStorage.getItem("games") || "[]");
    setGames(savedGames);
  }, []);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(games);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Games");
    XLSX.writeFile(wb, "fifa-games-history.xlsx");
  };

  const clearHistory = () => {
    localStorage.setItem("games", "[]");
    setGames([]);
    toast({
      title: "Success",
      description: "Game history has been cleared",
    });
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
      <div className="space-y-4">
        {games.map((game, index) => (
          <Card key={index} className="p-4 animate-fade-in">
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
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Winner</p>
                <p className="font-medium text-primary">{game.winner}</p>
              </div>
            </div>
          </Card>
        ))}
        {games.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No games recorded yet</p>
        )}
      </div>
    </div>
  );
};

export default History;
