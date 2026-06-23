export type GameMessage =
  | { type: "chat"; text: string; userId: string }
  | { type: "input"; x: number; y: number };
