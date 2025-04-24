
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
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

interface PlayerOpponentStats {
  opponentName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winPercentage: number;
}

const PlayerStats = () => {
  const [timeFilter, setTimeFilter] = useState<"month" | "allTime">("month");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [gameType, setGameType] = useState<"1v1" | "2v2">("1v1");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [players, setPlayers] = useState<{ id: string, name: string }[]>([]);
  const [stats, setStats] = useState<PlayerStats>({
    total: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    winPercentage: 0
  });
  const [mostPlayedAgainst, setMostPlayedAgainst] = useState<PlayerOpponentStats[]>([]);
  const [mostWinsAgainst, setMostWinsAgainst] = useState<PlayerOpponentStats[]>([]);
  const [mostLossesAgainst, setMostLossesAgainst] = useState<PlayerOpponentStats[]>([]);
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

  // Load all players in current room
  useEffect(() => {
    if (!currentRoomId) return;
    
    const loadPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from('players')
          .select('id, name')
          .eq('room_id', currentRoomId);
          
        if (error) throw error;
        
        setPlayers(data);
        
        // Auto-select the current user if they're in the list
        if (userEmail && !selectedPlayer) {
          const currentUser = data.find(p => p.name.toLowerCase() === userEmail.toLowerCase());
          if (currentUser) {
            setSelectedPlayer(currentUser.id);
          } else if (data.length > 0) {
            setSelectedPlayer(data[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading players:', error);
        toast({
          title: "Error",
          description: "Failed to load players",
          variant: "destructive",
        });
      }
    };
    
    loadPlayers();
  }, [currentRoomId, userEmail]);

  useEffect(() => {
    if (selectedPlayer && currentRoomId) {
      loadPlayerStats();
    }
  }, [currentRoomId, selectedPlayer, timeFilter, selectedMonth, gameType]);

  const loadPlayerStats = async () => {
    if (!selectedPlayer || !currentRoomId) return;
    
    setIsLoading(true);
    try {
      // Find player name
      const player = players.find(p => p.id === selectedPlayer);
      if (!player) return;
      
      const playerName = player.name;
      
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
      let userGames = [];
      
      if (gameType === "1v1") {
        userGames = data.filter(game => 
          game.team1 === playerName || game.team2 === playerName
        );
      } else {
        userGames = data.filter(game => 
          [game.team1_player1, game.team1_player2, game.team2_player1, game.team2_player2]
            .some(p => p === playerName || p === selectedPlayer)
        );
      }
      
      // Calculate statistics
      const total = userGames.length;
      let wins = 0;
      let draws = 0;
      let goalsFor = 0;
      let goalsAgainst = 0;
      
      // Track opponents stats
      const opponentStats: Record<string, {
        gamesPlayed: number;
        wins: number;
        losses: number;
        draws: number;
      }> = {};
      
      userGames.forEach(game => {
        let isTeam1 = false;
        let opponentName = "";
        
        if (gameType === "1v1") {
          isTeam1 = game.team1 === playerName;
          opponentName = isTeam1 ? game.team2 : game.team1;
        } else {
          isTeam1 = [game.team1_player1, game.team1_player2].some(p => p === playerName || p === selectedPlayer);
          
          if (isTeam1) {
            // Opponent is team2
            if (game.team2_player1 && game.team2_player2) {
              opponentName = `${game.team2_player1} & ${game.team2_player2}`;
            } else {
              opponentName = game.team2;
            }
          } else {
            // Opponent is team1
            if (game.team1_player1 && game.team1_player2) {
              opponentName = `${game.team1_player1} & ${game.team1_player2}`;
            } else {
              opponentName = game.team1;
            }
          }
        }
        
        // Initialize opponent stats if needed
        if (!opponentStats[opponentName]) {
          opponentStats[opponentName] = {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0
          };
        }
        
        opponentStats[opponentName].gamesPlayed += 1;
        
        if (game.winner === "Draw") {
          draws++;
          opponentStats[opponentName].draws += 1;
        } else if (
          (isTeam1 && game.winner === game.team1) || 
          (!isTeam1 && game.winner === game.team2)
        ) {
          wins++;
          opponentStats[opponentName].wins += 1;
        } else {
          opponentStats[opponentName].losses += 1;
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
      
      // Process opponent stats
      const opponentStatsArray = Object.entries(opponentStats).map(([name, stats]) => ({
        opponentName: name,
        gamesPlayed: stats.gamesPlayed,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        winPercentage: stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) * 100 : 0
      }));
      
      // Sort by different criteria
      const mostPlayed = [...opponentStatsArray].sort((a, b) => b.gamesPlayed - a.gamesPlayed).slice(0, 5);
      const mostWins = [...opponentStatsArray].sort((a, b) => b.wins - a.wins).slice(0, 5);
      const mostLosses = [...opponentStatsArray].sort((a, b) => b.losses - a.losses).slice(0, 5);
      
      setMostPlayedAgainst(mostPlayed);
      setMostWinsAgainst(mostWins);
      setMostLossesAgainst(mostLosses);
      
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
      
      <div className="mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Player</label>
                <Select
                  value={selectedPlayer}
                  onValueChange={setSelectedPlayer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map(player => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Game Type</label>
                <Select
                  value={gameType}
                  onValueChange={(value) => setGameType(value as "1v1" | "2v2")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select game type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1v1">1v1</SelectItem>
                    <SelectItem value="2v2">2v2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Time Period</label>
                <Select
                  value={timeFilter}
                  onValueChange={(value) => setTimeFilter(value as "month" | "allTime")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="allTime">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {timeFilter === "month" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Month</label>
                  <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
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
      
      {stats.total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Most Played Against</CardTitle>
              <CardDescription>Players/teams you've faced the most</CardDescription>
            </CardHeader>
            <CardContent>
              {mostPlayedAgainst.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mostPlayedAgainst.map(item => ({
                        name: item.opponentName,
                        value: item.gamesPlayed
                      }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" name="Games" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Most Wins Against</CardTitle>
              <CardDescription>Players/teams you defeat most often</CardDescription>
            </CardHeader>
            <CardContent>
              {mostWinsAgainst.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mostWinsAgainst.map(item => ({
                        name: item.opponentName,
                        value: item.wins
                      }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" name="Wins" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Most Losses Against</CardTitle>
              <CardDescription>Players/teams you struggle against</CardDescription>
            </CardHeader>
            <CardContent>
              {mostLossesAgainst.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={mostLossesAgainst.map(item => ({
                        name: item.opponentName,
                        value: item.losses
                      }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" name="Losses" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PlayerStats;
