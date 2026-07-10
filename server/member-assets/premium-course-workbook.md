# The Future Proof Method - Course Workbook

This workbook contains the deeper teaching behind the five-module path. Use the member portal for the next task and progress tracking; open this file when you need the framework, workshop, example, or quality bar.

# Module 1 - Set Up Both AI Builders

Install, sign in, and safely verify Claude Code and Codex inside one practice project.

## Deep lesson

### Remove setup uncertainty before it becomes build anxiety.

Promise: By the end of this module, you can open one safe project in Claude Code and Codex, understand what each tool can access, and complete a read-only first session.

Estimated time: 30-60 minutes

Framework:
- Choose: Pick the surfaces and account path you will actually use instead of installing every option.
- Verify: Confirm versions, authentication, project location, and Git before asking for edits.
- Bound: Keep the agent inside one project and keep credentials outside chat and source control.

Teaching notes:
### One project is the safest classroom

Beginners often launch an agent from a broad folder and then approve access without understanding the boundary. A dedicated practice project makes every file visible, disposable, and easy to inspect.

- Create a folder for the course instead of starting from your home directory.
- Put a short README inside so the agent has an obvious purpose to explain.
- Use read-only questions before asking either agent to edit anything.

### Permissions are part of the workflow

Permission prompts are not interruptions to click through. They are the moment you confirm what command will run, where it will run, and whether the action matches the task.

- Read commands before approval and ask the agent to explain unfamiliar ones.
- Do not enable broad bypass modes during beginner setup.
- Keep production dashboards, payment systems, and secret files outside the practice project.

### The first win is an explanation

A good first session proves that the agent can find files, understand context, and wait for direction. You do not need to generate an app on the first prompt.

- Ask what the project does and where the entry point would be.
- Compare how Claude Code and Codex explain the same folder.
- Save what confused you so the troubleshooting guide can solve the real issue.

Workshop:
### Verify the machine

1. Open the Install + Verify Pack for your operating system.
2. Confirm Git and the two agent surfaces are available.
3. Record versions without pasting tokens or account secrets.

### Create the practice project

1. Create one dedicated folder and a one-paragraph README.
2. Open the folder in each agent separately.
3. Confirm the working directory before continuing.

### Run the read-only comparison

1. Use the starter prompt in Claude Code.
2. Use the same prompt in Codex.
3. Save one sentence about which explanation was clearer and why.

Example:
- Before: Open the terminal in my home folder and build me an app.
- After: Open a dedicated practice project, verify the working directory, ask the agent to explain the files, and approve no edits yet.
- Why it works:
  - The file boundary is understandable.
  - The task proves access and context before code generation.
  - Any mistake is contained inside a disposable project.

Copy-ready script:
> Do not edit anything yet.

> Tell me what files you can see and what this project appears to do.

> Name the safest first task for a beginner and wait for my approval.

Quality bar:
- Both tools can open the intended project.
- The working directory and permission boundary are understood.
- No secret, private file, or unrelated folder was exposed.


## Implementation assignment

- [ ] Choose your Claude Code and Codex surfaces.
  - Evidence: A note names the terminal, desktop, or IDE surfaces you will use and the account attached to each.
- [ ] Install and verify Claude Code, Codex, and Git.
  - Evidence: Version output or a screenshot confirms all three tools are available.
- [ ] Create and open a dedicated practice project.
  - Evidence: The project has its own folder and a short README describing what it is for.
- [ ] Run the first read-only inspection in both agents.
  - Evidence: Claude Code and Codex each explain the project without editing a file.

## Exit receipt

- Output: A toolchain receipt showing Claude Code, Codex, and Git can open the same practice project.
- Verification: Save the three version results and one screenshot or note showing both agents can read the project.
- Done: Both agents can enter one safe project, explain it, and wait for a scoped task.

---

# Module 2 - Make the Project AI-Ready

Give both agents the same brief, durable rules, commands, safety boundaries, and definition of done.

## Deep lesson

### Make the project carry the context.

Promise: By the end of this module, either agent can enter the repository, understand the goal, find verified commands, respect safety boundaries, and know what completion means.

Estimated time: 45-90 minutes

Framework:
- Brief: Define the user, problem, first outcome, non-goals, and success check in one page.
- Guide: Store durable, concise instructions where each agent discovers them.
- Checkpoint: Protect secrets and create a clean baseline before feature work begins.

Teaching notes:
### A prompt is not a project brief

