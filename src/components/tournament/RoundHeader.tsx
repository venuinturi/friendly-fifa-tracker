
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface RoundHeaderProps {
  round: number;
  isComplete: boolean;
  isLastRound: boolean;
  hasMultipleMatches: boolean;
  onNextRound: () => void;
  onAdvanceToFinal: () => void;
}

export const RoundHeader = ({
  round,
  isComplete,
  isLastRound,
  hasMultipleMatches,
  onNextRound,
  onAdvanceToFinal
}: RoundHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold">Round {round}</h3>
      {isComplete && !isLastRound && (
        <Button 
          size="sm" 
          onClick={onNextRound}
        >
          Next Round <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      )}
      {isComplete && isLastRound && hasMultipleMatches && (
        <Button 
          size="sm" 
          onClick={onAdvanceToFinal}
        >
          Advance to Final <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
