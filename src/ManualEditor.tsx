import { useEffect, useRef, useState } from "react";
import { drills } from "./catalog.js";
import { timestamp } from "./generator.js";
import { ballFields, blockKinds, exportManualScore, initialBall, loadDrill } from "./manualScore.js";
import type { BallField, Block, BlockKind } from "./manualScore.js";
import type { Track } from "./rhythm.js";

type Props = {
  file: File; track: Track; left: boolean;
  blocks: Block[]; onChange: (blocks: Block[]) => void; onDownload: (source: string) => void;
};

const fieldNames: Record<BallField, string> = {
  SPEED: "Speed", SPIN: "Spin", HEIGHT: "Height", DROP: "Placement",
  BPM: "Balls/min", REPS: "Deliveries", SCATTER: "Scatter",
};

export function ManualEditor({ file, track, left, blocks, onChange, onDownload }: Props) {
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<BlockKind>("Drill");
  const [selected, setSelected] = useState<number>();
  const [playhead, setPlayhead] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  const block = blocks.find(item => item.id === selected);
  const sorted = [...blocks].sort((a, b) => a.timeMs - b.timeMs);
  const currentMarker = track.markers.reduce((current, marker, index) => marker.timeMs <= playhead ? index : current, -1);
  const currentBlock = sorted.filter(item => item.timeMs <= playhead).at(-1);
  let source = "";
  let issue = "";
  try { source = exportManualScore(track, blocks); }
  catch (error) { issue = error instanceof Error ? error.message : String(error); }

  function add(type: BlockKind, timeMs: number) {
    const id = Math.max(0, ...blocks.map(item => item.id)) + 1;
    const preset = type === "Drill" ? loadDrill(drills[0], left)
      : { name: "Custom drill", balls: [{ ...initialBall }], random: false };
    const seconds = Math.min(5, Math.max(.001, (track.durationMs - timeMs) / 1000));
    onChange([...blocks, { id, timeMs, kind: type, note: "", ...preset, seconds,
      once: false, flavorField: "BPM", flavorValue: 35 }]);
    setSelected(id);
  }

  function update(patch: Partial<Block>) {
    onChange(blocks.map(item => item.id === selected ? { ...item, ...patch } : item));
  }

  function seek(timeMs: number) {
    if (audio.current) audio.current.currentTime = timeMs / 1000;
    setPlayhead(timeMs);
  }

  return <section className="manual-editor">
    <h2>Complete Customization</h2>
    <audio ref={audio} src={url} controls onTimeUpdate={event => setPlayhead(Math.round(event.currentTarget.currentTime * 1000))} />
    <div className="block-tray" aria-label="Available blocks">
      {blockKinds.map(type => <button type="button" key={type} draggable aria-pressed={kind === type}
        onDragStart={event => event.dataTransfer.setData("application/x-spinphony-block", type)}
        onClick={() => setKind(type)}>{type}</button>)}
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
            {sorted.filter(item => item.timeMs === marker.timeMs).map(item =>
              <button type="button" key={item.id} onClick={() => setSelected(item.id)}>{item.kind}</button>)}
          </li>)}
      </ul></div>
      <div><h3>Your blocks</h3><ul className="event-list">
        {sorted.map(item => <li key={item.id} aria-current={currentBlock?.id === item.id ? "step" : undefined}>
          <button type="button" className="manual-link" onClick={() => seek(item.timeMs)}>{timestamp(item.timeMs)}</button>
          <button type="button" aria-pressed={item.id === selected} onClick={() => setSelected(item.id)}>
            {item.kind === "Drill" || item.kind === "Custom Drill" ? item.name : item.kind}
            {item.kind === "Rest" || item.kind === "Idle" ? " · " + item.seconds + "s" : ""}
          </button>
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
        {(block.kind === "Idle" || block.kind === "Rest") && <label>Duration (seconds)
          <input type="number" min=".001" step=".001" max={600} value={Number.isFinite(block.seconds) ? block.seconds : ""}
            onChange={event => update({ seconds: event.target.valueAsNumber })} /></label>}
      </div>
      {block.kind === "Idle" && <p className="hint">Feeding stays off until another drill starts. Duration reserves space on the timeline.</p>}
      {block.kind === "Rest" && <p className="hint">REST temporarily pauses the active drill. Resumption follows the MSYNC player.</p>}
      {block.kind === "Flavor" && <div className="fields">
        <label>Parameter<select value={block.flavorField} onChange={event => {
          const field = event.target.value as Block["flavorField"];
          update({ flavorField: field, flavorValue: initialBall[field] });
        }}>
          {Object.entries(fieldNames).filter(([key]) => key !== "SCATTER").map(([key, label]) =>
            <option key={key} value={key}>{label}</option>)}
          <option value="TYPE">Spin type</option>
        </select></label>
        {block.flavorField === "TYPE" ? <label>Spin type<select value={block.flavorValue} onChange={event =>
          update({ flavorValue: event.target.value as "top" | "back" })}><option>top</option><option>back</option></select></label>
          : <label>Value<input type="number" value={Number.isFinite(block.flavorValue) ? block.flavorValue : ""}
            min={ballFields[block.flavorField][0]} max={ballFields[block.flavorField][1]} step={ballFields[block.flavorField][2]}
            onChange={event => update({ flavorValue: event.target.valueAsNumber })} /></label>}
      </div>}
      {(block.kind === "Drill" || block.kind === "Custom Drill") && <>
        {block.kind === "Drill" && <label>Load library drill<select value="" onChange={event => {
          const drill = drills.find(item => item.id === event.target.value);
          if (drill) update(loadDrill(drill, left));
        }}><option value="">Choose a drill</option>
          {drills.map(drill => <option value={drill.id} key={drill.id}>{drill.name}</option>)}
        </select></label>}
        <div className="fields">
          <label>Drill name<input value={block.name} onChange={event => update({ name: event.target.value })} /></label>
          <label>Feed intensity<select value="" onChange={event => {
            const bpm = Number(event.target.value);
            if (bpm) update({ balls: block.balls.map(ball => ({ ...ball, BPM: bpm })) });
          }}><option value="">Choose a feed preset</option><option value="35">Light · 35 balls/min</option>
            <option value="45">Moderate · 45 balls/min</option><option value="60">Challenging · 60 balls/min</option></select></label>
          <label><input type="checkbox" checked={block.once} onChange={event => update({ once: event.target.checked })} />Play one cycle</label>
          <label><input type="checkbox" checked={block.random} onChange={event => update({ random: event.target.checked })} />Random order</label>
        </div>
        {block.balls.map((ball, index) => <details key={index}>
          <summary>Ball {index + 1}</summary>
          <div className="manual-ball">
            {(Object.keys(ballFields) as BallField[]).map(key => {
              const [min, max, step] = ballFields[key];
              return <label key={key}>{fieldNames[key]}<input type="number" min={min} max={max} step={step}
                value={Number.isFinite(ball[key]) ? ball[key] : ""}
                onChange={event => update({ balls: block.balls.map((item, i) =>
                  i === index ? { ...item, [key]: event.target.valueAsNumber } : item) })} /></label>;
            })}
            <label>Spin type<select value={ball.TYPE} onChange={event => update({ balls: block.balls.map((item, i) =>
              i === index ? { ...item, TYPE: event.target.value as "top" | "back" } : item) })}>
              <option value="top">Topspin</option><option value="back">Backspin</option>
            </select></label>
          </div>
          <button type="button" disabled={block.balls.length === 1}
            onClick={() => update({ balls: block.balls.filter((_, i) => i !== index) })}>Remove ball</button>
        </details>)}
        <button type="button" onClick={() => update({ balls: [...block.balls, { ...initialBall }] })}>Add ball</button>
      </>}
      <button type="button" onClick={() => {
        onChange(blocks.filter(item => item.id !== selected));
        setSelected(undefined);
      }}>Remove block</button>
    </fieldset>}
    {issue && <p role="status">{issue}</p>}
    <button type="button" disabled={!source} onClick={() => onDownload(source)}>Download MSYNC</button>
  </section>;
}
