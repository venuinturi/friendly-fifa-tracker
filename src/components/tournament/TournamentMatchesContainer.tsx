
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { TournamentMatch } from "@/types/game";
import { useRoom } from "@/context/RoomContext";
import { useTournamentApi } from "@/hooks/useTournamentApi";
import { TournamentHeader } from "./TournamentHeader";
import { RoundMatches } from "./RoundMatches";
import { TournamentStandings } from "./TournamentStandings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTournamentStandings } from "@/hooks/useTournamentStandings";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { useTournamentMatchState } from "@/hooks/tournament/useTournamentMatchState";

interface TournamentMatchesContainerProps {
  tournamentId: string;
  tournamentType: "1v1" | "2v2";
  onMatchUpdated: () => void;
}

export const TournamentMatchesContainer = ({
  tournamentId,
  tournamentType,
  onMatchUpdated
}: TournamentMatchesContainerProps) => {
  const [activeTab, setActiveTab] = useState<string>("matches");
  const { toast } = useToast();
  const { userEmail, userName, isAdmin } = useAuth();
  const { currentRoomId } = useRoom();
  const tournamentApi = useTournamentApi();
  
  const { 
    matches,
    loading,
    roundsComplete,
    currentRound,
    editingMatch,
    scores,
    allMatchesComplete,
    setCurrentRound,
    setEditingMatch,
    handleStartEdit,
    handleScoreChange,
    handleSaveScore,
    loadMatches
  } = useTournamentMatchState(tournamentId, onMatchUpdated);
  
  const standings = useTournamentStandings(matches);

  useEffect(() => {
    loadMatches();
  }, [tournamentId]);

  const createFinalMatch = async () => {
    if (!allMatchesComplete || standings.length < 2) {
      toast({
        title: "Cannot create finals",
        description: "All matches must be completed and at least 2 teams are needed",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the top 2 teams from standings
      const sortedStandings = [...standings].sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return b.goalDifference - a.goalDifference;
      });

      const finalist1 = sortedStandings[0];
      const finalist2 = sortedStandings[1];

      if (!finalist1 || !finalist2) {
        toast({
          title: "Error",
          description: "Could not determine finalists",
          variant: "destructive",
        });
        return;
      }

      // Create a new final match
      const maxRound = Math.max(...matches.map(m => m.round));
      const matchNumber = matches.filter(m => m.round === maxRound + 1).length + 1;

      // Find if these teams have player info
      const team1Info = matches.find(m => m.team1 === finalist1.name || m.team2 === finalist1.name);
      const team2Info = matches.find(m => m.team1 === finalist2.name || m.team2 === finalist2.name);

      let team1Player1 = null, team1Player2 = null, team2Player1 = null, team2Player2 = null;

      if (team1Info) {
        if (team1Info.team1 === finalist1.name) {
          team1Player1 = team1Info.team1_player1;
          team1Player2 = team1Info.team1_player2;
        } else {
          team1Player1 = team1Info.team2_player1;
          team1Player2 = team1Info.team2_player2;
        }
      }

      if (team2Info) {
        if (team2Info.team1 === finalist2.name) {
          team2Player1 = team2Info.team1_player1;
          team2Player2 = team2Info.team1_player2;
        } else {
          team2Player1 = team2Info.team2_player1;
          team2Player2 = team2Info.team2_player2;
        }
      }

      const finalMatch: Omit<TournamentMatch, 'id'> = {
        tournament_id: tournamentId,
        team1: finalist1.name,
        team2: finalist2.name,
        team1_player1: team1Player1,
        team1_player2: team1Player2,
        team2_player1: team2Player1,
        team2_player2: team2Player2,
        round: maxRound + 1,
        match_number: matchNumber,
        status: 'pending',
        score1: null,
        score2: null,
      };

      // Create the match in the database
      const success = await tournamentApi.createTournamentMatches([finalMatch]);
      if (success) {
        toast({
          title: "Success",
          description: "Created the final match!",
        });
        loadMatches();
      } else {
        throw new Error("Failed to create final match");
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

  if (loading) {
    return <div className="text-center py-4">Loading matches...</div>;
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No matches found for this tournament
      </div>
    );
  }

  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, TournamentMatch[]>);

  const maxRound = Math.max(...Object.keys(matchesByRound).map(Number));

  return (
    <div className="space-y-6">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="matches" className="pt-4">
          <TournamentHeader 
            currentRound={currentRound}
            onRefresh={loadMatches}
          />
          
          {Object.keys(matchesByRound)
            .map(Number)
            .sort((a, b) => a - b)
            .map(round => (
              <RoundMatches
                key={round}
                round={round}
                matches={matchesByRound[round]}
                isRoundComplete={roundsComplete[round]}
                isLastRound={round === maxRound}
                editingMatch={editingMatch}
                scores={scores}
                onScoreChange={handleScoreChange}
                onStartEdit={handleStartEdit}
                onSaveScore={handleSaveScore}
                onNextRound={setCurrentRound}
                onAdvanceToNextRound={() => {}}
                canEdit={true} // Everyone can add scores
                canEditCompleted={isAdmin} // Only admins can edit completed matches
              />
            ))}
            
          {allMatchesComplete && standings.length >= 2 && (
            <div className="flex justify-center mt-4">
              <Button 
                onClick={createFinalMatch} 
                className="bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700"
              >
                <Trophy className="h-5 w-5 mr-2" /> Create Finals Match
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="standings" className="pt-4">
          <TournamentStandings standings={standings} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
