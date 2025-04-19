
import { useEffect, useState } from "react";
import { TournamentMatchesContainer } from "./tournament/TournamentMatchesContainer";
import { Tournament, TournamentMatch, TournamentPlayer } from "@/types/game";
import { useTournamentApi } from "@/hooks/useTournamentApi";
import { useTournamentQueries } from "@/hooks/tournament/useTournamentQueries";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoom } from "@/context/RoomContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface TournamentMatchesProps {
  tournamentId: string;
  tournamentType: "1v1" | "2v2";
  onMatchUpdated: () => void;
}

export const TournamentMatches = (props: TournamentMatchesProps) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentRoomId } = useRoom();
  const tournamentApi = useTournamentApi();
  const tournamentQueries = useTournamentQueries();
  const { toast } = useToast();

  useEffect(() => {
    const loadTournament = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Validate input parameters
        if (!props.tournamentId) {
          setError("Tournament ID is missing");
          return;
        }
        
        if (!currentRoomId) {
          setError("Room ID is missing");
          return;
        }
        
        console.log("Loading tournament:", props.tournamentId, "in room:", currentRoomId);
        
        // Fetch the tournament data using the improved API
        const tournaments = await tournamentQueries.fetchTournaments(currentRoomId);
        const found = tournaments.find(t => t.id === props.tournamentId);
        
        if (found) {
          console.log("Found tournament:", found);
          setTournament(found);
        } else {
          console.error("Tournament not found:", props.tournamentId);
          setError("Tournament not found");
          return;
        }
        
        // Fetch players for this tournament
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, name')
          .eq('room_id', currentRoomId);
          
        if (playersError) {
          console.error("Error fetching players:", playersError);
          toast({
            title: "Error",
            description: "Failed to load players data",
            variant: "destructive",
          });
          return;
        }
        
        if (playersData) {
          console.log("Loaded players:", playersData.length);
          setPlayers(playersData.map(p => ({ id: p.id, name: p.name })));
        }
      } catch (error) {
        console.error("Error loading tournament data:", error);
        setError("Error loading tournament data");
        toast({
          title: "Error",
          description: "Failed to load tournament data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (props.tournamentId && currentRoomId) {
      loadTournament();
    }
  }, [props.tournamentId, currentRoomId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>Tournament not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <TournamentMatchesContainer 
      tournament={tournament}
      players={players}
      onTournamentComplete={props.onMatchUpdated}
    />
  );
};
