// functions/config.js (修正后)

export async function onRequest(context) {
  const { env } = context;

  const config = {
    // 修正: 使用 VITE_ 前缀，或确保与Cloudflare仪表盘中的名称一致
    supabaseUrl: env.VITE_SUPABASE_URL,
    supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
  };

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return new Response(JSON.stringify({
      error: 'Backend configuration is missing. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in the Cloudflare Pages environment variables.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 修正: 修复重复的键名
  return new Response(JSON.stringify(config), {
    headers: { 'Content-Type': 'application/json' },
  });
}
