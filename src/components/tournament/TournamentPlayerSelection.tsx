
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TournamentPlayer } from "@/types/game";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface TournamentPlayerSelectionProps {
  roomPlayers: TournamentPlayer[];
  selectedPlayers: TournamentPlayer[];
  setSelectedPlayers: React.Dispatch<React.SetStateAction<TournamentPlayer[]>>;
  tournamentType: "1v1" | "2v2";
}

export function TournamentPlayerSelection({
  roomPlayers,
  selectedPlayers,
  setSelectedPlayers,
  tournamentType
}: TournamentPlayerSelectionProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");

  const addPlayerToSelection = () => {
    if (!selectedPlayer) return;
    
    const player = roomPlayers.find(p => p.id === selectedPlayer);
    if (!player) return;
    
    // Check if player is already added
    if (selectedPlayers.some(p => p.id === player.id)) {
      return;
    }
    
    setSelectedPlayers(prev => [...prev, player]);
    setSelectedPlayer("");
  };

  const removePlayer = (playerId: string) => {
    setSelectedPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  // Filter out already selected players
  const availablePlayers = roomPlayers.filter(
    p => !selectedPlayers.some(sp => sp.id === p.id)
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium mb-1">
        Tournament Players
      </label>
      
      {tournamentType === "2v2" && (
        <Alert variant="default" className="bg-muted/30 border-primary/20 mb-4">
          <InfoIcon className="h-4 w-4 text-primary" />
          <AlertDescription>
            For 2v2 tournaments, please select an even number of players (at least 4)
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedPlayers.map(player => (
          <Badge key={player.id} variant="secondary" className="flex items-center gap-1">
            {player.name}
            <button 
              type="button" 
              onClick={() => removePlayer(player.id)}
              className="ml-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {selectedPlayers.length === 0 && (
          <p className="text-sm text-muted-foreground">No players selected yet</p>
        )}
      </div>
      
      <div className="flex gap-2">
        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select player to add" />
          </SelectTrigger>
          <SelectContent>
            {availablePlayers.length === 0 ? (
              <SelectItem value="empty" disabled>
                No more players available
              </SelectItem>
            ) : (
              availablePlayers.map(player => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button 
          type="button" 
          onClick={addPlayerToSelection} 
          disabled={!selectedPlayer}
          size="icon"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {tournamentType === "2v2" && selectedPlayers.length > 0 && selectedPlayers.length % 2 !== 0 && (
        <p className="text-xs text-amber-500 mt-1">
          Please select an even number of players for 2v2 tournament
        </p>
      )}
      
      {tournamentType === "2v2" && selectedPlayers.length > 0 && selectedPlayers.length < 4 && (
        <p className="text-xs text-amber-500 mt-1">
          Please select at least 4 players for 2v2 tournament
        </p>
      )}
    </div>
  );
}
