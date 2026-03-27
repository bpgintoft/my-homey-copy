import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 });

    console.log('Received file:', file.name, file.type, file.size, 'bytes');

    // Upload to Base44 storage to get a hosted URL the LLM can access
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    const file_url = uploadResult.file_url;
    console.log('Uploaded URL:', file_url);

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are Homey, a smart family document assistant. Carefully analyze this image or document and do TWO things:

STEP 1 - CLASSIFY: Determine which of these four categories best describes this document:
- "calendar_event": School flyers, sports schedules, event posters, activity sign-ups, appointment cards
- "maintenance_task": HVAC invoices, appliance receipts, service records, repair quotes, home maintenance reminders
- "personal_id": Passports, driver's licenses, insurance cards, birth certificates, social security cards, any government-issued personal ID
- "house_doc": Warranties, product manuals, home contracts, deeds, permits, receipts for purchases (not personal IDs)

STEP 2 - EXTRACT: Based on the category, extract the relevant fields below. Return null for any field you cannot find.

For ALL types, always return document_type.

For calendar_event, extract:
- event_name: title of the event
- date: date in YYYY-MM-DD format (convert any format like "Saturday April 5th" -> YYYY-MM-DD). null if not found.
- time: start time like "3:30 PM". null if not found.
- end_time: end time if present. null if not found.
- location: venue or place name. null if not found.
- address: street address if different from location. null if not found.
- description: 1-2 sentence summary.
- event_type: one of: event, sports_league, program, reminder
- age_range: e.g. "5-12 years". null if not found.
- cost: e.g. "Free", "$15". null if not found.
- registration_url: any URL mentioned. null if not found.
- assignee_name: name of a specific family member this is for (e.g. "Phoenix", "Mara"). null if not found.

For maintenance_task, extract:
- task_title: name of the maintenance task or service performed
- appliance_name: name of appliance, system, or area (e.g. "Furnace", "HVAC", "Roof"). null if not found.
- next_due_date: next service/due date in YYYY-MM-DD. null if not found.
- description: brief description of the work. null if not found.
- cost: cost if mentioned. null if not found.
- category: one of: hvac, plumbing, electrical, exterior, interior, appliances, safety, seasonal, landscaping

For personal_id, extract:
- doc_label: name or title of the document (e.g. "Passport", "Driver's License", "Insurance Card")
- doc_type: short type identifier (e.g. "passport", "drivers_license", "insurance_card", "birth_certificate", "ssn")
- expiry_date: expiration date in YYYY-MM-DD. null if not found.
- member_name: the full name or first name of the person this ID belongs to. null if not found.
- category: one of: identity, property, health, financial, travel, vehicles, education, other

For house_doc, extract:
- title: document title or name
- doc_category: one of: warranty, receipt, manual, insurance, contract, permit, diagram, other
- related_item_name: the product, appliance, or system this relates to. null if not found.
- expiration_date: expiration date in YYYY-MM-DD if applicable. null if not found.
- purchase_date: purchase date in YYYY-MM-DD if applicable. null if not found.
- purchase_price: numeric price if mentioned. null if not found.
- notes: any other relevant notes. null if not found.

Also return:
- confidence: "high", "medium", or "low" — your confidence in the classification and extraction.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          document_type: { type: "string" },
          confidence: { type: "string" },
          // calendar_event fields
          event_name: { type: ["string", "null"] },
          date: { type: ["string", "null"] },
          time: { type: ["string", "null"] },
          end_time: { type: ["string", "null"] },
          location: { type: ["string", "null"] },
          address: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          event_type: { type: ["string", "null"] },
          age_range: { type: ["string", "null"] },
          cost: { type: ["string", "null"] },
          registration_url: { type: ["string", "null"] },
          assignee_name: { type: ["string", "null"] },
          // maintenance_task fields
          task_title: { type: ["string", "null"] },
          appliance_name: { type: ["string", "null"] },
          next_due_date: { type: ["string", "null"] },
          category: { type: ["string", "null"] },
          // personal_id fields
          doc_label: { type: ["string", "null"] },
          doc_type: { type: ["string", "null"] },
          expiry_date: { type: ["string", "null"] },
          member_name: { type: ["string", "null"] },
          // house_doc fields
          title: { type: ["string", "null"] },
          doc_category: { type: ["string", "null"] },
          related_item_name: { type: ["string", "null"] },
          expiration_date: { type: ["string", "null"] },
          purchase_date: { type: ["string", "null"] },
          purchase_price: { type: ["number", "null"] },
          notes: { type: ["string", "null"] },
        }
      }
    });

    return Response.json({ result, file_url });
  } catch (error) {
    console.error('homeyScan error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
});