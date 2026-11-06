import { sql } from "drizzle-orm";
import { battleTeam, userCard } from "@wiki-collection/db/schema/index";
export function notInTeam() {
  return sql`not exists (select 1 from ${battleTeam} where ${battleTeam.member1} = ${userCard.id} or ${battleTeam.member2} = ${userCard.id} or ${battleTeam.member3} = ${userCard.id})`;
}
