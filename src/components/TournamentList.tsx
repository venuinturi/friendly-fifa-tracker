
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Tournament } from "@/types/game";
import { TournamentMatches } from "./TournamentMatches";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { useTournamentApi } from "@/hooks/useTournamentApi";
import { useAuth } from "@/context/AuthContext";

interface TournamentListProps {
  tournaments: Tournament[];
  onUpdate: () => void;
}

export const TournamentList = ({ tournaments, onUpdate }: TournamentListProps) => {
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null);
  const { toast } = useToast();
  const tournamentApi = useTournamentApi();
  const { isAdmin } = useAuth();

  const handleToggleExpand = (tournamentId: string) => {
    setExpandedTournament(prev => prev === tournamentId ? null : tournamentId);
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!isAdmin) {
      toast({
        title: "Access denied",
        description: "You don't have permission to delete tournaments",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const success = await tournamentApi.deleteTournament(tournamentId);
      
      if (success) {
        toast({
          title: "Success",
          description: "Tournament deleted successfully",
        });
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: "Error",
        description: "Failed to delete tournament",
        variant: "destructive",
      });
    }
  };

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tournaments created yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tournaments.map(tournament => (
        <Collapsible
          key={tournament.id}
          open={expandedTournament === tournament.id}
          onOpenChange={() => handleToggleExpand(tournament.id)}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-primary" />
                  {tournament.name}
                </CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {expandedTournament === tournament.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <div className="flex gap-2 text-sm text-muted-foreground">
                <span>{tournament.type} Tournament</span>
                <span>•</span>
                <span>
                  Created on {new Date(tournament.created_at).toLocaleDateString()}
                </span>
                <span>•</span>
                <span className="capitalize">{tournament.status}</span>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <TournamentMatches 
                  tournamentId={tournament.id} 
                  tournamentType={tournament.type}
                  onMatchUpdated={onUpdate}
                />
              </CardContent>
              {isAdmin && (
                <CardFooter className="border-t pt-4 flex justify-end">
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDeleteTournament(tournament.id)}
                  >
                    Delete Tournament
                  </Button>
                </CardFooter>
              )}
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
};
