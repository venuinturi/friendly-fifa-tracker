
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { TournamentMatch } from "@/types/game";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RefreshCcw, Save } from "lucide-react";
import { useTournamentApi } from "@/hooks/useTournamentApi";

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
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, { score1: string; score2: string }>>({});
  const { toast } = useToast();
  const { userEmail } = useAuth();
  const tournamentApi = useTournamentApi();

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = await tournamentApi.fetchTournamentMatches(tournamentId);
      setMatches(data);
      
      // Initialize scores object
      const initialScores: Record<string, { score1: string; score2: string }> = {};
      data.forEach(match => {
        initialScores[match.id] = { 
          score1: match.score1?.toString() || '', 
          score2: match.score2?.toString() || '' 
        };
      });
      setScores(initialScores);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [tournamentId]);

  const handleStartEdit = (matchId: string) => {
    setEditingMatch(matchId);
  };

  const handleScoreChange = (matchId: string, field: 'score1' | 'score2', value: string) => {
    // Only allow numbers
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
      const success = await tournamentApi.saveMatchResult(
        match, 
        score1, 
        score2, 
        tournamentId, 
        match.tournament_id, 
        userEmail || ''
      );
      
      if (success) {
        toast({
          title: "Success",
          description: "Match result saved successfully",
        });
        
        setEditingMatch(null);
        loadMatches();
        onMatchUpdated();
      }
    } catch (error) {
      console.error('Error saving match result:', error);
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadMatches}
          className="flex items-center"
        >
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>
      
      {matches.map(match => (
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
                      <div className="text-lg font-bold">
                        {match.score1} - {match.score2}
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
  );
};
