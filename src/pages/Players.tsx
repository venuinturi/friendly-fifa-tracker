
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";

interface Player {
  id: string;
  name: string;
  created_at: string;
  room_id: string;
}

const Players = () => {
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const { toast } = useToast();
  const { userEmail } = useAuth();
  const { currentRoomId, currentRoomName } = useRoom();

  useEffect(() => {
    if (currentRoomId) {
      loadPlayers();
    }
  }, [currentRoomId]);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', currentRoomId)
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
        .insert([{ 
          name: playerName.trim(),
          room_id: currentRoomId
        }]);

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

  const startEditing = (player: Player) => {
    setEditingPlayer(player);
    setPlayerName(player.name);
  };

  const cancelEditing = () => {
    setEditingPlayer(null);
    setPlayerName("");
  };

  const updatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !playerName.trim()) {
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
        .update({ name: playerName.trim() })
        .eq('id', editingPlayer.id);

      if (error) throw error;

      setPlayerName("");
      setEditingPlayer(null);
      loadPlayers();
      toast({
        title: "Success",
        description: "Player updated successfully",
      });
    } catch (error) {
      console.error('Error updating player:', error);
      toast({
        title: "Error",
        description: "Failed to update player",
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
      <h1 className="text-3xl font-bold text-center mb-2">Players</h1>
      {currentRoomName && (
        <h2 className="text-xl font-medium text-center mb-8 text-muted-foreground">
          Room: {currentRoomName}
        </h2>
      )}
      
      <div className="max-w-2xl mx-auto">
        <form onSubmit={editingPlayer ? updatePlayer : addPlayer} className="flex flex-col sm:flex-row gap-4 mb-8">
          <Input
            placeholder="Enter player name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 sm:flex-none">
              {editingPlayer ? "Update Player" : "Add Player"}
            </Button>
            {editingPlayer && (
              <Button type="button" variant="outline" onClick={cancelEditing}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="space-y-4">
          {players.map((player) => (
            <Card key={player.id} className="p-4 flex justify-between items-center">
              <span className="font-medium">{player.name}</span>
              <div className="flex gap-2">
                <Button
                  onClick={() => startEditing(player)}
                  variant="secondary"
                  size="sm"
                  className="px-2"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => deletePlayer(player.id)}
                  variant="destructive"
                  size="sm"
                  className="px-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
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
