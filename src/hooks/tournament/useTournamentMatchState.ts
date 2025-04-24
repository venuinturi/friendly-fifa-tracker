
import { useState } from "react";
import { TournamentMatch } from "@/types/game";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";
import { useTournamentApi } from "@/hooks/useTournamentApi";

export const useTournamentMatchState = (
  tournamentId: string,
  onMatchUpdated: () => void
) => {
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [roundsComplete, setRoundsComplete] = useState<Record<number, boolean>>({});
  const [currentRound, setCurrentRound] = useState(1);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, { score1: string; score2: string }>>({});
  const [allMatchesComplete, setAllMatchesComplete] = useState(false);
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

  return {
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
  };
};
