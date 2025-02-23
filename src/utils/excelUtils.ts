
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

const EXCEL_FILE_NAME = 'fifa-games-data.xlsx';
const SHEET_NAME = 'Games';

export const saveGamesToExcel = (games: GameRecord[]) => {
  const ws = XLSX.utils.json_to_sheet(games);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
  XLSX.writeFile(wb, EXCEL_FILE_NAME);
};

export const loadGamesFromExcel = (): GameRecord[] => {
  try {
    const wb = XLSX.readFile(EXCEL_FILE_NAME);
    const ws = wb.Sheets[SHEET_NAME];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws) as GameRecord[];
  } catch (error) {
    console.log('No existing file found, starting with empty array');
    return [];
  }
};
