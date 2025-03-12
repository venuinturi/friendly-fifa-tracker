import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { TournamentMatch } from "@/types/game";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RefreshCcw, Save, ChevronRight, Edit } from "lucide-react";
import { useTournamentApi } from "@/hooks/useTournamentApi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRoom } from "@/context/RoomContext";
import { DialogTitle, DialogDescription, DialogContent, Dialog, DialogHeader } from "@/components/ui/dialog";

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
  const [needsRoundRobin, setNeedsRoundRobin] = useState(false);
  const [isRoundRobinActive, setIsRoundRobinActive] = useState(false);
  const [showStandings, setShowStandings] = useState(false);
  const [roundRobinStats, setRoundRobinStats] = useState<any[]>([]);
  const { toast } = useToast();
  const { userEmail, userName } = useAuth();
  const { currentRoomId } = useRoom();
  const tournamentApi = useTournamentApi();

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
        
        rounds.forEach(round => {
          const roundMatches = data.filter(match => match.round === round);
          const allCompleted = roundMatches.every(match => match.status === 'completed');
          roundCompletionStatus[round] = allCompleted;
          
          const isRoundRobin = roundMatches.length >= 3 && 
                             roundMatches.some(m => m.team1 === roundMatches[0].team1 && m.team2 !== roundMatches[0].team2) &&
                             roundMatches.some(m => m.team1 === roundMatches[0].team2 || m.team2 === roundMatches[0].team2);
          
          if (isRoundRobin && round === Math.max(...rounds)) {
            setIsRoundRobinActive(true);
            
            if (allCompleted) {
              const stats = tournamentApi.calculateRoundRobinResults(roundMatches);
              setRoundRobinStats(stats);
            }
          }
          
          if (round === rounds[rounds.length - 1] && roundMatches.length === 1 && data.some(m => m.team2 === 'BYE')) {
            setNeedsRoundRobin(true);
          }
        });
        
        setRoundsComplete(roundCompletionStatus);
        
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
              status: 'completed'
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

  const handleAdvanceToNextRound = async () => {
    try {
      const success = await tournamentApi.advanceToNextRound(tournamentId, currentRound);
      
      if (success) {
        toast({
          title: "Success",
          description: "Advanced to next round successfully",
        });
        loadMatches();
        onMatchUpdated();
      }
    } catch (error) {
      console.error('Error advancing to next round:', error);
      toast({
        title: "Error",
        description: "Failed to advance to next round",
        variant: "destructive",
      });
    }
  };

  const handleCreateRoundRobin = async () => {
    try {
      const success = await tournamentApi.createRoundRobinMatches(tournamentId);
      
      if (success) {
        toast({
          title: "Success",
          description: "Round robin created successfully",
        });
        setNeedsRoundRobin(false);
        loadMatches();
        onMatchUpdated();
      }
    } catch (error) {
      console.error('Error creating round robin:', error);
      toast({
        title: "Error",
        description: "Failed to create round robin",
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="font-medium">Current Round: {currentRound}</h3>
        </div>
        <div className="flex space-x-2">
          {isRoundRobinActive && roundRobinStats.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowStandings(true)}
            >
              Standings
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadMatches}
            className="flex items-center"
          >
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>
      
      {needsRoundRobin && (
        <Alert className="mb-4">
          <AlertDescription>
            There are 3 teams left. A round-robin tournament is needed to determine the finalists.
            <Button 
              className="ml-2 mt-2" 
              size="sm" 
              onClick={handleCreateRoundRobin}
            >
              Create Round Robin
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {Object.keys(matchesByRound)
        .map(Number)
        .filter(round => round === currentRound)
        .map(round => (
          <div key={round} className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Round {round}</h3>
              {roundsComplete[round] && round < Math.max(...Object.keys(matchesByRound).map(Number)) && (
                <Button 
                  size="sm" 
                  onClick={() => setCurrentRound(round + 1)}
                >
                  Next Round <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
              {roundsComplete[round] && round === Math.max(...Object.keys(matchesByRound).map(Number)) && matchesByRound[round].length > 1 && (
                <Button 
                  size="sm" 
                  onClick={handleAdvanceToNextRound}
                >
                  Advance to Final <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
            
            {matchesByRound[round].map(match => (
              <Card key={match.id} className="p-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium">
                          {match.team1} vs {match.team2}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Round {match.round} • Match {match.match_number}
                        </p>
                      </div>
                      
                      {editingMatch === match.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-16 text-center"
                            value={scores[match.id]?.score1 || ''}
                            onChange={(e) => handleScoreChange(match.id, 'score1', e.target.value)}
                            placeholder="0"
                          />
                          <span className="text-lg font-medium">-</span>
                          <Input
                            className="w-16 text-center"
                            value={scores[match.id]?.score2 || ''}
                            onChange={(e) => handleScoreChange(match.id, 'score2', e.target.value)}
                            placeholder="0"
                          />
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveScore(match)}
                            className="ml-2"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          {match.status === 'completed' ? (
                            <div className="flex items-center gap-2">
                              <div className="text-lg font-bold">
                                {match.score1} - {match.score2}
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleStartEdit(match.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              onClick={() => handleStartEdit(match.id)}
                            >
                              Enter Score
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {match.status === 'completed' && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Winner: </span>
                        <span className="text-primary">{match.winner}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))}
        
      <Dialog open={showStandings} onOpenChange={setShowStandings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Round-Robin Standings</DialogTitle>
            <DialogDescription>
              Current standings based on wins and goal difference
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2">Team</th>
                  <th className="text-center pb-2">Wins</th>
                  <th className="text-center pb-2">Goal Diff</th>
                </tr>
              </thead>
              <tbody>
                {roundRobinStats.map((team, idx) => (
                  <tr key={idx} className={idx < 2 ? "bg-green-50 dark:bg-green-900/20" : ""}>
                    <td className="py-2">{team.name}</td>
                    <td className="text-center py-2">{team.wins}</td>
                    <td className="text-center py-2">{team.goalDiff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm text-muted-foreground mt-4">
              The top 2 teams will advance to the final round.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
