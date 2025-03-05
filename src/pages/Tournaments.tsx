
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
        created_by: userName || userEmail || '',
        status: 'active',
        auto_advance: true // Enable auto advancing to next rounds
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
      
      // Create tournament matches in a knockout format
      if (tournamentType === "1v1") {
        // Create pairings for a knockout tournament
        const matches = [];
        const powerOfTwo = getNextPowerOfTwo(shuffledPlayers.length);
        const totalPairs = powerOfTwo / 2;
        const byesNeeded = powerOfTwo - shuffledPlayers.length;
        
        let playerIndex = 0;
        
        for (let i = 0; i < totalPairs; i++) {
          let team1, team2, team1Player, team2Player;
          
          // First team
          if (playerIndex < shuffledPlayers.length) {
            team1 = shuffledPlayers[playerIndex].name;
            team1Player = shuffledPlayers[playerIndex].id;
            playerIndex++;
          } else {
            team1 = 'BYE';
            team1Player = null;
          }
          
          // Second team
          if (playerIndex < shuffledPlayers.length) {
            team2 = shuffledPlayers[playerIndex].name;
            team2Player = shuffledPlayers[playerIndex].id;
            playerIndex++;
          } else {
            team2 = 'BYE';
            team2Player = null;
          }
          
          // Add the match
          matches.push({
            tournament_id: tournament.id,
            team1,
            team2,
            team1_player1: team1Player,
            team2_player1: team2Player,
            status: 'pending',
            round: 1,
            match_number: i + 1
          });
        }

        if (matches.length > 0) {
          await tournamentApi.createTournamentMatches(matches);
        }
      } else {
        // Handle 2v2 tournament with knockout format
        // Create balanced teams
        const teams = [];
        const powerOfTwo = getNextPowerOfTwo(Math.floor(shuffledPlayers.length / 2));
        const totalPairs = powerOfTwo / 2;
        
        for (let i = 0; i < shuffledPlayers.length; i += 2) {
          if (i + 1 < shuffledPlayers.length) {
            teams.push({
              player1: shuffledPlayers[i],
              player2: shuffledPlayers[i + 1],
              name: `${shuffledPlayers[i].name} & ${shuffledPlayers[i + 1].name}`
            });
          }
        }
        
        // Shuffle teams
        teams.sort(() => Math.random() - 0.5);
        
        // Create matches with byes if needed
        const matches = [];
        let teamIndex = 0;
        
        for (let i = 0; i < totalPairs; i++) {
          let team1, team2;
          
          // First team
          if (teamIndex < teams.length) {
            team1 = teams[teamIndex];
            teamIndex++;
          } else {
            team1 = { name: 'BYE', player1: null, player2: null };
          }
          
          // Second team
          if (teamIndex < teams.length) {
            team2 = teams[teamIndex];
            teamIndex++;
          } else {
            team2 = { name: 'BYE', player1: null, player2: null };
          }
          
          // Add the match
          matches.push({
            tournament_id: tournament.id,
            team1: team1.name,
            team2: team2.name,
            team1_player1: team1.player1?.id || null,
            team1_player2: team1.player2?.id || null,
            team2_player1: team2.player1?.id || null,
            team2_player2: team2.player2?.id || null,
            status: 'pending',
            round: 1,
            match_number: i + 1
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

  const getNextPowerOfTwo = (n: number) => {
    if (n <= 1) return 2;
    let power = 2;
    while (power < n) {
      power *= 2;
    }
    return power;
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
