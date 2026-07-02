let mode: "dev" | "prod" = process.env.NODE_ENV === "production" ? "prod" : "dev";

export function getLsMode() {
  return mode;
}

export function setLsMode(newMode: "dev" | "prod") {
  mode = newMode;
}
