
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { GameRecord } from "@/types/game";
import { Edit, Trash2, X, Save } from "lucide-react";

interface GamesListProps {
  games: GameRecord[];
  gameType: "1v1" | "2v2";
  editingIndex: number | null;
  editForm: GameRecord | null;
  onStartEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onSave: (index: number) => void;
  onCancel: () => void;
  onEditFormChange: (updates: Partial<GameRecord>) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const GamesList = ({
  games,
  gameType,
  editingIndex,
  editForm,
  onStartEdit,
  onDelete,
  onSave,
  onCancel,
  onEditFormChange,
  canEdit = true,
  canDelete = true
}: GamesListProps) => {
  const filteredGames = games.filter(game => game.type === gameType);

  if (filteredGames.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No {gameType} games recorded
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredGames.map((game, index) => (
        <Card key={game.id} className="overflow-hidden">
          <CardContent className="p-0">
            {editingIndex === index && editForm ? (
              <div className="p-4 bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Team 1</label>
                    <Input
                      value={editForm.team1}
                      onChange={(e) => onEditFormChange({ team1: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Score 1</label>
                    <Input
                      type="number"
                      value={editForm.score1}
                      onChange={(e) => onEditFormChange({ score1: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Score 2</label>
                    <Input
                      type="number"
                      value={editForm.score2}
                      onChange={(e) => onEditFormChange({ score2: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Team 2</label>
                    <Input
                      value={editForm.team2}
                      onChange={(e) => onEditFormChange({ team2: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </div>
                {gameType === "2v2" && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Team 1 Player 1</label>
                      <Input
                        value={editForm.team1_player1 || ""}
                        onChange={(e) => onEditFormChange({ team1_player1: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Team 1 Player 2</label>
                      <Input
                        value={editForm.team1_player2 || ""}
                        onChange={(e) => onEditFormChange({ team1_player2: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Team 2 Player 1</label>
                      <Input
                        value={editForm.team2_player1 || ""}
                        onChange={(e) => onEditFormChange({ team2_player1: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Team 2 Player 2</label>
                      <Input
                        value={editForm.team2_player2 || ""}
                        onChange={(e) => onEditFormChange({ team2_player2: e.target.value })}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                  >
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onSave(index)}
                  >
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 p-4">
                <div className="flex flex-col mb-2 md:mb-0">
                  <span className="font-medium text-lg">{game.team1}</span>
                  {gameType === "2v2" && (
                    <div className="text-xs text-muted-foreground">
                      {game.team1_player1} & {game.team1_player2}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center mb-2 md:mb-0">
                  <div className="flex items-center justify-center bg-muted/40 rounded-lg px-6 py-2">
                    <span className={`text-2xl font-bold ${game.score1 > game.score2 ? 'text-green-600' : ''}`}>
                      {game.score1}
                    </span>
                    <span className="text-xl mx-2">-</span>
                    <span className={`text-2xl font-bold ${game.score2 > game.score1 ? 'text-green-600' : ''}`}>
                      {game.score2}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end justify-between">
                  <div className="flex flex-col mb-2 md:mb-0 md:text-right">
                    <span className="font-medium text-lg">{game.team2}</span>
                    {gameType === "2v2" && (
                      <div className="text-xs text-muted-foreground">
                        {game.team2_player1} & {game.team2_player2}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between w-full md:w-auto md:justify-end mt-2 md:mt-0">
                    <div className="text-sm text-muted-foreground mr-2">
                      {new Date(game.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex gap-1">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onStartEdit(index)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(index)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
