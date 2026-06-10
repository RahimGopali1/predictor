# TODO - Fix fixture-results mismatch

## Plan
1. Patch `netlify/functions/api.js` so group-stage matches use `openingFixtures` ids (and not regenerated ids starting at 25).
2. Ensure the group stage match objects created in `getGroupStageMatches()` preserve `id`, `home`, `away`, `group` etc.
3. Keep the extra “MD1/MD2/MD3” generated matches consistent with how `openingFixtures` are represented (so ids match existing `fixture-results.json`).
4. (Optional) Add a guard/log: if `results[match.id]` missing, log first few missing ids for easier debugging.
5. Run a quick node check (or start the netlify function) to confirm `/api/fixtures/status` marks fixtures as finished using existing `fixture-results.json`.