A prompt asks for a task now. A project brief preserves the decisions every future task needs: who the user is, what problem matters, what the current version includes, and what stays out.

- Write one primary user and one primary problem.
- Name the first useful outcome in observable language.
- Create a non-goal list before the agent invents scope for you.

### Use the right instruction layer

Durable project facts belong in AGENTS.md or CLAUDE.md. Long procedures belong in skills. One-time requests stay in the conversation. Mixing these layers creates bloated context and contradictory rules.

- Keep project guidance short and specific.
- Add verified build, test, and formatting commands.
- Move repeated multi-step workflows into skills later.

### Git is the confidence layer

A baseline checkpoint lets you compare changes, review generated work, and return to a known state. It turns experimentation into a controlled process instead of a memory test.

- Ignore environment files and generated output before the first commit.
- Review the staged files instead of blindly adding everything.
- Use descriptive checkpoints around working outcomes.

Workshop:
### Write the brief

1. Complete the purpose, user, problem, first outcome, and non-goals.
2. Add the exact success state a person can observe.
3. Remove any requirement that belongs after the first working slice.

### Create shared guidance

1. Ask one agent to inspect the project and propose concise guidance.
2. Verify every command against package scripts or project documentation.
3. Create the Claude Code file by importing or mirroring shared project facts without contradiction.

### Protect and checkpoint

1. Review .gitignore and scan for environment files.
2. Inspect the diff and staged file list.
3. Create the baseline checkpoint and ask the second agent to review it.

Example:
- Before: Always make good code and make the design look professional.
- After: Run npm test and npm run build before completion. Keep cards at 8px radius or less. Do not edit .env files. Verify the signup path in a browser after UI changes.
- Why it works:
  - The rules are observable and testable.
  - Commands and protected files are explicit.
  - The guidance is tied to this project rather than generic taste.

Copy-ready script:
> Separate permanent project facts from one-time task instructions.

> Verify every build and test command before writing it into guidance.

> Flag any rule that is vague, duplicated, contradictory, or machine-specific.

Quality bar:
- The project brief fits on one page.
- A fresh agent can locate verified commands and safety rules.
- The baseline contains no credentials or unrelated generated files.


## Implementation assignment

- [ ] Write the one-page project brief.
  - Evidence: The brief names the user, pain, first outcome, non-goals, and success check.
- [ ] Create AGENTS.md and CLAUDE.md guidance.
  - Evidence: Both files contain verified commands, key paths, conventions, safety rules, and definition of done.
- [ ] Protect secrets and local-only files.
  - Evidence: .gitignore covers environment files and the repository scan shows no pasted credentials.
- [ ] Create the baseline Git checkpoint.
  - Evidence: A descriptive commit or equivalent saved checkpoint exists before feature work begins.

## Exit receipt

- Output: An AI-ready project packet with a brief, AGENTS.md, CLAUDE.md, .gitignore, and first Git checkpoint.
- Verification: A clean repository contains the project packet and no secrets.
- Done: Either agent can enter the project, find the rules, and explain how work will be verified.

---

# Module 3 - Run the Operator Loop

Use the repeatable inspect, plan, build, verify, and checkpoint loop on one narrow change.

## Deep lesson

### Direct the work. Verify the result.

Promise: By the end of this module, you can move one real user path through inspect, plan, build, verify, and checkpoint without losing control of scope.

Estimated time: 60-150 minutes

Framework:
- Inspect: Ground the task in the actual files, behavior, risks, and user path before edits.
- Build: Implement one vertical slice with explicit non-goals and a stop condition.
- Verify: Run the real path, review the diff, and checkpoint the working result.

Teaching notes:
### Outcome beats feature list

The agent needs a user-visible outcome more than a long feature list. One person should be able to perform one action and see one success state when the loop ends.

- Name the current behavior before requesting the new behavior.
- List non-goals so the agent cannot quietly broaden the task.
- Define the stop condition before implementation starts.

### Inspection prevents confident guessing

Agents can produce convincing plans from incomplete context. Require the plan to cite files, explain the current path, and name risks before you trust it.

- Ask for relevant files and request flow.
- Correct a wrong assumption before any edits.
- Use the second agent as a reviewer when the change is risky or unfamiliar.

### Verification is part of building

A clean compile is useful, but the user path is the product. Completion should include the appropriate tests, build command, browser path, and diff review for the change.

- Run narrow checks during the edit loop and broad checks before completion.
- Capture the command or browser evidence that proves the path.
- Checkpoint before asking for polish or additional features.

