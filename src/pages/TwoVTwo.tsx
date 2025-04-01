
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

  // Helper function to create team name from two players in alphabetical order
  const createTeamNameFromPlayers = (player1: string, player2: string) => {
    const orderedNames = [player1, player2].sort();
    return `${orderedNames[0]} and ${orderedNames[1]}`;
  };

  const handleSubmit = async (formData: any) => {
    try {
      // Create team names with alphabetically ordered players
      const team1 = createTeamNameFromPlayers(formData.team1_player1, formData.team1_player2);
      const team2 = createTeamNameFromPlayers(formData.team2_player1, formData.team2_player2);

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
        team1_player1: formData.team1_player1 || null,
        team1_player2: formData.team1_player2 || null,
        team2_player1: formData.team2_player1 || null,
        team2_player2: formData.team2_player2 || null,
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
