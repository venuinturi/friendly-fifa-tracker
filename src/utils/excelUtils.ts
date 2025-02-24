
interface GameRecord {
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  winner: string;
  date: string;
  type: "1v1" | "2v2";
}

const STORAGE_KEY = 'fifa_games_data';

export const saveGamesToExcel = (games: GameRecord[]): boolean => {
  try {
    const existingGames = loadGamesFromExcel();
    const updatedGames = Array.isArray(games) ? 
      (games.length === 1 ? [...existingGames, ...games] : games) : 
      existingGames;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedGames));
    return true;
  } catch (error) {
    console.error('Error saving games:', error);
    return false;
  }
};

export const loadGamesFromExcel = (): GameRecord[] => {
  try {
    const gamesData = localStorage.getItem(STORAGE_KEY);
    return gamesData ? JSON.parse(gamesData) : [];
  } catch (error) {
    console.error('Error loading games:', error);
    return [];
  }
};

// Helper function to download current data as Excel file
export const downloadAsExcel = () => {
  try {
    const games = loadGamesFromExcel();
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet(games);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Games');
    XLSX.writeFile(wb, 'fifa-games-data.xlsx');
    return true;
  } catch (error) {
    console.error('Error downloading Excel:', error);
    return false;
  }
};
