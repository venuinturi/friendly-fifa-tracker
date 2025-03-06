export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      games: {
        Row: {
          created_at: string
          id: string
          room_id: string | null
          score1: number
          score2: number
          team1: string
          team1_player1: string | null
          team1_player2: string | null
          team2: string
          team2_player1: string | null
          team2_player2: string | null
          tournament_id: string | null
          type: string
          updated_at: string | null
          updated_by: string | null
          updated_by_email: string | null
          winner: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id?: string | null
          score1: number
          score2: number
          team1: string
          team1_player1?: string | null
          team1_player2?: string | null
          team2: string
          team2_player1?: string | null
          team2_player2?: string | null
          tournament_id?: string | null
          type: string
          updated_at?: string | null
          updated_by?: string | null
          updated_by_email?: string | null
          winner: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string | null
          score1?: number
          score2?: number
          team1?: string
          team1_player1?: string | null
          team1_player2?: string | null
          team2?: string
          team2_player1?: string | null
          team2_player2?: string | null
          tournament_id?: string | null
          type?: string
          updated_at?: string | null
          updated_by?: string | null
          updated_by_email?: string | null
          winner?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          id: string
          name: string
          room_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          room_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      tournament_matches: {
        Row: {
          id: string
          match_number: number
          round: number
          score1: number | null
          score2: number | null
          status: string
          team1: string
          team1_player1: string | null
          team1_player2: string | null
          team2: string
          team2_player1: string | null
          team2_player2: string | null
          tournament_id: string
          winner: string | null
        }
        Insert: {
          id?: string
          match_number: number
          round: number
          score1?: number | null
          score2?: number | null
          status?: string
          team1: string
          team1_player1?: string | null
          team1_player2?: string | null
          team2: string
          team2_player1?: string | null
          team2_player2?: string | null
          tournament_id: string
          winner?: string | null
        }
        Update: {
          id?: string
          match_number?: number
          round?: number
          score1?: number | null
          score2?: number | null
          status?: string
          team1?: string
          team1_player1?: string | null
          team1_player2?: string | null
          team2?: string
          team2_player1?: string | null
          team2_player2?: string | null
          tournament_id?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          room_id: string | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          room_id?: string | null
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          room_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
