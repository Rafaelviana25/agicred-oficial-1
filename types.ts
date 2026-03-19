
export interface UserProfile {
  id: string;
  full_name: string;
  cpf: string;
  email: string;
  phone: string;
  display_id?: string; // ID de 7 dígitos para exibição
  is_pro: boolean;
  pro_expires_at?: string; // Data de expiração do plano PRO
  pro_started_at?: string; // Data de início do plano PRO
  birth_date?: string;
  password?: string;
  created_at?: string;
}

export interface Client {
  id: string;
  user_id: string;
  full_name: string;
  cpf: string;
  birth_date: string;
  phone: string;
  address: string;
  city: string;
  workplace: string;
  created_at: string;
}

export interface Contract {
  id: string;
  user_id: string;
  client_id: string;
  capital: number;
  interest_rate: number;
  months: number;
  monthly_interest: number;
  total_interest: number;
  total_amount: number;
  paid_amount: number; // Novo campo para controle de saldo
  start_date: string;
  end_date: string;
  status: 'active' | 'paid' | 'overdue';
  created_at: string;
  payment_history?: Record<string, string>; // Índice da parcela -> Data de pagamento (ISO string ou YYYY-MM-DD)
  due_dates_override?: Record<string, string>; // Índice da parcela -> Data de vencimento personalizada
}

export interface AbacatePayResponse {
  data: {
    id: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'EXPIRED';
    brCode: string;
    brCodeBase64: string;
    expiresAt: string;
  };
  error?: string;
}
