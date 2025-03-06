import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TournamentList } from "@/components/TournamentList";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";
import { useTournamentApi } from "@/hooks/useTournamentApi";

const Tournaments = () => {
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentType, setTournamentType] = useState("1v1");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const { toast } = useToast();
  const { userEmail } = useAuth();
  const { currentRoomId: roomId } = useRoom();
  const navigate = useNavigate();
  const tournamentApi = useTournamentApi();

  useEffect(() => {
    if (!roomId) {
      toast({
        title: "No Room",
        description: "Please select a room to view tournaments.",
      });
      navigate('/rooms');
      return;
    }
    loadTournaments();
  }, [roomId, navigate, toast]);

  const loadTournaments = async () => {
    try {
      const tournamentsData = await tournamentApi.getTournamentsByRoomId(roomId || '');
      setTournaments(tournamentsData);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      toast({
        title: "Error",
        description: "Failed to load tournaments",
        variant: "destructive",
      });
    }
  };

  const createTournament = async () => {
    if (!roomId || !tournamentName) return;
    
    setIsLoading(true);
    try {
      const success = await tournamentApi.createTournament({
        name: tournamentName,
        type: tournamentType as "1v1" | "2v2",
        room_id: roomId,
        created_by: userEmail || '',
        status: "pending",
        auto_advance: autoAdvance
      });
      
      if (success) {
        setTournamentName('');
        loadTournaments();
        toast({
          title: "Success",
          description: "Tournament created successfully",
        });
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Error",
        description: "Failed to create tournament",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 pt-28 md:pt-24">
      <h1 className="text-3xl font-bold text-center mb-8">Tournaments</h1>

      <Card className="w-full max-w-2xl mx-auto mb-8">
        <CardHeader>
          <CardTitle>Create Tournament</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tournamentName">Tournament Name</Label>
              <Input
                id="tournamentName"
                placeholder="Enter tournament name"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Game Type</Label>
              <Select value={tournamentType} onValueChange={(value) => setTournamentType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select game type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1v1">1v1</SelectItem>
                  <SelectItem value="2v2">2v2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="autoAdvance" checked={autoAdvance} onCheckedChange={setAutoAdvance} />
            <Label htmlFor="autoAdvance">Auto Advance</Label>
          </div>
          <Button
            className="w-full"
            onClick={createTournament}
            disabled={isLoading || !tournamentName}
          >
            {isLoading ? "Creating..." : "Create Tournament"}
          </Button>
        </CardContent>
      </Card>

      <TournamentList tournaments={tournaments} onUpdate={loadTournaments} />
    </div>
  );
};

export default Tournaments;
