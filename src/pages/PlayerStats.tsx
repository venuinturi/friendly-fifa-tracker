
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
import RoomRequired from "@/components/RoomRequired";
import { useGameHistory } from "@/hooks/useGameHistory";

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

interface PlayWithStats {
  playerName: string;
  gamesPlayed: number;
  wins: number;
  winPercentage: number;
}

const PlayerStats = () => {
  const [timeFilter, setTimeFilter] = useState<"month" | "allTime">("allTime");
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
  const [mostPlayedWith, setMostPlayedWith] = useState<PlayWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentRoomId, inRoom } = useRoom();
  const { userEmail } = useAuth();
  const { games, loadGamesHistory } = useGameHistory(currentRoomId);

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
        console.log("Loading players for room:", currentRoomId);
        const { data, error } = await supabase
          .from('players')
          .select('id, name')
          .eq('room_id', currentRoomId);
          
        if (error) throw error;
        
        console.log("Players loaded:", data?.length || 0);
        setPlayers(data || []);
        
        // Auto-select the first player if none selected
        if (data && data.length > 0 && !selectedPlayer) {
          const currentUser = data.find(p => 
            p.name.toLowerCase() === (userEmail ? userEmail.toLowerCase() : '')
          );
          
          if (currentUser) {
            console.log("Auto-selecting current user:", currentUser.name);
            setSelectedPlayer(currentUser.id);
          } else {
            console.log("Auto-selecting first player:", data[0].name);
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
  }, [currentRoomId, userEmail, toast]);

  // Load game history when room changes
  useEffect(() => {
    if (currentRoomId) {
      console.log("Loading game history for room:", currentRoomId);
      loadGamesHistory();
    }
  }, [currentRoomId, loadGamesHistory]);

  // Calculate stats when selectedPlayer, gameType, or timeFilter changes
  useEffect(() => {
    if (selectedPlayer && games.length > 0) {
      console.log("Calculating stats for player:", selectedPlayer);
      console.log("Game history loaded:", games.length);
      calculatePlayerStats();
    }
  }, [selectedPlayer, games, gameType, timeFilter, selectedMonth]);

  const calculatePlayerStats = () => {
    if (!selectedPlayer || games.length === 0) {
      console.log("Not calculating stats - missing data");
      return;
    }
    
    setIsLoading(true);
    try {
      // Find player name
      const player = players.find(p => p.id === selectedPlayer);
      if (!player) {
        console.log("Player not found:", selectedPlayer);
        setIsLoading(false);
        return;
      }
      
      const playerName = player.name.toLowerCase();
      console.log("Calculating stats for:", playerName);
      
      // Filter games based on game type and time filter
      let filteredGames = games.filter(game => game.type === gameType);
      
      if (timeFilter === "month") {
        const startDate = startOfMonth(new Date(selectedMonth));
        const endDate = endOfMonth(new Date(selectedMonth));
        filteredGames = filteredGames.filter(game => {
          const gameDate = new Date(game.created_at);
          return gameDate >= startDate && gameDate <= endDate;
        });
      }
      
      console.log("Filtered games:", filteredGames.length);
      
      // Filter and calculate stats
      let userGames = [];
      
      if (gameType === "1v1") {
        userGames = filteredGames.filter(game => 
          game.team1.toLowerCase() === playerName || 
          game.team2.toLowerCase() === playerName
        );
      } else {
        userGames = filteredGames.filter(game => {
          const team1Players = [
            game.team1_player1?.toLowerCase(),
            game.team1_player2?.toLowerCase()
          ];
          const team2Players = [
            game.team2_player1?.toLowerCase(),
            game.team2_player2?.toLowerCase()
          ];
          
          return team1Players.includes(playerName) || 
                 team2Players.includes(playerName) ||
                 team1Players.includes(player.id) || 
                 team2Players.includes(player.id);
        });
      }
      
      console.log("User games:", userGames.length);
      
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
      
      // For 2v2, track teammates stats as well
      const teammateStats: Record<string, {
        gamesPlayed: number;
        wins: number;
      }> = {};
      
      userGames.forEach(game => {
        let isTeam1 = false;
        let opponentName = "";
        let teammateName = "";
        
        if (gameType === "1v1") {
          isTeam1 = game.team1.toLowerCase() === playerName;
          opponentName = isTeam1 ? game.team2 : game.team1;
        } else {
          const team1Players = [
            game.team1_player1?.toLowerCase(),
            game.team1_player2?.toLowerCase()
          ];
          
          isTeam1 = team1Players.includes(playerName) || 
                    team1Players.includes(player.id);
          
          if (isTeam1) {
            // Find teammate
            let teammateId = game.team1_player1 !== playerName && 
                           game.team1_player1 !== player.id ? 
                           game.team1_player1 : game.team1_player2;
            
            // Find the teammate's name from players
            const teammate = players.find(p => p.id === teammateId || p.name.toLowerCase() === teammateId?.toLowerCase());
            teammateName = teammate?.name || teammateId || "";
            
            // Opponent is team2
            opponentName = game.team2;
          } else {
            // Find teammate
            let teammateId = game.team2_player1 !== playerName && 
                           game.team2_player1 !== player.id ? 
                           game.team2_player1 : game.team2_player2;
            
            // Find the teammate's name from players
            const teammate = players.find(p => p.id === teammateId || p.name.toLowerCase() === teammateId?.toLowerCase());
            teammateName = teammate?.name || teammateId || "";
            
            // Opponent is team1
            opponentName = game.team1;
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
        
        // For 2v2, track teammate stats
        if (gameType === "2v2" && teammateName) {
          if (!teammateStats[teammateName]) {
            teammateStats[teammateName] = {
              gamesPlayed: 0,
              wins: 0
            };
          }
          
          teammateStats[teammateName].gamesPlayed += 1;
        }
        
        if (game.winner === "Draw" || game.winner.toLowerCase() === "draw") {
          draws++;
          opponentStats[opponentName].draws += 1;
        } else if (
          (isTeam1 && game.winner.toLowerCase() === game.team1.toLowerCase()) || 
          (!isTeam1 && game.winner.toLowerCase() === game.team2.toLowerCase())
        ) {
          wins++;
          opponentStats[opponentName].wins += 1;
          
          // Track teammate win
          if (gameType === "2v2" && teammateName) {
            teammateStats[teammateName].wins += 1;
          }
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
      
      // Process teammate stats for 2v2
      const teammateStatsArray = Object.entries(teammateStats).map(([name, stats]) => ({
        playerName: name,
        gamesPlayed: stats.gamesPlayed,
        wins: stats.wins,
        winPercentage: stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed) * 100 : 0
      }));
      
      // Sort by different criteria
      const mostPlayed = [...opponentStatsArray].sort((a, b) => b.gamesPlayed - a.gamesPlayed).slice(0, 5);
      const mostWins = [...opponentStatsArray].sort((a, b) => b.wins - a.wins).slice(0, 5);
      const mostLosses = [...opponentStatsArray].sort((a, b) => b.losses - a.losses).slice(0, 5);
      const mostPlayedWithSorted = [...teammateStatsArray].sort((a, b) => b.gamesPlayed - a.gamesPlayed).slice(0, 5);
      
      setMostPlayedAgainst(mostPlayed);
      setMostWinsAgainst(mostWins);
      setMostLossesAgainst(mostLosses);
      setMostPlayedWith(mostPlayedWithSorted);
      
      console.log("Stats calculated:", { total, wins, losses, draws });
      
    } catch (error) {
      console.error('Error calculating player stats:', error);
      toast({
        title: "Error",
        description: "Failed to calculate player statistics",
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
          
          {gameType === "1v1" ? (
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
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Most Played With</CardTitle>
                <CardDescription>Your most common teammates</CardDescription>
              </CardHeader>
              <CardContent>
                {mostPlayedWith.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={mostPlayedWith.map(item => ({
                          name: item.playerName,
                          value: item.gamesPlayed,
                          wins: item.wins
                        }))}
                        margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" name="Games" fill="#8884d8" />
                        <Bar dataKey="wins" name="Wins" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerStats;
