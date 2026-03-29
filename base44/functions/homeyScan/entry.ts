import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 });

    console.log('Received file:', file.name, file.type, file.size, 'bytes');

    // Upload to private storage (for secure vault docs) and also get a public URL for LLM analysis
    const privateUpload = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });
    const file_uri = privateUpload.file_uri;

    // Get a short-lived signed URL so the LLM can read the image
    const signedResult = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 300 });
    const file_url = signedResult.signed_url;
    console.log('Private URI:', file_uri, '| Signed URL for LLM:', file_url);

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are Homey, a smart family document assistant. Carefully analyze this image or document and do THREE things:

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
- doc_type: short type identifier (e.g. "passport", "drivers_license", "insurance_card", "health_insurance_card", "birth_certificate", "ssn")
- expiry_date: expiration/effective date in YYYY-MM-DD. For insurance cards, look for fields like "Effective Date", "Exp Date", "Valid Through", "Policy Period end date", or any date printed on the card. null if not found.
- member_name: the full name or first name of the person(s) this ID belongs to. null if not found.
- category: one of: identity, property, health, financial, travel, vehicles, education, other
- license_number: the driver's license number if this is a driver's license. null otherwise.
- insurance_provider: the insurance company name (e.g. "State Farm", "Geico", "Blue Cross") if this is any kind of insurance card. null otherwise.
- policy_number: the policy number, member ID, or group number on the card. null if not found.
- insurance_type: "vehicle" if auto/vehicle insurance, "health" if health insurance, "dental" if dental, "vision" if vision, null otherwise.

For house_doc, extract:
- title: document title or name
- doc_category: one of: warranty, receipt, manual, insurance, contract, permit, diagram, other
- related_item_name: the product, appliance, or system this relates to. null if not found.
- expiration_date: expiration date in YYYY-MM-DD if applicable. null if not found.
- purchase_date: purchase date in YYYY-MM-DD if applicable. null if not found.
- purchase_price: numeric price if mentioned. null if not found.
- notes: any other relevant notes. null if not found.

STEP 3 - EXTRACT METADATA: Always scan the document for structured data items and return them in an extracted_metadata array. Pay special attention to:
- Barcodes: Extract the barcode number below any barcode image
- Card numbers: Extract membership, card, or ID numbers prominently displayed
- Account/reference numbers: Any ID-like numbers not already captured in main fields

For each piece of metadata found, determine its type from:
- person_name: Any person's full name or first name found
- company_name: Any company or organization name
- phone_number: Phone numbers in any format
- email: Email addresses
- membership_id: Membership numbers, card IDs, library card numbers, or barcode numbers (e.g., "25252 00215 6485" from a library card barcode)
- issued_date: Date the document/card was issued in YYYY-MM-DD
- expiration_date: Date when something expires (separate from field expiry_date if already extracted)
- group_number: Group, batch, or team numbers
- account_number: Account, customer, or member account numbers
- website: Any website or URL found
- barcode_number: The numeric value below a barcode image

Return extracted_metadata as an array of objects with "type" and "value" fields. Example: [{"type": "person_name", "value": "John Smith"}, {"type": "membership_id", "value": "25252 00215 6485"}]. Return empty array [] if nothing found.

IMPORTANT: Do NOT skip card numbers or barcodes. These are critical for library cards, memberships, and ID cards.

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
          license_number: { type: ["string", "null"] },
          insurance_provider: { type: ["string", "null"] },
          policy_number: { type: ["string", "null"] },
          insurance_type: { type: ["string", "null"] },
          // house_doc fields
          title: { type: ["string", "null"] },
          doc_category: { type: ["string", "null"] },
          related_item_name: { type: ["string", "null"] },
          expiration_date: { type: ["string", "null"] },
          purchase_date: { type: ["string", "null"] },
          purchase_price: { type: ["number", "null"] },
          notes: { type: ["string", "null"] },
          // extracted metadata
          extracted_metadata: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                value: { type: "string" }
              }
            }
          }
          }
          }
    });

    return Response.json({ result, file_url: file_uri });
  } catch (error) {
    console.error('homeyScan error:', error?.message || error);
    return Response.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
});