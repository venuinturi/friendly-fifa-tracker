
import { useTournamentQueries } from './useTournamentQueries';
import { useTournamentMutations } from './useTournamentMutations';

export const useTournamentApi = () => {
  const { 
    loading: queriesLoading,
    fetchTournaments,
    fetchTournamentMatches,
  } = useTournamentQueries();

  const {
    loading: mutationsLoading,
    createTournament,
    createTournamentMatches,
    saveMatchResult,
    deleteTournament,
  } = useTournamentMutations();

  return {
    loading: queriesLoading || mutationsLoading,
    fetchTournaments,
    fetchTournamentMatches,
    createTournament,
    createTournamentMatches,
    saveMatchResult,
    deleteTournament,
  };
};
