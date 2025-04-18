
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoundMatches } from "@/components/tournament/RoundMatches";
import { useTournamentMatchState } from "@/hooks/tournament/useTournamentMatchState";
import { useTournamentStandings } from "@/hooks/tournament/useTournamentStandings";
import { Tournament, TournamentPlayer } from "@/types/game";
import { TournamentStandings } from "@/components/tournament/TournamentStandings";
import { Loader2, Trophy, Info, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useTournamentApi } from "@/hooks/useTournamentApi";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TournamentMatchesContainerProps {
  tournament: Tournament;
  players: TournamentPlayer[];
  onTournamentComplete?: () => void;
}

export function TournamentMatchesContainer({
  tournament,
  players,
  onTournamentComplete
}: TournamentMatchesContainerProps) {
  const { toast } = useToast();
  const tournamentApi = useTournamentApi();
  const [showCelebration, setShowCelebration] = useState(false);
  const [tournamentWinner, setTournamentWinner] = useState<string | null>(null);
  const [noMatchesFound, setNoMatchesFound] = useState(false);
  
  const refreshMatches = async () => {
    try {
      console.log("Refreshing matches for tournament:", tournament.id);
      const matches = await tournamentApi.fetchTournamentMatches(tournament.id);
      return matches;
    } catch (error) {
      console.error("Error refreshing matches:", error);
      return [];
    }
  };

  const { 
    matches, 
    loading, 
    roundsComplete, 
    currentRound, 
    allMatchesComplete,
    editingMatch,
    scores,
    setCurrentRound,
    handleStartEdit,
    handleScoreChange,
    handleSaveScore,
    loadMatches
  } = useTournamentMatchState(tournament.id, refreshMatches);
  
  const standings = useTournamentStandings(matches);
  
  // Check if we have any matches
  useEffect(() => {
    if (!loading && (!matches || matches.length === 0)) {
      setNoMatchesFound(true);
    } else {
      setNoMatchesFound(false);
    }
  }, [matches, loading]);
  
  // Load matches on component mount
  useEffect(() => {
    if (tournament?.id) {
      loadMatches();
    }
  }, [tournament?.id]);
  
  // Check if tournament is now complete
  useEffect(() => {
    if (allMatchesComplete && tournament.status !== 'completed') {
      // Find the winner from standings
      let winner = null;
      
      if (standings.length > 0) {
        // Sort standings by win percentage
        const sortedStandings = [...standings].sort((a, b) => b.winPercentage - a.winPercentage);
        
        // If there's a clear leader (no tie for first)
        if (sortedStandings.length >= 1 && 
            (sortedStandings.length === 1 || sortedStandings[0].winPercentage > sortedStandings[1].winPercentage)) {
          winner = sortedStandings[0].name;
        } else {
          // If there is a final match
          const finalMatch = matches.find(m => m.round === Math.max(...matches.map(m => m.round)));
          if (finalMatch && finalMatch.winner && finalMatch.winner !== 'Draw') {
            winner = finalMatch.winner;
          }
        }
        
        if (winner) {
          setTournamentWinner(winner);
          setShowCelebration(true);
          
          // Update tournament status to completed
          updateTournamentStatus(tournament.id, 'completed', winner);
        }
      }
    } else if (tournament.status === 'completed' && tournament.winner) {
      // If tournament is already marked as completed, show the winner
      setTournamentWinner(tournament.winner);
    }
  }, [allMatchesComplete, matches, standings, tournament.status, tournament.winner]);

  const updateTournamentStatus = async (tournamentId: string, status: string, winner?: string) => {
    try {
      await tournamentApi.updateTournamentStatus(tournamentId, status, winner);
      
      if (onTournamentComplete) {
        onTournamentComplete();
      }
    } catch (error) {
      console.error('Error updating tournament status:', error);
      toast({
        title: "Error",
        description: "Failed to update tournament status",
        variant: "destructive",
      });
    }
  };

  const onAdvanceToNextRound = () => {
    // This function would be implemented to handle progression to the next round
    console.log("Advancing to next round");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading matches...</span>
      </div>
    );
  }

  if (noMatchesFound) {
    return (
      <div className="py-8">
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            No matches found for this tournament. Try refreshing the page or check if matches were generated.
          </AlertDescription>
        </Alert>
        <Button onClick={loadMatches} className="mb-4">Refresh Matches</Button>
      </div>
    );
  }

  // Get all available rounds
  const rounds = [...new Set(matches.map(match => match.round))].sort((a, b) => a - b);

  // Function to create a final match after round robin
  const generateFinal = async () => {
    if (!standings || standings.length < 2) return;
    
    try {
      // Get top 2 players
      const top2 = [...standings].sort((a, b) => b.winPercentage - a.winPercentage).slice(0, 2);
      
      if (top2.length !== 2) {
        toast({
          title: "Error",
          description: "Need at least 2 players to generate a final match",
          variant: "destructive",
        });
        return;
      }
      
      console.log("Generating final match between:", top2[0].name, "and", top2[1].name);
      
      // Call tournament API to create final match
      const success = await tournamentApi.createFinalMatch(
        tournament.id, 
        top2[0].id, 
        top2[1].id,
        Math.max(...rounds) + 1
      );
      
      if (success) {
        toast({
          title: "Success",
          description: "Final match created successfully",
        });
        await loadMatches();
      } else {
        toast({
          title: "Error",
          description: "Failed to create final match",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating final match:', error);
      toast({
        title: "Error",
        description: "Failed to create final match",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      {tournamentWinner && (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <h2 className="text-2xl font-bold">Tournament Winner</h2>
            </div>
            <p className="text-xl text-center mb-4">{tournamentWinner}</p>
            <Button onClick={() => setShowCelebration(true)} variant="outline">
              Celebrate!
            </Button>
          </CardContent>
        </Card>
      )}
      
      <div className="mb-8">
        <TournamentStandings standings={standings} />
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Tournament Matches</h3>
        <div className="flex space-x-2">
          {rounds.map(round => (
            <Badge 
              key={round} 
              variant={currentRound === round ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setCurrentRound(round)}
            >
              {round === 0 ? "Round Robin" : `Round ${round}`}
              {roundsComplete[round] && " ✓"}
            </Badge>
          ))}
        </div>
      </div>
      
      <RoundMatches 
        round={currentRound}
        matches={matches.filter(m => m.round === currentRound)}
        isRoundComplete={roundsComplete[currentRound] || false}
        isLastRound={currentRound === Math.max(...rounds)}
        editingMatch={editingMatch}
        scores={scores}
        onScoreChange={handleScoreChange}
        onStartEdit={handleStartEdit}
        onSaveScore={handleSaveScore}
        onNextRound={() => setCurrentRound(Math.min(currentRound + 1, Math.max(...rounds)))}
        onAdvanceToNextRound={onAdvanceToNextRound}
      />
      
      {/* Show "Generate Final" button only if tournament is round robin, 
          current round is completed, and no final has been generated yet */}
      {tournament.has_round_robin && 
       roundsComplete[0] && 
       !rounds.includes(1) &&
       tournament.status !== 'completed' && (
        <div className="flex justify-center mt-8">
          <Button onClick={generateFinal}>
            Generate Final Match
          </Button>
        </div>
      )}
      
      {/* Updated Celebration Dialog with proper close button */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle className="text-2xl">🎉 Congratulations! 🎉</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
            <DialogDescription className="text-center text-lg">
              {tournamentWinner} has won the tournament!
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <img 
              src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWRxd3Q2Z2pxeTF2ZTk4bDVmNG04cHgzMDRqYnAwcWh1NTFkdGg0dyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/artj92V8o75VPL7AeQ/giphy.gif" 
              alt="Victory celebration" 
              className="rounded-lg max-h-60 object-contain"
            />
          </div>
          <div className="flex justify-center mt-4">
            <Button onClick={() => setShowCelebration(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
