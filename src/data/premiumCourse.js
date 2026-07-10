export const premiumModuleContent = {
  "setup-both-builders": {
    headline: "Remove setup uncertainty before it becomes build anxiety.",
    promise:
      "By the end of this module, you can open one safe project in Claude Code and Codex, understand what each tool can access, and complete a read-only first session.",
    estimatedTime: "30-60 minutes",
    framework: [
      { name: "Choose", body: "Pick the surfaces and account path you will actually use instead of installing every option." },
      { name: "Verify", body: "Confirm versions, authentication, project location, and Git before asking for edits." },
      { name: "Bound", body: "Keep the agent inside one project and keep credentials outside chat and source control." },
    ],
    lessonBlocks: [
      {
        title: "One project is the safest classroom",
        body:
          "Beginners often launch an agent from a broad folder and then approve access without understanding the boundary. A dedicated practice project makes every file visible, disposable, and easy to inspect.",
        bullets: [
          "Create a folder for the course instead of starting from your home directory.",
          "Put a short README inside so the agent has an obvious purpose to explain.",
          "Use read-only questions before asking either agent to edit anything.",
        ],
      },
      {
        title: "Permissions are part of the workflow",
        body:
          "Permission prompts are not interruptions to click through. They are the moment you confirm what command will run, where it will run, and whether the action matches the task.",
        bullets: [
          "Read commands before approval and ask the agent to explain unfamiliar ones.",
          "Do not enable broad bypass modes during beginner setup.",
          "Keep production dashboards, payment systems, and secret files outside the practice project.",
        ],
      },
      {
        title: "The first win is an explanation",
        body:
          "A good first session proves that the agent can find files, understand context, and wait for direction. You do not need to generate an app on the first prompt.",
        bullets: [
          "Ask what the project does and where the entry point would be.",
          "Compare how Claude Code and Codex explain the same folder.",
          "Save what confused you so the troubleshooting guide can solve the real issue.",
        ],
      },
    ],
    workshop: [
      {
        title: "Verify the machine",
        steps: [
          "Open the Install + Verify Pack for your operating system.",
          "Confirm Git and the two agent surfaces are available.",
          "Record versions without pasting tokens or account secrets.",
        ],
      },
      {
        title: "Create the practice project",
        steps: [
          "Create one dedicated folder and a one-paragraph README.",
          "Open the folder in each agent separately.",
          "Confirm the working directory before continuing.",
        ],
      },
      {
        title: "Run the read-only comparison",
        steps: [
          "Use the starter prompt in Claude Code.",
          "Use the same prompt in Codex.",
          "Save one sentence about which explanation was clearer and why.",
        ],
      },
    ],
    example: {
      title: "Safe first session",
      before: "Open the terminal in my home folder and build me an app.",
      after:
        "Open a dedicated practice project, verify the working directory, ask the agent to explain the files, and approve no edits yet.",
      breakdown: [
        "The file boundary is understandable.",
        "The task proves access and context before code generation.",
        "Any mistake is contained inside a disposable project.",
      ],
    },
    swipe: {
      title: "First-session script",
      lines: [
        "Do not edit anything yet.",
        "Tell me what files you can see and what this project appears to do.",
        "Name the safest first task for a beginner and wait for my approval.",
      ],
    },
    qualityBar: [
      "Both tools can open the intended project.",
      "The working directory and permission boundary are understood.",
      "No secret, private file, or unrelated folder was exposed.",
    ],
  },
  "ai-ready-project": {
    headline: "Make the project carry the context.",
    promise:
      "By the end of this module, either agent can enter the repository, understand the goal, find verified commands, respect safety boundaries, and know what completion means.",
    estimatedTime: "45-90 minutes",
    framework: [
      { name: "Brief", body: "Define the user, problem, first outcome, non-goals, and success check in one page." },
      { name: "Guide", body: "Store durable, concise instructions where each agent discovers them." },
      { name: "Checkpoint", body: "Protect secrets and create a clean baseline before feature work begins." },
    ],
    lessonBlocks: [
      {
        title: "A prompt is not a project brief",
        body:
          "A prompt asks for a task now. A project brief preserves the decisions every future task needs: who the user is, what problem matters, what the current version includes, and what stays out.",
        bullets: [
          "Write one primary user and one primary problem.",
          "Name the first useful outcome in observable language.",
          "Create a non-goal list before the agent invents scope for you.",
        ],
      },
      {
        title: "Use the right instruction layer",
        body:
          "Durable project facts belong in AGENTS.md or CLAUDE.md. Long procedures belong in skills. One-time requests stay in the conversation. Mixing these layers creates bloated context and contradictory rules.",
        bullets: [
          "Keep project guidance short and specific.",
          "Add verified build, test, and formatting commands.",
          "Move repeated multi-step workflows into skills later.",
        ],
      },
      {
        title: "Git is the confidence layer",
        body:
          "A baseline checkpoint lets you compare changes, review generated work, and return to a known state. It turns experimentation into a controlled process instead of a memory test.",
        bullets: [
          "Ignore environment files and generated output before the first commit.",
          "Review the staged files instead of blindly adding everything.",
          "Use descriptive checkpoints around working outcomes.",
        ],
      },
    ],
    workshop: [
      {
        title: "Write the brief",
        steps: [
          "Complete the purpose, user, problem, first outcome, and non-goals.",
          "Add the exact success state a person can observe.",
          "Remove any requirement that belongs after the first working slice.",
        ],
      },
      {
        title: "Create shared guidance",
        steps: [
          "Ask one agent to inspect the project and propose concise guidance.",
          "Verify every command against package scripts or project documentation.",
          "Create the Claude Code file by importing or mirroring shared project facts without contradiction.",
        ],
      },
      {
        title: "Protect and checkpoint",
        steps: [
          "Review .gitignore and scan for environment files.",
          "Inspect the diff and staged file list.",
          "Create the baseline checkpoint and ask the second agent to review it.",
        ],
      },
    ],
    example: {
      title: "Project guidance example",
      before: "Always make good code and make the design look professional.",
      after:
        "Run npm test and npm run build before completion. Keep cards at 8px radius or less. Do not edit .env files. Verify the signup path in a browser after UI changes.",
      breakdown: [
        "The rules are observable and testable.",
        "Commands and protected files are explicit.",
        "The guidance is tied to this project rather than generic taste.",
      ],
    },
    swipe: {
      title: "Instruction audit script",
      lines: [
        "Separate permanent project facts from one-time task instructions.",
        "Verify every build and test command before writing it into guidance.",
        "Flag any rule that is vague, duplicated, contradictory, or machine-specific.",
      ],
    },
    qualityBar: [
      "The project brief fits on one page.",
      "A fresh agent can locate verified commands and safety rules.",
      "The baseline contains no credentials or unrelated generated files.",
    ],
  },
  "operator-loop": {
    headline: "Direct the work. Verify the result.",
    promise:
      "By the end of this module, you can move one real user path through inspect, plan, build, verify, and checkpoint without losing control of scope.",
    estimatedTime: "60-150 minutes",
    framework: [
      { name: "Inspect", body: "Ground the task in the actual files, behavior, risks, and user path before edits." },
      { name: "Build", body: "Implement one vertical slice with explicit non-goals and a stop condition." },
      { name: "Verify", body: "Run the real path, review the diff, and checkpoint the working result." },
    ],
    lessonBlocks: [
      {
        title: "Outcome beats feature list",
        body:
          "The agent needs a user-visible outcome more than a long feature list. One person should be able to perform one action and see one success state when the loop ends.",
        bullets: [
          "Name the current behavior before requesting the new behavior.",
          "List non-goals so the agent cannot quietly broaden the task.",
          "Define the stop condition before implementation starts.",
        ],
      },
      {
        title: "Inspection prevents confident guessing",
        body:
          "Agents can produce convincing plans from incomplete context. Require the plan to cite files, explain the current path, and name risks before you trust it.",
        bullets: [
          "Ask for relevant files and request flow.",
          "Correct a wrong assumption before any edits.",
          "Use the second agent as a reviewer when the change is risky or unfamiliar.",
        ],
      },
      {
        title: "Verification is part of building",
        body:
          "A clean compile is useful, but the user path is the product. Completion should include the appropriate tests, build command, browser path, and diff review for the change.",
        bullets: [
          "Run narrow checks during the edit loop and broad checks before completion.",
          "Capture the command or browser evidence that proves the path.",
          "Checkpoint before asking for polish or additional features.",
        ],
      },
    ],
    workshop: [
      {
        title: "Write the build brief",
        steps: [
          "Choose one user path and capture its starting state.",
          "Write the expected success state and non-goals.",
          "Name the verification path and stop condition.",
        ],
      },
      {
        title: "Run inspect and build",
        steps: [
          "Ask the agent to inspect and propose a small plan.",
          "Review assumptions and approve only the scoped path.",
          "Implement in checkpoints and keep unrelated changes out.",
        ],
      },
      {
        title: "Verify and review",
        steps: [
          "Run project-specific checks and the real user path.",
          "Ask the second agent to review the diff for regressions and missing tests.",
          "Save the checkpoint and handoff while the context is fresh.",
        ],
      },
    ],
    example: {
      title: "Scoped build request",
      before: "Make my member area easier to use.",
      after:
        "Inspect the member dashboard. Make the first unfinished lesson the only primary action on mobile, keep existing auth and progress behavior, and verify the authenticated path at 390px and 1440px.",
      breakdown: [
        "The exact surface and user problem are named.",
        "Preserved behavior and viewport checks constrain the work.",
        "The requested outcome can be inspected after implementation.",
      ],
    },
    swipe: {
      title: "Operator-loop script",
      lines: [
        "Inspect the current path and cite the relevant files before editing.",
        "Implement the smallest change that satisfies the agreed success state.",
        "Run the real verification path, review the diff, and stop when the scoped result passes.",
      ],
    },
    qualityBar: [
      "The plan is grounded in the current code and user path.",
      "The implementation stays inside explicit non-goals.",
      "Verification evidence and a checkpoint exist before expansion.",
    ],
  },
  "starter-skills": {
    headline: "Turn repeated instructions into tools your agents remember.",
    promise:
      "By the end of this module, you can install, test, and customize reusable skills without bloating project instructions or trusting unknown automation blindly.",
    estimatedTime: "45-90 minutes",
    framework: [
      { name: "Place", body: "Choose personal or project scope based on who and what should receive the workflow." },
      { name: "Trigger", body: "Write a precise description so the right task loads the skill and unrelated tasks do not." },
      { name: "Prove", body: "Invoke the skill on a real project, inspect its behavior, and customize from evidence." },
    ],
    lessonBlocks: [
      {
        title: "Guidance and skills solve different problems",
        body:
          "Always-needed project facts belong in agent guidance. A skill is best for a repeatable procedure that should load only when relevant, such as mapping a project, scoping a slice, or verifying completion.",
        bullets: [
          "Keep build commands and conventions in project guidance.",
          "Keep multi-step workflows in skills.",
          "Keep one-time implementation details in the task prompt.",
        ],
      },
      {
        title: "A skill needs a clear contract",
        body:
          "The skill description should name the trigger, and the body should define inputs, steps, output, safety boundaries, and stop conditions. More words do not make a better skill.",
        bullets: [
          "Use a specific name and description.",
          "Define what the skill must not change or assume.",
          "Make the expected output easy to review.",
        ],
      },
      {
        title: "Inspect before installing",
        body:
          "A skill can contain scripts, tool permissions, and external references. Read the entire folder before installing it and avoid any package that asks for secrets or broad destructive access without a clear reason.",
        bullets: [
          "Read SKILL.md and supporting scripts.",
          "Check paths, commands, and network calls.",
          "Test in a practice project before using it on important work.",
        ],
      },
    ],
    workshop: [
      {
        title: "Install the pack",
        steps: [
          "Choose project or personal locations for each agent.",
          "Create the skill folders and add the provided SKILL.md files.",
          "Restart only if your current surface does not detect the new directory.",
        ],
      },
      {
        title: "Test the triggers",
        steps: [
          "Invoke each skill explicitly once.",
          "Try one natural-language request that should match the description.",
          "Record unexpected behavior before editing the skill.",
        ],
      },
      {
        title: "Customize one workflow",
        steps: [
          "Pick the skill that removed the most repeated prompting.",
          "Add the project's actual commands and quality bar.",
          "Run it again and compare the output with the original.",
        ],
      },
    ],
    example: {
      title: "Skill description",
      before: "Helps with coding.",
      after:
        "Maps an unfamiliar repository before implementation. Use when the user asks where a feature lives, how a request flows, or what files a change should touch.",
      breakdown: [
        "The workflow is specific.",
        "The trigger phrases are observable.",
        "The description does not claim unrelated capabilities.",
      ],
    },
    swipe: {
      title: "Skill audit script",
      lines: [
        "Explain when this skill should and should not run.",
        "List every command, file path, tool permission, and network action it can trigger.",
        "Recommend the smallest edit that makes its output safer and easier to verify.",
      ],
    },
    qualityBar: [
      "Every installed skill has a clear trigger and reviewable output.",
      "No skill contains private paths, secrets, or unexplained broad permissions.",
      "At least one skill is customized and proven on the member's project.",
    ],
  },
  "first-useful-build": {
    headline: "Finish one useful path before chasing a full product.",
    promise:
      "By the end of this module, you can reproduce one working user outcome, explain how it was verified, and hand the project to your next AI session without losing context.",
    estimatedTime: "2-4 hours",
    framework: [
      { name: "Select", body: "Choose one beginner-safe track and reduce it to one user, one action, and one success state." },
      { name: "Ship", body: "Build the complete vertical slice and move every extra feature into a later list." },
      { name: "Handoff", body: "Run clean-start QA, update the README, and name the next smallest improvement." },
    ],
    lessonBlocks: [
      {
        title: "A vertical slice teaches the whole system",
        body:
          "A small path that reaches from user action to visible result teaches more than several disconnected screens. It forces you to make scope, state, error, and verification decisions without requiring a giant app.",
        bullets: [
          "One user performs one primary action.",
          "The application shows one clear success state.",
          "An error or empty state is handled without crashing the path.",
        ],
      },
      {
        title: "Clean-start QA catches hidden assumptions",
        body:
          "A build can work only because your terminal, browser, or local files are already prepared. Restart the path from a clean state so your README and handoff describe reality.",
        bullets: [
          "Start from the documented project directory.",
          "Run install, start, test, and build commands where they apply.",
          "Verify the same action a user will perform.",
        ],
      },
      {
        title: "The handoff protects momentum",
        body:
          "A useful handoff records what changed, how to verify it, what remains risky, and what should happen next. It prevents the next session from reopening solved decisions or guessing at unfinished work.",
        bullets: [
          "Name the shipped path and evidence.",
          "List known limits without hiding them.",
          "Choose one next task and explain why it comes next.",
        ],
      },
    ],
    workshop: [
      {
        title: "Choose the track",
        steps: [
          "Pick new tool, existing-project improvement, or workflow automation.",
          "Write one user, one action, one result, and three non-goals.",
          "Confirm the result can be verified today.",
        ],
      },
      {
        title: "Run the complete loop",
        steps: [
          "Use the build brief and make the agent inspect first.",
          "Implement the vertical slice and handle one failure state.",
          "Run the real path and stop when the agreed result passes.",
        ],
      },
      {
        title: "Package the result",
        steps: [
          "Run clean-start verification and save the receipt.",
          "Update the README with real commands and current behavior.",
          "Write the handoff and create the final checkpoint.",
        ],
      },
    ],
    example: {
      title: "First-build scope",
      before: "Build a complete client portal with auth, billing, chat, uploads, and AI.",
      after:
        "Build one client request page that validates a form, saves a local or test record, and shows a confirmation state. Defer accounts, payments, chat, and production storage.",
      breakdown: [
        "The user and action are clear.",
        "The success state can be tested in one session.",
        "Large infrastructure decisions are explicit non-goals.",
      ],
    },
    swipe: {
      title: "First-ship script",
      lines: [
        "Keep this to one user, one action, and one visible success state.",
        "Move every extra feature into a next-build list instead of implementing it now.",
        "Before completion, reproduce the result from a clean start and write the handoff.",
      ],
    },
    qualityBar: [
      "The promised user path works from start to success.",
      "The verification can be repeated from documented commands.",
      "README, known limits, checkpoint, and next-build handoff exist.",
    ],
  },
};
