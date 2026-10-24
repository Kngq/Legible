// "Your ballot, wrapped" is development only until its visual design is approved
// (.kiro/specs/ballot-wrapped, W11). Production keeps For you, the routes, and
// storage exactly as before: no invite, no #/wrapped, no ?demo=true.
export const WRAPPED_ENABLED = process.env.NODE_ENV === "development";
