# The Future Proof Method - Module Roadmap

Claude Code + Codex Starter System

This is an implementation path, not a playlist. Complete one output, save the evidence, and then move forward.

## Module 1 - Set Up Both AI Builders

Objective: Install, sign in, and safely verify Claude Code and Codex inside one practice project.

Focus: Get both tools working without exposing secrets, skipping permissions, or learning terminal commands you do not need yet.

Output: A toolchain receipt showing Claude Code, Codex, and Git can open the same practice project.

Lesson map:
- Window: First 30-45 minutes
- Mode: Guided setup
- Evidence: Version check, authenticated session, and one read-only project explanation from each tool.
- Why it matters: A clean setup removes tool confusion before the course asks you to build anything.

Run kit:
- Timebox: 45 minutes
- Next move: Verify Git, Claude Code, and Codex, then open one empty practice project in both agents.
- Verification checkpoint: Save the three version results and one screenshot or note showing both agents can read the project.
- Stop rule: Stop and use the troubleshooting guide if an install command fails twice; do not stack random fixes.

Commands or script:

```text
git --version
claude --version
codex --version
```

Tasks:
- [ ] Choose your Claude Code and Codex surfaces.
  - Evidence: A note names the terminal, desktop, or IDE surfaces you will use and the account attached to each.
- [ ] Install and verify Claude Code, Codex, and Git.
  - Evidence: Version output or a screenshot confirms all three tools are available.
- [ ] Create and open a dedicated practice project.
  - Evidence: The project has its own folder and a short README describing what it is for.
- [ ] Run the first read-only inspection in both agents.
  - Evidence: Claude Code and Codex each explain the project without editing a file.

Deliverables:
- Claude Code and Codex installed or available on a supported surface.
- Both tools authenticated and opened from the same practice project.
- A saved setup receipt with versions, project path, and any issue you solved.

Questions before completion:
- Can you open the project in each tool without changing directories blindly?
- Can each tool explain the project before asking to edit it?
- Did you keep API keys, passwords, and private files out of the chat and repository?

Traps to avoid:
- Starting in your home folder and giving the agent access to unrelated files.
- Approving commands you do not understand just to make a prompt disappear.
- Pasting a secret into chat, source code, a screenshot, or a committed file.

Done when:
- Both agents can enter one safe project, explain it, and wait for a scoped task.

## Module 2 - Make the Project AI-Ready

Objective: Give both agents the same brief, durable rules, commands, safety boundaries, and definition of done.

Focus: Replace repeated explanations with a small project packet that Claude Code and Codex can reliably follow.

Output: An AI-ready project packet with a brief, AGENTS.md, CLAUDE.md, .gitignore, and first Git checkpoint.

Lesson map:
- Window: 45-75 minutes
- Mode: Project priming
- Evidence: Project brief, shared instructions, ignored secret files, and a clean Git baseline.
- Why it matters: Good context makes every future prompt shorter and reduces repeated agent mistakes.

Run kit:
- Timebox: 60 minutes
- Next move: Write the project brief, generate minimal agent instructions, verify commands, and commit the baseline.
- Verification checkpoint: A clean repository contains the project packet and no secrets.
- Stop rule: Do not add a rule unless it is project-specific, testable, and useful in more than one session.

Commands or script:

```text
git status
git diff -- . ':!package-lock.json'
git log -1 --oneline
```

Tasks:
- [ ] Write the one-page project brief.
  - Evidence: The brief names the user, pain, first outcome, non-goals, and success check.
- [ ] Create AGENTS.md and CLAUDE.md guidance.
  - Evidence: Both files contain verified commands, key paths, conventions, safety rules, and definition of done.
- [ ] Protect secrets and local-only files.
  - Evidence: .gitignore covers environment files and the repository scan shows no pasted credentials.
- [ ] Create the baseline Git checkpoint.
  - Evidence: A descriptive commit or equivalent saved checkpoint exists before feature work begins.

Deliverables:
- A one-page project brief naming the user, problem, scope, and first outcome.
- Concise AGENTS.md and CLAUDE.md guidance that share the same project facts.
- A .gitignore and baseline commit that keep secrets and generated files out of version history.

Questions before completion:
- Can a new agent explain the project without a long custom prompt?
- Are build and test commands copied from the project instead of guessed?
- Are secrets, production actions, and destructive commands explicitly bounded?

Traps to avoid:
- Turning project instructions into a giant handbook the agent will ignore.
- Adding personal secrets or machine-specific paths to shared project files.
- Writing rules that conflict across AGENTS.md, CLAUDE.md, and the actual codebase.

Done when:
- Either agent can enter the project, find the rules, and explain how work will be verified.

## Module 3 - Run the Operator Loop

Objective: Use the repeatable inspect, plan, build, verify, and checkpoint loop on one narrow change.

Focus: Direct the agent with a clear outcome and stop condition instead of asking it to build an entire idea at once.

Output: One working change with an inspection note, approved plan, verification receipt, and checkpoint.

Lesson map:
- Window: 60-120 minutes
- Mode: Verified build loop
- Evidence: Before state, scoped plan, working change, verification output, and checkpoint.
- Why it matters: This is the daily operating loop that turns AI speed into dependable progress.

Run kit:
- Timebox: 90 minutes
- Next move: Choose one user-visible change and run inspect, plan, build, verify, and checkpoint in order.
- Verification checkpoint: The project-specific verification path passes and the before/after can be explained in one sentence.
- Stop rule: When the promised path works, checkpoint it before asking for polish or another feature.

Commands or script:

```text
git diff --check
npm test
npm run build
```

Tasks:
- [ ] Write one narrow build brief.
  - Evidence: The brief names the user path, outcome, non-goals, risks, and stop condition.
