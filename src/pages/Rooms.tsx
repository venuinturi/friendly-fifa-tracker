
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Trash2, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useRoom } from "@/context/RoomContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Room {
  id: string;
  name: string;
  created_at: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

const Rooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomName, setRoomName] = useState("");
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const { toast } = useToast();
  const { userEmail, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { setCurrentRoom, currentRoomId } = useRoom();

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('name');

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load rooms",
        variant: "destructive",
      });
    }
  };

  const addRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('rooms')
        .insert([{ 
          name: roomName.trim(),
          created_by: userEmail,
          updated_by: userEmail
        }]);

      if (error) throw error;

      setRoomName("");
      loadRooms();
      toast({
        title: "Success",
        description: "Room added successfully",
      });
    } catch (error) {
      console.error('Error adding room:', error);
      toast({
        title: "Error",
        description: "Failed to add room",
        variant: "destructive",
      });
    }
  };

  const startEditing = (room: Room) => {
    if (!isAdmin) return;
    setEditingRoom(room);
    setRoomName(room.name);
  };

  const cancelEditing = () => {
    setEditingRoom(null);
    setRoomName("");
  };

  const updateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !roomName.trim() || !isAdmin) {
      toast({
        title: "Error",
        description: "Please enter a room name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('rooms')
        .update({ 
          name: roomName.trim(),
          updated_at: new Date().toISOString(),
          updated_by: userEmail
        })
        .eq('id', editingRoom.id);

      if (error) throw error;

      setRoomName("");
      setEditingRoom(null);
      loadRooms();
      toast({
        title: "Success",
        description: "Room updated successfully",
      });
    } catch (error) {
      console.error('Error updating room:', error);
      toast({
        title: "Error",
        description: "Failed to update room",
        variant: "destructive",
      });
    }
  };

  const deleteRoom = async (id: string) => {
    if (!isAdmin) return;
    
    try {
      // First check if this room has any tournaments
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('id')
        .eq('room_id', id);
        
      if (tournamentsError) throw tournamentsError;
      
      // If there are tournaments, delete them first
      if (tournamentsData && tournamentsData.length > 0) {
        // Delete all games related to tournaments in this room
        const tournamentIds = tournamentsData.map(t => t.id);
        
        const { error: gamesError } = await supabase
          .from('games')
          .delete()
          .in('tournament_id', tournamentIds);
          
        if (gamesError) console.error("Error deleting games:", gamesError);
        
        // Delete all tournament matches
        const { error: matchesError } = await supabase
          .from('tournament_matches')
          .delete()
          .in('tournament_id', tournamentIds);
          
        if (matchesError) console.error("Error deleting tournament matches:", matchesError);
        
        // Now delete the tournaments
        const { error: tournamentsDeleteError } = await supabase
          .from('tournaments')
          .delete()
          .eq('room_id', id);
          
        if (tournamentsDeleteError) console.error("Error deleting tournaments:", tournamentsDeleteError);
      }
      
      // Now transfer players and games to FifaShuttlers room
      const { data: fifaRoom } = await supabase
        .from('rooms')
        .select('id')
        .eq('name', 'FifaShuttlers')
        .single();

      if (!fifaRoom) {
        toast({
          title: "Error",
          description: "Cannot find default room",
          variant: "destructive",
        });
        return;
      }

      // Update players
      const { error: playerError } = await supabase
        .from('players')
        .update({ room_id: fifaRoom.id })
        .eq('room_id', id);

      if (playerError) console.error("Error updating players:", playerError);

      // Update games
      const { error: gameError } = await supabase
        .from('games')
        .update({ room_id: fifaRoom.id })
        .eq('room_id', id);

      if (gameError) console.error("Error updating games:", gameError);

      // Now delete the room
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id);

      if (error) throw error;

      loadRooms();
      toast({
        title: "Success",
        description: "Room deleted successfully. All data has been transferred to FifaShuttlers room.",
      });
    } catch (error) {
      console.error('Error deleting room:', error);
      toast({
        title: "Error",
        description: "Failed to delete room: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    }
  };

  const enterRoom = (roomId: string) => {
    setCurrentRoom(roomId);
    toast({
      title: "Success",
      description: "Entered room successfully",
    });
    navigate('/players');
  };

  return (
    <div className="container mx-auto pt-24 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Rooms</h1>
      
      <div className="max-w-2xl mx-auto">
        <form onSubmit={editingRoom ? updateRoom : addRoom} className="flex flex-col sm:flex-row gap-4 mb-8">
          <Input
            placeholder="Enter room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button type="submit" className="whitespace-nowrap flex-1 sm:flex-none">
              {editingRoom ? "Update Room" : "Add Room"}
            </Button>
            {editingRoom && (
              <Button type="button" variant="outline" onClick={cancelEditing}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="space-y-4">
          {rooms.map((room) => (
            <Card key={room.id} className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <span className="font-medium">{room.name}</span>
                  {currentRoomId === room.id && (
                    <span className="ml-2 text-sm text-primary">(Current)</span>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                  <Button
                    onClick={() => enterRoom(room.id)}
                    variant="default"
                    size="sm"
                    className="bg-primary hover:bg-primary-hover px-3"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" /> Enter
                  </Button>
                  
                  {isAdmin && (
                    <>
                      <Button
                        onClick={() => startEditing(room)}
                        variant="secondary"
                        size="sm"
                        className="px-2"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      {room.name !== "FifaShuttlers" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="px-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the room "{room.name}". All players and games associated with this room will be transferred to the FifaShuttlers room.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRoom(room.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {rooms.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No rooms added yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Rooms;
