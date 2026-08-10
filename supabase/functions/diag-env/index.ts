// Temporary diagnostic: reports ONLY presence (boolean) of env var names. No values.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const names = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'SB_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SB_SECRET_KEY',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
  ];
  const present: Record<string, boolean> = {};
  for (const n of names) present[n] = !!Deno.env.get(n);
  return new Response(JSON.stringify({ present }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
