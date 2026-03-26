import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// One-time utility: finds large images in RoomItem and FamilyMember entities,
// re-uploads them as compressed JPEGs, and updates the entity records.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const SIZE_THRESHOLD = 500 * 1024; // 500 KB
  const MAX_DIMENSION = 1200;
  const results = { checked: 0, optimized: 0, skipped: 0, errors: [] };

  // Collect all image URLs to check: [{ url, entityName, entityId, field }]
  const targets = [];

  const roomItems = await base44.asServiceRole.entities.RoomItem.list('-created_date', 500);
  for (const item of roomItems) {
    if (item.photo_url) targets.push({ url: item.photo_url, entityName: 'RoomItem', entityId: item.id, field: 'photo_url' });
    if (Array.isArray(item.photos)) {
      item.photos.forEach((url, idx) => targets.push({ url, entityName: 'RoomItem', entityId: item.id, field: 'photos', idx, allPhotos: item.photos }));
    }
  }

  const familyMembers = await base44.asServiceRole.entities.FamilyMember.list('-created_date', 100);
  for (const member of familyMembers) {
    if (member.photo_url) targets.push({ url: member.photo_url, entityName: 'FamilyMember', entityId: member.id, field: 'photo_url' });
  }

  console.log(`Total image targets to check: ${targets.length}`);

  for (const target of targets) {
    results.checked++;
    try {
      // HEAD request to check content-length first (fast path)
      const head = await fetch(target.url, { method: 'HEAD' });
      const contentLength = parseInt(head.headers.get('content-length') || '0', 10);

      if (contentLength > 0 && contentLength < SIZE_THRESHOLD) {
        results.skipped++;
        continue;
      }

      // Download the image
      const imgRes = await fetch(target.url);
      if (!imgRes.ok) { results.skipped++; continue; }
      const contentType = imgRes.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) { results.skipped++; continue; }

      const arrayBuffer = await imgRes.arrayBuffer();
      const actualSize = arrayBuffer.byteLength;

      if (actualSize < SIZE_THRESHOLD) {
        results.skipped++;
        continue;
      }

      console.log(`Optimizing: ${target.url} (${Math.round(actualSize / 1024)}KB)`);

      // Use canvas-based compression via LLM service — we encode to JPEG via the
      // GenerateImage "edit" mode isn't suitable here. Instead we re-upload to get
      // a hosted URL and then use the InvokeLLM image processing prompt to resize.
      // Since Deno has no canvas API, we use a pure-JS resize with Jimp-style approach:
      // Upload original, then use a separate resize trick via sharp (npm).

      // Use sharp for server-side resize/compress
      const sharp = (await import('npm:sharp@0.33.5')).default;
      const inputBuffer = new Uint8Array(arrayBuffer);
      const optimized = await sharp(inputBuffer)
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();

      const optimizedSize = optimized.byteLength;
      console.log(`  → ${Math.round(optimizedSize / 1024)}KB (was ${Math.round(actualSize / 1024)}KB)`);

      // Only update if we actually saved something meaningful (>10%)
      if (optimizedSize >= actualSize * 0.9) {
        results.skipped++;
        continue;
      }

      // Upload optimized image
      const blob = new Blob([optimized], { type: 'image/jpeg' });
      const file = new File([blob], 'optimized.jpg', { type: 'image/jpeg' });
      const { file_url: newUrl } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

      // Update entity
      if (target.field === 'photos') {
        const newPhotos = [...target.allPhotos];
        newPhotos[target.idx] = newUrl;
        await base44.asServiceRole.entities[target.entityName].update(target.entityId, { photos: newPhotos });
      } else {
        await base44.asServiceRole.entities[target.entityName].update(target.entityId, { [target.field]: newUrl });
      }

      results.optimized++;
      console.log(`  ✓ Updated ${target.entityName} ${target.entityId}.${target.field}`);
    } catch (err) {
      console.error(`Error processing ${target.url}:`, err.message);
      results.errors.push({ url: target.url, error: err.message });
    }
  }

  return Response.json({ success: true, results });
});