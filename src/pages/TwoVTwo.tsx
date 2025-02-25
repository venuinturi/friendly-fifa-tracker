
import GameForm from "@/components/GameForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const TwoVTwo = () => {
  const { toast } = useToast();

  const handleSubmit = async (gameData: any) => {
    try {
      const { error } = await supabase
        .from('games')
        .insert([gameData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Game record added successfully!",
      });
    } catch (error) {
      console.error('Error saving game:', error);
      toast({
        title: "Error",
        description: "Failed to save game record",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto pt-24 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Record 2v2 Match</h1>
        <GameForm type="2v2" onSubmit={handleSubmit} />
      </div>
    </div>
  );
};

export default TwoVTwo;
