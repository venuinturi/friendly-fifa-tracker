
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export const downloadAsExcel = async () => {
  try {
    // Fetch all games from Supabase
    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!games || games.length === 0) {
      console.error('No data to export');
      return false;
    }

    // Format the data for Excel
    const excelData = games.map(game => ({
      Date: new Date(game.created_at).toLocaleDateString(),
      Type: game.type,
      Team1: game.team1,
      Team2: game.team2,
      Score1: game.score1,
      Score2: game.score2,
      Winner: game.winner,
      Team1Player1: game.team1_player1 || '',
      Team1Player2: game.team1_player2 || '',
      Team2Player1: game.team2_player1 || '',
      Team2Player2: game.team2_player2 || ''
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Games');

    // Save file
    XLSX.writeFile(wb, 'fifa-games-history.xlsx');
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
};
