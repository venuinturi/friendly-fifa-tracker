
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TournamentMatch } from "@/types/game";
import { Edit, Save, AlertCircle, Check } from "lucide-react";

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
  onNextRound: (round: number) => void;
  onAdvanceToNextRound: () => void;
  canEdit?: boolean;
  canEditCompleted?: boolean;
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
  onAdvanceToNextRound,
  canEdit = true,
  canEditCompleted = false
}: RoundMatchesProps) => {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3 flex flex-row justify-between items-center">
        <CardTitle className="text-lg">Round {round}</CardTitle>
        <div className="flex items-center gap-2">
          {isRoundComplete ? (
            <div className="flex items-center text-green-500 text-sm">
              <Check className="h-4 w-4 mr-1" />
              Completed
            </div>
          ) : (
            <div className="flex items-center text-amber-500 text-sm">
              <AlertCircle className="h-4 w-4 mr-1" />
              In Progress
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {matches.map(match => (
            <Card key={match.id} className="overflow-hidden border">
              <CardContent className="p-0">
                {editingMatch === match.id ? (
                  <div className="p-4 bg-muted/20">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                      <div className="font-medium col-span-2 text-center md:text-left">{match.team1}</div>
                      <div className="flex justify-center items-center gap-2">
                        <Input
                          className="w-16 text-center"
                          value={scores[match.id]?.score1 || ''}
                          onChange={(e) => onScoreChange(match.id, 'score1', e.target.value)}
                        />
                        <span>-</span>
                        <Input
                          className="w-16 text-center"
                          value={scores[match.id]?.score2 || ''}
                          onChange={(e) => onScoreChange(match.id, 'score2', e.target.value)}
                        />
                      </div>
                      <div className="font-medium col-span-2 text-center md:text-right">{match.team2}</div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <Button size="sm" onClick={() => onSaveScore(match)}>
                        <Save className="h-4 w-4 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
                      <div className="md:col-span-3">
                        <div className={`font-medium text-center md:text-left ${match.status === 'completed' && match.winner === match.team1 ? 'text-green-600' : (match.status === 'completed' && match.winner !== 'Draw' && match.winner !== match.team1 ? 'text-red-600' : '')}`}>
                          {match.team1}
                        </div>
                        {match.team1_player2 && (
                          <div className="text-xs text-muted-foreground text-center md:text-left">
                            {match.team1_player1} & {match.team1_player2}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-center items-center gap-2">
                        {match.status === 'completed' ? (
                          <div className="flex items-center justify-center">
                            <span className={`text-xl font-bold ${match.winner === match.team1 ? 'text-green-600' : (match.winner !== 'Draw' ? 'text-red-600' : '')}`}>
                              {match.score1}
                            </span>
                            <span className="text-base mx-1">-</span>
                            <span className={`text-xl font-bold ${match.winner === match.team2 ? 'text-green-600' : (match.winner !== 'Draw' ? 'text-red-600' : '')}`}>
                              {match.score2}
                            </span>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Pending</div>
                        )}
                      </div>
                      <div className="md:col-span-3">
                        <div className={`font-medium text-center md:text-right ${match.status === 'completed' && match.winner === match.team2 ? 'text-green-600' : (match.status === 'completed' && match.winner !== 'Draw' && match.winner !== match.team2 ? 'text-red-600' : '')}`}>
                          {match.team2}
                        </div>
                        {match.team2_player2 && (
                          <div className="text-xs text-muted-foreground text-center md:text-right">
                            {match.team2_player1} & {match.team2_player2}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {match.status === 'completed' && match.winner && (
                      <div className="mt-2 text-sm">
                        {match.winner !== 'Draw' ? (
                          <div className="font-medium text-green-600">
                            Winner: {match.winner}
                          </div>
                        ) : (
                          <div className="font-medium text-amber-600">
                            Result: Draw
                          </div>
                        )}
                      </div>
                    )}
                    
                    {(canEdit && match.status !== 'completed') || (canEditCompleted && match.status === 'completed') ? (
                      <div className="flex justify-end mt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => onStartEdit(match.id)}
                        >
                          <Edit className="h-4 w-4 mr-1" /> {match.status === 'completed' ? 'Edit Score' : 'Add Score'}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
