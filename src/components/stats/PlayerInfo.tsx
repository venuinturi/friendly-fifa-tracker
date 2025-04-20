
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatsOverview } from "./StatsOverview";

interface PlayerInfoProps {
  name: string;
  avatarUrl?: string;
  stats: {
    total: number;
    wins: number;
    losses: number;
    draws: number;
    goalsFor: number;
    goalsAgainst: number;
    winPercentage: number;
  };
}

export const PlayerInfo = ({ name, avatarUrl, stats }: PlayerInfoProps) => {
  return (
    <div className="mb-8 flex flex-col md:flex-row items-center md:items-start gap-6">
      <Avatar className="h-36 w-36 border-4 border-primary">
        <AvatarImage src={avatarUrl || ''} alt={name} />
        <AvatarFallback className="text-4xl font-bold bg-primary text-primary-foreground">
          {name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <h1 className="text-4xl font-bold text-center md:text-left mb-4">{name}</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatsOverview stats={stats} isLoading={false} />
        </div>
      </div>
    </div>
  );
};
