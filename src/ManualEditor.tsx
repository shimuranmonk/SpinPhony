import { useEffect, useMemo, useRef, useState } from "react";
import { timestamp } from "./generator.js";
import { nativeDrills } from "./nativeDrills.js";
import { ballFields, blockKinds, blockLabel, blockOrder, compileManualScore, drillName, flavorFields, initialBall, loadBuiltInBalls, maxBalls, sessionFields } from "./manualScore.js";
import { validateMsyncSource } from "./msync-v1/validator.js";
import { CueMap } from "./CueMap.js";
import { MusicMap } from "./MusicMap.js";
import { musicGuidance } from "./musicGuidance.js";
import { MsyncTextPreview } from "./MsyncTextPreview.js";
import type { Ball, BallField, Block, BlockKind, SessionField, SessionSettings } from "./manualScore.js";
import type { Track } from "./rhythm.js";

type Props = {
  file: File; track: Track;
  blocks: Block[]; onChange: (blocks: Block[]) => void; onDownload: (source: string) => void;
  session: SessionSettings; onSessionChange: (session: SessionSettings) => void;
  onSaveCustom: (name: string, balls: Ball[], random: boolean) => string;
};

function showCurrentRow(list: HTMLUListElement | null) {
  const row = list?.querySelector('[aria-current="step"]');
  if (!list || !row) return;
  const bounds = list.getBoundingClientRect();
  const item = row.getBoundingClientRect();
  if (item.top < bounds.top) list.scrollTop += item.top - bounds.top;
  else if (item.bottom > bounds.bottom) list.scrollTop += item.bottom - bounds.bottom;
}

