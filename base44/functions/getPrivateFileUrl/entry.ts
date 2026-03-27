import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const body = await req.json();
  const base44 = createClientFromRequest(req, { body });
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_uri } = body;
  if (!file_uri) return Response.json({ error: 'Missing file_uri' }, { status: 400 });

  const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
    file_uri,
    expires_in: 300,
  });

  return Response.json({ signed_url });
});