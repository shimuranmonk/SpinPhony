# SpinPhony Coaching Specification v1

## Authority and scope

This is the coaching contract for standalone SpinPhony generation. Normative behavior below comes from the maintainer’s consolidation request and the recoverable [Spinphony v1 decision record](chatgpt-conversation://6b01c7b9-6b10-83ec-a9bd-673c62488b14). Direct approvals available in that record cover hybrid provisional calibration, independent music and feed rates, and next-ball resumption. The remaining behavioral requirements come from the consolidation request and the accompanying decision summaries. The transcript reader returned five exchanges and no older cursor. Exact questionnaire wording, numeric preferences and any decisions absent from those sources remain unverified. The calibration table and explicit test fixtures are proposals. The [architecture](ARCHITECTURE.md) describes the existing implementation.

SP-C01 through SP-C08 define future behavior. This specification changes documentation only. The app remains standalone with local audio analysis and MSYNC v1 export. Nova Prime integration and live robot control are outside scope.

## SP-C01 · Session setup and choreography

Before generation, expose a choreography profile, intensity, progression pace, recovery preference, selection mode and player difficulty ceiling. Keep the common setup simple. Put per-drill difficulty and preset edits in drill configuration. Preserve existing source and racket-hand setup. The exact option labels, numeric mappings and defaults for controls other than profile require validation.

| Profile | Required shape |
| --- | --- |
| Progressive Build + Cooldown (default) | Build from gentle preparation through progressively related practice toward harder work, taper, then finish with recovery. |
| Interval | Alternate work blocks and genuine recovery periods, with intensity bounded by the player ceiling and continuous-work limits. |
| Steady | Maintain a comparatively even main-work intensity, with required recovery and a closing taper. |
| Follow the Music | Let eligible musical changes shape starts and transitions while retaining coaching, recovery and safety constraints. |

Intensity guides demand. Progression pace guides the rate of change between blocks. Recovery preference guides pause placement and duration within safe bounds. Every profile reserves preparation, a cooldown appropriate to the delivered load and final no-feed recovery. Changing a preference or profile cannot override a hard limit. Between blocks, progression should build on related technical or movement patterns where feasible.

## SP-C02 · Selection, difficulty and substitution

- Provide **Automatic** and **Player Selection**. Automatic chooses compatible drills. Player Selection uses the requested pool and preserves requested drill identity where feasible. A selected drill may continue across sections, subject to normal work, recovery and manual assignment constraints.
- Each drill supports **Easy, Medium, Hard and Advanced**. Evaluate technical demand (for example, spin handling and stroke/sequence complexity) and physical demand (for example, movement and feed density) independently. Present one combined difficulty and player ceiling. An easy physical profile cannot erase a technical demand that exceeds the ceiling, or vice versa. The classification rubric and tier cutoffs are calibration work.
- Reclassify edited presets using the resulting parameters and movement sequence. Automatically reduce a custom configuration that exceeds allowed player or robot limits, preserving its pattern where feasible, then validate the effective configuration again. Explain the effective tier and material adjustments. If no permissible configuration is possible, treat the drill as incompatible.
- Replace incompatible automatic candidates with compatible repertoire. When no automatic candidate fits, pause feeding and reconsider at the next suitable boundary. For an incompatible player-selected drill, prefer an eligible substitution that preserves ordered placements and movement first, then other training features where possible. Explain the substitution and its reason. If no safe substitution exists, leave the slot without feeding and explain the gap. Never silently fill it with unrelated work.
- Compatibility depends on achievable parameters, sequence support, player ceiling, available time and workload/recovery constraints. A higher difficulty need not imply faster feeding. Exact similarity weights and tie-breaking are open.

## SP-C03 · Musical cues, continuity and precedence

Separate musical detection from action scheduling. Music BPM and musical marker times inform cue placement. Coaching determines feed frequency in balls per minute. The MSYNC BALL field named `BPM` represents feed rate here. Changes in estimated music BPM alone must leave an otherwise identical block’s feed settings intact.

- **Activation** starts or changes a scheduled drill at an eligible cue. **Continuation** explains that an existing drill carries through a marker without a new activation. **Candidate** makes an unused detection visible with its reason, including a detection removed from the editable score. A hit under an assigned section may appear as a candidate while the action explanation identifies the continuing drill. Scheduled cycles and recovery should show their actual action and reason.
- An assigned section controls the drill actions and repeats in its span and supersedes per-hit assignments there. Keep interior hit markers visible. Honor valid manual sequence, timing, repeat and comment edits in the edited score and export. Hard limits, mandatory recovery and track end take precedence over requested timing or repeats. Report invalid edits and block unsafe or invalid export. Preserve the existing explicit regeneration behavior when source inputs change or Generate is invoked.
- For an ordinary transition after reaching target, seek the next suitable major section boundary in preference to a strong phrase boundary. Use a strong phrase when a suitable major boundary is unavailable within the workable span. An accent alone does not force a transition. A boundary is suitable only when phase, cycle completion, recovery, remaining time and safety allow it. With sparse or uncertain structure, maintain a feasible block and use eligible fallbacks without implying semantic verse or chorus recognition.
- Returning sections favor recognizable drills or movement patterns. Each occurrence may vary in workload, difficulty or recovery as appropriate within the player ceiling. Settings within a single sustained block stay fixed, including sequence, placement, spin, speed, height and feed frequency. Changes belong at block boundaries. A section may contain several work blocks with recovery between them. Crossing a section boundary alone need not end a selected drill block.

## SP-C04 · Workload, pauses and interruption

A coaching cycle is one complete ordered drill pattern, including its scheduled deliveries. Count planned complete cycles independently of the MSYNC `REPS` field, which counts deliveries of an individual BALL entry. Track planned or estimated deliveries and cycles. SpinPhony has no verified measure of successful returns, actual fatigue or physical completion.

| Measure | Purpose |
| --- | --- |
| Minimum cycles | Smallest meaningful dose for ordinary practice. Check that it fits before starting a regular block. |
| Target cycles | Desired dose. Once reached, normally continue to an eligible musical transition while the hard limits permit. |
| Maximum continuous workload | Hard cap on uninterrupted work, separate from total work across recovered blocks. It may require a pause before minimum or target is reached. |

Adapt planned minimum, target, maximum and recovery to drill length, difficulty, feed frequency, movement demand, recent planned workload, preferences and time available. Account for actual scheduled intervals and any internal delays. Plan a smaller feasible target or recovery when the original target and the cap conflict. Avoid ordinary transitions that cut a cycle in half. Reserve genuine bounded no-feed intervals as workload requires. Align their start/end musically when feasible, without delaying a mandatory pause or shortening required rest. A slower feed, ineffective command, or low-demand drill does not count as a pause.

If mandatory recovery interrupts a cycle, retain the completed-cycle count, partial-cycle progress, original block settings and next scheduled delivery index, including position within repeated BALL entries if relevant. After sufficient recovery, resume **from the next ball**. Credit the interrupted cycle once its remaining deliveries are completed. Do not replay the already scheduled prefix, skip the suffix, or accelerate to catch up. If track end prevents a safe resumption, keep the recovery and report incomplete work. Format or scheduler limitations must be reported and block incompatible export rather than change this rule.

## SP-C05 · Preparation, taper and short tracks

Start every session with steady, gentle preparation. Scale warmup and its possible low-demand feeding to time available and the player’s limits. Increase main-work demand only after preparation. Scale cooldown to planned preceding load and remaining time, reducing demand gradually where there is feeding and reserving final no-feed recovery. Avoid launching a new demanding block that would consume the reserved ending. Stop at the track duration.

When a full session cannot fit, use a reduced session with fewer or easier feasible blocks and preserve preparation and recovery. If no meaningful work fits, produce preparation and recovery only and explain why. Determine these cases from feasible phase and workload budgets rather than inventing universal track-length cutoffs. The simplest preparation-only plan may require no robot feeding. Validate whether it can be exported under the frozen activation requirement. If it cannot, retain the plan and explanation in Preview and identify the export limitation. Do not insert a dummy feed.

## SP-C06 · Optional feedback

Offer optional post-session feedback and keep it local. Saving or viewing feedback does not change future generation. Apply it to future settings only when the player explicitly requests application. Adapt gradually and stay within the player ceiling, robot constraints and mandatory recovery. Preserve the current plan unless the player explicitly changes or regenerates it. Exact prompts, storage schema, update increments and evidence for personalization remain open. Treat self-reported feedback as player input, distinct from sensor or execution data.

## SP-C07 · Hybrid calibration and provisional examples

Use established coaching knowledge, cautious initial estimates and later player/robot testing. Calibrate a common policy to each drill’s cycle shape, placement, movement, technical demand, frequency, work and recovery. Record provenance, assumptions, evidence status and compatible substitutes. The five categories below are reference cases, with no implication that they are factory IDs.

All numbers below were **assistant-proposed**, roughly at an Easy-to-Medium baseline. They are unverified design candidates, not player-approved thresholds, device guarantees or physically tested settings.

| Reference exercise and calibration focus | Balls/cycle | Min cycles | Target cycles | Feed (balls/min) | Continuous cap (s) | Recovery (s) |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Forehand Drive · predictable placement and warmup | 1 | 8 | 16 | 35–45 | 45–60 | 10–20 |
| Alternating FH/BH · stroke changes and cycle timing | 2 | 5 | 10 | 30–40 | 35–50 | 15–25 |
| Two-Point Footwork · movement and recovery | 2 | 4 | 8 | 30–35 | 25–40 | 20–35 |
| Falkenberg · three-ball cycle and lateral movement | 3 | 3 | 6 | 30–35 | 25–40 | 20–40 |
| Controlled Backspin · technical versus movement demand | 1 | 6 | 12 | 30–40 | 40–60 | 10–25 |

A Falkenberg cycle in this calibration example is backhand-side backhand, backhand-side forehand, then wide forehand. Six cycles at 30 balls/min budget approximately 36 seconds before internal pauses or scheduler overhead. A 25-second cap therefore requires a smaller feasible target or a recovery break. Sixteen forehand deliveries at 40 balls/min budget about 24 seconds. These are planning estimates. Test all five reference categories across four tiers and four profiles, marking combinations that are infeasible and distinguishing simulation, validator and physical results.

## SP-C08 · Safety and compatibility

Apply the intersection of coaching limits, player ceiling, frozen format bounds and verified device/runtime limits to every generated, edited, customized, substituted and resumed action. Validate the effective values after modifiers, handedness transforms and quantization. Respect coupled constraints and order, spacing, recovery, cancellation and end-of-track behavior. Use verified drill IDs only when supported. Keep the existing self-contained inline path. The catalog’s sourced patterns do not establish physical calibration or identical manufacturer presets.

### Frozen MSYNC v1 inline limits

The read-only frozen validator and limits table at the revision in [architecture](ARCHITECTURE.md) establish the following **file constraints**. Hardware, firmware and consumer restrictions may be stricter.

| Field | Allowed values |
| --- | --- |
| BALL | Positive integer index, subject to definition validation |
| SPEED, SPIN | 0–10 in steps of 0.5, with the joint ceiling below |
| TYPE | `top` or `back` |
| HEIGHT | −50 to 100 in integer steps |
| DROP | −10 to 10 in steps of 0.5 |
| BPM (feed) | 30–90 in integer steps |
| REPS | 1–200 in integer steps |
| SCATTER (optional) | 0–10 in steps of 0.5, with abs(DROP) + SCATTER ≤ 10 |

| Speed | 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5 | 5.5 | 6 | 6.5 | 7 | 7.5 | 8 | 8.5 | 9 | 9.5 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Max spin | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 10 | 9 | 8 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |

Keep MSYNC v1, the selected audio identity (filename, exact SHA-256 and duration), properly ordered cue times, referenced inline definitions, comments and drill descriptions, and final standalone STOP. Use the frozen validator. REST requires active work, accepts 0.001–600 seconds with millisecond precision and must fit within audio duration. IDLE has an active-drill precondition. At least one DRILL or INLINE activation is required. Neither format validity nor a Preview indicator proves that a device stopped feeding or retained the sequence cursor.

Retain local audio analysis, timing fallback, editable text score, per-hit and section assignments, section repeats and comments, and synchronized read-only explanations. Preserve Setup inputs across Preview tab switches, shared playback-clock highlighting and scrolling, pause/resume/stop interactions, validation errors and downloadable files that reflect the edited score.

## Supersession and verification gates

| Prior behavior or suggestion | Governing decision |
| --- | --- |
| Restart the interrupted cycle after recovery | Maintainer’s later “continue from the next ball” controls. Preserve the prior progress and resume the suffix with the original settings. |
| Derive feed from tempo or prefer beat subdivisions | The explicit independent decision supersedes the suggested tempo relationship and the existing tempo-derived policy for coaching generation. |
| Rotate drills at each detected hit or end a drill at every section | Coaching eligibility and sustained blocks govern. Preserve marker visibility and manual precedence. |
| Treat target repetitions as a stop trigger or use one workload number | Minimum, target and hard continuous cap have separate meanings. Target permits extension within limits. |
| Equate validator acceptance or catalog provenance with hardware approval | Calibration is provisional. Verify device limits, runtime and measured feeds separately. |

Before implementing dependent scheduling/export behavior, prove that the frozen format and supported consumer can emit a genuine no-feed gap and resume an ordered partial cycle at the next delivery. Evaluate timing, internal gaps, latency, pre-buffered deliveries, repeats, phase boundaries and STOP near track end. Confirm supported physical parameter combinations, batch/sequence limits, actual feed/landing calibration and factory IDs against authoritative device evidence. Randomized sequences need a verified way to retain state or materialize the planned order. Document unsupported cases without a format extension or weakened safety policy. Validate the no-activation case independently. Establish difficulty thresholds, recovery bounds, short-session budgets, preference mappings and feedback update rules through calibration. Measure musical detection against annotated tracks and preserve uncertainty for weak structure. Recover any missing approved questionnaire details before treating the document as an exhaustive transcript audit.

## Acceptance criteria and scenario-based tests

These are planned checks, not executed app or hardware tests.

| Case | Scenario and pass criteria |
| --- | --- |
| A01 · Setup and profiles | First generation defaults to Progressive Build + Cooldown. For equivalent eligible inputs, each profile produces its stated work shape. Change each simple control independently and verify effects at block boundaries within hard limits. |
| A02 · Ceiling and editing | Edit a preset beyond the player ceiling. Expect reclassification, automatic reduction and explanation, or incompatibility if no valid reduction exists. Test slow but technically demanding and physically demanding but simple patterns independently. |
| A03 · Selection | Supply an incompatible Automatic candidate with an eligible replacement, then no compatible catalog candidates. Expect replacement in the first case and no feed until a suitable boundary in the second. In Player Selection, confirm an eligible requested drill is retained and that a necessary substitute favors the ordered placement/movement sequence. |
| A04 · Dense and weak cues | Use dense accents inside an assigned section, a coincident section/hit, a strong phrase before an eligible major boundary, and a track with weak structure. Verify precedence, visible unused markers, appropriate continuation, the major-boundary preference and a feasible fallback. |
| A05 · Repeated sections | Use an illustrative verse/chorus/verse/chorus fixture. Returning chorus uses a recognizable pattern with contextual workload. Compare two music BPM estimates on fixed markers and identical coaching inputs. Feed configuration is unchanged. |
| A06 · Long and crossing blocks | Fit multiple work blocks in one long section with real recovery. Let a selected drill span an eligible section boundary. Assert settings and frequency are invariant within each sustained block, including an interrupted portion. |
| A07 · Minimum, target and cap | Choose fixtures where minimum cannot fit, target is met before a major boundary, and hard cap arrives before the next suitable cue. Expect safe fallback, continuation past target, and an actual cap-enforced pause respectively. No planned delivery occurs in a mandatory rest window. |
| A08 · Next ball | Schedule A/B/C for two completed cycles plus A/B of cycle three, then mandatory recovery. The first delivery after recovery is C at its original settings. Cycle count goes from two to three only upon C. Repeat with an interruption inside a multi-delivery BALL entry and with insufficient remaining track time. Validate parser acceptance and consumer timing separately. |
| A09 · Session length | For full, reduced and preparation-only fixtures, verify gentle preparation, feasible main work where applicable, a load-appropriate taper and final no-feed recovery. Verify preparation-only explanation and explicitly handle no-activation export. |
| A10 · Feedback | Compare generation before feedback, after local feedback is saved, and after explicit application. Only explicit application can change settings. Verify small bounded adjustments and unchanged hard limits. |
| A11 · Safety and export | Exercise format extremes, invalid increments, coupled spin/speed, lateral scatter, unsupported sequences and invalid manual repeats. Reject unsafe combinations and timestamp conflicts. Validate valid exports with the frozen reference and original audio hash. Exercise consumer stop/pause behavior and compare physical outcomes only in an authorized hardware validation run. |
| A12 · Preview regression | Edit a hit, section repeat and comment, then play/pause/resume/stop and export. Both panels follow one clock, explain scheduled and unused markers, honor section-over-hit precedence, and reflect the edited score. Invalid edits prevent download. |