export function ManualEditor({ file, track, blocks, onChange, onDownload, session, onSessionChange, onSaveCustom }: Props) {
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<BlockKind>("CDRILL");
  const [selected, setSelected] = useState<number>();
  const [playhead, setPlayhead] = useState(0);
  const [editNotice, setEditNotice] = useState("");
  const [saveDraft, setSaveDraft] = useState<{ id: number; name: string; status: string }>();
  const [ballSelection, setBallSelection] = useState<{ blockId: number; index: number }>();
  const [validation, setValidation] = useState<{ key: string; errors: string[]; warnings: string[] }>();
  const audio = useRef<HTMLAudioElement>(null);
  const markersList = useRef<HTMLUListElement>(null);
  const blocksList = useRef<HTMLUListElement>(null);
  const [cueJump, setCueJump] = useState(0);
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  const block = blocks.find(item => item.id === selected);
  const sorted = [...blocks].sort((a, b) => a.timeMs - b.timeMs || blockOrder[a.kind] - blockOrder[b.kind]);
  const [showBeats, setShowBeats] = useState(false);
  const markers = useMemo(() => musicGuidance(track, showBeats), [track, showBeats]);
  const currentMarker = markers.reduce((current, marker, index) => marker.timeMs <= playhead ? index : current, -1);
  const latest = sorted.filter(item => item.timeMs <= playhead).at(-1);
  const currentBlock = latest && block?.timeMs === latest.timeMs ? block : latest;
  const { source, issues } = compileManualScore(track, blocks, session);
  const validationKey = JSON.stringify([source, issues]);
  const currentValidation = validation?.key === validationKey ? validation : undefined;
  const ballIndex = block && ballSelection?.blockId === block.id
    ? Math.min(ballSelection.index, block.balls.length - 1) : 0;

  function validate() {
    const result = validateMsyncSource(source, {
      track: { filename: track.filename, duration: track.durationMs / 1000, metadata: { sha256: track.sha256 } },
    });
    const describe = (issue: { line: number | null; code: string; message: string }) =>
      (issue.line === null ? "" : "Line " + issue.line + " · ") + issue.message + " (" + issue.code + ")";
    setValidation({ key: validationKey, errors: [...issues, ...result.errors.map(describe)], warnings: result.warnings.map(describe) });
  }

  useEffect(() => { showCurrentRow(markersList.current); }, [currentMarker, cueJump]);
  useEffect(() => { showCurrentRow(blocksList.current); }, [currentBlock?.id, cueJump]);

  function drillTimeTaken(type: BlockKind, timeMs: number, except?: number) {
    return type === "CDRILL" && blocks.some(item => item.id !== except && item.kind === "CDRILL" && item.timeMs === timeMs);
  }

  function add(type: BlockKind, timeMs: number) {
    if (drillTimeTaken(type, timeMs)) {
      setEditNotice("Only one drill can occupy " + timestamp(timeMs) + ". Remove or move the existing drill first.");
      return;
    }
    setEditNotice("");
    const id = Math.max(0, ...blocks.map(item => item.id)) + 1;
    const seconds = Math.min(5, Math.max(.001, (track.durationMs - timeMs) / 1000));
    const name = "";
    onChange([...blocks, { id, timeMs, kind: type, note: "", name, balls: [{ ...initialBall }],
      seconds, once: false, random: false,
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
    if (ballSelection?.blockId === id) setBallSelection(undefined);
    if (saveDraft?.id === id) setSaveDraft(undefined);
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

  function clear() {
    onChange([]);
    setSelected(undefined);
    setBallSelection(undefined);
    setValidation(undefined);
    setEditNotice("");
    setSaveDraft(undefined);
  }

  function seek(timeMs: number) {
    if (audio.current) audio.current.currentTime = timeMs / 1000;
    setPlayhead(timeMs);
  }

  const stopTime = sorted.find(item => item.kind === "STOP" && Number.isFinite(item.timeMs))?.timeMs ?? track.durationMs;
  const scheduled = sorted.filter(item => Number.isFinite(item.timeMs) && item.timeMs >= 0
    && item.timeMs <= Math.min(stopTime, track.durationMs));
  const mapEntries = scheduled.map(item => ({
    id: item.id, timeMs: item.timeMs, kind: item.kind, label: blockLabel(item),
    durationMs: item.kind === "CDRILL" && item.once ? item.balls.reduce((total, ball) =>
      total + (ball.BPM > 0 ? ball.REPS * 60000 / ball.BPM : 0), 0) : undefined,
  }));

  return <section className="manual-editor">
    <h2>MSYNC Editor</h2>
    <div className="manual-transport">
      <audio ref={audio} src={url} controls aria-label="Track audio"
        onTimeUpdate={event => setPlayhead(Math.round(event.currentTarget.currentTime * 1000))} />
      <MusicMap markers={markers} durationMs={track.durationMs} playhead={playhead}
        showBeats={showBeats} onToggleBeats={setShowBeats} onSeek={timeMs => {
          seek(timeMs); setCueJump(value => value + 1);
        }} />
      <CueMap entries={mapEntries} durationMs={track.durationMs} playhead={playhead} onSeek={item => {
        seek(item.timeMs); setSelected(item.id); setCueJump(value => value + 1);
      }} />
      <div className="manual-actions">
        <div className="manual-add-clear">
          <button type="button" onClick={() => add(kind, playhead)}>Add {kind} at {timestamp(playhead)}</button>
          <button type="button" disabled={!blocks.length} onClick={clear}>CLEAR</button>
        </div>
        <div className="block-tray" aria-label="Available blocks">
          {blockKinds.map(type => <button type="button" key={type} data-block={type} draggable aria-pressed={kind === type}
            onDragStart={event => event.dataTransfer.setData("application/x-spinphony-block", type)}
            onClick={() => setKind(type)}>{type === "CDRILL" ? type + "S" : type}</button>)}
        </div>
      </div>
      <p className="hint manual-instruction">Drag a block to a marker, or select a block type and use Add. Click a placed block to edit it.</p>
      {editNotice && <p className="manual-notice" role="status">{editNotice}</p>}
    </div>
    <div className="manual-panels">
      <div><h3>Music markers</h3><ul className="event-list" ref={markersList} aria-label="Music markers">
        {markers.map((marker, i) =>
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
            <span className="marker-labels">{marker.labels.map(label =>
              <span key={label.text} data-music={label.kind}>{label.text}</span>)}</span>
            <button type="button" className="manual-link" onClick={() => add(kind, marker.timeMs)}
              aria-label={"Add " + kind + " at " + timestamp(marker.timeMs)}>Add</button>
            {sorted.filter(item => item.timeMs === marker.timeMs).map(placedBlock)}
          </li>)}
      </ul></div>
      <div><h3>Your blocks</h3><ul className="event-list" ref={blocksList} aria-label="Your blocks">
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
          <label>NAME<input value={block.name} placeholder={drillName(block)} onChange={event => update({ name: event.target.value })} /></label>
          <label>RANDOM<select value={String(block.random)} onChange={event => update({ random: event.target.value === "true" })}>
            <option>false</option><option>true</option>
          </select></label>
        </div>
        {block.balls.map((ball, index) => <details key={index}>
          <summary onClick={() => setBallSelection({ blockId: block.id, index })}>BALL {index + 1}</summary>
          <label>Load built-in drill starting at BALL {index + 1}
            <select aria-label={"Load built-in drill starting at BALL " + (index + 1)} value="" onChange={event => {
              if (!event.target.value) return;
              const [key, level] = event.target.value.split(":");
              try {
                const loaded = loadBuiltInBalls(block.balls, index, key, Number(level));
                const inheritedName = index === 0 || !block.inheritedName
                  ? nativeDrills.find(drill => drill.key === key)?.name : block.inheritedName;
                update({ balls: loaded, inheritedName });
                setBallSelection({ blockId: block.id, index });
              } catch (error) {
                setEditNotice(error instanceof Error ? error.message : String(error));
              }
            }}>
              <option value="">Choose a drill and level</option>
              {nativeDrills.map(drill => <optgroup key={drill.key} label={drill.name}>
                {drill.levels.map((_, level) => <option key={level} value={drill.key + ":" + (level + 1)}>
                  {drill.name} · Level {level + 1}
                </option>)}
              </optgroup>)}
            </select>
          </label>
          <div className="manual-ball">
            {(Object.keys(ballFields) as BallField[]).map(key => {
              const [min, max, step] = ballFields[key];
              return <label key={key}>{key}<input type="number" min={min} max={max} step={step}
                value={Number.isFinite(ball[key]) ? ball[key] : ""}
                onChange={event => update({ balls: block.balls.map((item, i) =>
                  i === index ? { ...item, [key]: event.target.valueAsNumber } : item) })} /></label>;
            })}
          </div>
          <div className="manual-type-row">
            <label>TYPE<select value={ball.TYPE} onChange={event => update({ balls: block.balls.map((item, i) =>
              i === index ? { ...item, TYPE: event.target.value as "top" | "back" } : item) })}>
              <option value="top">Topspin</option><option value="back">Backspin</option>
            </select></label>
            <label className="once-control">
              <input type="checkbox" checked={block.once} onChange={event => update({ once: event.target.checked })} />Play one cycle
            </label>
          </div>
        </details>)}
        <div className="manual-ball-actions">
          <button type="button" disabled={block.balls.length === 1}
            aria-label={"Remove ball " + (ballIndex + 1)}
            onClick={() => update({ balls: block.balls.filter((_, i) => i !== ballIndex) })}>Remove ball {ballIndex + 1}</button>
          <button type="button" disabled={block.balls.length >= maxBalls}
            onClick={() => update({ balls: [...block.balls, { ...initialBall }] })}>Add Ball</button>
          <button type="button" onClick={() => remove(block.id)}>Remove block</button>
        </div>
        <details>
          <summary>Save as Custom</summary>
          <div className="manual-ball-actions">
            <label>Custom drill name<input value={saveDraft?.id === block.id ? saveDraft.name : ""}
              onChange={event => setSaveDraft({ id: block.id, name: event.target.value, status: "" })} /></label>
            <button type="button" onClick={() => {
              const name = saveDraft?.id === block.id ? saveDraft.name : "";
              setSaveDraft({ id: block.id, name, status: onSaveCustom(name, block.balls, block.random) });
            }}>Save as Custom</button>
          </div>
          {saveDraft?.id === block.id && saveDraft.status && <p role="status">{saveDraft.status}</p>}
        </details>
      </>}
      {block.kind !== "CDRILL" && <button type="button" onClick={() => remove(block.id)}>Remove block</button>}
    </fieldset>}
    <fieldset>
      <legend>SESSION</legend>
      <div className="session-row">
        {(Object.keys(sessionFields) as SessionField[]).map(key => {
          const { label, max, step } = sessionFields[key];
          return <label key={key}>{label} (s)
            <input type="number" min={0} max={max} step={step} value={session[key]}
              onChange={event => onSessionChange({ ...session, [key]: event.target.value })} />
          </label>;
        })}
      </div>
    </fieldset>
    <MsyncTextPreview source={source} timeMs={block?.timeMs} command={block?.kind === "CDRILL" ? "INLINE" : block?.kind} />
    {issues.length > 0 && <ul className="manual-issues" role="status">{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>}
    <div className="manual-ball-actions">
      <button type="button" onClick={validate}>VALIDATE</button>
      <button type="button" disabled={issues.length > 0 || Boolean(currentValidation?.errors.length)}
        onClick={() => onDownload(source)}>Download MSYNC</button>
    </div>
    {currentValidation && <div role="status" className="manual-validation">
      <strong>{currentValidation.errors.length ? "MSYNC validation failed." : "MSYNC validation passed."}</strong>
      {currentValidation.errors.length > 0 && <ul className="manual-issues">
        {currentValidation.errors.map((issue, i) => <li key={i}>{issue}</li>)}
      </ul>}
      {currentValidation.warnings.length > 0 && <ul>
        {currentValidation.warnings.map((issue, i) => <li key={i}>Warning: {issue}</li>)}
      </ul>}
    </div>}
  </section>;
}
