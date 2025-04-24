
import { useTournamentQueries } from './tournament/useTournamentQueries';
import { useTournamentMutations } from './tournament/useTournamentMutations';
import { useMatchResults } from './tournament/useMatchResults';

export const useTournamentApi = () => {
  const { fetchTournaments, fetchTournamentMatches } = useTournamentQueries();
  const { createTournament, createTournamentMatches, updateTournamentMatch, deleteTournament, updateTournamentStatus } = useTournamentMutations();
  const { saveMatchResult } = useMatchResults();
  
  return {
    // Queries
    fetchTournaments,
    fetchTournamentMatches,
    
    // Mutations
    createTournament,
    createTournamentMatches,
    updateTournamentMatch,
    deleteTournament,
    updateTournamentStatus,
    saveMatchResult
  };
};
