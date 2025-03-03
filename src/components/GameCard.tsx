
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { GameRecord } from "@/types/game";
import { GameEditForm } from "./GameEditForm";
import UpdatedBy from "./UpdatedBy";

interface GameCardProps {
  game: GameRecord;
  isEditing: boolean;
  editForm: GameRecord | null;
  onStartEdit: () => void;
  onDelete: () => void;
  onSave: () => void;
  onCancel: () => void;
  onEditFormChange: (updates: Partial<GameRecord>) => void;
}

export const GameCard = ({
  game,
  isEditing,
  editForm,
  onStartEdit,
  onDelete,
  onSave,
  onCancel,
  onEditFormChange,
}: GameCardProps) => {
  return (
    <Card className="p-4 animate-fade-in">
      {isEditing && editForm ? (
        <GameEditForm
          editForm={editForm}
          onSave={onSave}
          onCancel={onCancel}
          onChange={onEditFormChange}
        />
      ) : (
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              {new Date(game.created_at).toLocaleDateString()}
            </p>
            <p className="font-medium">
              {game.team1} vs {game.team2}
            </p>
            <p className="text-lg font-bold">
              {game.score1} - {game.score2}
            </p>
            <UpdatedBy 
              createdBy={game.updated_by || "Unknown"} 
              updatedBy={game.updated_by} 
              updatedAt={game.updated_at} 
              createdAt={game.created_at}
            />
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-sm text-muted-foreground">Winner</p>
            <p className="font-medium text-primary">{game.winner}</p>
            <div className="flex gap-2">
              <Button onClick={onStartEdit} size="sm" variant="outline">
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button onClick={onDelete} size="sm" variant="destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
