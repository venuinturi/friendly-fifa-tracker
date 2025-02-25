
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface PlayerStats {
  name: string;
  wins: number;
  draws: number;
  totalGames: number;
  winPercentage: number;
  goalDifference: number;
}

interface GameRecord {
  id: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  winner: string;
  created_at: string;
  type: "1v1" | "2v2";
  team1_player1?: string | null;
  team1_player2?: string | null;
  team2_player1?: string | null;
  team2_player2?: string | null;
}

const Leaderboard = () => {
  const [stats1v1, setStats1v1] = useState<PlayerStats[]>([]);
  const [stats2v2, setStats2v2] = useState<PlayerStats[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: gamesData, error } = await supabase
        .from('games')
        .select('*');

      if (error) throw error;

      // Convert the data to the correct type and ensure numbers are numbers
      const games = (gamesData || []).map(game => ({
        ...game,
        score1: Number(game.score1),
        score2: Number(game.score2),
        type: game.type as "1v1" | "2v2"
      })) as GameRecord[];

      const calculateStats = (type: "1v1" | "2v2") => {
        const typeGames = games.filter((game) => game.type === type);
        const playerStats = new Map<string, { 
          wins: number; 
          draws: number; 
          totalGames: number;
          goalsFor: number;
          goalsAgainst: number; 
        }>();

        typeGames.forEach((game) => {
          const isDraw = game.score1 === game.score2;

          // Update team 1 stats
          const team1Current = playerStats.get(game.team1) || { 
            wins: 0, 
            draws: 0, 
            totalGames: 0,
            goalsFor: 0,
            goalsAgainst: 0
          };
          playerStats.set(game.team1, {
            wins: team1Current.wins + (isDraw ? 0 : (game.winner === game.team1 ? 1 : 0)),
            draws: team1Current.draws + (isDraw ? 1 : 0),
            totalGames: team1Current.totalGames + 1,
            goalsFor: team1Current.goalsFor + game.score1,
            goalsAgainst: team1Current.goalsAgainst + game.score2
          });

          // Update team 2 stats
          const team2Current = playerStats.get(game.team2) || { 
            wins: 0, 
            draws: 0, 
            totalGames: 0,
            goalsFor: 0,
            goalsAgainst: 0
          };
          playerStats.set(game.team2, {
            wins: team2Current.wins + (isDraw ? 0 : (game.winner === game.team2 ? 1 : 0)),
            draws: team2Current.draws + (isDraw ? 1 : 0),
            totalGames: team2Current.totalGames + 1,
            goalsFor: team2Current.goalsFor + game.score2,
            goalsAgainst: team2Current.goalsAgainst + game.score1
          });
        });

        return Array.from(playerStats.entries())
          .map(([name, stats]) => ({
            name,
            wins: stats.wins,
            draws: stats.draws,
            totalGames: stats.totalGames,
            winPercentage: ((stats.wins + stats.draws * 0.5) / stats.totalGames) * 100,
            goalDifference: stats.goalsFor - stats.goalsAgainst
          }))
          .sort((a, b) => {
            if (b.winPercentage !== a.winPercentage) {
              return b.winPercentage - a.winPercentage;
            }
            return b.goalDifference - a.goalDifference;
          });
      };

      setStats1v1(calculateStats("1v1"));
      setStats2v2(calculateStats("2v2"));
    } catch (error) {
      console.error('Error loading stats:', error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard stats",
        variant: "destructive",
      });
    }
  };

  const renderStats = (stats: PlayerStats[]) => (
    <div className="space-y-4">
      {stats.map((player, index) => (
        <Card key={index} className="p-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">{player.name}</p>
              <p className="text-sm text-muted-foreground">
                {player.wins} wins, {player.draws} draws out of {player.totalGames} games
              </p>
              <p className="text-sm text-muted-foreground">
                Goal Difference: {player.goalDifference > 0 ? "+" : ""}{player.goalDifference}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">
                {player.winPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      ))}
      {stats.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No games recorded yet</p>
      )}
    </div>
  );

  return (
    <div className="container mx-auto pt-24 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Leaderboard</h1>
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
          {renderStats(stats1v1)}
        </TabsContent>
        <TabsContent value="2v2">
          {renderStats(stats2v2)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;
