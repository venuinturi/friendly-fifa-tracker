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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          auto_advance: boolean | null
          created_at: string
          created_by: string | null
          has_round_robin: boolean | null
          id: string
          matches_per_player: number | null
          name: string
          room_id: string | null
          round_robin_round: number | null
          round_robin_team1: string | null
          round_robin_team2: string | null
          round_robin_team3: string | null
          status: string
          type: string
        }
        Insert: {
          auto_advance?: boolean | null
          created_at?: string
          created_by?: string | null
          has_round_robin?: boolean | null
          id?: string
          matches_per_player?: number | null
          name: string
          room_id?: string | null
          round_robin_round?: number | null
          round_robin_team1?: string | null
          round_robin_team2?: string | null
          round_robin_team3?: string | null
          status?: string
          type: string
        }
        Update: {
          auto_advance?: boolean | null
          created_at?: string
          created_by?: string | null
          has_round_robin?: boolean | null
          id?: string
          matches_per_player?: number | null
          name?: string
          room_id?: string | null
          round_robin_round?: number | null
          round_robin_team1?: string | null
          round_robin_team2?: string | null
          round_robin_team3?: string | null
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
      user_profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
