// Demo persona for Ballot, Wrapped. Loaded only by `?demo=true`; never written to storage.
import { answerFact, emptyProfile, setTopic, type AnswerSource, type Profile } from "./profile";

const DEMO_SOURCE: AnswerSource = { kind: "persona", personaId: "wrapped-demo" };

/** True only when the query string has `demo=true`. */
export function isDemoQuery(search: string): boolean {
  return new URLSearchParams(search).get("demo") === "true";
}

/** A fixed Cambridge renter who rides transit and follows housing and transit. */
export function demoPersona(now: string = new Date().toISOString()): Profile {
  let p: Profile = { ...emptyProfile(now), townId: "cambridge", source: "persona" };
  p = answerFact(p, "rents", true, DEMO_SOURCE, now);
  p = answerFact(p, "owns", false, DEMO_SOURCE, now);
  p = answerFact(p, "rides_transit", true, DEMO_SOURCE, now);
  p = setTopic(p, "housing_costs", true, "chip", now);
  p = setTopic(p, "roads_transit", true, "chip", now);
  return p;
}
