import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_url, file_type } = await req.json();
  if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

  const prompt = `You are Homey, a helpful family assistant. Carefully analyze this image or document (which may be a school flyer, sports schedule, medical appointment card, event poster, or similar).

Extract the following details:
- event_name: The name or title of the event
- date: The date in YYYY-MM-DD format. If multiple dates, use the first/main one. If you cannot find a date, return null.
- time: Start time in HH:MM 12-hour format with AM/PM (e.g. "3:30 PM"). If not found, return null.
- end_time: End time if present, same format. If not found, return null.
- location: Physical location or venue name. If not found, return null.
- address: Street address if different from location name. If not found, return null.
- description: A brief 1-2 sentence description summarizing what this event is about.
- event_type: One of: event, sports_league, program, reminder
- age_range: Age range if mentioned (e.g. "5-12 years"). If not found, return null.
- cost: Cost or price if mentioned (e.g. "Free", "$15"). If not found, return null.
- registration_url: Any URL or website mentioned. If not found, return null.
- confidence: Your confidence level (high, medium, low) in the extraction

Be thorough — dates sometimes appear in formats like "Saturday, April 5th" or "4/5/26". Always convert to YYYY-MM-DD.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        event_name: { type: "string" },
        date: { type: ["string", "null"] },
        time: { type: ["string", "null"] },
        end_time: { type: ["string", "null"] },
        location: { type: ["string", "null"] },
        address: { type: ["string", "null"] },
        description: { type: "string" },
        event_type: { type: "string" },
        age_range: { type: ["string", "null"] },
        cost: { type: ["string", "null"] },
        registration_url: { type: ["string", "null"] },
        confidence: { type: "string" }
      }
    }
  });

  return Response.json({ result });
});