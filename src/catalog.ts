const manual = "https://tennis2table.com/wp-content/uploads/2025/12/PONGBOT-NOVA-S-PRO-OPERATION-MANUAL.pdf#page=30";

export const drills = [
  {
    id: "INL_FOREHAND",
    name: "Forehand drive",
    category: "Nova S Pro built-in pattern",
    description: "Repeat to the forehand side.",
    source: manual,
    placements: [4],
  },
  {
    id: "INL_ALTERNATE",
    name: "Forehand and backhand drive",
    category: "Nova S Pro built-in pattern",
    description: "Alternate between the forehand and backhand sides.",
    source: manual,
    placements: [4, -4],
  },
  {
    id: "INL_FALKENBERG",
    name: "Falkenberg",
    category: "Coaching drill",
    description: "Backhand, step-around forehand, then wide forehand.",
    source: "https://www.tabletenniscoaching.com/node/1183",
    placements: [-4, -4, 6],
  },
] as const;

export type Drill = typeof drills[number];
