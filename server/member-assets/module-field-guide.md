# The Future Proof Method - Module Field Guide

Use this file as the work surface. Understanding a lesson does not complete it; the output and evidence must exist.

## Module 1 - Set Up Both AI Builders

Focus: Get both tools working without exposing secrets, skipping permissions, or learning terminal commands you do not need yet.

Output: A toolchain receipt showing Claude Code, Codex, and Git can open the same practice project.

Operating question:

> Can I open one safe project in both agents and understand what each tool is asking permission to do?

Worksheet:

- Operating system:
- Claude Code surface:
- Codex surface:
- Git version:
- Claude Code version or access receipt:
- Codex version or access receipt:
- Practice project path:
- First read-only prompt result:
- Setup issue solved:

Starter prompt:

> Do not edit anything yet. Inspect this practice project, explain what files are here, and tell me the safest first task for a beginner.

Task checklist:
- [ ] Choose your Claude Code and Codex surfaces.
  - Evidence: A note names the terminal, desktop, or IDE surfaces you will use and the account attached to each.
- [ ] Install and verify Claude Code, Codex, and Git.
  - Evidence: Version output or a screenshot confirms all three tools are available.
- [ ] Create and open a dedicated practice project.
  - Evidence: The project has its own folder and a short README describing what it is for.
- [ ] Run the first read-only inspection in both agents.
  - Evidence: Claude Code and Codex each explain the project without editing a file.

Evidence to capture:
- Version or access checks.
- Practice project README.
- Read-only explanation from each agent.

Questions before completion:
- Can you open the project in each tool without changing directories blindly?
- Can each tool explain the project before asking to edit it?
- Did you keep API keys, passwords, and private files out of the chat and repository?

Traps to avoid:
- Starting in your home folder and giving the agent access to unrelated files.
- Approving commands you do not understand just to make a prompt disappear.
- Pasting a secret into chat, source code, a screenshot, or a committed file.

Stop rule:

Stop and use the troubleshooting guide if an install command fails twice; do not stack random fixes.

Exit criteria:

Both agents can enter one safe project, explain it, and wait for a scoped task.

## Module 2 - Make the Project AI-Ready

Focus: Replace repeated explanations with a small project packet that Claude Code and Codex can reliably follow.

Output: An AI-ready project packet with a brief, AGENTS.md, CLAUDE.md, .gitignore, and first Git checkpoint.

Operating question:

> What context should the project carry so I never need to re-explain the same facts to an agent?

Worksheet:

- Primary user:
- Pain or workflow:
- First useful outcome:
- Success state:
- Non-goals:
- Important paths:
- Build command:
- Test command:
- Protected files and actions:
- Definition of done:

Starter prompt:

> Inspect this project and draft the smallest useful project instructions. Include purpose, stack, important paths, build commands, test commands, safety boundaries, and definition of done. Do not invent commands you have not verified.

Task checklist:
- [ ] Write the one-page project brief.
  - Evidence: The brief names the user, pain, first outcome, non-goals, and success check.
- [ ] Create AGENTS.md and CLAUDE.md guidance.
  - Evidence: Both files contain verified commands, key paths, conventions, safety rules, and definition of done.
- [ ] Protect secrets and local-only files.
  - Evidence: .gitignore covers environment files and the repository scan shows no pasted credentials.
- [ ] Create the baseline Git checkpoint.
  - Evidence: A descriptive commit or equivalent saved checkpoint exists before feature work begins.

Evidence to capture:
- Project brief.
- AGENTS.md and CLAUDE.md.
- .gitignore check.
- Baseline checkpoint.

Questions before completion:
- Can a new agent explain the project without a long custom prompt?
- Are build and test commands copied from the project instead of guessed?
- Are secrets, production actions, and destructive commands explicitly bounded?

Traps to avoid:
- Turning project instructions into a giant handbook the agent will ignore.
- Adding personal secrets or machine-specific paths to shared project files.
- Writing rules that conflict across AGENTS.md, CLAUDE.md, and the actual codebase.

Stop rule:

Do not add a rule unless it is project-specific, testable, and useful in more than one session.

Exit criteria:

Either agent can enter the project, find the rules, and explain how work will be verified.

## Module 3 - Run the Operator Loop

Focus: Direct the agent with a clear outcome and stop condition instead of asking it to build an entire idea at once.

Output: One working change with an inspection note, approved plan, verification receipt, and checkpoint.

Operating question:

> What is the smallest user-visible change I can inspect, build, verify, and checkpoint today?

Worksheet:

- User path:
- Current behavior:
- Requested outcome:
- Non-goals:
- Relevant files found during inspection:
- Main risk:
- Verification path:
- Stop condition:
- Checkpoint or handoff:

Starter prompt:

> Inspect the relevant files first. Map the current user path, identify the smallest change that creates the requested outcome, list risks, and propose a verification plan. Do not edit until the plan is clear.

