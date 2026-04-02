import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const AVATAR_STYLE_PROMPT = (color) =>
  `Create a cartoon avatar portrait closely based on the person in the reference photo. Style: vibrant comic-book / video-game character art — bold dark ink outlines, rich saturated colors, strong cel-shading with highlights and shadows, slightly stylized but realistic proportions (NOT chibi or baby-faced). Think "mobile game character select screen" or "Cartoon Network / Nickelodeon animated series" style. LIKENESS: Match the person's hair color, hairstyle, skin tone, facial structure, eye color, beard/stubble if present, and any accessories (glasses, hats, etc.). COMPOSITION: Head and top of shoulders only, cropped tightly, centered inside a perfect circle. The circle background is solid flat color ${color || '#3b82f6'}. Add a thick dark near-black circular border ring around the circle. Everything outside the circle is fully transparent. Output: square PNG, transparent outside the circle.`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));

    // Support both direct call ({ memberId }) and entity automation payload ({ event, data })
    const memberId = body.memberId || body.event?.entity_id;

    // Find members to process — either a specific one or scan all pending
    let members = [];
    if (memberId) {
      const member = await base44.asServiceRole.entities.FamilyMember.get(memberId);
      if (member) members = [member];
    } else {
      // Manual scan — all members with a headshot but no generated avatar
      const all = await base44.asServiceRole.entities.FamilyMember.list();
      members = all.filter(m => m.original_headshot_url && !m.generated_avatar_url);
    }

    if (members.length === 0) {
      return Response.json({ message: 'No members need avatar generation.' });
    }

    const results = [];

    for (const member of members) {
      if (!member.original_headshot_url) continue;

      // Generate the avatar using the strict style prompt
      const { url: generatedUrl } = await base44.asServiceRole.integrations.Core.GenerateImage({
        prompt: AVATAR_STYLE_PROMPT(member.color),
        existing_image_urls: [member.original_headshot_url],
      });

      // Save the generated avatar URL back to the FamilyMember record
      await base44.asServiceRole.entities.FamilyMember.update(member.id, {
        generated_avatar_url: generatedUrl,
      });

      // Clear the pending flag on any User whose email matches this member
      // (best effort — member may not have a linked user)
      if (member.email) {
        try {
          const users = await base44.asServiceRole.entities.User.filter({ email: member.email });
          if (users?.length > 0) {
            await base44.asServiceRole.entities.User.update(users[0].id, {
              pending_avatar_generation: false,
            });
          }
        } catch (_) { /* no linked user — that's fine */ }
      }

      results.push({ memberId: member.id, name: member.name, avatarUrl: generatedUrl });
      console.log(`Avatar generated for ${member.name}`);
    }

    return Response.json({ success: true, generated: results });
  } catch (error) {
    console.error('generateMemberAvatar error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});