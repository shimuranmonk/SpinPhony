import { useEffect, useRef, useState } from "react";
import { timestamp } from "./generator.js";
import { nativeDrills } from "./nativeDrills.js";
import { ballFields, blockKinds, blockLabel, blockOrder, compileManualScore, flavorFields, initialBall, maxBalls } from "./manualScore.js";
import type { BallField, Block, BlockKind } from "./manualScore.js";
import type { Track } from "./rhythm.js";

type Props = {
  file: File; track: Track;
  blocks: Block[]; onChange: (blocks: Block[]) => void; onDownload: (source: string) => void;
};


const isDrill = (kind: BlockKind) => kind === "NDRILL" || kind === "CDRILL";

export function ManualEditor({ file, track, blocks, onChange, onDownload }: Props) {
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<BlockKind>("NDRILL");
  const [selected, setSelected] = useState<number>();
  const [playhead, setPlayhead] = useState(0);
  const [editNotice, setEditNotice] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  const block = blocks.find(item => item.id === selected);
  const nativeDrill = block?.kind === "NDRILL" ? nativeDrills.find(drill => drill.key === block.builtinKey) : undefined;
  const sorted = [...blocks].sort((a, b) => a.timeMs - b.timeMs || blockOrder[a.kind] - blockOrder[b.kind]);
  const currentMarker = track.markers.reduce((current, marker, index) => marker.timeMs <= playhead ? index : current, -1);
  const currentBlock = sorted.filter(item => item.timeMs <= playhead).at(-1);
  const { source, issues } = compileManualScore(track, blocks);

  function drillTimeTaken(type: BlockKind, timeMs: number, except?: number) {
    return isDrill(type) && blocks.some(item => item.id !== except && isDrill(item.kind) && item.timeMs === timeMs);
  }

  function add(type: BlockKind, timeMs: number) {
    if (drillTimeTaken(type, timeMs)) {
      setEditNotice("Only one drill can occupy " + timestamp(timeMs) + ". Remove or move the existing drill first.");
      return;
    }
    setEditNotice("");
    const id = Math.max(0, ...blocks.map(item => item.id)) + 1;
    const seconds = Math.min(5, Math.max(.001, (track.durationMs - timeMs) / 1000));
    const name = type === "CDRILL" ? "Custom drill" : "";
    onChange([...blocks, { id, timeMs, kind: type, note: "", name, balls: [{ ...initialBall }],
      seconds, once: false, random: false, reference: "", level: 1,
      flavor: { SPEED: 3.5, BPM: 65, SPIN: 2.5, HEIGHT: 38 } }]);
    setSelected(id);
  }

  function update(patch: Partial<Block>) {
    if (block && patch.timeMs !== undefined && drillTimeTaken(block.kind, patch.timeMs, block.id)) {
      setEditNotice("Only one drill can occupy " + timestamp(patch.timeMs) + ". Choose another time.");
      return;
    }
    setEditNotice("");
    onChange(blocks.map(item => item.id === selected ? { ...item, ...patch } : item));
  }

  function remove(id: number) {
    onChange(blocks.filter(item => item.id !== id));
    if (selected === id) setSelected(undefined);
    setEditNotice("");
  }

  function placedBlock(item: Block) {
    const label = blockLabel(item);
    return <span className="placed-block" key={item.id} data-block={item.kind}>
      <button type="button" data-block={item.kind} aria-pressed={item.id === selected}
        onClick={() => { setSelected(item.id); setEditNotice(""); }}>{label}</button>
      <button type="button" className="remove-chip" aria-label={"Remove " + label}
        onClick={() => remove(item.id)}>×</button>
    </span>;
  }

  function seek(timeMs: number) {
    if (audio.current) audio.current.currentTime = timeMs / 1000;
    setPlayhead(timeMs);
  }

  const stopTime = sorted.find(item => item.kind === "STOP" && Number.isFinite(item.timeMs))?.timeMs ?? track.durationMs;
  const scheduled = sorted.filter(item => Number.isFinite(item.timeMs) && item.timeMs >= 0
    && item.timeMs <= Math.min(stopTime, track.durationMs));
  const percent = (timeMs: number) => timeMs * 100 / track.durationMs;

  return <section className="manual-editor">
    <h2>Complete Customization</h2>
    <div className="manual-transport">
      <audio ref={audio} src={url} controls aria-label="Track audio"
        onTimeUpdate={event => setPlayhead(Math.round(event.currentTarget.currentTime * 1000))} />
      <div className="cue-strip" role="group" aria-label="Scheduled blocks on the audio timeline">
        {scheduled.map((item, index) => {
          const next = scheduled.slice(index + 1).find(cue => cue.kind !== "FLAVOR");
          const isMarker = item.kind === "STOP" || item.kind === "FLAVOR";
          const cycle = item.kind === "CDRILL" && item.once
            ? item.balls.reduce((total, ball) => total + (ball.BPM > 0 ? ball.REPS * 60000 / ball.BPM : 0), 0)
            : Infinity;
          const end = Math.max(item.timeMs, Math.min(next?.timeMs ?? stopTime, item.timeMs + cycle));
          const label = blockLabel(item) + " · " + timestamp(item.timeMs)
            + (isMarker ? "" : " to " + timestamp(Math.round(end))) + (item.kind === "NDRILL" && item.once ? " (actual end depends on the controller)" : "");
          return <button type="button" key={item.id} data-block={item.kind}
            className={isMarker ? "cue-pin" : "cue-span"} title={label} aria-label={label}
            style={{ left: percent(item.timeMs) + "%", width: isMarker ? undefined : percent(end - item.timeMs) + "%" }}
            onClick={() => { seek(item.timeMs); setSelected(item.id); }}>
            {!isMarker && blockLabel(item)}
          </button>;
        })}
        <span className="cue-playhead" aria-hidden="true" style={{ left: percent(playhead) + "%" }} />
      </div>
      <div className="block-tray" aria-label="Available blocks">
        {blockKinds.map(type => <button type="button" key={type} data-block={type} draggable aria-pressed={kind === type}
          onDragStart={event => event.dataTransfer.setData("application/x-spinphony-block", type)}
          onClick={() => setKind(type)}>{type === "NDRILL" || type === "CDRILL" ? type + "S" : type}</button>)}
      </div>
      {editNotice && <p className="manual-notice" role="status">{editNotice}</p>}
    </div>
    <p className="hint">Drag a block to a marker, or select a block type and use Add. Click an added block to edit it.</p>
    <button type="button" onClick={() => add(kind, playhead)}>Add {kind} at {timestamp(playhead)}</button>
    <div className="manual-panels">
      <div><h3>Music markers</h3><ul className="event-list">
        {[...track.markers, { timeMs: track.durationMs, kind: "end" }].map((marker, i) =>
          <li key={i} aria-current={i === currentMarker ? "step" : undefined}
            onDragOver={event => {
              if (event.dataTransfer.types.includes("application/x-spinphony-block")) event.preventDefault();
            }} onDrop={event => {
              const type = blockKinds.find(item => item === event.dataTransfer.getData("application/x-spinphony-block"));
              if (!type) return;
              event.preventDefault();
              add(type, marker.timeMs);
            }}>
            <button type="button" className="manual-link" onClick={() => seek(marker.timeMs)}>{timestamp(marker.timeMs)}</button>
            {" "}{marker.kind === "hit" ? "Accent" : marker.kind === "section" ? "Section" : "End"}
            <button type="button" className="manual-link" onClick={() => add(kind, marker.timeMs)}
              aria-label={"Add " + kind + " at " + timestamp(marker.timeMs)}>Add</button>
            {sorted.filter(item => item.timeMs === marker.timeMs).map(placedBlock)}
          </li>)}
      </ul></div>
      <div><h3>Your blocks</h3><ul className="event-list">
        {sorted.map(item => <li key={item.id} aria-current={currentBlock?.id === item.id ? "step" : undefined}>
          <button type="button" className="manual-link" onClick={() => seek(item.timeMs)}>{timestamp(item.timeMs)}</button>
          {placedBlock(item)}
        </li>)}
      </ul></div>
    </div>
    {block && <fieldset>
      <legend>{block.kind} settings</legend>
      <div className="fields">
        <label>Time (seconds)<input type="number" min={0} max={track.durationMs / 1000} step=".001"
          value={Number.isFinite(block.timeMs) ? block.timeMs / 1000 : ""}
          onChange={event => update({ timeMs: Math.round(event.target.valueAsNumber * 1000) })} /></label>
        <label>Cue note<input value={block.note} onChange={event => update({ note: event.target.value })} /></label>
        {block.kind === "IDLE" && <label>Duration (seconds)
          <input type="number" min=".001" step=".001" max={600} value={Number.isFinite(block.seconds) ? block.seconds : ""}
            onChange={event => update({ seconds: event.target.valueAsNumber })} /></label>}
      </div>
      {block.kind === "IDLE" && <p className="hint">Feeding stays off until another drill starts. Duration reserves space on the timeline.</p>}
      {block.kind === "NDRILL" && <><div className="fields">
        <label>Built-in drill<select value={block.builtinKey ?? ""} onChange={event => {
          const drill = nativeDrills.find(item => item.key === event.target.value);
          const previousName = nativeDrill?.key.replace(/[^a-z0-9]+/gi, "_").replace(/_+$/, "");
          const defaultName = drill?.key.replace(/[^a-z0-9]+/gi, "_").replace(/_+$/, "");
          update({ builtinKey: drill?.key, name: !block.name || block.name === previousName ? defaultName ?? "" : block.name });
        }}>
          <option value="">Use a pasted Nova Prime ID</option>
          {nativeDrills.map(drill => <option key={drill.key} value={drill.key}>{drill.name}</option>)}
        </select></label>
        <label>Drill alias<input value={block.name} onChange={event => update({ name: event.target.value })} /></label>
        {!nativeDrill && <label>Nova Prime drill ID<input value={block.reference} onChange={event => update({ reference: event.target.value })} /></label>}
        <label>LEVEL<select value={block.level} onChange={event => update({ level: Number(event.target.value) })}>
          <option>1</option><option>2</option><option>3</option>
        </select></label>
      </div>{nativeDrill ? <div className="native-ball-table" tabIndex={0} role="region" aria-label="Built-in ball parameters">
        <table>
          <caption>{nativeDrill.name} · Level {block.level} · RANDOM {String(nativeDrill.random)}</caption>
          <thead><tr>{["BALL", "SPEED", "SPIN", "TYPE", "HEIGHT", "DROP", "BPM", "REPS", "SCATTER"].map(field =>
            <th key={field} scope="col">{field}</th>)}</tr></thead>
          <tbody>{nativeDrill.levels[block.level - 1]?.map((ball, index) =>
            <tr key={index}><th scope="row">{index + 1}</th><td>{ball.speed}</td><td>{ball.spin}</td><td>{ball.type}</td>
              <td>{ball.height}</td><td>{ball.drop}</td><td>{ball.bpm}</td><td>{ball.repetitions}</td><td>{ball.scatter}</td></tr>)}</tbody>
        </table>
      </div> : <p className="hint"><strong>Ball parameters</strong> · Nova Prime looks up the ball sequence using this drill ID and level. The ID alone does not provide those values to SpinPhony.</p>}</>}
      {block.kind === "FLAVOR" && <>
        <label>Flavor name<input value={block.name} onChange={event => update({ name: event.target.value })} /></label>
        <div className="manual-ball">{flavorFields.map(key => {
          const [min, max, step] = ballFields[key];
          return <label key={key}>FLV_{key}<input type="number" min={min} max={max} step={step}
            value={Number.isFinite(block.flavor[key]) ? block.flavor[key] : ""}
            onChange={event => update({ flavor: { ...block.flavor, [key]: event.target.valueAsNumber } })} /></label>;
        })}</div>
      </>}
      {block.kind === "CDRILL" && <>
        <div className="fields">
          <label>NAME<input value={block.name} onChange={event => update({ name: event.target.value })} /></label>
          <label>RANDOM<select value={String(block.random)} onChange={event => update({ random: event.target.value === "true" })}>
            <option>false</option><option>true</option>
          </select></label>
        </div>
        {block.balls.map((ball, index) => <details key={index}>
          <summary>BALL {index + 1}</summary>
          <div className="manual-ball">
            {(Object.keys(ballFields) as BallField[]).map(key => {
              const [min, max, step] = ballFields[key];
              return <label key={key}>{key}<input type="number" min={min} max={max} step={step}
                value={Number.isFinite(ball[key]) ? ball[key] : ""}
                onChange={event => update({ balls: block.balls.map((item, i) =>
                  i === index ? { ...item, [key]: event.target.valueAsNumber } : item) })} /></label>;
            })}
            <label>TYPE<select value={ball.TYPE} onChange={event => update({ balls: block.balls.map((item, i) =>
              i === index ? { ...item, TYPE: event.target.value as "top" | "back" } : item) })}>
              <option value="top">Topspin</option><option value="back">Backspin</option>
            </select></label>
          </div>
          <button type="button" disabled={block.balls.length === 1}
            onClick={() => update({ balls: block.balls.filter((_, i) => i !== index) })}>Remove ball</button>
        </details>)}
        <button type="button" disabled={block.balls.length >= maxBalls}
          onClick={() => update({ balls: [...block.balls, { ...initialBall }] })}>Add Ball</button>
      </>}
      {(block.kind === "CDRILL" || block.kind === "NDRILL") && <label className="once-control">
        <input type="checkbox" checked={block.once} onChange={event => update({ once: event.target.checked })} />Play one cycle
      </label>}
      <button type="button" onClick={() => remove(block.id)}>Remove block</button>
    </fieldset>}
    <h3>Live MSYNC Preview</h3>
    <textarea className="live-msync" aria-label="Live MSYNC Preview" readOnly value={source} spellCheck={false} />
    {issues.length > 0 && <ul className="manual-issues" role="status">{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>}
    <button type="button" disabled={issues.length > 0} onClick={() => onDownload(source)}>Download MSYNC</button>
  </section>;
}
