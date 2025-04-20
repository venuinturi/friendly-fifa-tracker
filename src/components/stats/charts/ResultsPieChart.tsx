
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GAME_COLORS } from "@/lib/utils";

interface ResultData {
  name: string;
  value: number;
}

interface ResultsPieChartProps {
  data: ResultData[];
}

export const ResultsPieChart = ({ data }: ResultsPieChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Match Results</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {data.some(d => d.value > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => 
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? GAME_COLORS[0] : 
                          index === 1 ? GAME_COLORS[1] : 
                          GAME_COLORS[2]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [value, 'Games']} />
            </PieChart>
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
