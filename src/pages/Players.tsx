
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

interface Player {
  id: string;
  name: string;
  created_at: string;
}

const Players = () => {
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const { toast } = useToast();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSignedIn) {
      navigate('/auth');
      return;
    }
    loadPlayers();
  }, [isSignedIn, navigate]);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
      toast({
        title: "Error",
        description: "Failed to load players",
        variant: "destructive",
      });
    }
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a player name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('players')
        .insert([{ name: playerName.trim() }]);

      if (error) throw error;

      setPlayerName("");
      loadPlayers();
      toast({
        title: "Success",
        description: "Player added successfully",
      });
    } catch (error) {
      console.error('Error adding player:', error);
      toast({
        title: "Error",
        description: "Failed to add player",
        variant: "destructive",
      });
    }
  };

  const deletePlayer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id);

      if (error) throw error;

      loadPlayers();
      toast({
        title: "Success",
        description: "Player deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting player:', error);
      toast({
        title: "Error",
        description: "Failed to delete player",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto pt-24 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Players</h1>
      
      <div className="max-w-2xl mx-auto">
        <form onSubmit={addPlayer} className="flex gap-4 mb-8">
          <Input
            placeholder="Enter player name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <Button type="submit">Add Player</Button>
        </form>

        <div className="space-y-4">
          {players.map((player) => (
            <Card key={player.id} className="p-4 flex justify-between items-center">
              <span className="font-medium">{player.name}</span>
              <Button
                onClick={() => deletePlayer(player.id)}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
          {players.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No players added yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Players;
