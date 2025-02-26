
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import { GameRecord } from "@/types/game";

interface GameEditFormProps {
  editForm: GameRecord;
  onSave: () => void;
  onCancel: () => void;
  onChange: (updates: Partial<GameRecord>) => void;
}

export const GameEditForm = ({ editForm, onSave, onCancel, onChange }: GameEditFormProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Team 1</label>
          <Input
            value={editForm?.team1 || ""}
            onChange={(e) => onChange({ team1: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Team 2</label>
          <Input
            value={editForm?.team2 || ""}
            onChange={(e) => onChange({ team2: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Score 1</label>
          <Input
            type="number"
            value={editForm?.score1 || ""}
            onChange={(e) => onChange({ score1: Number(e.target.value) })}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Score 2</label>
          <Input
            type="number"
            value={editForm?.score2 || ""}
            onChange={(e) => onChange({ score2: Number(e.target.value) })}
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={onSave} size="sm" className="bg-primary hover:bg-primary-hover">
          <Save className="mr-2 h-4 w-4" /> Save
        </Button>
        <Button onClick={onCancel} size="sm" variant="outline">
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
      </div>
    </div>
  );
};
