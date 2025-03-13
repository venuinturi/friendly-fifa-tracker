
import { useTournamentQueries } from './useTournamentQueries';
import { useTournamentMutations } from './useTournamentMutations';
import { useState } from 'react';

export const useTournamentApi = () => {
  const [mutationLoading, setMutationLoading] = useState(false);
  
  const { 
    loading: queriesLoading,
    fetchTournaments,
    fetchTournamentMatches,
  } = useTournamentQueries();

  const {
    createTournament,
    createTournamentMatches,
    saveMatchResult,
    deleteTournament,
    advanceToNextRound,
  } = useTournamentMutations();

  return {
    loading: queriesLoading || mutationLoading,
    fetchTournaments,
    fetchTournamentMatches,
    createTournament,
    createTournamentMatches,
    saveMatchResult,
    deleteTournament,
    advanceToNextRound,
  };
};
