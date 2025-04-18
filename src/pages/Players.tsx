
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase, logError } from "@/integrations/supabase/client";
import { Trash2, Pencil, UserPlus, User, Image } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";
import RoomRequired from "@/components/RoomRequired";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Player {
  id: string;
  name: string;
  created_at: string;
  room_id: string;
  avatar_url?: string;
}

const Players = () => {
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [playerForAvatar, setPlayerForAvatar] = useState<Player | null>(null);
  const { toast } = useToast();
  const { userEmail, isAdmin, isBasic } = useAuth();
  const { currentRoomId, currentRoomName, inRoom } = useRoom();
  const navigate = useNavigate();

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

      if (error) throw logError(error, 'loadPlayers');
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

      if (error) throw logError(error, 'addPlayer');

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
    if (!isAdmin && !isBasic) return;
    setEditingPlayer(player);
    setPlayerName(player.name);
  };

  const cancelEditing = () => {
    setEditingPlayer(null);
    setPlayerName("");
  };

  const updatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !playerName.trim() || (!isAdmin && !isBasic)) {
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

      if (error) throw logError(error, 'updatePlayer');

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
    if (!isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id);

      if (error) throw logError(error, 'deletePlayer');

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

  const handleAvatarUpload = (player: Player) => {
    setPlayerForAvatar(player);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAvatarFile(file);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !playerForAvatar) return;
    
    setUploading(true);
    try {
      // Check if storage bucket exists, create if not
      const { data: bucketData, error: bucketError } = await supabase
        .storage
        .getBucket('player-avatars');
      
      if (bucketError && bucketError.message.includes('not found')) {
        // Create bucket if it doesn't exist
        await supabase.storage.createBucket('player-avatars', {
          public: true
        });
      }
      
      // Upload file
      const filePath = `${playerForAvatar.id}/${avatarFile.name}`;
      const { error: uploadError } = await supabase
        .storage
        .from('player-avatars')
        .upload(filePath, avatarFile, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('player-avatars')
        .getPublicUrl(filePath);

      // Update player record with avatar URL
      const { error: updateError } = await supabase
        .from('players')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', playerForAvatar.id);

      if (updateError) throw updateError;

      setAvatarFile(null);
      setPlayerForAvatar(null);
      loadPlayers();
      
      toast({
        title: "Success",
        description: "Avatar uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const navigateToPlayerStats = (playerId: string) => {
    navigate(`/player-stats?player=${playerId}`);
  };

  if (!inRoom) {
    return <RoomRequired />;
  }

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
              {editingPlayer ? "Update Player" : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" /> Add Player
                </>
              )}
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
            <Card key={player.id} className="p-4 flex items-center">
              <div className="mr-4">
                <Avatar className="h-12 w-12 cursor-pointer" onClick={() => navigateToPlayerStats(player.id)}>
                  {player.avatar_url ? (
                    <AvatarImage src={player.avatar_url} alt={player.name} />
                  ) : (
                    <AvatarFallback className="bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <span 
                className="font-medium flex-1 cursor-pointer hover:text-primary transition-colors" 
                onClick={() => navigateToPlayerStats(player.id)}
              >
                {player.name}
              </span>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => handleAvatarUpload(player)}
                      variant="outline"
                      size="sm"
                      className="px-2"
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Avatar for {player.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex items-center justify-center">
                        <Avatar className="h-24 w-24">
                          {player.avatar_url ? (
                            <AvatarImage src={player.avatar_url} alt={player.name} />
                          ) : (
                            <AvatarFallback className="bg-primary/10">
                              <User className="h-10 w-10 text-primary" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </div>
                      <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="picture">Picture</Label>
                        <Input id="picture" type="file" accept="image/*" onChange={handleFileChange} />
                      </div>
                      <Button 
                        onClick={uploadAvatar} 
                        disabled={!avatarFile || uploading} 
                        className="w-full"
                      >
                        {uploading ? "Uploading..." : "Upload Avatar"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                {(isAdmin || isBasic) && (
                  <Button
                    onClick={() => startEditing(player)}
                    variant="secondary"
                    size="sm"
                    className="px-2"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                
                {isAdmin && (
                  <Button
                    onClick={() => deletePlayer(player.id)}
                    variant="destructive"
                    size="sm"
                    className="px-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
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
