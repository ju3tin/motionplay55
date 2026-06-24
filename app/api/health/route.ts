// app/api/health/route.ts
export async function GET() {
  try {
    const response = await fetch('https://node-gameserver.onrender.com/health', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-cache',
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ status: 'error' }), { status: 503 });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return new Response(JSON.stringify({ status: 'error' }), { status: 500 });
  }
}
