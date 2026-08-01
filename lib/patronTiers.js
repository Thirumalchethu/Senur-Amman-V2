// Cumulative lifetime giving thresholds (INR). Adjust these anytime —
// both the admin dashboard and the public Wall of Honor read from here.
export const PATRON_TIERS = [
  { name: "Platinum Patron", min: 100000, color: "#6B7280", accent: "#E5E7EB" }, // platinum/silver-grey
  { name: "Gold Patron", min: 50000, color: "#8A6A1E", accent: "#D9AD52" },
  { name: "Silver Patron", min: 20000, color: "#5B5B5B", accent: "#C7C7C7" },
  { name: "Bronze Patron", min: 5000, color: "#7A4B26", accent: "#C08552" },
];

export function tierFor(cumulative) {
  return PATRON_TIERS.find((t) => cumulative >= t.min) || null;
}
