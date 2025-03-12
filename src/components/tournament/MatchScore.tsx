
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Edit } from "lucide-react";
import { TournamentMatch } from "@/types/game";

interface MatchScoreProps {
  match: TournamentMatch;
  isEditing: boolean;
  scores: { score1: string; score2: string };
  onScoreChange: (field: 'score1' | 'score2', value: string) => void;
  onStartEdit: () => void;
  onSaveScore: () => void;
}

export const MatchScore = ({
  match,
  isEditing,
  scores,
  onScoreChange,
  onStartEdit,
  onSaveScore
}: MatchScoreProps) => {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          className="w-16 text-center"
          value={scores.score1}
          onChange={(e) => onScoreChange('score1', e.target.value)}
          placeholder="0"
        />
        <span className="text-lg font-medium">-</span>
        <Input
          className="w-16 text-center"
          value={scores.score2}
          onChange={(e) => onScoreChange('score2', e.target.value)}
          placeholder="0"
        />
        <Button 
          size="sm" 
          onClick={onSaveScore}
          className="ml-2"
        >
          <Save className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {match.status === 'completed' ? (
        <div className="flex items-center gap-2">
          <div className="text-lg font-bold">
            {match.score1} - {match.score2}
          </div>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onStartEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button 
          size="sm" 
          onClick={onStartEdit}
        >
          Enter Score
        </Button>
      )}
    </div>
  );
};
