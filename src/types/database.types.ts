export type Profile = {
  id: string;
  display_name: string | null;
  match_code: string;
  push_subscription?: any;
  created_at: string;
};

export type Match = {
  id: string;
  player1_id: string;
  player2_id: string;
  status: 'active' | 'finished';
  created_at: string;
};

export type Card = {
  id: number;
  titulo: string;
  categoria: string;
  tipo: 'Reto' | 'Comodín';
  descripcion: string;
};

export type GameStateStatus = 'in_hand' | 'pending' | 'completed' | 'discarded' | 'bounced';

export type GameState = {
  id: string;
  match_id: string;
  card_id: number;
  player_id: string;
  status: GameStateStatus;
  played_at: string | null;
  resolved_at: string | null;
};
