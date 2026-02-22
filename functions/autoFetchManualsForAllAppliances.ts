import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all appliances
    const appliances = await base44.entities.RoomItem.filter({ type: 'appliance' });
    
    const appliancesNeedingManuals = appliances.filter(
      a => a.brand && a.model && !a.manual_url
    );

    if (appliancesNeedingManuals.length === 0) {
      return Response.json({ 
        message: 'No appliances need manual fetching',
        processed: 0 
      });
    }

    let successCount = 0;
    let failureCount = 0;

    // Fetch manuals for each appliance
    for (const appliance of appliancesNeedingManuals) {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Find the official online user manual PDF link for ${appliance.brand} ${appliance.model}. Search the manufacturer's website and return the direct PDF URL or support page URL.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              manual_url: { type: "string" },
              found: { type: "boolean" }
            }
          }
        });

        if (result.found && result.manual_url) {
          await base44.entities.RoomItem.update(appliance.id, {
            manual_url: result.manual_url
          });
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        failureCount++;
      }
    }

    return Response.json({
      message: 'Manual fetching complete',
      total: appliancesNeedingManuals.length,
      successful: successCount,
      failed: failureCount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});