import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TournamentPlayer } from "@/types/game";
import { supabase, logError } from "@/integrations/supabase/client";
import { Trophy, AlertCircle, Shuffle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { TournamentPlayerSelection } from "./TournamentPlayerSelection";
import { useTournamentApi } from "@/hooks/useTournamentApi";
import { useTournamentMutations } from "@/hooks/tournament/useTournamentMutations";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateTournamentFormProps {
  roomId: string;
  onTournamentCreated: () => void;
}

export function CreateTournamentForm({ roomId, onTournamentCreated }: CreateTournamentFormProps) {
  const [tournamentName, setTournamentName] = useState<string>("");
  const [tournamentType, setTournamentType] = useState<"1v1" | "2v2">("1v1");
  const [matchesPerPlayer, setMatchesPerPlayer] = useState<string>("1");
  const [isCreating, setIsCreating] = useState(false);
  const [roomPlayers, setRoomPlayers] = useState<TournamentPlayer[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<TournamentPlayer[]>([]);
  const [teams, setTeams] = useState<{ team1: TournamentPlayer, team2: TournamentPlayer }[]>([]);
  
  const { toast } = useToast();
  const { userEmail, userName } = useAuth();
  const tournamentApi = useTournamentApi();
  const { createTournament, createTournamentMatches } = useTournamentMutations();

  useEffect(() => {
    if (roomId) {
      loadPlayers();
    }
  }, [roomId]);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name')
        .eq('room_id', roomId)
        .order('name');
        
      if (error) throw logError(error, 'loadPlayers');
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

  const generateRandomTeams = () => {
    if (tournamentType === "2v2") {
      if (selectedPlayers.length < 4 || selectedPlayers.length % 2 !== 0) {
        toast({
          title: "Error",
          description: "Please select an even number of players (at least 4) for 2v2 tournament",
          variant: "destructive",
        });
        return;
      }

      // Shuffle players randomly
      const shuffled = [...selectedPlayers].sort(() => 0.5 - Math.random());
      
      // Create pairs
      const newTeams: { team1: TournamentPlayer, team2: TournamentPlayer }[] = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          newTeams.push({
            team1: shuffled[i],
            team2: shuffled[i + 1]
          });
        }
      }
      
      setTeams(newTeams);
    }
  };

  const generateRoundRobinMatches = (tournamentId: string) => {
    const numMatchesPerPlayer = parseInt(matchesPerPlayer);
    const matches = [];
    
    console.log("Generating matches for tournament:", tournamentId);
    console.log("Selected players:", selectedPlayers);
    console.log("Tournament type:", tournamentType);
    
    if (tournamentType === "1v1") {
      // For 1v1 tournaments, create matches between all players
      const players = selectedPlayers;
      
      // For each player, create matches with all other players
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          matches.push({
            tournament_id: tournamentId,
            team1: players[i].name,
            team2: players[j].name,
            team1_player1: players[i].id,
            team2_player1: players[j].id,
            team1_player2: null,
            team2_player2: null,
            round: 0, // Round robin starts with round 0
            match_number: matches.length + 1,
            status: 'pending'
          });
        }
      }
    } else if (tournamentType === "2v2" && teams.length > 0) {
      // For 2v2 tournaments, create matches between all teams
      // For each team, create matches with all other teams
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const team1 = teams[i];
          const team2 = teams[j];
          
          matches.push({
            tournament_id: tournamentId,
            team1: `${team1.team1.name} & ${team1.team2.name}`,
            team2: `${team2.team1.name} & ${team2.team2.name}`,
            team1_player1: team1.team1.id,
            team1_player2: team1.team2.id,
            team2_player1: team2.team1.id,
            team2_player2: team2.team2.id,
            round: 0, // Round robin starts with round 0
            match_number: matches.length + 1,
            status: 'pending'
          });
        }
      }
    }
    
    console.log(`Generated ${matches.length} matches for tournament ${tournamentId}`);
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

    if (!roomId) {
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

    if (tournamentType === "2v2") {
      if (selectedPlayers.length < 4 || selectedPlayers.length % 2 !== 0) {
        toast({
          title: "Error",
          description: "Please select an even number of players (at least 4) for 2v2 tournament",
          variant: "destructive",
        });
        return;
      }
      
      if (teams.length === 0) {
        toast({
          title: "Error",
          description: "Please generate teams first",
          variant: "destructive",
        });
        return;
      }
    }

    setIsCreating(true);

    try {
      // Create the tournament
      const tournament = await createTournament(
        tournamentName.trim(),
        tournamentType,
        roomId,
        userName || userEmail || '',
        true, // autoAdvance
        true, // hasRoundRobin
        parseInt(matchesPerPlayer)
      );
      
      if (!tournament) {
        throw new Error("Failed to create tournament");
      }

      console.log("Tournament created successfully:", tournament);

      // Generate matches
      const matches = generateRoundRobinMatches(tournament.id);
      
      console.log("Generated matches:", matches);

      if (matches.length > 0) {
        const success = await createTournamentMatches(matches);
        if (!success) {
          throw new Error("Failed to create tournament matches");
        }
        console.log("Tournament matches created successfully");
      } else {
        console.error("No matches generated");
        toast({
          title: "Warning",
          description: "No matches were generated. Please check player selection.",
          variant: "destructive",
        });
      }

      // Reset form
      setTournamentName("");
      setSelectedPlayers([]);
      setTeams([]);
      onTournamentCreated();
      
      toast({
        title: "Success",
        description: "Tournament created successfully",
      });
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Error",
        description: "Failed to create tournament: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
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
              onValueChange={(value) => {
                setTournamentType(value as "1v1" | "2v2");
                // Reset teams when changing tournament type
                if (value === "1v1") {
                  setTeams([]);
                }
              }}
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
          
          <TournamentPlayerSelection
            roomPlayers={roomPlayers}
            selectedPlayers={selectedPlayers}
            setSelectedPlayers={setSelectedPlayers}
            tournamentType={tournamentType}
          />
          
          {tournamentType === "2v2" && selectedPlayers.length >= 4 && selectedPlayers.length % 2 === 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Teams</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={generateRandomTeams}
                  className="text-xs"
                  size="sm"
                >
                  <Shuffle className="h-3 w-3 mr-1" /> Generate Random Teams
                </Button>
              </div>
              
              {teams.length > 0 ? (
                <div className="space-y-2 border rounded-md p-3">
                  {teams.map((team, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted/20 rounded-md">
                      <div className="text-sm">
                        Team {index + 1}: <span className="font-medium">{team.team1.name} & {team.team2.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert variant="default" className="bg-muted/30 border-primary/20">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    Please generate teams before creating the tournament
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isCreating || (tournamentType === "2v2" && teams.length === 0)}
          >
            {isCreating ? (
              "Creating..."
            ) : (
              <>
                <Trophy className="mr-2 h-4 w-4" /> Generate Tournament
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