Workshop:
### Write the build brief

1. Choose one user path and capture its starting state.
2. Write the expected success state and non-goals.
3. Name the verification path and stop condition.

### Run inspect and build

1. Ask the agent to inspect and propose a small plan.
2. Review assumptions and approve only the scoped path.
3. Implement in checkpoints and keep unrelated changes out.

### Verify and review

1. Run project-specific checks and the real user path.
2. Ask the second agent to review the diff for regressions and missing tests.
3. Save the checkpoint and handoff while the context is fresh.

Example:
- Before: Make my member area easier to use.
- After: Inspect the member dashboard. Make the first unfinished lesson the only primary action on mobile, keep existing auth and progress behavior, and verify the authenticated path at 390px and 1440px.
- Why it works:
  - The exact surface and user problem are named.
  - Preserved behavior and viewport checks constrain the work.
  - The requested outcome can be inspected after implementation.

Copy-ready script:
> Inspect the current path and cite the relevant files before editing.

> Implement the smallest change that satisfies the agreed success state.

> Run the real verification path, review the diff, and stop when the scoped result passes.

Quality bar:
- The plan is grounded in the current code and user path.
- The implementation stays inside explicit non-goals.
- Verification evidence and a checkpoint exist before expansion.


## Implementation assignment

- [ ] Write one narrow build brief.
  - Evidence: The brief names the user path, outcome, non-goals, risks, and stop condition.
- [ ] Make the agent inspect before it plans.
  - Evidence: The plan cites relevant files and current behavior before proposing edits.
- [ ] Implement the smallest useful slice.
  - Evidence: The requested behavior works without unrelated features or refactors.
- [ ] Verify the user path and save a checkpoint.
  - Evidence: A test, browser check, or command receipt and a commit or handoff both exist.

## Exit receipt

- Output: One working change with an inspection note, approved plan, verification receipt, and checkpoint.
- Verification: The project-specific verification path passes and the before/after can be explained in one sentence.
- Done: One real user path works better, the result is verified, and another agent can review or resume it.

---

# Module 4 - Install Your Starter Skills

Turn your best repeated instructions into reusable skills that work with Claude Code and Codex.

## Deep lesson

### Turn repeated instructions into tools your agents remember.

Promise: By the end of this module, you can install, test, and customize reusable skills without bloating project instructions or trusting unknown automation blindly.

Estimated time: 45-90 minutes

Framework:
- Place: Choose personal or project scope based on who and what should receive the workflow.
- Trigger: Write a precise description so the right task loads the skill and unrelated tasks do not.
- Prove: Invoke the skill on a real project, inspect its behavior, and customize from evidence.

Teaching notes:
### Guidance and skills solve different problems

Always-needed project facts belong in agent guidance. A skill is best for a repeatable procedure that should load only when relevant, such as mapping a project, scoping a slice, or verifying completion.

- Keep build commands and conventions in project guidance.
- Keep multi-step workflows in skills.
- Keep one-time implementation details in the task prompt.

### A skill needs a clear contract

The skill description should name the trigger, and the body should define inputs, steps, output, safety boundaries, and stop conditions. More words do not make a better skill.

- Use a specific name and description.
- Define what the skill must not change or assume.
- Make the expected output easy to review.

### Inspect before installing

A skill can contain scripts, tool permissions, and external references. Read the entire folder before installing it and avoid any package that asks for secrets or broad destructive access without a clear reason.

- Read SKILL.md and supporting scripts.
- Check paths, commands, and network calls.
- Test in a practice project before using it on important work.

Workshop:
### Install the pack

1. Choose project or personal locations for each agent.
2. Create the skill folders and add the provided SKILL.md files.
3. Restart only if your current surface does not detect the new directory.

### Test the triggers

1. Invoke each skill explicitly once.
2. Try one natural-language request that should match the description.
3. Record unexpected behavior before editing the skill.

### Customize one workflow

1. Pick the skill that removed the most repeated prompting.
2. Add the project's actual commands and quality bar.
3. Run it again and compare the output with the original.

Example:
- Before: Helps with coding.
- After: Maps an unfamiliar repository before implementation. Use when the user asks where a feature lives, how a request flows, or what files a change should touch.
- Why it works:
  - The workflow is specific.
  - The trigger phrases are observable.
  - The description does not claim unrelated capabilities.

Copy-ready script:
> Explain when this skill should and should not run.

> List every command, file path, tool permission, and network action it can trigger.

