export type OrderStatus = 'Paid' | 'Packed' | 'Shipped' | 'Delivered';
export type Sender = 'user' | 'ai';

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      conversations: {
        Row: {
          id: string;
          created_at: string;
          metadata: Record<string, unknown> | null;
          customer_id: string | null; // added in migration 007; null for pre-migration rows
        };
        Insert: {
          id?: string;
          created_at?: string;
          metadata?: Record<string, unknown> | null;
          customer_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender: Sender;
          text: string;
          card_payload: Record<string, unknown> | null;
          card_payloads: Record<string, unknown>[] | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender: Sender;
          text: string;
          card_payload?: Record<string, unknown> | null;
          card_payloads?: Record<string, unknown>[] | null;
          timestamp?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          status: OrderStatus;
          customer_name: string;    // kept for backward compat; use customer_id for new logic
          customer_id: string | null; // added in migration 007; null for pre-migration rows
          items: unknown[];
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          status: OrderStatus;
          customer_name: string;
          customer_id?: string | null;
          items?: unknown[];
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      faq_chunks: {
        Row: {
          id: string;
          content: string;
          embedding: number[] | null;
          metadata: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          content: string;
          embedding?: number[] | null;
          metadata?: Record<string, unknown> | null;
        };
        Update: Partial<Database['public']['Tables']['faq_chunks']['Insert']>;
      };
      message_embeddings: {
        Row: {
          id: string;
          message_id: string;
          embedding: number[] | null;
        };
        Insert: {
          id?: string;
          message_id: string;
          embedding?: number[] | null;
        };
        Update: Partial<Database['public']['Tables']['message_embeddings']['Insert']>;
      };
    };
  };
}
