import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGameHistory } from "@/hooks/useGameHistory";
import { useTournamentQueries } from "@/hooks/tournament/useTournamentQueries";
import { useRoom } from "@/context/RoomContext";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { GAME_COLORS } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { StatsHeader } from "@/components/stats/StatsHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsOverview } from "@/components/stats/StatsOverview";
import { FilterControls } from "@/components/stats/FilterControls";

interface PlayerData {
  id: string;
  name: string;
  avatar_url?: string;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winPercentage: number;
  goalsScored: number;
  goalsConceded: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
}

interface PartnerData {
  id: string;
  name: string;
  count: number;
  wins: number;
  winPercentage: number;
}

interface OpponentData {
  id: string;
  name: string;
  totalGames: number;
  wins: number;
  losses: number;
  winPercentage: number;
}

const PlayerStats = () => {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null);
  const [mostPlayedWith, setMostPlayedWith] = useState<PartnerData[]>([]);
  const [opponents, setOpponents] = useState<OpponentData[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [gameType, setGameType] = useState<"1v1" | "2v2">("1v1");
  const [timeFilter, setTimeFilter] = useState<"month" | "allTime">("allTime");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [months, setMonths] = useState<Array<{ value: string; label: string }>>([]);

  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const playerId = searchParams.get("playerId");
  const playerName = searchParams.get("playerName");

  const { games, loadGamesHistory } = useGameHistory();
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();
  const tournamentQueries = useTournamentQueries();
  const { currentRoomId } = useRoom();

  useEffect(() => {
    const generateMonthsList = () => {
      const monthList = [];
      const now = new Date();
      
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        monthList.push({
          value: monthValue,
          label: monthLabel
        });
      }
      
      setMonths(monthList);
      
      if (monthList.length > 0) {
        setSelectedMonth(String(monthList[0].value));
      }
    };
    
    generateMonthsList();
  }, []);

  const filterGamesByMonth = (games: any[]) => {
    if (timeFilter === 'allTime') return games;
    
    const [year, month] = selectedMonth.split('-').map(Number);
    
    return games.filter(game => {
      const gameDate = new Date(game.created_at);
      return gameDate.getFullYear() === year && gameDate.getMonth() + 1 === month;
    });
  };

  const filterGamesByType = (games: any[]) => {
    return games.filter(game => game.type === gameType);
  };

  useEffect(() => {
    const fetchPlayerStats = async () => {
      if (!playerId && !playerName) {
        console.warn("No player ID or name provided");
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setNotFound(false);
      
      try {
        console.log("Fetching player data for ID:", playerId, "Name:", playerName);
        
        let playerData = null;
        
        if (playerId) {
          playerData = await tournamentQueries.fetchPlayerById(playerId);
          console.log("Fetched by ID, result:", playerData);
        }
        
        if (!playerData && playerName && currentRoomId) {
          console.log("Fetching players in room:", currentRoomId);
          const players = await tournamentQueries.fetchRoomPlayers(currentRoomId);
          
          if (players && players.length > 0) {
            console.log("Found players in room:", players.length);
            playerData = players.find(p => 
              p.name.toLowerCase() === playerName.toLowerCase()
            );
            
            console.log("Player by name match:", playerData);
            
            if (playerData) {
              const newParams = new URLSearchParams(searchParams);
              newParams.set('playerId', playerData.id);
              navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
            }
          } else {
            console.log("No players found in room");
          }
        }
        
        if (playerData) {
          console.log("Found player data:", playerData);
          setAvatarUrl(playerData.avatar_url || null);
        } else {
          console.warn("Player not found in database");
          toast({
            title: "Warning",
            description: "Player data not found",
            variant: "destructive",
          });
          setNotFound(true);
          setIsLoading(false);
          return;
        }

        if (currentRoomId) {
          await loadGamesHistory(currentRoomId);
        } else {
          console.error("No current room ID available");
        }
      } catch (error) {
        console.error("Error fetching player stats:", error);
        toast({
          title: "Error",
          description: "Failed to load player statistics",
          variant: "destructive",
        });
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerStats();
  }, [playerId, playerName, currentRoomId]);

  useEffect(() => {
    if (!games || games.length === 0 || (!playerId && !playerName)) {
      setPlayerData(null);
      setMostPlayedWith([]);
      setOpponents([]);
      return;
    }

    try {
      const filteredGames = filterGamesByType(filterGamesByMonth(games));
      console.log("Filtered games count:", filteredGames.length);

      const playerGames = filteredGames.filter(game => {
        if (!playerId && !playerName) return false;
        
        if (playerId) {
          const isTeam1 = game.team1_player1 === playerId || game.team1_player2 === playerId;
          const isTeam2 = game.team2_player1 === playerId || game.team2_player2 === playerId;
          return isTeam1 || isTeam2;
        } else if (playerName) {
          const namePattern = new RegExp(`\\b${playerName}\\b`, 'i');
          return namePattern.test(game.team1) || namePattern.test(game.team2);
        }
        
        return false;
      });

      console.log("Player games count:", playerGames.length);

      if (playerGames.length === 0) {
        setPlayerData({
          id: playerId || "unknown",
          name: playerName || "Unknown Player",
          avatar_url: avatarUrl || undefined,
          totalGames: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winPercentage: 0,
          goalsScored: 0,
          goalsConceded: 0,
          avgGoalsScored: 0,
          avgGoalsConceded: 0
        });
        setMostPlayedWith([]);
        setOpponents([]);
        return;
      }

      let wins = 0;
      let losses = 0;
      let draws = 0;
      let goalsScored = 0;
      let goalsConceded = 0;
      
      const partnerStats: Record<string, PartnerData> = {};
      const opponentStats: Record<string, OpponentData> = {};
      
      playerGames.forEach(game => {
        let isTeam1 = false;
        
        if (playerId) {
          isTeam1 = game.team1_player1 === playerId || game.team1_player2 === playerId;
        } else if (playerName) {
          isTeam1 = game.team1.includes(playerName);
        }
        
        if (isTeam1) {
          goalsScored += game.score1;
          goalsConceded += game.score2;
        } else {
          goalsScored += game.score2;
          goalsConceded += game.score1;
        }
        
        if (game.winner === 'Draw') {
          draws++;
        } else if ((isTeam1 && game.winner === game.team1) || 
                  (!isTeam1 && game.winner === game.team2)) {
          wins++;
        } else {
          losses++;
        }
        
        if (game.type === '2v2') {
          let partnerId = null;
          let partnerName = null;
          
          if (playerId) {
            if (isTeam1) {
              if (game.team1_player1 === playerId && game.team1_player2) {
                partnerId = game.team1_player2;
                const names = game.team1.split(' & ');
                if (names.length > 1) {
                  partnerName = names[1];
                }
              } else if (game.team1_player2 === playerId && game.team1_player1) {
                partnerId = game.team1_player1;
                const names = game.team1.split(' & ');
                if (names.length > 1) {
                  partnerName = names[0];
                }
              }
            } else {
              if (game.team2_player1 === playerId && game.team2_player2) {
                partnerId = game.team2_player2;
                const names = game.team2.split(' & ');
                if (names.length > 1) {
                  partnerName = names[1];
                }
              } else if (game.team2_player2 === playerId && game.team2_player1) {
                partnerId = game.team2_player1;
                const names = game.team2.split(' & ');
                if (names.length > 1) {
                  partnerName = names[0];
                }
              }
            }
          } else if (playerName) {
            if (isTeam1 && game.team1.includes(' & ')) {
              const names = game.team1.split(' & ');
              if (names[0].includes(playerName)) {
                partnerName = names[1];
                partnerId = game.team1_player2;
              } else if (names[1].includes(playerName)) {
                partnerName = names[0];
                partnerId = game.team1_player1;
              }
            } else if (!isTeam1 && game.team2.includes(' & ')) {
              const names = game.team2.split(' & ');
              if (names[0].includes(playerName)) {
                partnerName = names[1];
                partnerId = game.team2_player2;
              } else if (names[1].includes(playerName)) {
                partnerName = names[0];
                partnerId = game.team2_player1;
              }
            }
          }
          
          if (partnerId && partnerName) {
            if (!partnerStats[partnerId]) {
              partnerStats[partnerId] = {
                id: partnerId,
                name: partnerName,
                count: 0,
                wins: 0,
                winPercentage: 0
              };
            }
            
            partnerStats[partnerId].count++;
            
            if ((isTeam1 && game.winner === game.team1) || 
                (!isTeam1 && game.winner === game.team2)) {
              partnerStats[partnerId].wins++;
            }
          }
        }
        
        const opponentTeam = isTeam1 ? game.team2 : game.team1;
        const opponentId = isTeam1 
          ? (game.type === '2v2' ? `${game.team2_player1}_${game.team2_player2}` : game.team2_player1) 
          : (game.type === '2v2' ? `${game.team1_player1}_${game.team1_player2}` : game.team1_player1);
          
        if (!opponentStats[opponentId]) {
          opponentStats[opponentId] = {
            id: opponentId,
            name: opponentTeam,
            totalGames: 0,
            wins: 0,
            losses: 0,
            winPercentage: 0
          };
        }
        
        opponentStats[opponentId].totalGames++;
        
        if (game.winner !== 'Draw') {
          if ((isTeam1 && game.winner === game.team1) || 
              (!isTeam1 && game.winner === game.team2)) {
            opponentStats[opponentId].wins++;
          } else {
            opponentStats[opponentId].losses++;
          }
        }
      });
      
      Object.values(partnerStats).forEach(partner => {
        partner.winPercentage = partner.count > 0 
          ? (partner.wins / partner.count) * 100 
          : 0;
      });
      
      Object.values(opponentStats).forEach(opponent => {
        opponent.winPercentage = opponent.totalGames > 0 
          ? (opponent.wins / opponent.totalGames) * 100 
          : 0;
      });
      
      const sortedPartners = Object.values(partnerStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      const sortedOpponents = Object.values(opponentStats)
        .sort((a, b) => b.totalGames - a.totalGames)
        .slice(0, 5);
      
      setMostPlayedWith(sortedPartners);
      setOpponents(sortedOpponents);
      
      const totalGames = wins + losses + draws;
      setPlayerData({
        id: playerId || "unknown",
        name: playerName || "Unknown Player",
        avatar_url: avatarUrl || undefined,
        totalGames,
        wins,
        losses,
        draws,
        winPercentage: totalGames > 0 ? (wins / totalGames) * 100 : 0,
        goalsScored,
        goalsConceded,
        avgGoalsScored: totalGames > 0 ? goalsScored / totalGames : 0,
        avgGoalsConceded: totalGames > 0 ? goalsConceded / totalGames : 0
      });
    } catch (error) {
      console.error("Error processing player stats:", error);
      toast({
        title: "Error",
        description: "Error analyzing player statistics",
        variant: "destructive"
      });
    }
  }, [playerId, playerName, games, gameType, timeFilter, selectedMonth, avatarUrl]);

  if (isLoading) {
    return (
      <div className="container mx-auto pt-28 md:pt-24 px-4">
        <StatsHeader 
          title="Player Statistics"
          subtitle="Loading player data..."
        />
        <div className="grid gap-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Skeleton className="h-36 w-36 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-10 w-40" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (notFound || !playerData) {
    return (
      <div className="container mx-auto pt-28 md:pt-24 px-4 text-center">
        <h1 className="text-3xl font-bold mb-6">Player Not Found</h1>
        <p>The player you're looking for doesn't exist or has no game history.</p>
        <Button className="mt-4" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const playerStats = {
    total: playerData.totalGames,
    wins: playerData.wins,
    losses: playerData.losses,
    draws: playerData.draws,
    goalsFor: playerData.goalsScored,
    goalsAgainst: playerData.goalsConceded,
    winPercentage: playerData.winPercentage,
  };

  const resultData = [
    { name: "Wins", value: playerData.wins },
    { name: "Losses", value: playerData.losses },
    { name: "Draws", value: playerData.draws }
  ];

  return (
    <div className="container mx-auto pt-28 md:pt-24 px-4">
      <StatsHeader 
        title={`Player Statistics: ${playerData?.name || 'Loading...'}`}
        subtitle="View detailed performance metrics"
      />

      <FilterControls 
        gameType={gameType}
        onGameTypeChange={setGameType}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        months={months}
        isMonthVisible={timeFilter === 'month'}
      />
      
      <div className="mb-8 flex flex-col md:flex-row items-center md:items-start gap-6">
        <Avatar className="h-36 w-36 border-4 border-primary">
          <AvatarImage src={playerData.avatar_url || ''} alt={playerData.name} />
          <AvatarFallback className="text-4xl font-bold bg-primary text-primary-foreground">
            {playerData.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-center md:text-left mb-4">{playerData.name}</h1>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <StatsOverview stats={playerStats} isLoading={false} />
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="overview">
        <TabsList className="mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="partners">2v2 Partners</TabsTrigger>
          <TabsTrigger value="opponents">Opponents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Match Results</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {resultData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={resultData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => 
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {resultData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === 0 ? GAME_COLORS[0] : 
                                  index === 1 ? GAME_COLORS[1] : 
                                  GAME_COLORS[2]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [value, 'Games']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground">No games played yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Goals Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                {playerData.totalGames > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Goals Scored', value: playerData.goalsScored },
                        { name: 'Goals Conceded', value: playerData.goalsConceded }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip formatter={(value: any) => [value, 'Goals']} />
                      <Bar 
                        dataKey="value" 
                        fill={GAME_COLORS[3]}
                        name="Goals"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground">No games played yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="partners">
          <Card>
            <CardHeader>
              <CardTitle>Most Played With</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              {mostPlayedWith.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mostPlayedWith}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end"
                      height={50}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'winPercentage') return [`${Number(value).toFixed(1)}%`, 'Win Rate'];
                        return [value, name === 'count' ? 'Games' : name];
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="count" 
                      name="Games Played" 
                      fill={GAME_COLORS[0]}
                    />
                    <Bar 
                      dataKey="wins" 
                      name="Wins" 
                      fill={GAME_COLORS[1]}
                    />
                    <Bar 
                      dataKey="winPercentage" 
                      name="Win Rate" 
                      fill={GAME_COLORS[3]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-center">
                  <p className="text-muted-foreground">No 2v2 games played yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="opponents">
          <Card>
            <CardHeader>
              <CardTitle>Opponents Analysis</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
              {opponents.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={opponents}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end"
                      height={50}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'winPercentage') return [`${Number(value).toFixed(1)}%`, 'Win Rate'];
                        return [value, name === 'totalGames' ? 'Games' : name];
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="totalGames" 
                      name="Games Played" 
                      fill={GAME_COLORS[0]}
                    />
                    <Bar 
                      dataKey="wins" 
                      name="Wins" 
                      fill={GAME_COLORS[3]}
                    />
                    <Bar 
                      dataKey="losses" 
                      name="Losses" 
                      fill={GAME_COLORS[1]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-center">
                  <p className="text-muted-foreground">No opponent data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlayerStats;
