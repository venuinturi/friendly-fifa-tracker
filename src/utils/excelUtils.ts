
import * as XLSX from 'xlsx';

interface GameRecord {
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  winner: string;
  date: string;
  type: "1v1" | "2v2";
}

const EXCEL_FILE_NAME = './fifa-games-data.xlsx';
const SHEET_NAME = 'Games';

export const saveGamesToExcel = (games: GameRecord[]) => {
  try {
    // First try to read existing data to merge with new data
    const existingGames = loadGamesFromExcel();
    const allGames = [...existingGames, ...games];
    
    const ws = XLSX.utils.json_to_sheet(allGames);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
    XLSX.writeFile(wb, EXCEL_FILE_NAME);
    return true;
  } catch (error) {
    console.error('Error saving to Excel:', error);
    return false;
  }
};

export const loadGamesFromExcel = (): GameRecord[] => {
  try {
    const wb = XLSX.readFile(EXCEL_FILE_NAME);
    const ws = wb.Sheets[SHEET_NAME];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws) as GameRecord[];
  } catch (error) {
    console.error('Error reading Excel file:', error);
    return [];
  }
};
