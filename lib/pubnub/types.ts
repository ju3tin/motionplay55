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
      payload: unknown;
    }
  | {
      type: "state";
      payload: unknown;
    };
