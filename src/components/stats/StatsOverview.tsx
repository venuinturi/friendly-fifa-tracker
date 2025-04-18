
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Trophy, Target, MinusCircle, BarChart2, ArrowUp, ArrowDown, Hash, Percent } from "lucide-react";

interface PlayerStats {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  winPercentage: number;
}

interface StatsOverviewProps {
  stats: PlayerStats;
  isLoading: boolean;
}

export const StatsOverview = ({ stats, isLoading }: StatsOverviewProps) => {
  const statCards = [
    {
      title: "Total Games",
      value: stats.total,
      icon: BarChart2,
      color: "bg-blue-100 text-blue-700"
    },
    {
      title: "Wins",
      value: stats.wins,
      icon: Trophy,
      color: "bg-green-100 text-green-700"
    },
    {
      title: "Losses",
      value: stats.losses,
      icon: MinusCircle,
      color: "bg-red-100 text-red-700"
    },
    {
      title: "Draws",
      value: stats.draws,
      icon: Target,
      color: "bg-amber-100 text-amber-700"
    },
    {
      title: "Goals Scored",
      value: stats.goalsFor,
      icon: ArrowUp,
      color: "bg-indigo-100 text-indigo-700"
    },
    {
      title: "Goals Conceded",
      value: stats.goalsAgainst,
      icon: ArrowDown,
      color: "bg-purple-100 text-purple-700"
    },
    {
      title: "Win Rate",
      value: `${stats.winPercentage.toFixed(1)}%`,
      icon: Percent,
      color: "bg-emerald-100 text-emerald-700"
    },
    {
      title: "Goal Difference",
      value: stats.goalsFor - stats.goalsAgainst,
      icon: Hash,
      color: "bg-sky-100 text-sky-700"
    }
  ];

  if (isLoading) {
    return (
      <>
        {statCards.slice(0, 4).map((card, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-6 w-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  return (
    <>
      {statCards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center">
              {card.icon && <card.icon className="h-4 w-4 mr-1" />}
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};
