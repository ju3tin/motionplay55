// lib/supabase/types.ts

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          solana_wallet: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          solana_wallet?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          solana_wallet?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      wallet_nonces: {
        Row: {
          id: string;
          wallet_address: string;
          nonce: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          nonce: string;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          nonce?: string;
          expires_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type WalletNonce = Database["public"]["Tables"]["wallet_nonces"]["Row"];
