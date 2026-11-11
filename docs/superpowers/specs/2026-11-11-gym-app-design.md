# Gym App — Design Spec (2026-11-11)

Personal fat-loss + muscle PWA built around common Egyptian food. Arabic (Egyptian) RTL UI. Approved in chat on 2026-11-11.

## Goals
- Turn a 12-week fat-loss plan into a daily tool: what to eat, what to train, how to track, when to adjust.
- Any program length (12 weeks, 24 weeks, or custom N weeks).
- Works offline (except videos), installable from Chrome on Android.
- No personal data in the source code: the user enters it on first run; it lives only in the phone's browser storage, with JSON export/import.

## Non-goals (YAGNI)
- No backend, accounts, push server, or in-app scheduled notifications (reminders go through Google Calendar).
- Female formulas, multiple users, barcode scanning, social features.

## Architecture
Static site, no framework, no build step. ES modules. Pure "engine" modules (no DOM) are unit-tested with `node --test`.

```
gym-app/
  index.html, manifest.webmanifest, sw.js, icons/*.png
  css/app.css
  js/app.js                # bootstrap, tab router, onboarding gate
  js/store.js              # load/save/migrate state (localStorage), export/import
  js/engine/dates.js       # local-date helpers (YYYY-MM-DD), week index, weekday
  js/engine/bodycomp.js    # navy, rfm, army, estimateBodyFat, lbm
  js/engine/energy.js      # mifflin, katch, tdee, targets, trendTdee, advice
  js/engine/program.js     # buildProgram, weekInfo, sessionForDate
  js/engine/menu.js        # scaleDay, totals, swapItem, intakeForDate
  js/engine/reminders.js   # google calendar links, ICS text
  js/data/foods.js         # Egyptian food DB per 100 g (from the research report)
  js/data/menus.js         # 7 day templates
  js/data/exercises.js     # sessions, exercises, cues, video ids
  js/ui/*.js               # today, meals, workout, progress, settings, onboarding, chart
  tests/*.test.js
```

## Engine rules (single source of truth = the plan)
- **Body fat:** working BF = mean(Navy, RFM); Army shown as a check. LBM = W × (1 − BF).
- **BMR:** Mifflin-St Jeor (male); Katch-McArdle if BF < 15%.
- **TDEE (initial):** BMR × PAL (1.2 / 1.375 / 1.55). Default 1.375.
- **TDEE (trend):** after ≥ 21 days with ≥ 4 weigh-ins in each of the first and last 7 days of the window: avgIntake + (Δ 7-day-avg weight × 7700) / days. Window = last 21 days. Intake = logged meals + extras on days with any log, else the day's target.
- **Calories:** deficit % by BF: ≥ 25 → 20%, 15–25 → 17.5%, < 15 → 12.5%; deficit ≤ 750; result rounded to 50; floor 1500. Maintenance weeks and goal-reached mode use TDEE.
- **Protein:** BF ≥ 25 → 2.1 × (LBM / 0.8); else 2.0 × W. **Fat:** max(25% kcal / 9, 0.5 × W). **Carbs:** remainder.
- **Advice (from week 3):** loss < 0.5%/wk for 2 weeks and waist flat → −150 kcal or +2000 steps; loss > 1.2 kg/wk for 2 weeks → +150 kcal. Shown as a suggestion; user taps to apply (stores a kcal offset).
- **Goal:** default target BF 20%; when reached, switch to maintenance + recomp message.

## Program
- Weekday → session: Sat Push A, Sun Pull A, Mon Legs A, Tue Push B, Wed Pull B, Thu Legs B, Fri rest.
- Weeks: 1–2 `ramp` (2 sets, RIR 3); then repeating cycles of 4 `build` + 1 `deload` (deload: 2 sets, RIR 4, −10% load, maintenance calories); the first build cycle is RIR 2 (isolation 1); later cycles are `push` (RIR 1–2, isolation 0–1, +1 set on the first exercise); the final week is `test` (3 sets, RIR 2, measure everything). For 12 weeks this reproduces the plan exactly.
- Steps target by week: 6k, 7k, 8k, 8k, then 9–10k.
- Workout log per exercise per set: weight + reps. Progression hint: all sets at top of rep range → "+2.5 kg upper / +5 kg lower".
- Videos: lite embed (thumbnail → tap → `youtube-nocookie.com/embed/<id>` iframe). Backup video + "search on YouTube" link if the embed fails.

## Food
- Food DB: ~80 items per 100 g (kcal, P, C, F), group (`protein`, `carb`, `dairy`, `fat`, `veg`, `fruit`, `dish`, `street`, `sweet`, `drink`) and optional unit (egg 50 g, egg white 33 g, half baladi loaf 45 g, banana 118 g…). Values come from the research report.
- 7-day menu (Sat–Fri), 4 meals + night milk + flexible tea. Each item has a role: `protein`, `carb`, or `fixed`.
- `scaleDay(template, targets)`: scale protein-role items to hit protein, then carb-role items to hit kcal; bounded factors; round to units/5 g. Acceptance: for targets 1800–2800 kcal and 150–210 g protein, totals within ±75 kcal and ±8 g protein.
- Swap: replace an item with a same-group food at equal protein (protein group), equal carbs (carb group), or equal kcal (others). Stored per date.
- Extras: free logging from the DB with grams. Meal check-off per date.
- Default meal times: 09:00, 14:00, 17:30, 21:30, milk 23:30 (editable).

## Reminders
Google Calendar "template" links (`calendar.google.com/calendar/render?action=TEMPLATE&…&ctz=Africa/Cairo&recur=RRULE:…`), one tap each, recurring until program end:
- each meal (daily), workout of the day (weekly per weekday, at 10:00, text = session name), steps/cardio check (daily 20:00), weekly measurement (Fri 09:00).
Also a downloadable `.ics` with the same events.

## Storage
`localStorage["gymapp.v1"]` = `{ schema, profile, settings, measurements[], weights[], days{date:{eaten[], swaps{}, extras[], steps}}, workouts{date:{exKey:[{w,r}]}}, kcalOffset }`. Writes wrapped in try/catch; failure shows a banner suggesting export. Export/import JSON file.

## Hosting
GitHub Pages (public repo, relative paths, `start_url: "./"`). Repo creation and push only after the user approves in chat.

## Testing
- `node --test` for all engine modules (bodycomp numbers match the plan: Navy 29.1 / RFM 30.7 / Army 30.2 for the report's reference example; program weeks for 12 and 24; menu scaling tolerance; RRULE/link format).
- Manual run in a mobile viewport (375×812): onboarding → today → meals swap → workout log + video → progress → reminders links.
