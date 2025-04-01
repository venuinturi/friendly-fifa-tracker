
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { TournamentMatch, TournamentStanding } from "@/types/game";
import { useRoom } from "@/context/RoomContext";
import { useTournamentApi } from "@/hooks/useTournamentApi";
import { TournamentHeader } from "./tournament/TournamentHeader";
import { RoundMatches } from "./tournament/RoundMatches";
import { TournamentStandings } from "./tournament/TournamentStandings";
import { useTournamentStandings } from "@/hooks/useTournamentStandings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

interface TournamentMatchesProps {
  tournamentId: string;
  tournamentType: "1v1" | "2v2";
  onMatchUpdated: () => void;
}

export const TournamentMatches = ({ 
  tournamentId, 
  tournamentType,
  onMatchUpdated 
}: TournamentMatchesProps) => {
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [roundsComplete, setRoundsComplete] = useState<Record<number, boolean>>({});
  const [currentRound, setCurrentRound] = useState(1);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, { score1: string; score2: string }>>({});
  const [activeTab, setActiveTab] = useState<string>("matches");
  const [allMatchesComplete, setAllMatchesComplete] = useState(false);
  const { toast } = useToast();
  const { userEmail, userName, isAdmin } = useAuth();
  const { currentRoomId } = useRoom();
  const tournamentApi = useTournamentApi();
  const standings = useTournamentStandings(matches);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = await tournamentApi.fetchTournamentMatches(tournamentId);
      setMatches(data);
      
      const initialScores: Record<string, { score1: string; score2: string }> = {};
      data.forEach(match => {
        initialScores[match.id] = { 
          score1: match.score1?.toString() || '', 
          score2: match.score2?.toString() || '' 
        };
      });
      setScores(initialScores);
      
      const rounds = [...new Set(data.map(match => match.round))].sort((a, b) => a - b);
      if (rounds.length > 0) {
        const roundCompletionStatus: Record<number, boolean> = {};
        let allComplete = true;
        
        rounds.forEach(round => {
          const roundMatches = data.filter(match => match.round === round);
          const allCompleted = roundMatches.every(match => match.status === 'completed');
          roundCompletionStatus[round] = allCompleted;
          if (!allCompleted) allComplete = false;
        });
        
        setRoundsComplete(roundCompletionStatus);
        setAllMatchesComplete(allComplete);
        
        const incompleteRound = rounds.find(round => !roundCompletionStatus[round]) || rounds[rounds.length - 1];
        setCurrentRound(incompleteRound);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      toast({
        title: "Error",
        description: "Failed to load tournament matches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [tournamentId]);

  const handleStartEdit = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    
    if (match) {
      setScores(prev => ({
        ...prev,
        [matchId]: {
          score1: match.score1?.toString() || '',
          score2: match.score2?.toString() || ''
        }
      }));
    }
    
    setEditingMatch(matchId);
  };

  const handleScoreChange = (matchId: string, field: 'score1' | 'score2', value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    setScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
    }));
  };

  const handleSaveScore = async (match: TournamentMatch) => {
    const matchScores = scores[match.id];
    if (!matchScores) return;
    
    const score1 = parseInt(matchScores.score1 || '0', 10);
    const score2 = parseInt(matchScores.score2 || '0', 10);
    
    if (isNaN(score1) || isNaN(score2)) {
      toast({
        title: "Error",
        description: "Please enter valid scores",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log('Saving match result with:', {
        match,
        score1,
        score2,
        tournamentId,
        roomId: currentRoomId,
        userEmail,
        userName: userName || userEmail
      });
      
      const success = await tournamentApi.saveMatchResult(
        match, 
        score1, 
        score2, 
        tournamentId, 
        currentRoomId || '', 
        userEmail || '',
        userName || userEmail || ''
      );
      
      if (success) {
        toast({
          title: "Success",
          description: "Match result saved successfully",
        });
        
        const updatedMatches = matches.map(m => {
          if (m.id === match.id) {
            const winner = score1 > score2 ? match.team1 : (score2 > score1 ? match.team2 : 'Draw');
            return {
              ...m,
              score1,
              score2,
              winner,
              status: 'completed' as const
            };
          }
          return m;
        });
        
        setMatches(updatedMatches);
        setEditingMatch(null);
        
        onMatchUpdated();
        
        await loadMatches();
      } else {
        toast({
          title: "Error",
          description: "Failed to save match result",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving match result:', error);
      toast({
        title: "Error",
        description: `Failed to save match result: ${error}`,
        variant: "destructive",
      });
    }
  };

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
        team1_player1,
        team1_player2,
        team2_player1,
        team2_player2,
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
