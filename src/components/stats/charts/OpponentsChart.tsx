
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GAME_COLORS } from "@/lib/utils";

interface OpponentData {
  id: string;
  name: string;
  totalGames: number;
  wins: number;
  losses: number;
  winPercentage: number;
}

interface OpponentsChartProps {
  data: OpponentData[];
}

export const OpponentsChart = ({ data }: OpponentsChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Opponents Analysis</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end"
                height={50}
                interval={0}
              />
              <YAxis />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'winPercentage') return [`${Number(value).toFixed(1)}%`, 'Win Rate'];
                  return [value, name === 'totalGames' ? 'Games' : name];
                }}
              />
              <Legend />
              <Bar dataKey="totalGames" name="Games Played" fill={GAME_COLORS[0]} />
              <Bar dataKey="wins" name="Wins" fill={GAME_COLORS[3]} />
              <Bar dataKey="losses" name="Losses" fill={GAME_COLORS[1]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <p className="text-muted-foreground">No opponent data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
