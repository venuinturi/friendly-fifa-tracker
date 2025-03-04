
export interface GameRecord {
  id: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  winner: string;
  created_at: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
  type: "1v1" | "2v2";
  team1_player1?: string | null;
  team1_player2?: string | null;
  team2_player1?: string | null;
  team2_player2?: string | null;
  room_id?: string;
  tournament_id?: string; 
}

export interface Tournament {
  id: string;
  name: string;
  type: "1v1" | "2v2";
  created_at: string;
  created_by?: string;
  room_id: string;
  status: "pending" | "active" | "completed";
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  team1: string;
  team2: string;
  score1?: number;
  score2?: number;
  winner?: string;
  status: "pending" | "completed";
  round: number;
  match_number: number;
  team1_player1?: string | null;
  team1_player2?: string | null;
  team2_player1?: string | null;
  team2_player2?: string | null;
}
