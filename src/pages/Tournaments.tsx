
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TournamentPlayer, Tournament } from "@/types/game";
import { TournamentList } from "@/components/TournamentList";
import RoomRequired from "@/components/RoomRequired";
import { useTournamentApi } from "@/hooks/useTournamentApi";
import { supabase, logError } from "@/integrations/supabase/client";
import { Check, Plus, X, RandomIcon, UserGroupIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreateTournamentForm } from "@/components/tournament/CreateTournamentForm";
import { TournamentPlayerSelection } from "@/components/tournament/TournamentPlayerSelection";

const Tournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();
  const { userEmail, userName } = useAuth();
  const { currentRoomId, inRoom, currentRoomName } = useRoom();
  const tournamentApi = useTournamentApi();

  useEffect(() => {
    if (inRoom && currentRoomId) {
      loadTournaments();
    }
  }, [currentRoomId, inRoom]);

  const loadTournaments = async () => {
    if (!currentRoomId) return;
    
    setIsLoading(true);
    try {
      const data = await tournamentApi.fetchTournaments(currentRoomId);
      setTournaments(data);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      toast({
        title: "Error",
        description: "Failed to load tournaments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!inRoom) {
    return <RoomRequired />;
  }

  return (
    <div className="container mx-auto pt-28 md:pt-24 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Tournaments</h1>
      
      {currentRoomName && (
        <h2 className="text-xl font-medium text-muted-foreground text-center mb-6">
          Room: {currentRoomName}
        </h2>
      )}
      
      <div className="max-w-2xl mx-auto mb-8">
        <CreateTournamentForm 
          roomId={currentRoomId || ''} 
          onTournamentCreated={loadTournaments}
        />
      </div>
      
      {isLoading ? (
        <div className="text-center py-8">Loading tournaments...</div>
      ) : (
        <TournamentList 
          tournaments={tournaments}
          onUpdate={loadTournaments}
        />
      )}
    </div>
  );
};

export default Tournaments;
