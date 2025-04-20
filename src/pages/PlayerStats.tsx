import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/hooks/useGameHistory";
import { useTournamentQueries } from "@/hooks/tournament/useTournamentQueries";
import { useRoom } from "@/context/RoomContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { StatsHeader } from "@/components/stats/StatsHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterControls } from "@/components/stats/FilterControls";
import { PlayerInfo } from "@/components/stats/PlayerInfo";
import { ResultsPieChart } from "@/components/stats/charts/ResultsPieChart";
import { GoalsBarChart } from "@/components/stats/charts/GoalsBarChart";
import { PartnersChart } from "@/components/stats/charts/PartnersChart";
import { OpponentsChart } from "@/components/stats/charts/OpponentsChart";
import { calculatePlayerStats } from "@/lib/utils";

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
  const [gameType, setGameType] = useState<"1v1" | "2v2">("1v1");
  const [timeFilter, setTimeFilter] = useState<"month" | "allTime">("allTime");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [months, setMonths] = useState<Array<{ value: string; label: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const playerId = searchParams.get("playerId");
  const playerName = searchParams.get("playerName");

  const { games, loadGamesHistory } = useGameHistory();
  const { toast } = useToast();
  const tournamentQueries = useTournamentQueries();
  const { currentRoomId } = useRoom();

  // Initialize month selection
  useEffect(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonth);
    
    const monthList = [];
    
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthValue = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(d);
      const year = d.getFullYear();
      const monthLabel = `${monthName} ${year}`;
      
      monthList.push({ value: monthValue, label: monthLabel });
    }
    
    setMonths(monthList);
  }, []);

  // Fetch player data and game history
  useEffect(() => {
    const fetchPlayerData = async () => {
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
        
        let player = null;
        
        if (playerId) {
          player = await tournamentQueries.fetchPlayerById(playerId);
          console.log("Fetched by ID, result:", player);
        }
        
        if (!player && playerName && currentRoomId) {
          console.log("Searching for player by name in room:", currentRoomId);
          const players = await tournamentQueries.fetchRoomPlayers(currentRoomId);
          
          if (players && players.length > 0) {
            player = players.find(p => 
              p.name.toLowerCase() === playerName.toLowerCase()
            );
            
            if (player) {
              // Update URL with player ID for better tracking
              const newParams = new URLSearchParams(searchParams);
              newParams.set('playerId', player.id);
              navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
            }
          }
        }
        
        if (!player) {
          console.warn("Player not found");
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
          toast({
            title: "Error",
            description: "No room selected",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching player data:", error);
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

    fetchPlayerData();
  }, [playerId, playerName, currentRoomId]);

  // Process games data for player statistics
  useEffect(() => {
    if (!games || games.length === 0 || (!playerId && !playerName) || isLoading) {
      return;
    }

    try {
      // Filter games by type and time period
      const filteredGames = games.filter(game => {
        // Filter by game type
        if (game.type !== gameType) return false;
        
        // Filter by time period
        if (timeFilter === 'month') {
          const [year, month] = selectedMonth.split('-').map(Number);
          const gameDate = new Date(game.created_at);
          if (gameDate.getFullYear() !== year || gameDate.getMonth() + 1 !== month) {
            return false;
          }
        }
        
        // Filter by player
        if (playerId) {
          return [game.team1_player1, game.team1_player2, game.team2_player1, game.team2_player2].includes(playerId);
        } else if (playerName) {
          return game.team1.includes(playerName) || game.team2.includes(playerName);
        }
        
        return false;
      });

      console.log(`Filtered games for ${playerName || playerId}: ${filteredGames.length}`);
      
      if (filteredGames.length === 0) {
        // Set empty data
        setPlayerData({
          id: playerId || "unknown",
          name: playerName || "Unknown Player",
          totalGames: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winPercentage: 0,
          goalsScored: 0,
          goalsConceded: 0
        });
        setMostPlayedWith([]);
        setOpponents([]);
        return;
      }

      // Process player statistics
      let wins = 0;
      let losses = 0;
      let draws = 0;
      let goalsScored = 0;
      let goalsConceded = 0;
      
      // Track partners (for 2v2 games)
      const partnerStats: Record<string, PartnerData> = {};
      
      // Track opponents
      const opponentStats: Record<string, OpponentData> = {};
      
      filteredGames.forEach(game => {
        let isTeam1 = false;
        
        // Determine which team the player is on
        if (playerId) {
          isTeam1 = [game.team1_player1, game.team1_player2].includes(playerId);
        } else if (playerName) {
          isTeam1 = game.team1.includes(playerName);
        }
        
        // Update goals
        if (isTeam1) {
          goalsScored += game.score1;
          goalsConceded += game.score2;
        } else {
          goalsScored += game.score2;
          goalsConceded += game.score1;
        }
        
        // Update game results
        if (game.winner === 'Draw') {
          draws++;
        } else if ((isTeam1 && game.winner === game.team1) || 
                  (!isTeam1 && game.winner === game.team2)) {
          wins++;
        } else {
          losses++;
        }
        
        // Process partners for 2v2 games
        if (game.type === '2v2') {
          let partnerId = null;
          let partnerName = null;
          
          if (playerId) {
            if (isTeam1) {
              if (game.team1_player1 === playerId && game.team1_player2) {
                partnerId = game.team1_player2;
                partnerName = game.team1.split(' & ').filter(name => !name.includes(playerName))[0];
              } else if (game.team1_player2 === playerId && game.team1_player1) {
                partnerId = game.team1_player1;
                partnerName = game.team1.split(' & ').filter(name => !name.includes(playerName))[0];
              }
            } else {
              if (game.team2_player1 === playerId && game.team2_player2) {
                partnerId = game.team2_player2;
                partnerName = game.team2.split(' & ').filter(name => !name.includes(playerName))[0];
              } else if (game.team2_player2 === playerId && game.team2_player1) {
                partnerId = game.team2_player1;
                partnerName = game.team2.split(' & ').filter(name => !name.includes(playerName))[0];
              }
            }
          } else if (playerName) {
            const team1Names = game.team1.split(' & ');
            const team2Names = game.team2.split(' & ');
            
            if (isTeam1 && team1Names.length > 1) {
              partnerName = team1Names.find(name => !name.includes(playerName));
              partnerId = game.team1_player1 === playerId ? game.team1_player2 : game.team1_player1;
            } else if (!isTeam1 && team2Names.length > 1) {
              partnerName = team2Names.find(name => !name.includes(playerName));
              partnerId = game.team2_player1 === playerId ? game.team2_player2 : game.team2_player1;
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
        
        // Process opponents
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
      
      // Calculate percentages
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
      
      // Sort and limit the data
      const sortedPartners = Object.values(partnerStats)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      const sortedOpponents = Object.values(opponentStats)
        .sort((a, b) => b.totalGames - a.totalGames)
        .slice(0, 5);
      
      setMostPlayedWith(sortedPartners);
      setOpponents(sortedOpponents);
      
      // Set player data
      const totalGames = wins + losses + draws;
      const player = games.find(g => 
        g.team1_player1 === playerId || 
        g.team1_player2 === playerId || 
        g.team2_player1 === playerId || 
        g.team2_player2 === playerId
      );
      
      setPlayerData({
        id: playerId || "unknown",
        name: playerName || player?.team1.includes(playerName || '') 
          ? player?.team1 
          : player?.team2 || "Unknown Player",
        avatar_url: undefined,  // Will be set separately
        totalGames,
        wins,
        losses,
        draws,
        winPercentage: totalGames > 0 ? (wins / totalGames) * 100 : 0,
        goalsScored,
        goalsConceded
      });
      
      // Fetch player avatar if available
      if (playerId) {
        tournamentQueries.fetchPlayerById(playerId).then(playerData => {
          if (playerData) {
            setPlayerData(prev => prev ? { ...prev, avatar_url: playerData.avatar_url } : null);
          }
        });
      }
    } catch (error) {
      console.error("Error processing player stats:", error);
      toast({
        title: "Error",
        description: "Error analyzing player statistics",
        variant: "destructive"
      });
    }
  }, [playerId, playerName, games, gameType, timeFilter, selectedMonth]);

  // Render loading state
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

  // Render not found state
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

  // Prepare data for charts
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
      
      <PlayerInfo 
        name={playerData?.name || "Unknown Player"}
        avatarUrl={playerData?.avatar_url}
        stats={{
          total: playerData?.totalGames || 0,
          wins: playerData?.wins || 0,
          losses: playerData?.losses || 0,
          draws: playerData?.draws || 0,
          goalsFor: playerData?.goalsScored || 0,
          goalsAgainst: playerData?.goalsConceded || 0,
          winPercentage: playerData?.winPercentage || 0,
        }}
      />
      
      <Tabs defaultValue="overview">
        <TabsList className="mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="partners">2v2 Partners</TabsTrigger>
          <TabsTrigger value="opponents">Opponents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <ResultsPieChart data={resultData} />
            <GoalsBarChart 
              goalsScored={playerData?.goalsScored || 0}
              goalsConceded={playerData?.goalsConceded || 0}
              totalGames={playerData?.totalGames || 0}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="partners">
          <PartnersChart data={mostPlayedWith} />
        </TabsContent>
        
        <TabsContent value="opponents">
          <OpponentsChart data={opponents} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlayerStats;
