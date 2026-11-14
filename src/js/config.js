// Conexão com o Supabase (login e dados na nuvem).
// A chave publicável pode ficar no código: quem protege os dados são as regras de
// Row Level Security do banco (cada pessoa só lê e grava os próprios dados).
// Se ficar vazio, o sistema funciona só no navegador.
export const SUPABASE_URL = 'https://zazsawtgvyiucorkbmow.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_8s4lMxa1KvTyG6aXVRhgbw_ZA29-LGL';
export const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
