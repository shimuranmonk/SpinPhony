import { useState } from "react";
import { skillLimits } from "./autoDrills.js";
import type { Skill } from "./autoDrills.js";
import type { Drill } from "./catalog.js";
import { ballFields } from "./manualScore.js";
import type { Ball, BallField } from "./manualScore.js";

export function AutoBallEditor({ drills, skill, left, onEdit, onSave }: {
  drills: Drill[]; skill: Skill; left: boolean;
  onEdit: (id: string, balls: Ball[]) => void;
  onSave: (drill: Drill, name: string) => string;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const drill = drills.find(item => item.id === id) ?? drills[0];
  const balls = drill?.parameters;
  if (!drill || !balls) return null;
  const direction = left ? -1 : 1;
  function update(index: number, patch: Partial<Ball>) {
    if (!balls || !drill) return;
    onEdit(drill.id, balls.map((ball, i) => i === index ? { ...ball, ...patch } : ball));
    setStatus("");
  }
  return <section>
    <h2>Auto drill ball settings</h2>
    <label>Drill<select value={drill.id} onChange={event => {
      setId(event.target.value); setName(""); setStatus("");
    }}>{drills.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <p className="hint">Changes apply to every cue using this drill. If a cycle no longer fits, generate the timeline again to fit the edited settings.</p>
    {balls.map((ball, index) => <details key={drill.id + ":" + index}>
      <summary>BALL {index + 1}</summary>
      <div className="manual-ball">
        {(Object.keys(ballFields) as BallField[]).map(key => {
          const [min, max, step] = ballFields[key];
          const cap = key === "SPEED" ? skillLimits[skill].speed : key === "SPIN" ? skillLimits[skill].spin : max;
          const shown = key === "DROP" ? ball.DROP * direction : ball[key];
          return <label key={key}>{key}<input type="number" min={min} max={cap} step={step}
            value={Number.isFinite(shown) ? shown : ""}
            onChange={event => update(index, { [key]: event.target.valueAsNumber * (key === "DROP" ? direction : 1) })} /></label>;
        })}
        <label>TYPE<select value={ball.TYPE} onChange={event => update(index,
          { TYPE: event.target.value as Ball["TYPE"] })}><option value="top">Topspin</option><option value="back">Backspin</option></select></label>
      </div>
    </details>)}
    <div className="manual-ball-actions">
      <label>Custom drill name<input value={name} onChange={event => { setName(event.target.value); setStatus(""); }} /></label>
      <button type="button" onClick={() => setStatus(onSave(drill, name))}>Save as Custom</button>
    </div>
    {status && <p role="status">{status}</p>}
  </section>;
}