Task checklist:
- [ ] Write one narrow build brief.
  - Evidence: The brief names the user path, outcome, non-goals, risks, and stop condition.
- [ ] Make the agent inspect before it plans.
  - Evidence: The plan cites relevant files and current behavior before proposing edits.
- [ ] Implement the smallest useful slice.
  - Evidence: The requested behavior works without unrelated features or refactors.
- [ ] Verify the user path and save a checkpoint.
  - Evidence: A test, browser check, or command receipt and a commit or handoff both exist.

Evidence to capture:
- Before state.
- Grounded plan.
- Working result.
- Verification output.
- Checkpoint.

Questions before completion:
- Did the agent inspect the actual files and current behavior before planning?
- Can you show the improvement through the user path rather than only through code?
- Did you stop after the scoped outcome passed instead of expanding the feature?

Traps to avoid:
- Giving a vague request such as make the app better.
- Accepting an impressive plan that never names the exact user path.
- Calling the task complete because code compiled without running the real behavior.

Stop rule:

When the promised path works, checkpoint it before asking for polish or another feature.

Exit criteria:

One real user path works better, the result is verified, and another agent can review or resume it.

## Module 4 - Install Your Starter Skills

Focus: Install three customer-safe skills, understand where each agent discovers them, and customize one for your project.

Output: Three tested starter skills plus one project-specific customization.

Operating question:

> Which instructions do I repeat often enough to become an on-demand skill?

Worksheet:

- Skill location for Claude Code:
- Skill location for Codex:
- Project Map test result:
- Build One Slice test result:
- Verify Before Done test result:
- Skill selected for customization:
- Project command added:
- Quality bar added:
- Unexpected behavior found:

Starter prompt:

> Audit the repeated instructions in this project. Recommend which belong in durable project guidance and which should become an on-demand skill. Explain the trigger for each recommendation.

Task checklist:
- [ ] Choose personal versus project skill locations.
  - Evidence: A note explains which skills should travel with this project and which should follow you everywhere.
- [ ] Install the three-skill starter pack.
  - Evidence: Three SKILL.md files exist in the intended Claude Code and/or Codex locations.
- [ ] Invoke and test every starter skill.
  - Evidence: Saved outputs show Project Map, Build One Slice, and Verify Before Done behaved as intended.
- [ ] Customize one skill for your project.
  - Evidence: The edited skill names a real trigger, command, output, and quality bar from the project.

Evidence to capture:
- Installed SKILL.md files.
- Invocation outputs.
- Customized skill diff.

Questions before completion:
- Does the skill description clearly say what it does and when to use it?
- Can the skill run without secrets, private paths, or assumptions from Murad's machine?
- Does the customized skill improve a repeated workflow instead of duplicating project guidance?

Traps to avoid:
- Installing dozens of skills before proving that three are useful.
- Copying a skill you have not inspected because its name sounds helpful.
- Putting a one-time task or a permanent project fact in the wrong instruction layer.

Stop rule:

Do not install another skill until you can name the repeated task it removes.

Exit criteria:

Your agents can reuse three proven workflows without you pasting the same instructions again.

## Module 5 - Ship Your First Useful Build

Focus: Finish a small, inspectable outcome that teaches the complete workflow without requiring a giant application.

Output: A locally verified or deployed first build with a README, verification receipt, and next-build handoff.

Operating question:

> What one user action can I ship and reproduce without turning the exercise into a full application?

Worksheet:

- Selected build track:
- User:
- Primary action:
- Visible success state:
- Failure or empty state:
- Non-goals:
- Clean-start commands:
- Verification evidence:
- Known limits:
- Next smallest build:

Starter prompt:

> Help me select one beginner-safe vertical slice for this project. It must have one user, one action, one visible success state, and a verification path I can run today. List non-goals before implementation.

Task checklist:
- [ ] Choose one first-build track.
  - Evidence: The Build Lab records one user, one action, one success state, and explicit non-goals.
- [ ] Ship one complete vertical slice.
  - Evidence: The real user can start, perform the core action, and see the success state.
- [ ] Run the clean-start verification path.
  - Evidence: Install, start, test, and build checks are recorded from a fresh session where applicable.
- [ ] Update the README and write the next-build handoff.
  - Evidence: The repository explains how to run the project, what shipped, known limits, and the next safe task.

Evidence to capture:
- Working user path.
- Clean-start verification.
- README update.
- Next-build handoff.

Questions before completion:
- Can another person understand what the build does in under 30 seconds?
- Can you reproduce the success state from a clean start?
- Does the handoff clearly separate what is done, what is not, and what should happen next?

Traps to avoid:
- Adding authentication, payments, AI, and automation before the core path works.
- Deploying before local verification or calling local verification a deployment.
- Finishing the code but leaving no README, test receipt, or next action.

Stop rule:

Ship the smallest version that proves the path; move every extra idea into the next-build list.

Exit criteria:

You have one useful build, a repeatable verification path, and a clean handoff for the next session.
