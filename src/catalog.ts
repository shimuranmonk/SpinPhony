const manual = "https://device.report/m/5844640969b9ba563c817978f1836deee83beee7bd85481c94e34c2dbfffc368.pdf";
const hodges = "https://www.tabletenniscoaching.com/node/18";
const footwork = "https://www.tabletenniscoaching.com/blog?page=57";
const coachingVideo = "https://www.youtube.com/watch?v=1Nv8ZFfiDFo";

const feeds = {
  WB: { drop: -6, spin: "top", depth: "long" },
  B: { drop: -4, spin: "top", depth: "long" },
  M: { drop: 0, spin: "top", depth: "long" },
  F: { drop: 4, spin: "top", depth: "long" },
  WF: { drop: 6, spin: "top", depth: "long" },
  Bs: { drop: -4, spin: "back", depth: "short" },
  Fs: { drop: 4, spin: "back", depth: "short" },
  Bu: { drop: -4, spin: "back", depth: "long" },
  Mu: { drop: 0, spin: "back", depth: "long" },
  Fu: { drop: 4, spin: "back", depth: "long" },
} as const;

type Feed = typeof feeds[keyof typeof feeds];
type FeedCode = keyof typeof feeds;
type ManualRow = [id: string, name: string, page: number, sequence: FeedCode[], random?: boolean];

export type Drill = {
  id: string;
  name: string;
  category: "Nova S Pro manual" | "Coaching drill";
  description: string;
  source: string;
  balls: Feed[];
  random: boolean;
};

const manualRows: ManualRow[] = [
  ["FOREHAND","Forehand drive",16,["F"]],
  ["ALTERNATE","Forehand and backhand drive",18,["F","B"]],
  ["BACKHAND","Backhand drive",16,["B"]],
  ["PUSH_F","Forehand push",15,["Fs"]],
  ["PUSH_B","Backhand push",15,["Bs"]],
  ["LOOP_F","Forehand loop against backspin",16,["Fu"]],
  ["LOOP_B","Backhand loop against backspin",17,["Bu"]],
  ["LF_DB","Forehand loop → backhand drive",17,["Fu","B"]],
  ["LF_DF","Forehand loop → forehand drive",17,["Fu","F"]],
  ["PF_DF","Forehand push → forehand drive from middle",18,["Fs","M"]],
  ["PB_LF","Backhand push → forehand loop",18,["Bs","Fu"]],
  ["PF_LB","Forehand push → backhand loop",19,["Fs","Bu"]],
  ["DF_DF","Two-point forehand drive",19,["F","M"]],
  ["PB_LB","Backhand push → backhand loop",20,["Bs","Bu"]],
  ["PF_LF","Forehand push → forehand loop",20,["Fs","Fu"]],
  ["LF_LF","Two-point forehand loop",20,["Fu","Mu"]],
  ["LB_DF","Backhand loop → forehand drive",21,["Bu","F"]],
  ["LB_DB_DF","Backhand loop → backhand drive → forehand drive",21,["Bu","B","F"]],
  ["PF_LF_DB","Forehand push → forehand loop → backhand drive",21,["Fs","Fu","B"]],
  ["PB_LF_DF","Backhand push → forehand loop → forehand drive",21,["Bs","Fu","F"]],
  ["PB_LB_DF","Backhand push → backhand loop → forehand drive",22,["Bs","Bu","F"]],
  ["DB_DF_DF","Backhand drive → two forehand drives",22,["B","F","F"]],
  ["LONG_PF_LF_DF","Long forehand push → forehand loop → forehand drive",22,["Fu","Fu","F"]],
  ["RANDOM_DRIVE","Random topspin across the table",22,["WB","B","M","F","WF"],true],
  ["RANDOM_TWO_THIRDS","Random topspin on the forehand two-thirds",23,["M","F","WF"],true],
  ["LF_DB_DF","Forehand loop → backhand drive → forehand drive",23,["Fu","B","F"]],
  ["PF_LF_DF","Short forehand push → forehand loop → forehand drive",23,["Fs","Fu","F"]],
  ["PB_LB_DB","Backhand push → backhand loop → backhand drive",24,["Bs","Bu","B"]],
  ["PF_LB_DB","Forehand push → backhand loop → backhand drive",24,["Fs","Bu","B"]],
  ["ALL_RANDOM","Random short backspin and long topspin",24,["Bs","Fs","B","M","F"],true],
  ["PB_LF_DB","Backhand push → forehand loop → backhand drive",25,["Bs","Fu","B"]],
  ["PF_LB_DF","Forehand push → backhand loop → forehand drive",25,["Fs","Bu","F"]],
  ["LF_DF_DB","Forehand loop → forehand drive → backhand drive",25,["Fu","F","B"]],
  ["LB_DF_DB","Backhand loop → forehand drive → backhand drive",26,["Bu","F","B"]],
  ["DF_THREE","Three-point forehand drive",26,["F","M","B"]],
  ["TWO_TWO","Two forehands → two backhands",30,["F","F","B","B"]],
  ["PF_DB_DB","Forehand push → two backhand drives",40,["Fs","B","B"]],
];

function describeFeed(ball: Feed) {
  const side = ball.drop < 0 ? "backhand" : ball.drop > 0 ? "forehand" : "middle";
  return [ball.depth, ball.spin === "back" ? "backspin" : "topspin", "to " + side].join(" ");
}

const manualDrills: Drill[] = manualRows.map(([id, name, page, sequence, random = false]) => {
  const balls = sequence.map(code => feeds[code]);
  return {
    id: "INL_" + id,
    name,
    category: "Nova S Pro manual",
    description: (random ? "Randomly mix " : "") + balls.map(describeFeed).join(random ? ", " : " → ") + ".",
    source: manual + "#page=" + page,
    balls,
    random,
  };
});

function coaching(id: string, name: string, description: string, source: string, sequence: FeedCode[], random = false): Drill {
  return { id: "INL_" + id, name, description, source, category: "Coaching drill", balls: sequence.map(code => feeds[code]), random };
}

const coachingDrills = [
  coaching("FALKENBERG", "Falkenberg", "Backhand, step-around forehand from the backhand corner, then wide forehand.", "https://www.tabletenniscoaching.com/node/1183", ["B", "B", "WF"]),
  coaching("COACH_BH_MOVE", "Two-point backhand footwork", "Use backhands at the wide backhand and near the middle.", footwork, ["WB", "M"]),
  coaching("COACH_SIDE_MOVE", "Side-to-side forehand footwork", "Use forehands across a wider span as your footwork improves.", hodges, ["M", "WF"]),
  coaching("COACH_RANDOM_WINGS", "Random forehand or backhand", "Read the feed and choose the stroke after the ball is sent.", hodges, ["B", "F"], true),
  coaching("COACH_MIDDLE_CORNERS", "Middle and corners", "Recover through the middle between alternating corners.", coachingVideo + "&t=768", ["M", "B", "M", "F"]),
];

export const starterDrills = [manualDrills[0], manualDrills[1], coachingDrills[0]];
export const drills = [...manualDrills, ...coachingDrills];
