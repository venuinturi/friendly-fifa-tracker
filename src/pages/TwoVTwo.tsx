
import GameForm from "@/components/GameForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";

interface GameData {
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  team1_player1?: string;
  team1_player2?: string;
  team2_player1?: string;
  team2_player2?: string;
  type: "1v1" | "2v2";
  winner: string;
  updated_by?: string;
  created_by?: string;
  room_id?: string;
}

const TwoVTwo = () => {
  const { toast } = useToast();
  const { userEmail, userName } = useAuth();
  const { currentRoomId, currentRoomName } = useRoom();

  const handleSubmit = async (formData: any) => {
    try {
      // Create team names based on player names (not IDs)
      // We'll get the actual player names from the form
      const player1Team1 = formData.team1_player1;
      const player2Team1 = formData.team1_player2;
      const player1Team2 = formData.team2_player1;
      const player2Team2 = formData.team2_player2;
      
      // Get player names from the players table
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, name')
        .in('id', [player1Team1, player2Team1, player1Team2, player2Team2]);
      
      if (playersError) throw playersError;
      
      // Create a mapping of player IDs to names
      const playerNames: Record<string, string> = {};
      playersData.forEach(player => {
        playerNames[player.id] = player.name.toLowerCase();
      });
      
      // Now create team names using actual player names in alphabetical order
      const team1Names = [
        playerNames[player1Team1] || player1Team1,
        playerNames[player2Team1] || player2Team1
      ].sort();
      
      const team2Names = [
        playerNames[player1Team2] || player1Team2,
        playerNames[player2Team2] || player2Team2
      ].sort();
      
      const team1 = `${team1Names[0]} & ${team1Names[1]}`;
      const team2 = `${team2Names[0]} & ${team2Names[1]}`;

      console.log("Creating 2v2 game with teams:", team1, team2);

      // Transform the data to match our database schema
      const gameData: GameData = {
        team1,
        team2,
        score1: Number(formData.score1),
        score2: Number(formData.score2),
        type: "2v2",
        winner: Number(formData.score1) === Number(formData.score2) 
          ? "Draw" 
          : (Number(formData.score1) > Number(formData.score2) ? team1 : team2),
        team1_player1: player1Team1, // Store the player IDs
        team1_player2: player2Team1,
        team2_player1: player1Team2,
        team2_player2: player2Team2,
        updated_by: userName || userEmail,
        created_by: userName || userEmail,
        room_id: currentRoomId
      };

      const { error } = await supabase
        .from('games')
        .insert([gameData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Game record added successfully!",
      });
    } catch (error) {
      console.error('Error saving game:', error);
      toast({
        title: "Error",
        description: "Failed to save game record",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto pt-24 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Record 2v2 Match</h1>
        {currentRoomName && (
          <h2 className="text-xl font-medium text-center mb-8 text-muted-foreground">
            Room: {currentRoomName}
          </h2>
        )}
        <GameForm type="2v2" onSubmit={handleSubmit} />
      </div>
    </div>
  );
};

export default TwoVTwo;