- [ ] Make the agent inspect before it plans.
  - Evidence: The plan cites relevant files and current behavior before proposing edits.
- [ ] Implement the smallest useful slice.
  - Evidence: The requested behavior works without unrelated features or refactors.
- [ ] Verify the user path and save a checkpoint.
  - Evidence: A test, browser check, or command receipt and a commit or handoff both exist.

Deliverables:
- A build brief with one user path, one outcome, non-goals, and a stop condition.
- The smallest implementation that changes the real user path.
- A test, browser, or command receipt plus a saved checkpoint another agent can review.

Questions before completion:
- Did the agent inspect the actual files and current behavior before planning?
- Can you show the improvement through the user path rather than only through code?
- Did you stop after the scoped outcome passed instead of expanding the feature?

Traps to avoid:
- Giving a vague request such as make the app better.
- Accepting an impressive plan that never names the exact user path.
- Calling the task complete because code compiled without running the real behavior.

Done when:
- One real user path works better, the result is verified, and another agent can review or resume it.

## Module 4 - Install Your Starter Skills

Objective: Turn your best repeated instructions into reusable skills that work with Claude Code and Codex.

Focus: Install three customer-safe skills, understand where each agent discovers them, and customize one for your project.

Output: Three tested starter skills plus one project-specific customization.

Lesson map:
- Window: 45-90 minutes
- Mode: Reusable workflow setup
- Evidence: Three installed skills, invocation receipts, and one customized workflow.
- Why it matters: Skills remove repeated prompting while keeping long procedures out of always-loaded project instructions.

Run kit:
- Timebox: 60 minutes
- Next move: Install the three-skill starter pack, test each skill, then customize only the most useful one.
- Verification checkpoint: Each agent can discover or explicitly run at least one installed skill.
- Stop rule: Do not install another skill until you can name the repeated task it removes.

Commands or script:

```text
find .agents/skills .claude/skills -name SKILL.md -maxdepth 3 2>/dev/null
```

Tasks:
- [ ] Choose personal versus project skill locations.
  - Evidence: A note explains which skills should travel with this project and which should follow you everywhere.
- [ ] Install the three-skill starter pack.
  - Evidence: Three SKILL.md files exist in the intended Claude Code and/or Codex locations.
- [ ] Invoke and test every starter skill.
  - Evidence: Saved outputs show Project Map, Build One Slice, and Verify Before Done behaved as intended.
- [ ] Customize one skill for your project.
  - Evidence: The edited skill names a real trigger, command, output, and quality bar from the project.

Deliverables:
- Project Map, Build One Slice, and Verify Before Done skills installed.
- One successful explicit invocation or matching natural-language trigger in each agent.
- One skill customized with the project's real commands and quality bar.

Questions before completion:
- Does the skill description clearly say what it does and when to use it?
- Can the skill run without secrets, private paths, or assumptions from Murad's machine?
- Does the customized skill improve a repeated workflow instead of duplicating project guidance?

Traps to avoid:
- Installing dozens of skills before proving that three are useful.
- Copying a skill you have not inspected because its name sounds helpful.
- Putting a one-time task or a permanent project fact in the wrong instruction layer.

Done when:
- Your agents can reuse three proven workflows without you pasting the same instructions again.

## Module 5 - Ship Your First Useful Build

Objective: Choose a beginner-safe build track, ship one vertical slice, and package the result for the next session.

Focus: Finish a small, inspectable outcome that teaches the complete workflow without requiring a giant application.

Output: A locally verified or deployed first build with a README, verification receipt, and next-build handoff.

Lesson map:
- Window: One focused build day
- Mode: First ship
- Evidence: Working slice, clean-start verification, README update, and next-build handoff.
- Why it matters: The first complete loop builds confidence and creates a reusable starting point for every later project.

Run kit:
- Timebox: 2-4 hours
- Next move: Pick one track, build one vertical slice, run a clean-start check, and package the handoff.
- Verification checkpoint: A fresh browser or terminal session can reproduce the promised result.
- Stop rule: Ship the smallest version that proves the path; move every extra idea into the next-build list.

Commands or script:

```text
git status
git diff --check
npm run build
```

Tasks:
- [ ] Choose one first-build track.
  - Evidence: The Build Lab records one user, one action, one success state, and explicit non-goals.
- [ ] Ship one complete vertical slice.
  - Evidence: The real user can start, perform the core action, and see the success state.
- [ ] Run the clean-start verification path.
  - Evidence: Install, start, test, and build checks are recorded from a fresh session where applicable.
- [ ] Update the README and write the next-build handoff.
  - Evidence: The repository explains how to run the project, what shipped, known limits, and the next safe task.

Deliverables:
- One chosen track: new tool, existing-project improvement, or workflow automation.
- A working vertical slice tested through the real user path.
- A final README section, proof receipt, and handoff naming the next safe improvement.

Questions before completion:
- Can another person understand what the build does in under 30 seconds?
- Can you reproduce the success state from a clean start?
- Does the handoff clearly separate what is done, what is not, and what should happen next?

Traps to avoid:
- Adding authentication, payments, AI, and automation before the core path works.
- Deploying before local verification or calling local verification a deployment.
- Finishing the code but leaving no README, test receipt, or next action.

Done when:
- You have one useful build, a repeatable verification path, and a clean handoff for the next session.

## End-of-course check

- [ ] Both agents can open and explain the same project.
- [ ] Project guidance contains verified commands and safety boundaries.
- [ ] One inspect-plan-build-verify-checkpoint loop is complete.
- [ ] Three starter skills are installed and tested.
- [ ] One useful build works from a clean start.
