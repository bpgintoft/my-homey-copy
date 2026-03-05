import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyMemberId, input } = await req.json();

    if (!familyMemberId || !input) {
      return Response.json({ error: 'Missing familyMemberId or input' }, { status: 400 });
    }

    // Call LLM to parse and categorize the input
    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract and categorize family member information from the following input. Return structured JSON data organized by the 10 categories below. For each field, only include it if it was found in the input text.

Categories to extract:
1. personal_info_hub: email, phone, role, responsibilities
2. to_do_list: tasks/chores with title and timing (daily/short-term/mid-term/long-term)
3. bright_horizons: school/work programs with title, grade, teacher, schedule, website, passcodes
4. important_links: urls with title and category (school, sports_extracurriculars, medical, social, shopping, entertainment, other)
5. important_contacts: contacts with name, type, phone, email, address, website
6. goals_milestones: milestones with title, date, description
7. health_medical: blood_type, height, weight, insurance info, doctor names, vaccination history
8. documents_ids: documents with type (warranty, receipt, manual, insurance, contract, permit, diagram, other), title, expiration_date
9. vehicles_travel: vehicle details, license plate, passport info, frequent flyer programs
10. personal_notes: any general notes or observations

Input text:
"${input}"

Return a JSON object with only the categories that contain extracted data. For each category, include only the fields that were mentioned.`,
      response_json_schema: {
        type: "object",
        properties: {
          personal_info_hub: {
            type: "object",
            properties: {
              email: { type: "string" },
              phone: { type: "string" },
              role: { type: "string" },
              responsibilities: { type: "array", items: { type: "string" } }
            }
          },
          to_do_list: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                timing: { type: "string", enum: ["daily", "short-term", "mid-term", "long-term"] }
              }
            }
          },
          bright_horizons: {
            type: "object",
            properties: {
              title: { type: "string" },
              grade: { type: "string" },
              teacher: { type: "string" },
              schedule: {
                type: "object",
                properties: {
                  monday: { type: "string" },
                  tuesday: { type: "string" },
                  wednesday: { type: "string" },
                  thursday: { type: "string" },
                  friday: { type: "string" }
                }
              },
              website_title: { type: "string" },
              url: { type: "string" },
              passcodes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    code: { type: "string" }
                  }
                }
              },
              phone: { type: "string" },
              email: { type: "string" }
            }
          },
          important_links: {
            type: "array",
            items: {
              type: "object",
              properties: {
                url: { type: "string" },
                title: { type: "string" },
                category: { type: "string", enum: ["school", "sports_extracurriculars", "medical", "social", "shopping", "entertainment", "other"] }
              }
            }
          },
          important_contacts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                phone: { type: "string" },
                email: { type: "string" },
                address: { type: "string" },
                website: { type: "string" }
              }
            }
          },
          goals_milestones: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                date: { type: "string", format: "date" },
                description: { type: "string" }
              }
            }
          },
          health_medical: {
            type: "object",
            properties: {
              blood_type: { type: "string" },
              height_feet: { type: "number" },
              height_inches: { type: "number" },
              weight_lbs: { type: "number" },
              insurance_provider: { type: "string" },
              insurance_member_id: { type: "string" },
              insurance_group_number: { type: "string" },
              primary_care_physician: { type: "string" },
              pediatrician: { type: "string" },
              dentist: { type: "string" },
              vaccination_history: { type: "string" }
            }
          },
          documents_ids: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["warranty", "receipt", "manual", "insurance", "contract", "permit", "diagram", "other"] },
                title: { type: "string" },
                expiration_date: { type: "string", format: "date" }
              }
            }
          },
          vehicles_travel: {
            type: "object",
            properties: {
              vehicle_make: { type: "string" },
              vehicle_model: { type: "string" },
              vehicle_year: { type: "number" },
              license_plate_number: { type: "string" },
              license_number: { type: "string" },
              license_expiration_date: { type: "string", format: "date" },
              passport_expiration_date: { type: "string", format: "date" },
              frequent_flyer_programs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    airline: { type: "string" },
                    number: { type: "string" }
                  }
                }
              }
            }
          },
          personal_notes: {
            type: "string"
          }
        }
      }
    });

    // Process and save the extracted data
    const updates = {};

    // Direct FamilyMember updates
    if (aiResponse.personal_info_hub?.email) updates.email = aiResponse.personal_info_hub.email;
    if (aiResponse.personal_info_hub?.phone) updates.phone = aiResponse.personal_info_hub.phone;
    if (aiResponse.personal_info_hub?.role) updates.role = aiResponse.personal_info_hub.role;
    if (aiResponse.personal_info_hub?.responsibilities) updates.responsibilities = aiResponse.personal_info_hub.responsibilities;

    if (aiResponse.health_medical?.blood_type) updates.blood_type = aiResponse.health_medical.blood_type;
    if (aiResponse.health_medical?.height_feet !== undefined) updates.height_feet = aiResponse.health_medical.height_feet;
    if (aiResponse.health_medical?.height_inches !== undefined) updates.height_inches = aiResponse.health_medical.height_inches;
    if (aiResponse.health_medical?.weight_lbs !== undefined) updates.weight_lbs = aiResponse.health_medical.weight_lbs;
    if (aiResponse.health_medical?.insurance_provider) updates.insurance_provider = aiResponse.health_medical.insurance_provider;
    if (aiResponse.health_medical?.insurance_member_id) updates.insurance_member_id = aiResponse.health_medical.insurance_member_id;
    if (aiResponse.health_medical?.insurance_group_number) updates.insurance_group_number = aiResponse.health_medical.insurance_group_number;
    if (aiResponse.health_medical?.primary_care_physician) updates.primary_care_physician = aiResponse.health_medical.primary_care_physician;
    if (aiResponse.health_medical?.pediatrician) updates.pediatrician = aiResponse.health_medical.pediatrician;
    if (aiResponse.health_medical?.dentist) updates.dentist = aiResponse.health_medical.dentist;
    if (aiResponse.health_medical?.vaccination_history) updates.vaccination_history = aiResponse.health_medical.vaccination_history;

    if (aiResponse.vehicles_travel?.vehicle_make) updates.vehicle_make = aiResponse.vehicles_travel.vehicle_make;
    if (aiResponse.vehicles_travel?.vehicle_model) updates.vehicle_model = aiResponse.vehicles_travel.vehicle_model;
    if (aiResponse.vehicles_travel?.vehicle_year) updates.vehicle_year = aiResponse.vehicles_travel.vehicle_year;
    if (aiResponse.vehicles_travel?.license_plate_number) updates.license_plate_number = aiResponse.vehicles_travel.license_plate_number;
    if (aiResponse.vehicles_travel?.license_number) updates.license_number = aiResponse.vehicles_travel.license_number;
    if (aiResponse.vehicles_travel?.license_expiration_date) updates.license_expiration_date = aiResponse.vehicles_travel.license_expiration_date;
    if (aiResponse.vehicles_travel?.passport_expiration_date) updates.passport_expiration_date = aiResponse.vehicles_travel.passport_expiration_date;
    if (aiResponse.vehicles_travel?.frequent_flyer_programs) updates.frequent_flyer_programs = aiResponse.vehicles_travel.frequent_flyer_programs;

    if (aiResponse.personal_notes) updates.personal_notes = aiResponse.personal_notes;

    // Update FamilyMember
    if (Object.keys(updates).length > 0) {
      await base44.entities.FamilyMember.update(familyMemberId, updates);
    }

    // Create Chores from to_do_list
    if (aiResponse.to_do_list?.length > 0) {
      const member = await base44.entities.FamilyMember.filter({ id: familyMemberId }).then(res => res[0]);
      for (const chore of aiResponse.to_do_list) {
        await base44.entities.Chore.create({
          title: chore.title,
          timing: chore.timing === 'daily' ? 'short-term' : chore.timing || 'short-term',
          assigned_to_member_id: familyMemberId,
          assigned_to_name: member?.name || 'Unknown'
        });
      }
    }

    // Create/Update SchoolProgram
    if (aiResponse.bright_horizons) {
      const existing = await base44.entities.SchoolProgram.filter({ family_member_id: familyMemberId }).then(res => res[0]);
      const programData = {
        family_member_id: familyMemberId,
        ...aiResponse.bright_horizons
      };
      if (existing) {
        await base44.entities.SchoolProgram.update(existing.id, programData);
      } else {
        await base44.entities.SchoolProgram.create(programData);
      }
    }

    // Create Links
    if (aiResponse.important_links?.length > 0) {
      const member = await base44.entities.FamilyMember.filter({ id: familyMemberId }).then(res => res[0]);
      for (const link of aiResponse.important_links) {
        await base44.entities.FamilyMemberLink.create({
          url: link.url,
          title: link.title,
          category: link.category,
          assigned_to_member_id: familyMemberId,
          assigned_to_name: member?.name || 'Unknown'
        });
      }
    }

    // Create Contacts
    if (aiResponse.important_contacts?.length > 0) {
      for (const contact of aiResponse.important_contacts) {
        await base44.entities.ImportantContact.create({
          ...contact,
          linked_to_member_ids: [familyMemberId]
        });
      }
    }

    // Create Milestones
    if (aiResponse.goals_milestones?.length > 0) {
      const member = await base44.entities.FamilyMember.filter({ id: familyMemberId }).then(res => res[0]);
      for (const milestone of aiResponse.goals_milestones) {
        await base44.entities.Milestone.create({
          ...milestone,
          assigned_to_member_id: familyMemberId,
          assigned_to_name: member?.name || 'Unknown'
        });
      }
    }

    // Create Documents
    if (aiResponse.documents_ids?.length > 0) {
      for (const doc of aiResponse.documents_ids) {
        await base44.entities.Document.create({
          title: doc.title,
          type: doc.type,
          ...(doc.expiration_date && { expiration_date: doc.expiration_date })
        });
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