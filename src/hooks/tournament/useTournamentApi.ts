
import { useTournamentQueries } from './useTournamentQueries';
import { useTournamentMutations } from './useTournamentMutations';
import { useState } from 'react';

export const useTournamentApi = () => {
  const [mutationLoading, setMutationLoading] = useState(false);
  
  const { 
    loading: queriesLoading,
    fetchTournaments,
    fetchTournamentMatches 
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
    createNextRoundMatches: async () => {}, // Stub function to match the original API
    generateNextRoundMatches: async () => {}, // Stub function to match the original API
    handleSmall2v2Tournament: async () => false, // Stub function to match the original API
  };
};
