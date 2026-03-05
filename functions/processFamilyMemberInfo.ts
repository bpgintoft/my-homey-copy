import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
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
    const base44 = createClientFromRequest(req);
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Extract insurance and contact info from this text. Return JSON with only found data.
Text: "${input}"`,
      response_json_schema: {
        type: "object",
        properties: {
          health_medical: {
            type: "object",
            properties: {
              health_insurance_provider: { type: "string" },
              health_insurance_member_id: { type: "string" },
              health_insurance_group_number: { type: "string" },
              dental_insurance_provider: { type: "string" },
              dental_insurance_member_id: { type: "string" },
              dental_insurance_group_number: { type: "string" },
              vision_insurance_provider: { type: "string" },
              vision_insurance_member_id: { type: "string" },
              vision_insurance_group_number: { type: "string" },
              dentist: { type: "string" },
              optometrist: { type: "string" }
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
    if (aiResponse.health_medical?.health_insurance_provider) {
      updates.insurance_provider = aiResponse.health_medical.health_insurance_provider;
    }
    if (aiResponse.health_medical?.health_insurance_member_id) {
      updates.insurance_member_id = aiResponse.health_medical.health_insurance_member_id;
    }
    if (aiResponse.health_medical?.health_insurance_group_number) {
      updates.insurance_group_number = aiResponse.health_medical.health_insurance_group_number;
    }
    if (aiResponse.health_medical?.dental_insurance_provider) {
      updates.dental_insurance_provider = aiResponse.health_medical.dental_insurance_provider;
    }
    if (aiResponse.health_medical?.dental_insurance_member_id) {
      updates.dental_insurance_member_id = aiResponse.health_medical.dental_insurance_member_id;
    }
    if (aiResponse.health_medical?.dental_insurance_group_number) {
      updates.dental_insurance_group_number = aiResponse.health_medical.dental_insurance_group_number;
    }
    if (aiResponse.health_medical?.vision_insurance_provider) {
      updates.vision_insurance_provider = aiResponse.health_medical.vision_insurance_provider;
    }
    if (aiResponse.health_medical?.vision_insurance_member_id) {
      updates.vision_insurance_member_id = aiResponse.health_medical.vision_insurance_member_id;
    }
    if (aiResponse.health_medical?.vision_insurance_group_number) {
      updates.vision_insurance_group_number = aiResponse.health_medical.vision_insurance_group_number;
    }
    if (aiResponse.health_medical?.dentist) {
      updates.dentist = aiResponse.health_medical.dentist;
    }
    if (aiResponse.health_medical?.optometrist) {
      updates.optometrist = aiResponse.health_medical.optometrist;
    }

    // Also sync vision insurance to selected other members if specified
    if (syncMemberIds.length > 0) {
      const visionInsuranceData = {
        vision_insurance_provider: updates.vision_insurance_provider,
        vision_insurance_member_id: updates.vision_insurance_member_id,
        vision_insurance_group_number: updates.vision_insurance_group_number,
      };
      const updatedMembers = [
        ...syncMemberIds.map(id => ({ id, data: { ...insuranceData, ...visionInsuranceData } }))
      ];
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