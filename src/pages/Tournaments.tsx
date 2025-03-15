
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";
import { useNavigate } from "react-router-dom";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FormEvent } from "react";
import { Tournament } from "@/types/game";
import { TournamentList } from "@/components/TournamentList";
import RoomRequired from "@/components/RoomRequired";
import { useTournamentApi } from "@/hooks/useTournamentApi";
import { supabase } from "@/integrations/supabase/client";

const Tournaments = () => {
  const [tournamentName, setTournamentName] = useState<string>("");
  const [tournamentType, setTournamentType] = useState<"1v1" | "2v2">("1v1");
  const [matchesPerPlayer, setMatchesPerPlayer] = useState<string>("1");
  const [isCreating, setIsCreating] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const { toast } = useToast();
  const { userEmail, userName } = useAuth();
  const { currentRoomId, inRoom, currentRoomName } = useRoom();
  const navigate = useNavigate();
  const tournamentApi = useTournamentApi();

  useEffect(() => {
    if (inRoom && currentRoomId) {
      loadTournaments();
    }
  }, [currentRoomId, inRoom]);

  const loadTournaments = async () => {
    if (!currentRoomId) return;
    
    try {
      const data = await tournamentApi.fetchTournaments(currentRoomId);
      setTournaments(data);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    }
  };

  const generateRoundRobinMatches = (players: any[], matchesPerPlayer: number) => {
    const matches = [];
    
    // For each required iteration of the tournament
    for (let iteration = 0; iteration < matchesPerPlayer; iteration++) {
      // For each player, create matches with all other players
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          matches.push({
            team1: players[i].name,
            team2: players[j].name,
            team1_player1: players[i].id,
            team2_player1: players[j].id,
            team1_player2: null,
            team2_player2: null,
            round: iteration + 1,
            match_number: matches.length + 1,
            status: 'pending'
          });
        }
      }
    }
    
    return matches;
  };

  const generatePairedRoundRobinMatches = (players: any[], matchesPerPlayer: number) => {
    const matches = [];
    const teams = [];
    
    // Create teams (pairs of players)
    for (let i = 0; i < players.length; i += 2) {
      if (i + 1 < players.length) {
        teams.push({
          name: `${players[i].name} & ${players[i+1].name}`,
          player1: players[i],
          player2: players[i+1]
        });
      }
    }
    
    // For each required iteration of the tournament
    for (let iteration = 0; iteration < matchesPerPlayer; iteration++) {
      // For each team, create matches with all other teams
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          matches.push({
            team1: teams[i].name,
            team2: teams[j].name,
            team1_player1: teams[i].player1.id,
            team1_player2: teams[i].player2.id,
            team2_player1: teams[j].player1.id,
            team2_player2: teams[j].player2.id,
            round: iteration + 1,
            match_number: matches.length + 1,
            status: 'pending'
          });
        }
      }
    }
    
    return matches;
  };

  const handleCreateTournament = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!tournamentName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tournament name",
        variant: "destructive",
      });
      return;
    }

    if (!currentRoomId) {
      toast({
        title: "Error",
        description: "Please select a room first",
        variant: "destructive",
      });
      return;
    }

    const numMatchesPerPlayer = parseInt(matchesPerPlayer);
    if (isNaN(numMatchesPerPlayer) || numMatchesPerPlayer < 1) {
      toast({
        title: "Error",
        description: "Please enter a valid number of matches (minimum 1)",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Create the tournament first
      const tournament = await tournamentApi.createTournament({
        name: tournamentName.trim(),
        type: tournamentType,
        room_id: currentRoomId,
        created_by: userName || userEmail || '',
        status: 'active',
        auto_advance: true,
        has_round_robin: true,
        matches_per_player: numMatchesPerPlayer
      });
      
      if (!tournament) {
        throw new Error("Failed to create tournament");
      }

      // First, get players from the current room
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name')
        .eq('room_id', currentRoomId);

      if (playersError) throw playersError;

      if (!players || players.length < 2) {
        toast({
          title: "Error",
          description: "Need at least 2 players to create a tournament",
          variant: "destructive",
        });
        setIsCreating(false);
        return;
      }

      // For 2v2, we need at least 4 players
      if (tournamentType === "2v2" && players.length < 4) {
        toast({
          title: "Error",
          description: "Need at least 4 players to create a 2v2 tournament",
          variant: "destructive",
        });
        setIsCreating(false);
        return;
      }

      // Shuffle players to randomize matches
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      
      let matches = [];
      
      if (tournamentType === "1v1") {
        matches = generateRoundRobinMatches(shuffledPlayers, numMatchesPerPlayer);
      } else {
        matches = generatePairedRoundRobinMatches(shuffledPlayers, numMatchesPerPlayer);
      }
      
      // Add tournament_id to all matches
      matches = matches.map(match => ({
        ...match,
        tournament_id: tournament.id,
      }));

      if (matches.length > 0) {
        await tournamentApi.createTournamentMatches(matches);
      }

      setTournamentName("");
      loadTournaments();
      toast({
        title: "Success",
        description: "Tournament created successfully",
      });
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Error",
        description: "Failed to create tournament",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!inRoom) {
    return <RoomRequired />;
  }

  return (
    <div className="container mx-auto pt-28 md:pt-24 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Tournaments</h1>
      
      {currentRoomName && (
        <h2 className="text-xl font-medium text-muted-foreground text-center mb-6">
          Room: {currentRoomName}
        </h2>
      )}
      
      <div className="max-w-2xl mx-auto mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Tournament</CardTitle>
            <CardDescription>Generate matches between players in the current room</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTournament} className="space-y-4">
              <div>
                <label htmlFor="tournamentName" className="block text-sm font-medium mb-1">
                  Tournament Name
                </label>
                <Input
                  id="tournamentName"
                  placeholder="Enter tournament name"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="tournamentType" className="block text-sm font-medium mb-1">
                  Tournament Type
                </label>
                <Select
                  value={tournamentType}
                  onValueChange={(value) => setTournamentType(value as "1v1" | "2v2")}
                >
                  <SelectTrigger id="tournamentType">
                    <SelectValue placeholder="Select tournament type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1v1">1v1 Tournament</SelectItem>
                    <SelectItem value="2v2">2v2 Tournament</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="matchesPerPlayer" className="block text-sm font-medium mb-1">
                  Matches Per Player/Team
                </label>
                <Select
                  value={matchesPerPlayer}
                  onValueChange={(value) => setMatchesPerPlayer(value)}
                >
                  <SelectTrigger id="matchesPerPlayer">
                    <SelectValue placeholder="Select number of matches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Match</SelectItem>
                    <SelectItem value="2">2 Matches</SelectItem>
                    <SelectItem value="3">3 Matches</SelectItem>
                    <SelectItem value="4">4 Matches</SelectItem>
                    <SelectItem value="5">5 Matches</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Each player will face every other player this many times
                </p>
              </div>
              
              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? "Creating..." : "Generate Tournament"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      
      <TournamentList 
        tournaments={tournaments}
        onUpdate={loadTournaments}
      />
    </div>
  );
};

export default Tournaments;
