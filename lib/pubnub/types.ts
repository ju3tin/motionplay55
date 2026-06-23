export type GameMessage =
  | {
      type: "join";
      userId: string;
    }
  | {
      type: "leave";
      userId: string;
    }
  | {
      type: "chat";
      userId: string;
      text: string;
    }
  | {
      type: "input";
      payload: {
        y: number;
        side?: "left" | "right";
      };
    }
  | {
      type: "state";
      payload: {
        ball: { x: number; y: number; vx: number; vy: number };
        left: number;
        right: number;
        scoreL: number;
        scoreR: number;
      };
    };
