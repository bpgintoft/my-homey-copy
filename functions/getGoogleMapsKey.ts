import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    
    if (!apiKey) {
      return Response.json({ error: 'GOOGLE_MAPS_API_KEY not configured' }, { status: 500 });
    }

    return Response.json({ apiKey });
  } catch (error) {
    console.error('Error fetching Google Maps key:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});