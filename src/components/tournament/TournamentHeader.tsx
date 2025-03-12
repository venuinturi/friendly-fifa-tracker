
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

interface TournamentHeaderProps {
  currentRound: number;
  onRefresh: () => void;
}

export const TournamentHeader = ({
  currentRound,
  onRefresh
}: TournamentHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-2">
      <div>
        <h3 className="font-medium">Current Round: {currentRound}</h3>
      </div>
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          className="flex items-center"
        >
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>
    </div>
  );
};
