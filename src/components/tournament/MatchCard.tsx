
import { Card } from "@/components/ui/card";
import { TournamentMatch } from "@/types/game";
import { MatchScore } from "./MatchScore";

interface MatchCardProps {
  match: TournamentMatch;
  editingMatch: string | null;
  scores: Record<string, { score1: string; score2: string }>;
  onScoreChange: (matchId: string, field: 'score1' | 'score2', value: string) => void;
  onStartEdit: (matchId: string) => void;
  onSaveScore: (match: TournamentMatch) => void;
}

export const MatchCard = ({
  match,
  editingMatch,
  scores,
  onScoreChange,
  onStartEdit,
  onSaveScore
}: MatchCardProps) => {
  return (
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
            
            <MatchScore
              match={match}
              isEditing={editingMatch === match.id}
              scores={scores[match.id] || { score1: '', score2: '' }}
              onScoreChange={(field, value) => onScoreChange(match.id, field, value)}
              onStartEdit={() => onStartEdit(match.id)}
              onSaveScore={() => onSaveScore(match)}
            />
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
  );
};
