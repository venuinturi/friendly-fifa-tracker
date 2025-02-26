
import { GameRecord } from "@/types/game";
import { GameCard } from "./GameCard";

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
}: GamesListProps) => {
  const filteredGames = games.filter(game => game.type === gameType);

  return (
    <div className="space-y-4">
      {filteredGames.map((game, index) => {
        const originalIndex = games.findIndex(g => g.id === game.id);
        return (
          <GameCard
            key={game.id}
            game={game}
            isEditing={editingIndex === originalIndex}
            editForm={editForm}
            onStartEdit={() => onStartEdit(originalIndex)}
            onDelete={() => onDelete(originalIndex)}
            onSave={() => onSave(originalIndex)}
            onCancel={onCancel}
            onEditFormChange={onEditFormChange}
          />
        );
      })}
      {filteredGames.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No {gameType} games recorded yet</p>
      )}
    </div>
  );
};
