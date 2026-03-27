import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    // Extract auth token from Authorization header before reading body
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    const body = await req.json();
    const { file_uri } = body;

    if (!file_uri) return Response.json({ error: 'Missing file_uri' }, { status: 400 });

    // Use service role to create signed URL - token validation handled by platform
    const base44 = createClientFromRequest(req, { body });

    const result = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 300,
    });

    return Response.json({ signed_url: result.signed_url });
  } catch (error) {
    console.error('[ERROR]', error?.message || error);
    return Response.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
});