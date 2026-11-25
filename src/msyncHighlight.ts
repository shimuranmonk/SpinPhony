type CueLine = { timeMs: number; command: string; reference: string; line: number };

export function indexMsync(source: string) {
  const definitions = new Map<string, number>();
  const cues: CueLine[] = [];
  source.split(/\r?\n/).forEach((line, index) => {
    const definition = /^\[(INLINE|FLAVOR):([^\]]+)\]$/.exec(line);
    if (definition) {
      definitions.set(definition[1] + ":" + definition[2], index);
      return;
    }
    const cue = /^(\d+):([0-5]\d)\.(\d{3})\s+(INLINE|FLAVOR|IDLE|STOP)(?:=([^;\s]+)(?:;ONCE)?)?$/.exec(line);
    if (cue) cues.push({
      timeMs: (Number(cue[1]) * 60 + Number(cue[2])) * 1000 + Number(cue[3]),
      command: cue[4], reference: cue[5] ?? "", line: index,
    });
  });
  return { definitions, cues };
}

export function msyncHighlight(index: ReturnType<typeof indexMsync>, timeMs?: number, command?: string) {
  if (timeMs === undefined) return {};
  const cue = command
    ? index.cues.find(item => item.timeMs === timeMs && item.command === command)
    : index.cues.filter(item => item.timeMs <= timeMs).at(-1);
  const definition = cue?.reference ? index.definitions.get(cue.command + ":" + cue.reference) : undefined;
  return { cue: cue?.line, definition };
}
