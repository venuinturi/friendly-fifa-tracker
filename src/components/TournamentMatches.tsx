
import { useEffect, useState } from "react";
import { TournamentMatchesContainer } from "./tournament/TournamentMatchesContainer";
import { Tournament, TournamentPlayer } from "@/types/game";
import { useTournamentApi } from "@/hooks/useTournamentApi";
import { Skeleton } from "@/components/ui/skeleton";

interface TournamentMatchesProps {
  tournamentId: string;
  tournamentType: "1v1" | "2v2";
  onMatchUpdated: () => void;
}

export const TournamentMatches = (props: TournamentMatchesProps) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const tournamentApi = useTournamentApi();

  useEffect(() => {
    const loadTournament = async () => {
      try {
        // Fetch the tournament data
        const tournaments = await tournamentApi.fetchTournaments("");
        const found = tournaments.find(t => t.id === props.tournamentId);
        
        if (found) {
          setTournament(found);
        }
        
        // For demonstration, create some placeholder players
        // In a real app, you'd fetch the actual players from a DB
        setPlayers([
          { id: "1", name: "Player 1" },
          { id: "2", name: "Player 2" },
          { id: "3", name: "Player 3" },
          { id: "4", name: "Player 4" }
        ]);
        
      } catch (error) {
        console.error("Error loading tournament data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTournament();
  }, [props.tournamentId]);

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
