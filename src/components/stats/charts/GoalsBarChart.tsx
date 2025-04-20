
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GAME_COLORS } from "@/lib/utils";

interface GoalsBarChartProps {
  goalsScored: number;
  goalsConceded: number;
  totalGames: number;
}

export const GoalsBarChart = ({ goalsScored, goalsConceded, totalGames }: GoalsBarChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Goals Distribution</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {totalGames > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: 'Goals Scored', value: goalsScored },
                { name: 'Goals Conceded', value: goalsConceded }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value: any) => [value, 'Goals']} />
              <Bar dataKey="value" fill={GAME_COLORS[3]} name="Goals" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">No games played yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
