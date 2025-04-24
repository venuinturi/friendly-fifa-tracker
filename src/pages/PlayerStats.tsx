
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGameHistory } from "@/hooks/useGameHistory";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { GAME_COLORS } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { StatsHeader } from "@/components/stats/StatsHeader";

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const playerId = searchParams.get("playerId");
  const playerName = searchParams.get("playerName");

  const { games, loadGamesHistory } = useGameHistory();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPlayerStats = async () => {
      if (!playerId) return;

      setIsLoading(true);
      try {
        // First, get the player details including avatar
        const { data: playerData, error: playerError } = await supabase
          .from("players")
          .select("*")
          .eq("id", playerId)
          .single();

        if (playerError) throw playerError;

        if (playerData) {
          setAvatarUrl(playerData.avatar_url || null);
        }

        // Load game history
        await loadGamesHistory();
        
        // Process the data to calculate stats
        let wins = 0;
        let losses = 0;
        let draws = 0;
        let goalsScored = 0;
        let goalsConceded = 0;
        
        const partnerStats: Record<string, PartnerData> = {};
        
        // Filter games involving this player
        const playerGames = games.filter(game => {
          const isTeam1 = game.team1_player1 === playerId || game.team1_player2 === playerId;
          const isTeam2 = game.team2_player1 === playerId || game.team2_player2 === playerId;
          return isTeam1 || isTeam2;
        });
        
        playerGames.forEach(game => {
          const isTeam1 = game.team1_player1 === playerId || game.team1_player2 === playerId;
          
          // Count goals
          if (isTeam1) {
            goalsScored += game.score1;
            goalsConceded += game.score2;
          } else {
            goalsScored += game.score2;
            goalsConceded += game.score1;
          }
          
          // Count wins, losses, draws
          if (game.winner === 'Draw') {
            draws++;
          } else if ((isTeam1 && game.winner === game.team1) || 
                     (!isTeam1 && game.winner === game.team2)) {
            wins++;
          } else {
            losses++;
          }
          
          // Calculate partner stats for 2v2 games
          if (game.type === '2v2') {
            let partnerId = null;
            let partnerName = null;
            
            if (isTeam1) {
              if (game.team1_player1 === playerId && game.team1_player2) {
                partnerId = game.team1_player2;
                // Extract partner name from team name (Team Name1 & Name2 format)
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
              
              // Count wins with this partner
              if ((isTeam1 && game.winner === game.team1) || 
                  (!isTeam1 && game.winner === game.team2)) {
                partnerStats[partnerId].wins++;
              }
            }
          }
        });
        
        // Calculate win percentages for partners
        Object.values(partnerStats).forEach(partner => {
          partner.winPercentage = partner.count > 0 
            ? (partner.wins / partner.count) * 100 
            : 0;
        });
        
        // Sort partners by number of games played together
        const sortedPartners = Object.values(partnerStats)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5); // Top 5 partners
        
        setMostPlayedWith(sortedPartners);
        
        // Set player data
        const totalGames = wins + losses + draws;
        setPlayerData({
          id: playerId,
          name: playerName || playerData.name,
          avatar_url: playerData.avatar_url,
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
        console.error("Error fetching player stats:", error);
        toast({
          title: "Error",
          description: "Failed to load player statistics",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerStats();
  }, [playerId, playerName]);

  if (isLoading) {
    return <div className="container mx-auto pt-28 md:pt-24 px-4 text-center">Loading player statistics...</div>;
  }

  if (!playerData) {
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

  const resultData = [
    { name: "Wins", value: playerData.wins },
    { name: "Losses", value: playerData.losses },
    { name: "Draws", value: playerData.draws }
  ];

  return (
    <div className="container mx-auto pt-28 md:pt-24 px-4">
      <StatsHeader 
        title={`Player Statistics: ${playerData.name}`}
        subtitle="View detailed performance metrics"
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
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Games</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{playerData.totalGames}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{playerData.winPercentage.toFixed(1)}%</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Goals Scored</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{playerData.goalsScored}</p>
                <p className="text-xs text-muted-foreground">
                  Avg: {playerData.avgGoalsScored.toFixed(1)} per game
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Goals Conceded</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{playerData.goalsConceded}</p>
                <p className="text-xs text-muted-foreground">
                  Avg: {playerData.avgGoalsConceded.toFixed(1)} per game
                </p>
              </CardContent>
            </Card>
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
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* More charts would go here */}
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
          {/* Opponents stats would go here */}
          <Card>
            <CardHeader>
              <CardTitle>Opponents Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-12">
                Opponent analysis coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlayerStats;
