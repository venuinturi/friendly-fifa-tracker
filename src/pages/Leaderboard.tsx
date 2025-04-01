
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useRoom } from "@/context/RoomContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns";

interface PlayerStats {
  name: string;
  wins: number;
  draws: number;
  totalGames: number;
  winPercentage: number;
  goalDifference: number;
}

interface PlayerWithTeams extends PlayerStats {
  teams: string[];
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
  room_id?: string;
}

interface Player {
  id: string;
  name: string;
}

type ViewMode = "team" | "player";
type SortOption = "name" | "wins" | "winPercentage";
type TimeFilter = "month" | "allTime";

const Leaderboard = () => {
  const [stats1v1, setStats1v1] = useState<PlayerStats[]>([]);
  const [stats2v2, setStats2v2] = useState<PlayerStats[]>([]);
  const [playerStats2v2, setPlayerStats2v2] = useState<PlayerWithTeams[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");
  const [viewMode, setViewMode] = useState<ViewMode>("team");
  const [sortOption, setSortOption] = useState<SortOption>("winPercentage");
  const [players, setPlayers] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { currentRoomId, inRoom } = useRoom();

  // Generate last 12 months for the dropdown
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy')
    };
  });

  // Fetch all players to map IDs to names
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from('players')
          .select('id, name');

        if (error) throw error;

        const playerMap: Record<string, string> = {};
        (data as Player[]).forEach(player => {
          playerMap[player.id] = player.name;
        });
        
        setPlayers(playerMap);
      } catch (error) {
        console.error('Error fetching players:', error);
        toast({
          title: "Error",
          description: "Failed to load players",
          variant: "destructive",
        });
      }
    };

    fetchPlayers();
  }, [toast]);

  useEffect(() => {
    loadStats();
  }, [selectedMonth, timeFilter, viewMode, players, currentRoomId, sortOption]);

  const loadStats = async () => {
    try {
      let query = supabase.from('games').select('*');
      
      // Apply time filter
      if (timeFilter === "month") {
        const startDate = startOfMonth(new Date(selectedMonth));
        const endDate = endOfMonth(new Date(selectedMonth));
        query = query
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
      }
      
      // Filter by room if inside a room
      if (inRoom && currentRoomId) {
        query = query.eq('room_id', currentRoomId);
      }

      const { data: gamesData, error } = await query;

      if (error) throw error;

      // Convert the data to the correct type and ensure numbers are numbers
      const games = (gamesData || []).map(game => ({
        ...game,
        score1: Number(game.score1),
        score2: Number(game.score2),
        type: game.type as "1v1" | "2v2"
      })) as GameRecord[];

      const calculateTeamStats = (type: "1v1" | "2v2") => {
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
            winPercentage: stats.totalGames > 0 ? ((stats.wins + stats.draws * 0.5) / stats.totalGames) * 100 : 0,
            goalDifference: stats.goalsFor - stats.goalsAgainst
          }))
          .sort((a, b) => {
            if (b.winPercentage !== a.winPercentage) {
              return b.winPercentage - a.winPercentage;
            }
            return b.goalDifference - a.goalDifference;
          });
      };

      const calculatePlayerStats2v2 = () => {
        const twoVTwoGames = games.filter((game) => game.type === "2v2");
        const playerStatsMap = new Map<string, { 
          wins: number; 
          draws: number; 
          totalGames: number;
          goalsFor: number;
          goalsAgainst: number;
          teams: Set<string>;
        }>();

        twoVTwoGames.forEach((game) => {
          const isDraw = game.score1 === game.score2;
          const team1Won = game.winner === game.team1;
          
          // Process players from team 1
          [game.team1_player1, game.team1_player2].filter(Boolean).forEach(player => {
            if (!player) return;
            
            const playerData = playerStatsMap.get(player) || { 
              wins: 0, 
              draws: 0, 
              totalGames: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              teams: new Set<string>()
            };
            
            playerStatsMap.set(player, {
              wins: playerData.wins + (isDraw ? 0 : (team1Won ? 1 : 0)),
              draws: playerData.draws + (isDraw ? 1 : 0),
              totalGames: playerData.totalGames + 1,
              goalsFor: playerData.goalsFor + game.score1,
              goalsAgainst: playerData.goalsAgainst + game.score2,
              teams: playerData.teams.add(game.team1)
            });
          });
          
          // Process players from team 2
          [game.team2_player1, game.team2_player2].filter(Boolean).forEach(player => {
            if (!player) return;
            
            const playerData = playerStatsMap.get(player) || { 
              wins: 0, 
              draws: 0, 
              totalGames: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              teams: new Set<string>()
            };
            
            playerStatsMap.set(player, {
              wins: playerData.wins + (isDraw ? 0 : (!team1Won ? 1 : 0)),
              draws: playerData.draws + (isDraw ? 1 : 0),
              totalGames: playerData.totalGames + 1,
              goalsFor: playerData.goalsFor + game.score2,
              goalsAgainst: playerData.goalsAgainst + game.score1,
              teams: playerData.teams.add(game.team2)
            });
          });
        });

        return Array.from(playerStatsMap.entries())
          .map(([playerId, stats]) => {
            // Get player name from the players map, fallback to ID if not found
            const playerName = players[playerId] || `Unknown (${playerId})`;
            
            return {
              id: playerId,
              name: playerName,
              wins: stats.wins,
              draws: stats.draws,
              totalGames: stats.totalGames,
              winPercentage: stats.totalGames > 0 ? ((stats.wins + stats.draws * 0.5) / stats.totalGames) * 100 : 0,
              goalDifference: stats.goalsFor - stats.goalsAgainst,
              teams: Array.from(stats.teams)
            };
          })
          .sort((a, b) => {
            // Apply appropriate sorting based on sortOption
            if (sortOption === "name") {
              return a.name.localeCompare(b.name);
            }
            if (sortOption === "wins") {
              return b.wins - a.wins;
            }
            // Default to winPercentage
            if (b.winPercentage !== a.winPercentage) {
              return b.winPercentage - a.winPercentage;
            }
            return b.goalDifference - a.goalDifference;
          });
      };

      setStats1v1(calculateTeamStats("1v1"));
      setStats2v2(calculateTeamStats("2v2"));
      setPlayerStats2v2(calculatePlayerStats2v2());
    } catch (error) {
      console.error('Error loading stats:', error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard stats",
        variant: "destructive",
      });
    }
  };

  const renderTeamStats = (stats: PlayerStats[]) => (
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
        <p className="text-center text-muted-foreground py-8">No games recorded for this period</p>
      )}
    </div>
  );

  const renderPlayerStats = (stats: PlayerWithTeams[]) => (
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
              <p className="text-sm text-muted-foreground">
                Teams: {player.teams.join(', ')}
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
        <p className="text-center text-muted-foreground py-8">No games recorded for this period</p>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 pt-28 md:pt-24">
      <div className="flex flex-col items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-center">Leaderboard</h1>
        
        <Select
          value={timeFilter}
          onValueChange={(value) => setTimeFilter(value as TimeFilter)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="allTime">All Time</SelectItem>
          </SelectContent>
        </Select>
        
        {timeFilter === "month" && (
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
          >
            <SelectTrigger className="w-[200px]">
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
        )}
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
          {renderTeamStats(stats1v1)}
        </TabsContent>
        <TabsContent value="2v2">
          <div className="mb-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Select
              value={viewMode}
              onValueChange={(value) => setViewMode(value as ViewMode)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="View by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team">Team View</SelectItem>
                <SelectItem value="player">Player View</SelectItem>
              </SelectContent>
            </Select>
            
            {viewMode === "player" && (
              <Select
                value={sortOption}
                onValueChange={(value) => setSortOption(value as SortOption)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="wins">Wins</SelectItem>
                  <SelectItem value="winPercentage">Win Percentage</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          {viewMode === "team" ? renderTeamStats(stats2v2) : renderPlayerStats(playerStats2v2)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;
