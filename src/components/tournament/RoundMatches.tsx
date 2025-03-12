
import { TournamentMatch } from "@/types/game";
import { MatchCard } from "./MatchCard";
import { RoundHeader } from "./RoundHeader";

interface RoundMatchesProps {
  round: number;
  matches: TournamentMatch[];
  isRoundComplete: boolean;
  isLastRound: boolean;
  editingMatch: string | null;
  scores: Record<string, { score1: string; score2: string }>;
  onScoreChange: (matchId: string, field: 'score1' | 'score2', value: string) => void;
  onStartEdit: (matchId: string) => void;
  onSaveScore: (match: TournamentMatch) => void;
  onNextRound: (nextRound: number) => void;
  onAdvanceToNextRound: () => void;
}

export const RoundMatches = ({
  round,
  matches,
  isRoundComplete,
  isLastRound,
  editingMatch,
  scores,
  onScoreChange,
  onStartEdit,
  onSaveScore,
  onNextRound,
  onAdvanceToNextRound
}: RoundMatchesProps) => {
  return (
    <div className="space-y-4">
      <RoundHeader
        round={round}
        isComplete={isRoundComplete}
        isLastRound={isLastRound}
        hasMultipleMatches={matches.length > 1}
        onNextRound={() => onNextRound(round + 1)}
        onAdvanceToFinal={onAdvanceToNextRound}
      />
      
      {matches.map(match => (
        <MatchCard
          key={match.id}
          match={match}
          editingMatch={editingMatch}
          scores={scores}
          onScoreChange={onScoreChange}
          onStartEdit={onStartEdit}
          onSaveScore={onSaveScore}
        />
      ))}
    </div>
  );
};
