import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Only adult-role or admin users
  if (user.role === 'child' || user.role === 'user') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { file_name, file_type, file_data } = await req.json();
  if (!file_data) return Response.json({ error: 'No file data' }, { status: 400 });

  // Decode base64 to binary
  const binaryStr = atob(file_data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: file_type });

  const { file_uri } = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: blob });

  return Response.json({ file_uri });
});