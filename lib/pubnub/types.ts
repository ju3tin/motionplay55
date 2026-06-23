export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

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
      payload: JsonValue;
    }
  | {
      type: "state";
      payload: JsonValue;
    };
