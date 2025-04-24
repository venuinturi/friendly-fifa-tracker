
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

const OneVOne = () => {
  const { toast } = useToast();
  const { userEmail, userName } = useAuth();
  const { currentRoomId, currentRoomName } = useRoom();

  const handleSubmit = async (formData: any) => {
    try {
      // Transform the data to match our database schema
      const gameData: GameData = {
        team1: formData.team1,
        team2: formData.team2,
        score1: Number(formData.score1),
        score2: Number(formData.score2),
        type: "1v1",
        winner: Number(formData.score1) === Number(formData.score2) 
          ? "Draw" 
          : (Number(formData.score1) > Number(formData.score2) ? formData.team1 : formData.team2),
        team1_player1: formData.team1_player1 || null,
        team2_player1: formData.team2_player1 || null,
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
        <h1 className="text-3xl font-bold text-center mb-2">Record 1v1 Match</h1>
        {currentRoomName && (
          <h2 className="text-xl font-medium text-center mb-8 text-muted-foreground">
            Room: {currentRoomName}
          </h2>
        )}
        <GameForm type="1v1" onSubmit={handleSubmit} />
      </div>
    </div>
  );
};

export default OneVOne;
