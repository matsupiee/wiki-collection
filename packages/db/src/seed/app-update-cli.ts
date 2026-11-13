import { eq } from "drizzle-orm";
import { appVersion, mobilePlatform } from "../app-version";
import { appUpdatePolicy } from "../schema/app-update-policy";
import { openLocalDb } from "./local-db";

const platform = mobilePlatform.parse(process.argv[2]);
const minimum = process.argv[3] === "off" ? null : appVersion.parse(process.argv[3]);
const { db, dispose } = await openLocalDb();
try {
  if (minimum === null) {
    await db.delete(appUpdatePolicy).where(eq(appUpdatePolicy.platform, platform));
  } else {
    await db
      .insert(appUpdatePolicy)
      .values({ platform, minimumVersion: minimum })
      .onConflictDoUpdate({ target: appUpdatePolicy.platform, set: { minimumVersion: minimum } });
  }
} finally {
  await dispose();
}
