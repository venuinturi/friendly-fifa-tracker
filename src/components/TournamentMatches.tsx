
import { useEffect, useState } from "react";
import { TournamentMatchesContainer } from "./tournament/TournamentMatchesContainer";
import { Tournament, TournamentMatch, TournamentPlayer } from "@/types/game";
import { useTournamentApi } from "@/hooks/useTournamentApi";
import { useTournamentQueries } from "@/hooks/tournament/useTournamentQueries";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoom } from "@/context/RoomContext";
import { supabase } from "@/integrations/supabase/client";

interface TournamentMatchesProps {
  tournamentId: string;
  tournamentType: "1v1" | "2v2";
  onMatchUpdated: () => void;
}

export const TournamentMatches = (props: TournamentMatchesProps) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentRoomId } = useRoom();
  const tournamentApi = useTournamentApi();
  const tournamentQueries = useTournamentQueries();

  useEffect(() => {
    const loadTournament = async () => {
      try {
        setLoading(true);
        
        // Fetch the tournament data
        if (!props.tournamentId) {
          console.error("Tournament ID is missing");
          setLoading(false);
          return;
        }
        
        // Use the room ID from context
        const tournaments = await tournamentQueries.fetchTournaments(currentRoomId || "");
        const found = tournaments.find(t => t.id === props.tournamentId);
        
        if (found) {
          setTournament(found);
        } else {
          console.error("Tournament not found:", props.tournamentId);
        }
        
        // Fetch players for this tournament
        const { data: playersData, error } = await supabase
          .from('players')
          .select('id, name')
          .eq('room_id', currentRoomId);
          
        if (!error && playersData) {
          setPlayers(playersData.map(p => ({ id: p.id, name: p.name })));
        }
      } catch (error) {
        console.error("Error loading tournament data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (props.tournamentId) {
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

  if (!tournament) {
    return <div className="text-center py-4">Tournament not found</div>;
  }

  return (
    <TournamentMatchesContainer 
      tournament={tournament}
      players={players}
      onTournamentComplete={props.onMatchUpdated}
    />
  );
};
