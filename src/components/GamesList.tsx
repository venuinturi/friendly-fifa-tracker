import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GameRecord } from "@/types/game";
import { formatDate } from "@/utils/dateUtils";
import { Edit, Trash2 } from "lucide-react";

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
  canDelete = true,
}: GamesListProps) => {
  const filteredGames = games.filter((game) => game.type === gameType);

  if (filteredGames.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No {gameType} games recorded yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Team 1</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Team 2</TableHead>
            <TableHead>Winner</TableHead>
            {gameType === "2v2" && <TableHead>Players</TableHead>}
            <TableHead>Added By</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredGames.map((game, index) => {
            const isEditing = editingIndex === index;
            return (
              <TableRow key={game.id}>
                <TableCell>{formatDate(game.created_at)}</TableCell>
                <TableCell className={game.winner === game.team1 ? "text-green-600 font-medium" : (game.winner !== "Draw" ? "text-red-600" : "")}>
                  {isEditing ? (
                    <Input
                      value={editForm?.team1 || ""}
                      onChange={(e) =>
                        onEditFormChange({ team1: e.target.value })
                      }
                      className="w-full"
                    />
                  ) : (
                    game.team1
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        value={editForm?.score1 || ""}
                        onChange={(e) =>
                          onEditFormChange({ score1: Number(e.target.value) })
                        }
                        className="w-16"
                        type="number"
                      />
                      <span>-</span>
                      <Input
                        value={editForm?.score2 || ""}
                        onChange={(e) =>
                          onEditFormChange({ score2: Number(e.target.value) })
                        }
                        className="w-16"
                        type="number"
                      />
                    </div>
                  ) : (
                    <span className="font-bold">
                      {game.score1} - {game.score2}
                    </span>
                  )}
                </TableCell>
                <TableCell className={game.winner === game.team2 ? "text-green-600 font-medium" : (game.winner !== "Draw" ? "text-red-600" : "")}>
                  {isEditing ? (
                    <Input
                      value={editForm?.team2 || ""}
                      onChange={(e) =>
                        onEditFormChange({ team2: e.target.value })
                      }
                      className="w-full"
                    />
                  ) : (
                    game.team2
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Select
                      value={editForm?.winner || ""}
                      onValueChange={(value) => onEditFormChange({ winner: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select winner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={editForm?.team1 || ""}>
                          {editForm?.team1}
                        </SelectItem>
                        <SelectItem value={editForm?.team2 || ""}>
                          {editForm?.team2}
                        </SelectItem>
                        <SelectItem value="Draw">Draw</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={game.winner !== "Draw" ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                      {game.winner}
                    </span>
                  )}
                </TableCell>
                {gameType === "2v2" && (
                  <TableCell className="text-xs">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editForm?.team1_player1 || ""}
                          onChange={(e) =>
                            onEditFormChange({ team1_player1: e.target.value })
                          }
                          placeholder="Team 1 Player 1"
                          className="mb-1"
                        />
                        <Input
                          value={editForm?.team1_player2 || ""}
                          onChange={(e) =>
                            onEditFormChange({ team1_player2: e.target.value })
                          }
                          placeholder="Team 1 Player 2"
                          className="mb-1"
                        />
                        <Input
                          value={editForm?.team2_player1 || ""}
                          onChange={(e) =>
                            onEditFormChange({ team2_player1: e.target.value })
                          }
                          placeholder="Team 2 Player 1"
                          className="mb-1"
                        />
                        <Input
                          value={editForm?.team2_player2 || ""}
                          onChange={(e) =>
                            onEditFormChange({ team2_player2: e.target.value })
                          }
                          placeholder="Team 2 Player 2"
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          Team 1: {game.team1_player1} & {game.team1_player2}
                        </div>
                        <div>
                          Team 2: {game.team2_player1} & {game.team2_player2}
                        </div>
                      </>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-xs text-muted-foreground">
                  {game.created_by || "Unknown"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {game.updated_by ? `${game.updated_by} (${formatDate(game.updated_at || "")})` : "N/A"}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => onSave(index)}
                        variant="default"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        onClick={onCancel}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onStartEdit(index)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => onDelete(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
