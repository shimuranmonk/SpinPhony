# SpinPhony Coaching Specification v1

## Authority and scope

This is the coaching contract for standalone SpinPhony generation. The maintainer-supplied **SpinPhony Coaching Decisions v1** (consolidated 2026-11-23) records the approved questionnaire choices and supersessions. The [Spinphony v1 conversation](chatgpt-conversation://6b01c7b9-6b10-83ec-a9bd-673c62488b14) provides supporting context. This specification consolidates the supplied decision record. Numeric calibration examples, control defaults marked as proposals, and the engineering precedence synthesis have their own status below. The [architecture](ARCHITECTURE.md) describes the existing implementation.

SP-C01 through SP-C08 define future behavior. This specification changes documentation only. The app remains standalone with local audio analysis and MSYNC v1 export. Nova Prime integration and live robot control are outside scope.

## Scope and later product decisions (2026-11-26)

The coaching requirements apply to Auto generation. The standalone MSYNC Editor is player-authored and uses format checks independently of coaching policy. The release has a shared read-only Preview and supports CDRILL, FLAVOR, IDLE, STOP and editor-only FLAG blocks. References below to an editable text timeline or a manual REST block describe the earlier workflow. The approved automatic recovery semantics remain a development target.

The later Auto design introduced Novice, Amateur, Expert and Pro as player skill choices, with Speed/Spin ceilings of 3/3, 4.5/4, 6/6 and 8/8, subject to the robot’s coupled limit. These settings govern generated ball values. The per-drill difficulty policy below remains a separate target. Nova Level 1 and locally saved Custom drills supply starting ball patterns. See [architecture](ARCHITECTURE.md) for the currently implemented subset.

## SP-C01 · Session setup and choreography

### Approved Auto placement and recovery update

Give every feasible selected drill a meaningful practice block in coaching order before repeating a pattern. Start with simpler, predictable patterns. Place drill entries and recovery starts at the best suitable musical boundary or accent while honoring work and recovery constraints. Use two 8-second recoveries per track when feasible and 3–4 seconds for other recoveries, including the final pause if it is short. Explain which drills or long recoveries could not fit. The calibration examples below remain provisional. Controller no-feed timing and next-ball resumption still require separate verification.

The primary training objective is **Balanced** across technique, footwork and conditioning. Opening accents support progressive build after gentle preparation. Choose drill duration using both meaningful cycle completion and musical placement, and prefer section-based recovery where feasible.

Before generation, expose a choreography profile, intensity, progression pace, recovery preference, selection mode and player difficulty ceiling. Keep the common setup simple. Put per-drill difficulty and preset edits in drill configuration. Preserve existing source and racket-hand setup. Use simple controls. Training intensity offers **Light / Moderate / Challenging**, progression pace offers **Gentle / Balanced / Aggressive**, and recovery preference offers **More / Balanced / Less**. These are separate from player ability, per-drill difficulty and the choreography profile. **Moderate / Balanced / Balanced** are proposed defaults. Numeric mappings and final defaults remain open.

| Profile | Required shape |
| --- | --- |
| Progressive Build + Cooldown (default) | Build from gentle preparation through progressively related practice toward harder work, taper, then finish with recovery. |
| Interval Training | Alternate work blocks and genuine recovery periods, with intensity bounded by the player ceiling and continuous-work limits. |
| Steady Rhythm | Maintain a comparatively even main-work intensity, with required recovery and a closing taper. |
| Follow the Music | Let eligible musical changes shape starts and transitions while retaining coaching, recovery and safety constraints. |

Intensity guides demand. Progression pace guides the rate of change between blocks. Recovery preference guides pause placement and duration within safe bounds. Every profile reserves preparation, a cooldown appropriate to the delivered load and final no-feed recovery. Changing a preference or profile cannot override a hard limit. Between blocks, use progressively related drills and alternate the dimension of eligible progression between drill complexity and feed frequency. At a chorus or drop, prefer a change in movement pattern over an automatic intensity increase. Any increase still requires player eligibility.

## SP-C02 · Selection, difficulty and substitution

- Provide exactly two modes, **Automatic** and **Player Selection**. Detailed choreography customization takes place in the existing timeline editor after generation. Automatic chooses compatible drills. Player Selection schedules and orders the chosen main-training pool, with compatible substitutions when necessary. The dedicated warmup library may supply simple unselected drills. A pool of one or two drills is sufficient for repetitions and permitted variations. Pool size alone never requires a shorter workout or unrelated drills. A selected drill may continue across sections, subject to normal work, recovery and manual assignment constraints.
- Use the verified Nova S Pro built-in catalog where identifiers and capabilities are established, plus a curated library of established coaching patterns. The initial coaching candidate set is approximately ten patterns, such as Falkenberg and reverse Falkenberg. Require a verified definition, cycle semantics, legal parameters and suitable substitutions. Automatic online drill discovery is outside MVP scope.
- Each drill supports **Easy, Medium, Hard and Advanced**. Evaluate technical demand (for example, spin handling and stroke/sequence complexity) and physical demand (for example, movement and feed density) independently. Present one combined difficulty and player ceiling. Show the final difficulty label without requiring a technical breakdown. The combined classification rule, dimension weights and tier cutoffs remain open. A maximum-of-dimensions formula was an assistant proposal.
- Reclassify edited presets using the resulting parameters and movement sequence. Automatically reduce a custom configuration that exceeds allowed player or robot limits, preserving its pattern where feasible, then validate the effective configuration again. Explain the effective tier and material adjustments. If no permissible configuration is possible, treat the drill as incompatible.
- Replace incompatible automatic candidates with compatible repertoire. When no automatic candidate fits, pause feeding and reconsider at the next suitable boundary. For an incompatible player-selected drill, prefer an eligible substitution that preserves ordered placements and movement first, then other training features where possible. Explain the substitution and its reason. If no compatible pattern-preserving substitute exists, report the limitation. The final Player Selection fallback in this case remains open. Keep unavailable-drill pauses distinct from recovery pauses in the plan and explanations. Warn when active training coverage is low while allowing generation and any otherwise valid export.
- Compatibility depends on achievable parameters, sequence support, player ceiling, available time and workload/recovery constraints. A higher difficulty need not imply faster feeding. Exact similarity weights and tie-breaking are open.

## SP-C03 · Musical cues, continuity and precedence

Separate musical detection from action scheduling. Consider sharp accents, energy changes, likely section transitions and strong phrase boundaries. Music BPM and musical marker times inform cue placement. Coaching determines feed frequency in balls per minute. The MSYNC BALL field named `BPM` represents feed rate here. Changes in estimated music BPM alone must leave an otherwise identical block’s feed settings intact.

- **Activation** starts or changes a scheduled drill at an eligible cue. **Continuation** explains that an existing drill carries through a marker without a new activation. **Candidate** makes an unused detection visible with its reason, including a detection removed from the editable score. A hit under an assigned section may appear as a candidate while the action explanation identifies the continuing drill. **Pause/recover** describes an actual no-feed action and its reason. Scheduled cycles should also show their actual action and reason.
- An assigned section controls the drill actions and repeats in its span and supersedes per-hit assignments there. Keep interior hit markers visible. Honor valid manual sequence, timing, repeat and comment edits in the edited score and export. Hard limits, mandatory recovery and track end take precedence over requested timing or repeats. Report invalid edits and block unsafe or invalid export. Preserve the existing explicit regeneration behavior when source inputs change or Generate is invoked.
- Sustain a section assignment when its coaching goal and feasible cycles justify it. If a section ends before minimum cycles are complete, carry the existing drill across the boundary unless a mandatory intervention prevents it. After minimum the drill is eligible for change when the change improves training. After target, retain the drill until a suitable boundary subject to mandatory limits, even when that boundary is distant. There is no approved music-only maximum wait.
- For an ordinary transition after reaching target, seek the next suitable major section boundary in preference to a strong phrase boundary. Use a strong phrase when a suitable major boundary is unavailable within the workable span. An accent alone does not force a transition. A boundary is suitable only when phase, cycle completion, recovery, remaining time and safety allow it. With sparse or uncertain structure, maintain a feasible block and use eligible fallbacks without implying semantic verse or chorus recognition.
- Returning sections favor recognizable drills or movement patterns. Reuse the same drill identity and selected difficulty. Physical workload and recovery may vary between occurrences within the combined ceiling and selected intensity, while technical difficulty stays the same. Settings within a single sustained block stay fixed, including sequence, placement, spin, speed, height and feed frequency. Changes belong at block boundaries. A section may contain several work blocks with recovery between them. Crossing a section boundary alone need not end a selected drill block.

### Conceptual _Eye of the Tiger_ scenario

A suitable opening guitar accent can start a simple gentle drill. Nearby accents can be held or left as candidates while it completes cycles. A suitable major or phrase boundary can then introduce related practice or progression. Sustained phrases hold fixed settings, returning sections reuse recognizable patterns, and later sections allow genuine pauses, taper and final no-feed recovery. The scenario uses no recording-specific timestamps or verified labels.

## SP-C04 · Workload, pauses and interruption

A coaching cycle is one complete ordered drill pattern, including its scheduled deliveries. Count planned complete cycles independently of the MSYNC `REPS` field, which counts deliveries of an individual BALL entry. Track planned or estimated deliveries and cycles. SpinPhony has no verified measure of successful returns, actual fatigue or physical completion.

| Measure | Purpose |
| --- | --- |
| Minimum cycles | Smallest meaningful dose for ordinary practice. Check that it fits before starting a regular block. |
| Target cycles | Desired dose. Once reached, normally continue to an eligible musical transition while the hard limits permit. |
| Maximum continuous workload | Hard cap on uninterrupted work, separate from total work across recovered blocks. It may require a pause before minimum or target is reached. |

Adapt the minimum to player difficulty and drill complexity. Adapt target to difficulty, complexity, training objective and available track time. Adapt the continuous-work ceiling to difficulty, selected intensity, movement and recent workload. Balance technical complexity, movement demand and feed frequency in the workload estimate. When uncertain, use easier settings or more recovery. Adapt recovery bounds to accumulated workload and recovery preference, favoring phrase alignment within those bounds. Account for actual scheduled intervals and any internal delays. Plan a smaller feasible target or recovery when the original target and the cap conflict. Prefer cycle boundaries for ordinary transitions and planned recovery when feasible. Safety and manual Stop can interrupt immediately. Reserve genuine bounded no-feed intervals as workload requires. Align their start/end musically when feasible, without delaying a mandatory pause or shortening required rest. A slower feed, ineffective command, or low-demand drill does not count as a pause.

If mandatory recovery interrupts a cycle, retain the completed-cycle count, partial-cycle progress, original block settings and next scheduled delivery index, including position within repeated BALL entries if relevant. After sufficient recovery, resume **from the next ball**. Credit the interrupted cycle once its remaining deliveries are completed. Do not replay the already scheduled prefix, skip the suffix, or accelerate to catch up. If track end prevents a safe resumption, keep the recovery and report incomplete work. Format or scheduler limitations must be reported and block incompatible export rather than change this rule.

## SP-C05 · Preparation, taper and short tracks

Start every session with steady, gentle preparation. Use simple, predictable warmup exercises, including dedicated warmup drills outside the selected main-training pool if needed. Scale warmup duration to track length and player difficulty with a meaningful minimum. Increase main-work demand only after preparation. Scale cooldown to song length, difficulty and accumulated workload. Use simple, predictable, low-demand drills that taper across one or more gentle blocks. Reserve final no-feed recovery while the music finishes naturally. If the last block would overrun, proactively reduce its planned target when the minimum still fits. If the final window cannot accommodate minimum cycles, use recovery. End the exported score at track duration.

When a full session cannot fit, use a reduced session with fewer or easier feasible blocks, warmup and cooldown where feasible, preserved recovery and a concise explanation. If no meaningful work fits, produce preparation and recovery only and explain why. Determine these cases from feasible phase and workload budgets rather than inventing universal track-length cutoffs. The simplest preparation-only plan may require no robot feeding. Validate whether it can be exported under the frozen activation requirement. If it cannot, retain the plan and explanation in Preview and identify the export limitation. Do not insert a dummy feed. Describe the planned preparation accurately without claiming that one short track provides a complete physical warmup or workout.

## SP-C06 · Optional feedback

Offer optional post-session feedback with **Easy / Appropriate / Too Hard** and store it on the player’s device. Saving or viewing feedback does not change future generation. Apply it to future settings only when the player explicitly requests application. Adapt gradually using repeated feedback and stay within the player ceiling, robot constraints and mandatory recovery. Historical feedback cannot silently change selected difficulty, intensity or recovery preferences. Preserve the current plan unless the player explicitly changes or regenerates it. Prompt presentation, storage schema, update increments and evidence for personalization remain open. Treat self-reported feedback as player input, distinct from sensor or execution data.

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
| Modify settings within a sustained block | Hold all settings fixed until the next block or occurrence. |
| Easy/Average/Hard/Pro and separate visible ceilings | Use Easy/Medium/Hard/Advanced and one visible ceiling with separate internal assessments. |
| Warn or reject an over-limit customized preset | Automatically adjust it when a compatible configuration can be achieved. |
| Exclude an incompatible player selection or enforce selected-only warmup | Attempt compatible adjustment, then pattern-preserving substitution. Allow dedicated unselected warmup drills. |
| Fill an unsuitable Automatic slot with an ineligible drill | Pause feeding until a suitable boundary and an eligible drill. |
| Increase warmup intensity gradually | Keep warmup steady and gentle. Begin progression in main training. |
| Let musical alignment dictate recovery | Guarantee genuine workload-bounded feeding pauses and align musically where feasible. |
| Treat target repetitions as a stop trigger or use one workload number | Minimum, target and hard continuous cap have separate meanings. Target permits extension within limits. |
| Equate validator acceptance or catalog provenance with hardware approval | Calibration is provisional. Verify device limits, runtime and measured feeds separately. |

For engineering review, the consolidated precedence is safety/manual Stop and robot constraints, mandatory workload and recovery, player ceiling, required cycles and phases, selection and substitution, choreography strategy, musical sections and phrases, then individual accents. This ordering is an interpretation of the approved rules. Validate edge cases before depending on it.

Before implementing dependent scheduling/export behavior, prove that the frozen format and supported consumer can emit a genuine no-feed gap and resume an ordered partial cycle at the next delivery. Evaluate timing, internal gaps, latency, pre-buffered deliveries, repeats, phase boundaries and STOP near track end. Confirm supported physical parameter combinations, batch/sequence limits, actual feed/landing calibration and factory IDs against authoritative device evidence. Randomized sequences need a verified way to retain state or materialize the planned order. Document unsupported cases without a format extension or weakened safety policy. Validate the no-activation case independently. Establish difficulty thresholds, recovery bounds, short-session budgets, preference mappings and feedback update rules through calibration. Measure musical detection against annotated tracks and preserve uncertainty for weak structure. Resolve the no-compatible-substitute final fallback, verify adaptive phase minima on very short audio, and test uncertain boundaries and false positives without relying on unsupported commands.

## Acceptance criteria and scenario-based tests

These are planned checks. App and hardware execution is pending.

| Case | Scenario and pass criteria |
| --- | --- |
| A01 · Setup and profiles | First generation defaults to Progressive Build + Cooldown. For equivalent eligible inputs, each profile produces its stated work shape. Change each simple control independently and verify effects at block boundaries within hard limits. |
| A02 · Ceiling and editing | Edit a preset beyond the player ceiling. Expect reclassification, automatic reduction and explanation, or incompatibility if no valid reduction exists. Test slow but technically demanding and physically demanding but simple patterns independently. |
| A03 · Selection | Supply an incompatible Automatic candidate with an eligible replacement, then no compatible catalog candidates. Expect replacement in the first case and no feed until a suitable boundary in the second. In Player Selection, confirm an eligible requested drill is retained and that a necessary substitute favors the ordered placement/movement sequence. |
| A04 · Dense and weak cues | Use dense accents inside an assigned section, a coincident section/hit, a strong phrase before an eligible major boundary, and a track with weak structure. Verify precedence, visible unused markers, appropriate continuation, the major-boundary preference and a feasible fallback. |
| A05 · Repeated sections | Use an illustrative verse/chorus/verse/chorus fixture. Returning chorus uses the same drill identity and selected technical difficulty with only permitted workload differences between occurrences. Compare two music BPM estimates on fixed markers and identical coaching inputs. Feed configuration is unchanged. |
| A06 · Long and crossing blocks | Fit multiple work blocks in one long section with real recovery. Let a selected drill span an eligible section boundary. Assert settings and frequency are invariant within each sustained block, including an interrupted portion. |
| A07 · Minimum, target and cap | Choose fixtures where minimum cannot fit, target is met before a major boundary, and hard cap arrives before the next suitable cue. Expect safe fallback, continuation past target, and an actual cap-enforced pause respectively. No planned delivery occurs in a mandatory rest window. |
| A08 · Next ball | Schedule A/B/C for two completed cycles plus A/B of cycle three, then mandatory recovery. The first delivery after recovery is C at its original settings. Cycle count goes from two to three only upon C. Repeat with an interruption inside a multi-delivery BALL entry and with insufficient remaining track time. Validate parser acceptance and consumer timing separately. |
| A09 · Session length | For full, reduced and preparation-only fixtures, verify gentle preparation, feasible main work where applicable, a load-appropriate taper and final no-feed recovery. Verify preparation-only explanation and explicitly handle no-activation export. |
| A10 · Feedback | Compare generation before feedback, after local feedback is saved, and after explicit application. Only explicit application can change settings. Verify small bounded adjustments and unchanged hard limits. |
| A11 · Safety and export | Exercise format extremes, invalid increments, coupled spin/speed, lateral scatter, unsupported sequences and invalid manual repeats. Reject unsafe combinations and timestamp conflicts. Validate valid exports with the frozen reference and original audio hash. Exercise consumer stop/pause behavior and compare physical outcomes only in an authorized hardware validation run. |
| A12 · Preview regression | Edit a hit, section repeat and comment, then play/pause/resume/stop and export. Both panels follow one clock, explain scheduled and unused markers, honor section-over-hit precedence, and reflect the edited score. Invalid edits prevent download. |
| A13 · Opening and early section boundary | Use a synthetic fixture with _Eye of the Tiger_-style opening accents and a section change before minimum cycles. Start gently, retain closely spaced accents as holds/candidates and continue across the boundary unless mandatory recovery intervenes. |
| A14 · Distant boundary and progression | Meet target well before the next viable boundary. Continue at fixed settings until that boundary or required recovery. Across eligible new blocks alternate complexity and feed progression, and prefer movement change at a chorus/drop. |
| A15 · Sparse selection and low coverage | Generate from one or two selected drills with an optional dedicated unselected warmup. Main training repeats eligible selections or uses the approved substitution priority. With no eligible Automatic drill, keep the unavailability reason distinct from recovery, warn on low coverage and allow any valid export. |
| A16 · Ending and manual Stop | Shorten the last target when minimum cycles still fit, otherwise use recovery. Final recovery has no feed while audio continues. Verify immediate manual Stop during active work, including any scheduled continuation. |
