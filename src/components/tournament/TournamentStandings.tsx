
import { TournamentStanding } from "@/types/game";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TournamentStandingsProps {
  standings: TournamentStanding[];
}

export const TournamentStandings = ({ standings }: TournamentStandingsProps) => {
  // Sort standings by points (descending), then by goal difference
  const sortedStandings = [...standings].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    return b.goalDifference - a.goalDifference;
  });

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle>Tournament Standings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player/Team</TableHead>
                <TableHead className="text-center">MP</TableHead>
                <TableHead className="text-center">W</TableHead>
                <TableHead className="text-center">D</TableHead>
                <TableHead className="text-center">L</TableHead>
                <TableHead className="text-center">GF</TableHead>
                <TableHead className="text-center">GA</TableHead>
                <TableHead className="text-center">GD</TableHead>
                <TableHead className="text-center">Points</TableHead>
                <TableHead className="text-center">Win %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStandings.map((standing, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{standing.name}</TableCell>
                  <TableCell className="text-center">{standing.matches}</TableCell>
                  <TableCell className="text-center">{standing.wins}</TableCell>
                  <TableCell className="text-center">{standing.draws}</TableCell>
                  <TableCell className="text-center">{standing.losses}</TableCell>
                  <TableCell className="text-center">{standing.goalsFor}</TableCell>
                  <TableCell className="text-center">{standing.goalsAgainst}</TableCell>
                  <TableCell className="text-center">{standing.goalDifference}</TableCell>
                  <TableCell className="text-center">{standing.points}</TableCell>
                  <TableCell className="text-center">{standing.winPercentage.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
