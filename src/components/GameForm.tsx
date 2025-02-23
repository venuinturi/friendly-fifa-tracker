
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Trophy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface GameFormProps {
  type: "1v1" | "2v2";
  onSubmit: (gameData: any) => void;
}

const GameForm = ({ type, onSubmit }: GameFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    team1: type === "1v1" ? "" : "",
    team2: type === "1v1" ? "" : "",
    score1: "",
    score2: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.team1 || !formData.team2 || !formData.score1 || !formData.score2) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const score1 = parseInt(formData.score1);
    const score2 = parseInt(formData.score2);
    const winner = score1 === score2 ? "Draw" : (score1 > score2 ? formData.team1 : formData.team2);
    
    onSubmit({ ...formData, winner, type, date: new Date().toISOString() });
    setFormData({ team1: "", team2: "", score1: "", score2: "" });
    toast({
      title: "Success",
      description: "Game record added successfully!",
    });
  };

  return (
    <Card className="p-6 animate-fade-in">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Team 1</label>
            <Input
              placeholder={type === "1v1" ? "Player 1" : "Team 1 Players"}
              value={formData.team1}
              onChange={(e) => setFormData({ ...formData, team1: e.target.value })}
              className="transition-all duration-200 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Team 2</label>
            <Input
              placeholder={type === "1v1" ? "Player 2" : "Team 2 Players"}
              value={formData.team2}
              onChange={(e) => setFormData({ ...formData, team2: e.target.value })}
              className="transition-all duration-200 focus:ring-primary"
            />
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
