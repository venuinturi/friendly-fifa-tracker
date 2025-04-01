
import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useRoom } from "@/context/RoomContext";
import { useAuth } from "@/context/AuthContext";
import { StatsOverview } from "@/components/stats/StatsOverview";
import { StatsHeader } from "@/components/stats/StatsHeader";
import { FilterControls } from "@/components/stats/FilterControls";
import RoomRequired from "@/components/RoomRequired";

interface PlayerStats {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  winPercentage: number;
}

const PlayerStats = () => {
  const [timeFilter, setTimeFilter] = useState<"month" | "allTime">("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [gameType, setGameType] = useState<"1v1" | "2v2">("1v1");
  const [stats, setStats] = useState<PlayerStats>({
    total: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    winPercentage: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentRoomId, inRoom } = useRoom();
  const { userEmail } = useAuth();

  // Generate last 12 months for dropdown
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy')
    };
  });

  useEffect(() => {
    if (inRoom && currentRoomId && userEmail) {
      loadPlayerStats();
    }
  }, [currentRoomId, userEmail, timeFilter, selectedMonth, gameType, inRoom]);

  const loadPlayerStats = async () => {
    if (!userEmail || !currentRoomId) return;
    
    setIsLoading(true);
    try {
      let query = supabase.from('games').select('*').eq('room_id', currentRoomId);
      
      // Filter by game type
      query = query.eq('type', gameType);
      
      // Apply time filter
      if (timeFilter === "month") {
        const startDate = startOfMonth(new Date(selectedMonth));
        const endDate = endOfMonth(new Date(selectedMonth));
        query = query
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filter and calculate stats
      const userGames = data.filter(game => {
        if (gameType === "1v1") {
          return game.team1 === userEmail || game.team2 === userEmail;
        } else {
          return (
            game.team1_player1 === userEmail || 
            game.team1_player2 === userEmail || 
            game.team2_player1 === userEmail || 
            game.team2_player2 === userEmail
          );
        }
      });
      
      // Calculate statistics
      const total = userGames.length;
      let wins = 0;
      let draws = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;
      
      userGames.forEach(game => {
        const isTeam1 = gameType === "1v1" 
          ? game.team1 === userEmail
          : (game.team1_player1 === userEmail || game.team1_player2 === userEmail);
        
        if (game.winner === "Draw") {
          draws++;
        } else if (
          (isTeam1 && game.winner === game.team1) || 
          (!isTeam1 && game.winner === game.team2)
        ) {
          wins++;
        }
        
        if (isTeam1) {
          goalsFor += Number(game.score1);
          goalsAgainst += Number(game.score2);
        } else {
          goalsFor += Number(game.score2);
          goalsAgainst += Number(game.score1);
        }
      });
      
      const losses = total - wins - draws;
      const winPercentage = total > 0 ? (wins / total) * 100 : 0;
      
      setStats({
        total,
        wins,
        losses,
        draws,
        goalsFor,
        goalsAgainst,
        winPercentage
      });
      
    } catch (error) {
      console.error('Error loading player stats:', error);
      toast({
        title: "Error",
        description: "Failed to load player statistics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!inRoom) {
    return <RoomRequired />;
  }

  // Prepare chart data
  const resultData = [
    { name: 'Wins', value: stats.wins, color: '#22c55e' },
    { name: 'Losses', value: stats.losses, color: '#ef4444' },
    { name: 'Draws', value: stats.draws, color: '#f59e0b' }
  ].filter(item => item.value > 0);

  return (
    <div className="container mx-auto px-4 pt-28 md:pt-24">
      <StatsHeader title="Player Statistics" />
      
      <FilterControls
        gameType={gameType}
        onGameTypeChange={setGameType}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        months={months}
        isMonthVisible={timeFilter === "month"}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatsOverview 
          stats={stats}
          isLoading={isLoading}
        />
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Match Results</CardTitle>
          <CardDescription>
            Breakdown of your game outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resultData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {resultData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} games`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  {isLoading ? "Loading stats..." : "No games found for the selected period"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerStats;
