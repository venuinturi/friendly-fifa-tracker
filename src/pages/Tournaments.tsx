
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
  const [isCreating, setIsCreating] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const { toast } = useToast();
  const { userEmail } = useAuth();
  const { currentRoomId, inRoom } = useRoom();
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

    setIsCreating(true);

    try {
      // Create the tournament first
      const tournament = await tournamentApi.createTournament({
        name: tournamentName.trim(),
        type: tournamentType,
        room_id: currentRoomId,
        created_by: userEmail || '',
        status: 'active'
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
      
      // Create tournament matches
      if (tournamentType === "1v1") {
        // Handle odd number of players by adding a "bye" if needed
        const matchPlayers = [...shuffledPlayers];
        if (matchPlayers.length % 2 !== 0) {
          matchPlayers.push({ id: 'bye', name: 'BYE' });
        }

        const matches = [];
        for (let i = 0; i < matchPlayers.length; i += 2) {
          const team1 = matchPlayers[i];
          const team2 = matchPlayers[i + 1];
          
          // Skip matches against "bye"
          if (team1.id === 'bye' || team2.id === 'bye') continue;
          
          matches.push({
            tournament_id: tournament.id,
            team1: team1.name,
            team2: team2.name,
            team1_player1: team1.id,
            team2_player1: team2.id,
            status: 'pending',
            round: 1,
            match_number: Math.floor(i / 2) + 1
          });
        }

        if (matches.length > 0) {
          await tournamentApi.createTournamentMatches(matches);
        }
      } else {
        // Handle 2v2 tournament
        // Make sure we have an even number of players
        const matchPlayers = [...shuffledPlayers];
        while (matchPlayers.length % 4 !== 0 && matchPlayers.length > 0) {
          matchPlayers.pop();
        }

        const matches = [];
        for (let i = 0; i < matchPlayers.length; i += 4) {
          if (i + 3 >= matchPlayers.length) break; // Not enough players for a complete match
          
          const team1Player1 = matchPlayers[i];
          const team1Player2 = matchPlayers[i + 1];
          const team2Player1 = matchPlayers[i + 2];
          const team2Player2 = matchPlayers[i + 3];
          
          const team1Name = `${team1Player1.name} & ${team1Player2.name}`;
          const team2Name = `${team2Player1.name} & ${team2Player2.name}`;
          
          matches.push({
            tournament_id: tournament.id,
            team1: team1Name,
            team2: team2Name,
            team1_player1: team1Player1.id,
            team1_player2: team1Player2.id,
            team2_player1: team2Player1.id,
            team2_player2: team2Player2.id,
            status: 'pending',
            round: 1,
            match_number: Math.floor(i / 4) + 1
          });
        }

        if (matches.length > 0) {
          await tournamentApi.createTournamentMatches(matches);
        }
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
    <div className="container mx-auto pt-24 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Tournaments</h1>
      
      <div className="max-w-2xl mx-auto mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Tournament</CardTitle>
            <CardDescription>Generate random matches between players in the current room</CardDescription>
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
