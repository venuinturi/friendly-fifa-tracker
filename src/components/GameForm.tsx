
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRoom } from "@/context/RoomContext";

interface GameFormProps {
  type: "1v1" | "2v2";
  onSubmit: (data: any) => void;
}

interface Player {
  id: string;
  name: string;
}

const GameForm = ({ type, onSubmit }: GameFormProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const { currentRoomId } = useRoom();
  
  // Schema validation
  const formSchema = z.object({
    team1_player1: z.string().min(1, "Player 1 is required"),
    team2_player1: z.string().min(1, "Player 1 is required"),
    team1_player2: type === "2v2" ? z.string().min(1, "Player 2 is required") : z.string().optional(),
    team2_player2: type === "2v2" ? z.string().min(1, "Player 2 is required") : z.string().optional(),
    score1: z.string().min(1, "Score is required"),
    score2: z.string().min(1, "Score is required"),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      team1_player1: "",
      team2_player1: "",
      team1_player2: "",
      team2_player2: "",
      score1: "0",
      score2: "0",
    },
  });
  
  // Track selected players to filter them out from other dropdowns
  const [selectedPlayers, setSelectedPlayers] = useState<{[key: string]: string}>({
    team1_player1: "",
    team2_player1: "",
    team1_player2: "",
    team2_player2: "",
  });

  // Update selected players when form values change
  useEffect(() => {
    const subscription = form.watch((value) => {
      const newSelected = { ...selectedPlayers };
      if (value.team1_player1) newSelected.team1_player1 = value.team1_player1;
      if (value.team2_player1) newSelected.team2_player1 = value.team2_player1;
      if (value.team1_player2) newSelected.team1_player2 = value.team1_player2;
      if (value.team2_player2) newSelected.team2_player2 = value.team2_player2;
      setSelectedPlayers(newSelected);
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!currentRoomId) return;
      
      try {
        const { data, error } = await supabase
          .from('players')
          .select('id, name')
          .eq('room_id', currentRoomId)
          .order('name');
          
        if (error) throw error;
        setPlayers(data || []);
      } catch (error) {
        console.error('Error fetching players:', error);
      }
    };
    
    fetchPlayers();
  }, [currentRoomId]);

  // Filter players for each dropdown to remove already selected players
  const getAvailablePlayers = (fieldName: string) => {
    return players.filter(player => 
      !Object.entries(selectedPlayers)
        .filter(([key, value]) => key !== fieldName && value !== "")
        .map(([_, value]) => value)
        .includes(player.id)
    );
  };

  const handleFormSubmit = (data: z.infer<typeof formSchema>) => {
    if (type === "1v1") {
      // For 1v1, get player names to use as team names
      const team1Player = players.find(p => p.id === data.team1_player1);
      const team2Player = players.find(p => p.id === data.team2_player1);
      
      onSubmit({
        ...data,
        team1: team1Player?.name || data.team1_player1,
        team2: team2Player?.name || data.team2_player1,
      });
    } else {
      // For 2v2, we'll pass the player IDs and let the parent component handle team name creation
      onSubmit(data);
    }
    
    // Reset form after submission
    form.reset({
      team1_player1: "",
      team2_player1: "",
      team1_player2: "",
      team2_player2: "",
      score1: "0",
      score2: "0",
    });
    
    // Clear selected players
    setSelectedPlayers({
      team1_player1: "",
      team2_player1: "",
      team1_player2: "",
      team2_player2: "",
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Team 1</h3>
            
            <FormField
              control={form.control}
              name="team1_player1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Player 1</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Player 1" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getAvailablePlayers("team1_player1").map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {type === "2v2" && (
              <FormField
                control={form.control}
                name="team1_player2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Player 2</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Player 2" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getAvailablePlayers("team1_player2").map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="score1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Score</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Team 2</h3>
            
            <FormField
              control={form.control}
              name="team2_player1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Player 1</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Player 1" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getAvailablePlayers("team2_player1").map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {type === "2v2" && (
              <FormField
                control={form.control}
                name="team2_player2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Player 2</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Player 2" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getAvailablePlayers("team2_player2").map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="score2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Score</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="flex justify-center">
          <Button type="submit" size="lg">
            Save Game
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default GameForm;
