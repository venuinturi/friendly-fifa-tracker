
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TournamentPlayer, Tournament } from "@/types/game";
import { TournamentList } from "@/components/TournamentList";
import RoomRequired from "@/components/RoomRequired";
import { useTournamentApi } from "@/hooks/useTournamentApi";
import { supabase } from "@/integrations/supabase/client";
import { Check, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const Tournaments = () => {
  const [tournamentName, setTournamentName] = useState<string>("");
  const [tournamentType, setTournamentType] = useState<"1v1" | "2v2">("1v1");
  const [matchesPerPlayer, setMatchesPerPlayer] = useState<string>("1");
  const [isCreating, setIsCreating] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [roomPlayers, setRoomPlayers] = useState<TournamentPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [selectedPlayers, setSelectedPlayers] = useState<TournamentPlayer[]>([]);
  
  const { toast } = useToast();
  const { userEmail, userName } = useAuth();
  const { currentRoomId, inRoom, currentRoomName } = useRoom();
  const tournamentApi = useTournamentApi();

  useEffect(() => {
    if (inRoom && currentRoomId) {
      loadTournaments();
      loadPlayers();
    }
  }, [currentRoomId, inRoom]);

  const loadTournaments = async () => {
    if (!currentRoomId) return;
    
    try {
      const data = await tournamentApi.fetchTournaments(currentRoomId);
      setTournaments(data);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      toast({
        title: "Error",
        description: "Failed to load tournaments",
        variant: "destructive",
      });
    }
  };

  const loadPlayers = async () => {
    if (!currentRoomId) return;
    
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name')
        .eq('room_id', currentRoomId)
        .order('name');
        
      if (error) throw error;
      setRoomPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
      toast({
        title: "Error",
        description: "Failed to load players",
        variant: "destructive",
      });
    }
  };

  const addPlayerToSelection = () => {
    if (!selectedPlayer) return;
    
    const player = roomPlayers.find(p => p.id === selectedPlayer);
    if (!player) return;
    
    // Check if player is already added
    if (selectedPlayers.some(p => p.id === player.id)) {
      toast({
        title: "Player already added",
        description: `${player.name} is already in the tournament`,
        variant: "default",
      });
      return;
    }
    
    setSelectedPlayers(prev => [...prev, player]);
    setSelectedPlayer("");
  };

  const removePlayer = (playerId: string) => {
    setSelectedPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const generateRoundRobinMatches = () => {
    const players = selectedPlayers;
    const matches = [];
    const numMatchesPerPlayer = parseInt(matchesPerPlayer);
    
    // For each required iteration of the tournament
    for (let iteration = 0; iteration < numMatchesPerPlayer; iteration++) {
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

  const handleCreateTournament = async (e: React.FormEvent) => {
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

    if (selectedPlayers.length < 2) {
      toast({
        title: "Error",
        description: "Please select at least 2 players for the tournament",
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

      // Generate matches based on selected players
      let matches = generateRoundRobinMatches();
      
      // Add tournament_id to all matches
      matches = matches.map(match => ({
        ...match,
        tournament_id: tournament.id,
      }));

      if (matches.length > 0) {
        await tournamentApi.createTournamentMatches(matches);
      }

      // Reset form
      setTournamentName("");
      setSelectedPlayers([]);
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

  const availablePlayers = roomPlayers.filter(
    p => !selectedPlayers.some(sp => sp.id === p.id)
  );

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
            <form onSubmit={handleCreateTournament} className="space-y-6">
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
                  Matches Per Player
                </label>
                <Select
                  value={matchesPerPlayer}
                  onValueChange={(value) => setMatchesPerPlayer(value)}
                >
                  <SelectTrigger id="matchesPerPlayer">
                    <SelectValue placeholder="Select number of matches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Match (each player faces others once)</SelectItem>
                    <SelectItem value="2">2 Matches (each player faces others twice)</SelectItem>
                    <SelectItem value="3">3 Matches (each player faces others three times)</SelectItem>
                    <SelectItem value="4">4 Matches (each player faces others four times)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Each player will face every other player this many times
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">
                  Tournament Players
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedPlayers.map(player => (
                    <Badge key={player.id} variant="secondary" className="flex items-center gap-1">
                      {player.name}
                      <button 
                        type="button" 
                        onClick={() => removePlayer(player.id)}
                        className="ml-1 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {selectedPlayers.length === 0 && (
                    <p className="text-sm text-muted-foreground">No players selected yet</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select player to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlayers.length === 0 ? (
                        <SelectItem value="empty" disabled>
                          No more players available
                        </SelectItem>
                      ) : (
                        availablePlayers.map(player => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    onClick={addPlayerToSelection} 
                    disabled={!selectedPlayer}
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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