> Recommend the smallest edit that makes its output safer and easier to verify.

Quality bar:
- Every installed skill has a clear trigger and reviewable output.
- No skill contains private paths, secrets, or unexplained broad permissions.
- At least one skill is customized and proven on the member's project.


## Implementation assignment

- [ ] Choose personal versus project skill locations.
  - Evidence: A note explains which skills should travel with this project and which should follow you everywhere.
- [ ] Install the three-skill starter pack.
  - Evidence: Three SKILL.md files exist in the intended Claude Code and/or Codex locations.
- [ ] Invoke and test every starter skill.
  - Evidence: Saved outputs show Project Map, Build One Slice, and Verify Before Done behaved as intended.
- [ ] Customize one skill for your project.
  - Evidence: The edited skill names a real trigger, command, output, and quality bar from the project.

## Exit receipt

- Output: Three tested starter skills plus one project-specific customization.
- Verification: Each agent can discover or explicitly run at least one installed skill.
- Done: Your agents can reuse three proven workflows without you pasting the same instructions again.

---

# Module 5 - Ship Your First Useful Build

Choose a beginner-safe build track, ship one vertical slice, and package the result for the next session.

## Deep lesson

### Finish one useful path before chasing a full product.

Promise: By the end of this module, you can reproduce one working user outcome, explain how it was verified, and hand the project to your next AI session without losing context.

Estimated time: 2-4 hours

Framework:
- Select: Choose one beginner-safe track and reduce it to one user, one action, and one success state.
- Ship: Build the complete vertical slice and move every extra feature into a later list.
- Handoff: Run clean-start QA, update the README, and name the next smallest improvement.

Teaching notes:
### A vertical slice teaches the whole system

A small path that reaches from user action to visible result teaches more than several disconnected screens. It forces you to make scope, state, error, and verification decisions without requiring a giant app.

- One user performs one primary action.
- The application shows one clear success state.
- An error or empty state is handled without crashing the path.

### Clean-start QA catches hidden assumptions

A build can work only because your terminal, browser, or local files are already prepared. Restart the path from a clean state so your README and handoff describe reality.

- Start from the documented project directory.
- Run install, start, test, and build commands where they apply.
- Verify the same action a user will perform.

### The handoff protects momentum

A useful handoff records what changed, how to verify it, what remains risky, and what should happen next. It prevents the next session from reopening solved decisions or guessing at unfinished work.

- Name the shipped path and evidence.
- List known limits without hiding them.
- Choose one next task and explain why it comes next.

Workshop:
### Choose the track

1. Pick new tool, existing-project improvement, or workflow automation.
2. Write one user, one action, one result, and three non-goals.
3. Confirm the result can be verified today.

### Run the complete loop

1. Use the build brief and make the agent inspect first.
2. Implement the vertical slice and handle one failure state.
3. Run the real path and stop when the agreed result passes.

### Package the result

1. Run clean-start verification and save the receipt.
2. Update the README with real commands and current behavior.
3. Write the handoff and create the final checkpoint.

Example:
- Before: Build a complete client portal with auth, billing, chat, uploads, and AI.
- After: Build one client request page that validates a form, saves a local or test record, and shows a confirmation state. Defer accounts, payments, chat, and production storage.
- Why it works:
  - The user and action are clear.
  - The success state can be tested in one session.
  - Large infrastructure decisions are explicit non-goals.

Copy-ready script:
> Keep this to one user, one action, and one visible success state.

> Move every extra feature into a next-build list instead of implementing it now.

> Before completion, reproduce the result from a clean start and write the handoff.

Quality bar:
- The promised user path works from start to success.
- The verification can be repeated from documented commands.
- README, known limits, checkpoint, and next-build handoff exist.


## Implementation assignment

- [ ] Choose one first-build track.
  - Evidence: The Build Lab records one user, one action, one success state, and explicit non-goals.
- [ ] Ship one complete vertical slice.
  - Evidence: The real user can start, perform the core action, and see the success state.
- [ ] Run the clean-start verification path.
  - Evidence: Install, start, test, and build checks are recorded from a fresh session where applicable.
- [ ] Update the README and write the next-build handoff.
  - Evidence: The repository explains how to run the project, what shipped, known limits, and the next safe task.

## Exit receipt

- Output: A locally verified or deployed first build with a README, verification receipt, and next-build handoff.
- Verification: A fresh browser or terminal session can reproduce the promised result.
- Done: You have one useful build, a repeatable verification path, and a clean handoff for the next session.
