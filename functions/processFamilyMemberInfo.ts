import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { familyMemberId, input } = body;

    if (!familyMemberId || !input) {
      return Response.json({ error: 'Missing familyMemberId or input' }, { status: 400 });
    }

    // Call LLM to parse and categorize the input
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Extract insurance and contact info from this text. Return JSON with only found data.
Text: "${input}"`,
      response_json_schema: {
        type: "object",
        properties: {
          health_medical: {
            type: "object",
            properties: {
              insurance_provider: { type: "string" },
              insurance_member_id: { type: "string" },
              insurance_group_number: { type: "string" },
              dentist: { type: "string" }
            }
          },
          important_links: {
            type: "array",
            items: {
              type: "object",
              properties: {
                url: { type: "string" },
                title: { type: "string" }
              }
            }
          }
        }
      }
    });

    const updates = {};

    // Direct FamilyMember updates
    if (aiResponse.health_medical?.insurance_provider) {
      updates.insurance_provider = aiResponse.health_medical.insurance_provider;
    }
    if (aiResponse.health_medical?.insurance_member_id) {
      updates.insurance_member_id = aiResponse.health_medical.insurance_member_id;
    }
    if (aiResponse.health_medical?.insurance_group_number) {
      updates.insurance_group_number = aiResponse.health_medical.insurance_group_number;
    }
    if (aiResponse.health_medical?.dentist) {
      updates.dentist = aiResponse.health_medical.dentist;
    }

    // Update FamilyMember
    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.FamilyMember.update(familyMemberId, updates);
    }

    // Create Links
    if (aiResponse.important_links?.length > 0) {
      for (const link of aiResponse.important_links) {
        if (link.url) {
          await base44.asServiceRole.entities.FamilyMemberLink.create({
            url: link.url,
            title: link.title || 'Link',
            category: 'other',
            assigned_to_member_id: familyMemberId,
            assigned_to_name: 'Member'
          });
        }
      }
    }

    return Response.json({
      success: true,
      message: 'Family member information processed successfully',
      extracted: aiResponse
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});