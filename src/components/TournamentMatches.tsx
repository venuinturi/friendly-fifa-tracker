
import { TournamentMatchesContainer } from "./tournament/TournamentMatchesContainer";

interface TournamentMatchesProps {
  tournamentId: string;
  tournamentType: "1v1" | "2v2";
  onMatchUpdated: () => void;
}

export const TournamentMatches = (props: TournamentMatchesProps) => {
  return (
    <TournamentMatchesContainer {...props} />
  );
};
