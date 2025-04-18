
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";
import RoomRequired from "@/components/RoomRequired";
import { PlusCircle, Trash2, Edit, Search, AlertCircle, Users, Upload, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

interface Player {
  id: string;
  name: string;
  avatar_url?: string;
}

const Players = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const { toast } = useToast();
  const { isAdmin, isBasic } = useAuth();
  const { currentRoomId, inRoom } = useRoom();
  const navigate = useNavigate();

  useEffect(() => {
    if (inRoom && currentRoomId) {
      fetchPlayers();
    }
  }, [currentRoomId, inRoom]);

  useEffect(() => {
    // Filter players based on search term
    const filtered = players.filter(player =>
      player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPlayers(filtered);
  }, [searchTerm, players]);

  const fetchPlayers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", currentRoomId)
        .order("name");

      if (error) throw error;
      setPlayers(data || []);
      setFilteredPlayers(data || []);
    } catch (error) {
      console.error("Error fetching players:", error);
      toast({
        title: "Error",
        description: "Failed to load players",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      toast({
        title: "Error",
        description: "Player name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      const { data, error } = await supabase
        .from("players")
        .insert([
          {
            name: newPlayerName.trim(),
            room_id: currentRoomId,
          },
        ])
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player added successfully",
      });

      setNewPlayerName("");
      setIsAdding(false);
      
      // If we uploaded an avatar and have a new player ID, upload the avatar
      if (selectedFile && data && data[0]) {
        await uploadAvatar(data[0].id, selectedFile);
      }
      
      fetchPlayers();
    } catch (error) {
      console.error("Error adding player:", error);
      toast({
        title: "Error",
        description: "Failed to add player",
        variant: "destructive",
      });
      setIsAdding(false);
    }
  };

  const handleEditPlayer = async () => {
    if (!editPlayerName.trim() || !editPlayerId) {
      toast({
        title: "Error",
        description: "Player name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsEditing(true);
    try {
      const { error } = await supabase
        .from("players")
        .update({ name: editPlayerName.trim() })
        .eq("id", editPlayerId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player updated successfully",
      });
      
      // If we have a new avatar file, upload it
      if (selectedFile) {
        await uploadAvatar(editPlayerId, selectedFile);
      }

      setEditPlayerId(null);
      setEditPlayerName("");
      setIsEditing(false);
      fetchPlayers();
    } catch (error) {
      console.error("Error updating player:", error);
      toast({
        title: "Error",
        description: "Failed to update player",
        variant: "destructive",
      });
      setIsEditing(false);
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this player?")) {
      return;
    }

    try {
      // First, delete the player's avatar if it exists
      const player = players.find(p => p.id === id);
      if (player?.avatar_url) {
        const fileName = player.avatar_url.split('/').pop();
        if (fileName) {
          await supabase.storage.from('player-avatars').remove([fileName]);
        }
      }
      
      // Then delete the player record
      const { error } = await supabase
        .from("players")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player deleted successfully",
      });

      fetchPlayers();
    } catch (error) {
      console.error("Error deleting player:", error);
      toast({
        title: "Error",
        description: "Failed to delete player",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 2MB",
          variant: "destructive",
        });
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "File must be an image",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const uploadAvatar = async (playerId: string, file: File) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${playerId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = fileName;
      
      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('player-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('player-avatars')
        .getPublicUrl(filePath);
      
      // Update the player record with the avatar URL
      const { error: updateError } = await supabase
        .from('players')
        .update({ avatar_url: publicUrl })
        .eq('id', playerId);
        
      if (updateError) throw updateError;
      
      toast({
        title: "Success",
        description: "Avatar uploaded successfully",
      });
      
      // Clear the selected file
      setSelectedFile(null);
      
      // Refresh the players list
      fetchPlayers();
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const navigateToPlayerStats = (playerId: string, playerName: string) => {
    navigate(`/stats?playerId=${playerId}&playerName=${encodeURIComponent(playerName)}`);
  };

  if (!inRoom) {
    return <RoomRequired />;
  }

  return (
    <div className="container mx-auto pt-28 md:pt-24 px-4">
      <div className="flex items-center gap-2 mb-6">
        <Users size={24} className="text-primary" />
        <h1 className="text-3xl font-bold">Players</h1>
      </div>

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex-shrink-0">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Player
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Player</DialogTitle>
                <DialogDescription>
                  Enter the name of the player you want to add to this room.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Player Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter name"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="avatar">Player Avatar (optional)</Label>
                  <div className="flex items-center gap-4">
                    {selectedFile ? (
                      <div className="flex items-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          <img 
                            src={URL.createObjectURL(selectedFile)} 
                            alt="Avatar preview" 
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="text-sm truncate max-w-[200px]">
                          {selectedFile.name}
                        </span>
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    
                    <Label 
                      htmlFor="avatar-upload" 
                      className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded text-sm"
                    >
                      Choose File
                    </Label>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Max file size: 2MB. Supported formats: JPEG, PNG, GIF
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={handleAddPlayer} disabled={isAdding || !newPlayerName.trim()}>
                  {isAdding ? "Adding..." : "Add Player"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading players...</div>
      ) : filteredPlayers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-xl font-medium">No players found</p>
          <p className="text-muted-foreground mb-6">
            {searchTerm
              ? "No players match your search"
              : "Start by adding some players to this room"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPlayers.map((player) => (
            <div
              key={player.id}
              className="bg-card rounded-lg shadow p-4 border flex flex-col items-center hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col items-center" onClick={() => navigateToPlayerStats(player.id, player.name)}>
                <Avatar className="h-24 w-24 mb-4 cursor-pointer hover:opacity-90 transition-opacity">
                  <AvatarImage src={player.avatar_url || ''} alt={player.name} />
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                    {player.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-medium mb-2 text-center cursor-pointer hover:text-primary transition-colors">
                  {player.name}
                </h3>
              </div>
              
              {(isAdmin || isBasic) && (
                <div className="flex gap-2 mt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditPlayerId(player.id);
                          setEditPlayerName(player.name);
                          setSelectedFile(null);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Player</DialogTitle>
                        <DialogDescription>
                          Update the player name or avatar.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-name">Player Name</Label>
                          <Input
                            id="edit-name"
                            placeholder="Enter name"
                            value={editPlayerName}
                            onChange={(e) => setEditPlayerName(e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-avatar">Player Avatar</Label>
                          <div className="flex items-center gap-4">
                            {selectedFile ? (
                              <div className="flex items-center gap-2">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                  <img 
                                    src={URL.createObjectURL(selectedFile)} 
                                    alt="Avatar preview" 
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <span className="text-sm truncate max-w-[200px]">
                                  {selectedFile.name}
                                </span>
                              </div>
                            ) : (
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={player.avatar_url || ''} alt={player.name} />
                                <AvatarFallback className="text-sm bg-primary text-primary-foreground">
                                  {player.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            
                            <Label 
                              htmlFor="edit-avatar-upload" 
                              className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded text-sm"
                            >
                              Choose File
                            </Label>
                            <Input
                              id="edit-avatar-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Max file size: 2MB. Supported formats: JPEG, PNG, GIF
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={handleEditPlayer}
                          disabled={isEditing || !editPlayerName.trim()}
                        >
                          {isEditing ? "Saving..." : "Save Changes"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePlayer(player.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Players;
