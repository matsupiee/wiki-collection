import { backfillLengths } from "./backfill-lengths";
import { DATA_DIR } from "./card-store";
import { createWikimediaClient } from "./wikimedia-client";
const result = await backfillLengths(createWikimediaClient(), DATA_DIR);
console.log(result);
if (result.missing) process.exitCode = 1;
