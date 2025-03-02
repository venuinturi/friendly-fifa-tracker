
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GameFormProps {
  type: "1v1" | "2v2";
  onSubmit: (gameData: any) => void;
}

interface Player {
  id: string;
  name: string;
}

const GameForm = ({ type, onSubmit }: GameFormProps) => {
  const { toast } = useToast();
  const { userEmail } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [formData, setFormData] = useState({
    team1Player1: "",
    team1Player2: "",
    team2Player1: "",
    team2Player2: "",
    score1: "",
    score2: "",
  });

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
      toast({
        title: "Error",
        description: "Failed to load players",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (type === "2v2") {
      if (!formData.team1Player1 || !formData.team1Player2 || !formData.team2Player1 || !formData.team2Player2 || !formData.score1 || !formData.score2) {
        toast({
          title: "Error",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!formData.team1Player1 || !formData.team2Player1 || !formData.score1 || !formData.score2) {
        toast({
          title: "Error",
          description: "Please fill in all fields",
          variant: "destructive",
        });
        return;
      }
    }

    const score1 = parseInt(formData.score1);
    const score2 = parseInt(formData.score2);
    
    const team1Name = type === "2v2" 
      ? `${getPlayerName(formData.team1Player1)} & ${getPlayerName(formData.team1Player2)}`
      : getPlayerName(formData.team1Player1);
    
    const team2Name = type === "2v2"
      ? `${getPlayerName(formData.team2Player1)} & ${getPlayerName(formData.team2Player2)}`
      : getPlayerName(formData.team2Player1);

    const winner = score1 === score2 ? "Draw" : (score1 > score2 ? team1Name : team2Name);
    
    const gameData = {
      team1: team1Name,
      team2: team2Name,
      team1_player1: formData.team1Player1,
      team1_player2: type === "2v2" ? formData.team1Player2 : null,
      team2_player1: formData.team2Player1,
      team2_player2: type === "2v2" ? formData.team2Player2 : null,
      score1,
      score2,
      winner,
      type,
      // Add creator information
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: userEmail,
      updated_by_email: userEmail
    };

    onSubmit(gameData);
    setFormData({
      team1Player1: "",
      team1Player2: "",
      team2Player1: "",
      team2Player2: "",
      score1: "",
      score2: "",
    });
  };

  const getPlayerName = (playerId: string): string => {
    return players.find(p => p.id === playerId)?.name || '';
  };

  return (
    <Card className="p-6 animate-fade-in">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Team 1</label>
            <div className="space-y-2">
              <Select value={formData.team1Player1} onValueChange={(value) => setFormData({ ...formData, team1Player1: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select player 1" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {type === "2v2" && (
                <Select value={formData.team1Player2} onValueChange={(value) => setFormData({ ...formData, team1Player2: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player 2" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Team 2</label>
            <div className="space-y-2">
              <Select value={formData.team2Player1} onValueChange={(value) => setFormData({ ...formData, team2Player1: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select player 1" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {type === "2v2" && (
                <Select value={formData.team2Player2} onValueChange={(value) => setFormData({ ...formData, team2Player2: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player 2" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Score 1</label>
            <Input
              type="number"
              placeholder="Score"
              value={formData.score1}
              onChange={(e) => setFormData({ ...formData, score1: e.target.value })}
              className="transition-all duration-200 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Score 2</label>
            <Input
              type="number"
              placeholder="Score"
              value={formData.score2}
              onChange={(e) => setFormData({ ...formData, score2: e.target.value })}
              className="transition-all duration-200 focus:ring-primary"
            />
          </div>
        </div>
        <Button type="submit" className="w-full bg-primary hover:bg-primary-hover transition-colors">
          <Trophy className="mr-2 h-4 w-4" /> Record Game
        </Button>
      </form>
    </Card>
  );
};

export default GameForm;
