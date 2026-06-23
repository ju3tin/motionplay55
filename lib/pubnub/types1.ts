export type GameMessage =
  | {
      type: "chat";
      userId: string;
      text: string;
    }
  | {
      type: "input";
      payload: {
        x: number;
        y: number;
      };
    }
  | {
      type: "pong:state";
      payload: {
        ball: {
          x: number;
          y: number;
          vx: number;
          vy: number;
        };
        left: number;
        right: number;
        scoreL: number;
        scoreR: number;
      };
    }
  | {
      type: "join";
      userId: string;
    }
  | {
      type: "leave";
      userId: string;
    };
