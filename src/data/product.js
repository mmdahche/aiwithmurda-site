import { premiumModuleContent } from "./premiumCourse.js";

export const productKey = "future_proof_method";
export const productName = "The Future Proof Method";
export const productSubtitle = "Claude Code + Codex Starter System";
export const productPriceCents = 4700;

export const firstBuildTracks = [
  {
    key: "new-project",
    label: "Start something new",
    title: "Build a small web tool",
    body: "Turn one useful idea into a single working screen before adding accounts, payments, or a large feature list.",
    firstMove: "Write the user, problem, one action, and success state in the Build Brief Canvas.",
    starterPrompt:
      "Help me reduce this idea to one useful screen. Ask for the user, problem, one action, and success state before proposing a stack.",
  },
  {
    key: "existing-project",
    label: "Improve an existing project",
    title: "Fix one real user path",
    body: "Use Claude Code or Codex to inspect what exists, identify the smallest valuable improvement, and verify the path after editing.",
    firstMove: "Choose one page, bug, or workflow that a real user touches and capture the before state.",
    starterPrompt:
      "Inspect this project before editing. Map the user path I describe, identify the smallest safe improvement, and tell me how we will verify it.",
  },
  {
    key: "workflow",
    label: "Automate a workflow",
    title: "Remove one manual bottleneck",
    body: "Map the input, decisions, output, failure cases, and approval points before choosing tools or writing code.",
    firstMove: "Write the current manual steps and circle the one handoff that wastes the most time.",
    starterPrompt:
      "Turn this manual workflow into a clear map of inputs, decisions, outputs, failure cases, and human approval points. Do not choose tools yet.",
  },
];

export const productModules = [
  {
    key: "setup-both-builders",
    title: "Module 1: Set Up Both AI Builders",
    body: "Install, sign in, and safely verify Claude Code and Codex inside one practice project.",
    premium: premiumModuleContent["setup-both-builders"],
    lesson: {
      focus: "Get both tools working without exposing secrets, skipping permissions, or learning terminal commands you do not need yet.",
      output: "A toolchain receipt showing Claude Code, Codex, and Git can open the same practice project.",
      useWith: ["60-Minute Quickstart", "Install + Verify Pack", "Troubleshooting Guide"],
      starterPrompt:
        "Do not edit anything yet. Inspect this practice project, explain what files are here, and tell me the safest first task for a beginner.",
      deliverables: [
        "Claude Code and Codex installed or available on a supported surface.",
        "Both tools authenticated and opened from the same practice project.",
        "A saved setup receipt with versions, project path, and any issue you solved.",
      ],
      proofQuestions: [
        "Can you open the project in each tool without changing directories blindly?",
        "Can each tool explain the project before asking to edit it?",
        "Did you keep API keys, passwords, and private files out of the chat and repository?",
      ],
      failureTraps: [
        "Starting in your home folder and giving the agent access to unrelated files.",
        "Approving commands you do not understand just to make a prompt disappear.",
        "Pasting a secret into chat, source code, a screenshot, or a committed file.",
      ],
    },
    operatorBrief: {
      window: "First 30-45 minutes",
      mode: "Guided setup",
      proof: "Version check, authenticated session, and one read-only project explanation from each tool.",
      why: "A clean setup removes tool confusion before the course asks you to build anything.",
    },
    actionKit: {
      timebox: "45 minutes",
      todayMove: "Verify Git, Claude Code, and Codex, then open one empty practice project in both agents.",
      runCommand: "git --version\nclaude --version\ncodex --version",
      proofCheckpoint: "Save the three version results and one screenshot or note showing both agents can read the project.",
      stopRule: "Stop and use the troubleshooting guide if an install command fails twice; do not stack random fixes.",
    },
    todos: [
      {
        key: "choose-surfaces",
        label: "Choose your Claude Code and Codex surfaces.",
        proof: "A note names the terminal, desktop, or IDE surfaces you will use and the account attached to each.",
      },
      {
        key: "verify-tools",
        label: "Install and verify Claude Code, Codex, and Git.",
        proof: "Version output or a screenshot confirms all three tools are available.",
      },
      {
        key: "practice-project",
        label: "Create and open a dedicated practice project.",
        proof: "The project has its own folder and a short README describing what it is for.",
      },
      {
        key: "first-inspection",
        label: "Run the first read-only inspection in both agents.",
        proof: "Claude Code and Codex each explain the project without editing a file.",
      },
    ],
    done: "Both agents can enter one safe project, explain it, and wait for a scoped task.",
  },
  {
    key: "ai-ready-project",
    title: "Module 2: Make the Project AI-Ready",
    body: "Give both agents the same brief, durable rules, commands, safety boundaries, and definition of done.",
    premium: premiumModuleContent["ai-ready-project"],
    lesson: {
      focus: "Replace repeated explanations with a small project packet that Claude Code and Codex can reliably follow.",
      output: "An AI-ready project packet with a brief, AGENTS.md, CLAUDE.md, .gitignore, and first Git checkpoint.",
      useWith: ["Dual-Agent Project Starter", "Core Prompt Scripts", "Verification + Handoff Checklist"],
      starterPrompt:
        "Inspect this project and draft the smallest useful project instructions. Include purpose, stack, important paths, build commands, test commands, safety boundaries, and definition of done. Do not invent commands you have not verified.",
      deliverables: [
        "A one-page project brief naming the user, problem, scope, and first outcome.",
        "Concise AGENTS.md and CLAUDE.md guidance that share the same project facts.",
        "A .gitignore and baseline commit that keep secrets and generated files out of version history.",
      ],
      proofQuestions: [
        "Can a new agent explain the project without a long custom prompt?",
        "Are build and test commands copied from the project instead of guessed?",
        "Are secrets, production actions, and destructive commands explicitly bounded?",
      ],
      failureTraps: [
        "Turning project instructions into a giant handbook the agent will ignore.",
        "Adding personal secrets or machine-specific paths to shared project files.",
        "Writing rules that conflict across AGENTS.md, CLAUDE.md, and the actual codebase.",
      ],
    },
    operatorBrief: {
      window: "45-75 minutes",
      mode: "Project priming",
      proof: "Project brief, shared instructions, ignored secret files, and a clean Git baseline.",
      why: "Good context makes every future prompt shorter and reduces repeated agent mistakes.",
    },
    actionKit: {
      timebox: "60 minutes",
      todayMove: "Write the project brief, generate minimal agent instructions, verify commands, and commit the baseline.",
      runCommand: "git status\ngit diff -- . ':!package-lock.json'\ngit log -1 --oneline",
      proofCheckpoint: "A clean repository contains the project packet and no secrets.",
      stopRule: "Do not add a rule unless it is project-specific, testable, and useful in more than one session.",
    },
    todos: [
      {
        key: "project-brief",
        label: "Write the one-page project brief.",
        proof: "The brief names the user, pain, first outcome, non-goals, and success check.",
      },
      {
        key: "agent-guidance",
        label: "Create AGENTS.md and CLAUDE.md guidance.",
        proof: "Both files contain verified commands, key paths, conventions, safety rules, and definition of done.",
      },
      {
        key: "secret-boundary",
        label: "Protect secrets and local-only files.",
        proof: ".gitignore covers environment files and the repository scan shows no pasted credentials.",
      },
      {
        key: "baseline-commit",
        label: "Create the baseline Git checkpoint.",
        proof: "A descriptive commit or equivalent saved checkpoint exists before feature work begins.",
      },
    ],
    done: "Either agent can enter the project, find the rules, and explain how work will be verified.",
  },
  {
    key: "operator-loop",
    title: "Module 3: Run the Operator Loop",
    body: "Use the repeatable inspect, plan, build, verify, and checkpoint loop on one narrow change.",
    premium: premiumModuleContent["operator-loop"],
    lesson: {
      focus: "Direct the agent with a clear outcome and stop condition instead of asking it to build an entire idea at once.",
      output: "One working change with an inspection note, approved plan, verification receipt, and checkpoint.",
      useWith: ["Core Prompt Scripts", "Dual-Agent Project Starter", "Verification + Handoff Checklist"],
      starterPrompt:
        "Inspect the relevant files first. Map the current user path, identify the smallest change that creates the requested outcome, list risks, and propose a verification plan. Do not edit until the plan is clear.",
      deliverables: [
        "A build brief with one user path, one outcome, non-goals, and a stop condition.",
        "The smallest implementation that changes the real user path.",
        "A test, browser, or command receipt plus a saved checkpoint another agent can review.",
      ],
      proofQuestions: [
        "Did the agent inspect the actual files and current behavior before planning?",
        "Can you show the improvement through the user path rather than only through code?",
        "Did you stop after the scoped outcome passed instead of expanding the feature?",
      ],
      failureTraps: [
        "Giving a vague request such as make the app better.",
        "Accepting an impressive plan that never names the exact user path.",
        "Calling the task complete because code compiled without running the real behavior.",
      ],
    },
    operatorBrief: {
      window: "60-120 minutes",
      mode: "Verified build loop",
      proof: "Before state, scoped plan, working change, verification output, and checkpoint.",
      why: "This is the daily operating loop that turns AI speed into dependable progress.",
    },
    actionKit: {
      timebox: "90 minutes",
      todayMove: "Choose one user-visible change and run inspect, plan, build, verify, and checkpoint in order.",
      runCommand: "git diff --check\nnpm test\nnpm run build",
      proofCheckpoint: "The project-specific verification path passes and the before/after can be explained in one sentence.",
      stopRule: "When the promised path works, checkpoint it before asking for polish or another feature.",
    },
    todos: [
      {
        key: "build-brief",
        label: "Write one narrow build brief.",
        proof: "The brief names the user path, outcome, non-goals, risks, and stop condition.",
      },
      {
        key: "inspect-plan",
        label: "Make the agent inspect before it plans.",
        proof: "The plan cites relevant files and current behavior before proposing edits.",
      },
      {
        key: "build-slice",
        label: "Implement the smallest useful slice.",
        proof: "The requested behavior works without unrelated features or refactors.",
      },
      {
        key: "verify-checkpoint",
        label: "Verify the user path and save a checkpoint.",
        proof: "A test, browser check, or command receipt and a commit or handoff both exist.",
      },
    ],
    done: "One real user path works better, the result is verified, and another agent can review or resume it.",
  },
  {
    key: "starter-skills",
    title: "Module 4: Install Your Starter Skills",
    body: "Turn your best repeated instructions into reusable skills that work with Claude Code and Codex.",
    premium: premiumModuleContent["starter-skills"],
    lesson: {
      focus: "Install three customer-safe skills, understand where each agent discovers them, and customize one for your project.",
      output: "Three tested starter skills plus one project-specific customization.",
      useWith: ["Starter Skill Pack", "Core Prompt Scripts", "Troubleshooting Guide"],
      starterPrompt:
        "Audit the repeated instructions in this project. Recommend which belong in durable project guidance and which should become an on-demand skill. Explain the trigger for each recommendation.",
      deliverables: [
        "Project Map, Build One Slice, and Verify Before Done skills installed.",
        "One successful explicit invocation or matching natural-language trigger in each agent.",
        "One skill customized with the project's real commands and quality bar.",
      ],
      proofQuestions: [
        "Does the skill description clearly say what it does and when to use it?",
        "Can the skill run without secrets, private paths, or assumptions from Murad's machine?",
        "Does the customized skill improve a repeated workflow instead of duplicating project guidance?",
      ],
      failureTraps: [
        "Installing dozens of skills before proving that three are useful.",
        "Copying a skill you have not inspected because its name sounds helpful.",
        "Putting a one-time task or a permanent project fact in the wrong instruction layer.",
      ],
    },
    operatorBrief: {
      window: "45-90 minutes",
      mode: "Reusable workflow setup",
      proof: "Three installed skills, invocation receipts, and one customized workflow.",
      why: "Skills remove repeated prompting while keeping long procedures out of always-loaded project instructions.",
    },
    actionKit: {
      timebox: "60 minutes",
      todayMove: "Install the three-skill starter pack, test each skill, then customize only the most useful one.",
      runCommand: "find .agents/skills .claude/skills -name SKILL.md -maxdepth 3 2>/dev/null",
      proofCheckpoint: "Each agent can discover or explicitly run at least one installed skill.",
      stopRule: "Do not install another skill until you can name the repeated task it removes.",
    },
    todos: [
      {
        key: "skill-layers",
        label: "Choose personal versus project skill locations.",
        proof: "A note explains which skills should travel with this project and which should follow you everywhere.",
      },
      {
        key: "install-pack",
        label: "Install the three-skill starter pack.",
        proof: "Three SKILL.md files exist in the intended Claude Code and/or Codex locations.",
      },
      {
        key: "test-skills",
        label: "Invoke and test every starter skill.",
        proof: "Saved outputs show Project Map, Build One Slice, and Verify Before Done behaved as intended.",
      },
      {
        key: "customize-skill",
        label: "Customize one skill for your project.",
        proof: "The edited skill names a real trigger, command, output, and quality bar from the project.",
      },
    ],
    done: "Your agents can reuse three proven workflows without you pasting the same instructions again.",
  },
  {
    key: "first-useful-build",
    title: "Module 5: Ship Your First Useful Build",
    body: "Choose a beginner-safe build track, ship one vertical slice, and package the result for the next session.",
    premium: premiumModuleContent["first-useful-build"],
    lesson: {
      focus: "Finish a small, inspectable outcome that teaches the complete workflow without requiring a giant application.",
      output: "A locally verified or deployed first build with a README, verification receipt, and next-build handoff.",
      useWith: ["First Build Lab", "Verification + Handoff Checklist", "Troubleshooting Guide"],
      starterPrompt:
        "Help me select one beginner-safe vertical slice for this project. It must have one user, one action, one visible success state, and a verification path I can run today. List non-goals before implementation.",
      deliverables: [
        "One chosen track: new tool, existing-project improvement, or workflow automation.",
        "A working vertical slice tested through the real user path.",
        "A final README section, proof receipt, and handoff naming the next safe improvement.",
      ],
      proofQuestions: [
        "Can another person understand what the build does in under 30 seconds?",
        "Can you reproduce the success state from a clean start?",
        "Does the handoff clearly separate what is done, what is not, and what should happen next?",
      ],
      failureTraps: [
        "Adding authentication, payments, AI, and automation before the core path works.",
        "Deploying before local verification or calling local verification a deployment.",
        "Finishing the code but leaving no README, test receipt, or next action.",
      ],
    },
    operatorBrief: {
      window: "One focused build day",
      mode: "First ship",
      proof: "Working slice, clean-start verification, README update, and next-build handoff.",
      why: "The first complete loop builds confidence and creates a reusable starting point for every later project.",
    },
    actionKit: {
      timebox: "2-4 hours",
      todayMove: "Pick one track, build one vertical slice, run a clean-start check, and package the handoff.",
      runCommand: "git status\ngit diff --check\nnpm run build",
      proofCheckpoint: "A fresh browser or terminal session can reproduce the promised result.",
      stopRule: "Ship the smallest version that proves the path; move every extra idea into the next-build list.",
    },
    todos: [
      {
        key: "choose-track",
        label: "Choose one first-build track.",
        proof: "The Build Lab records one user, one action, one success state, and explicit non-goals.",
      },
      {
        key: "ship-vertical-slice",
        label: "Ship one complete vertical slice.",
        proof: "The real user can start, perform the core action, and see the success state.",
      },
      {
        key: "clean-start-qa",
        label: "Run the clean-start verification path.",
        proof: "Install, start, test, and build checks are recorded from a fresh session where applicable.",
      },
      {
        key: "package-handoff",
        label: "Update the README and write the next-build handoff.",
        proof: "The repository explains how to run the project, what shipped, known limits, and the next safe task.",
      },
    ],
    done: "You have one useful build, a repeatable verification path, and a clean handoff for the next session.",
  },
];

export const productTaskCount = productModules.reduce((total, module) => total + module.todos.length, 0);

export const courseCompletion = {
  title: "Future Proof Builder Certificate",
  subtitle: "Finish with a verified build, not a watched playlist.",
  promise:
    "Completion means both agents are usable, the project is AI-ready, the operator loop has shipped a real change, starter skills are installed, and one useful build can be reproduced.",
  capstone: {
    title: "First Build Handoff",
    body:
      "Package the five module outputs into one handoff another person or AI agent can use: setup, project rules, build brief, working result, verification, installed skills, and next move.",
    prompt:
      "Turn my completed Future Proof Method outputs into a concise first-build handoff. Include tool setup, project purpose, instructions, shipped user path, verification evidence, installed skills, known limits, and the next smallest build.",
    output: "One portfolio-ready build receipt and a practical handoff for the next session.",
  },
  criteria: [
    {
      key: "tools-ready",
      title: "Both builders are ready",
      proof: "Claude Code, Codex, and Git are verified inside one dedicated project.",
    },
    {
      key: "project-ready",
      title: "The project carries its own context",
      proof: "Brief, instructions, commands, secret boundaries, and baseline checkpoint exist.",
    },
    {
      key: "loop-proven",
      title: "The operator loop shipped a change",
      proof: "Inspect, plan, build, verify, and checkpoint receipts exist for one real user path.",
    },
    {
      key: "skills-ready",
      title: "Starter skills are installed",
      proof: "Three reusable skills were tested and one was customized for the project.",
    },
    {
      key: "first-build-shipped",
      title: "The first useful build is reproducible",
      proof: "The core path works from a clean start and the README and handoff explain what comes next.",
    },
  ],
  finalReceiptSections: [
    { title: "Setup receipt", prompt: "Which Claude Code, Codex, and Git surfaces did you verify?" },
    { title: "Project packet", prompt: "What context, commands, rules, and secret boundaries now travel with the project?" },
    { title: "Build brief", prompt: "Who is the user, what path did you improve, and what did you deliberately leave out?" },
    { title: "Working result", prompt: "What can a user do now that they could not do before?" },
    { title: "Verification", prompt: "Which test, browser path, build, or clean-start check proves the result works?" },
    { title: "Skills installed", prompt: "Which skills did you install, test, and customize?" },
    { title: "Next build", prompt: "What is the next smallest useful improvement and why should it come next?" },
  ],
  certificateCopy: [
    "I completed The Future Proof Method by setting up Claude Code and Codex, preparing an AI-ready project, and shipping a verified first build.",
    "Completion means the user path, verification receipt, starter skills, and project handoff can be inspected.",
    "My next move is another narrow build loop, not a larger pile of unverified features.",
  ],
};

export const memberStartPath = [
  { title: "1. Verify the tools", body: "Open the 60-Minute Quickstart and confirm both builders can read one project." },
  { title: "2. Follow one next task", body: "The member home always points to the next unfinished implementation step." },
  { title: "3. Ship the first path", body: "Use the Build Lab and verification checklist to finish one reproducible result." },
];

export const memberOnboardingSteps = [
  {
    key: "quickstart",
    title: "Download the 60-Minute Quickstart",
    body: "Use the guided setup path instead of bouncing between random tutorials.",
    assetTitle: "60-Minute Quickstart",
  },
  {
    key: "scripts",
    title: "Download the Core Prompt Scripts",
    body: "Keep the inspect, plan, build, verify, and handoff prompts beside your project.",
    assetTitle: "Core Prompt Scripts",
  },
  {
    key: "module-one",
    title: "Open Module 1",
    body: "Set up both builders before installing skills or starting a real project.",
    href: "/members/module/setup-both-builders",
  },
  {
    key: "first-task",
    title: "Choose your two working surfaces",
    body: "Name where you will use Claude Code and Codex, then mark the first task complete.",
    moduleKey: "setup-both-builders",
    taskKey: "choose-surfaces",
  },
];

export const buyerOnboardingEmails = [
  {
    key: "day-0-access",
    day: "Day 0",
    subject: "Your Claude Code + Codex build path is ready",
    goal: "Get the buyer into the workspace and through the first two downloads.",
    ctaLabel: "Open member workspace",
    ctaHref: "/members",
    bullets: [
      "Download the 60-Minute Quickstart.",
      "Download the Core Prompt Scripts.",
      "Choose the two surfaces you will use.",
      "Open Module 1 before starting a real build.",
    ],
  },
  {
    key: "day-1-tool-setup",
    day: "Day 1",
    subject: "Get both builders reading the same project",
    goal: "Complete the toolchain receipt and remove setup uncertainty.",
    ctaLabel: "Open Module 1",
    ctaHref: "/members/module/setup-both-builders",
    bullets: [
      "Verify Claude Code, Codex, and Git.",
      "Create one dedicated practice project.",
      "Run a read-only inspection in both agents.",
      "Save the setup receipt before moving on.",
    ],
  },
  {
    key: "day-3-project-packet",
    day: "Day 3",
    subject: "Stop re-explaining your project to AI",
    goal: "Build the concise project packet both agents can follow.",
    ctaLabel: "Open Module 2",
    ctaHref: "/members/module/ai-ready-project",
    bullets: [
      "Write the one-page project brief.",
      "Create AGENTS.md and CLAUDE.md.",
      "Verify commands instead of guessing them.",
      "Create the clean baseline checkpoint.",
    ],
  },
  {
    key: "day-5-operator-loop",
    day: "Day 5",
    subject: "Run one complete AI build loop",
    goal: "Move from setup into a narrow, verified implementation.",
    ctaLabel: "Open Module 3",
    ctaHref: "/members/module/operator-loop",
    bullets: [
      "Write one build brief.",
      "Make the agent inspect before editing.",
      "Ship the smallest useful slice.",
      "Verify and checkpoint before expanding scope.",
    ],
  },
  {
    key: "day-7-first-ship",
    day: "Day 7",
    subject: "Turn the first week into a reproducible build",
    goal: "Push the buyer toward starter skills, clean-start QA, and the capstone handoff.",
    ctaLabel: "Open your build path",
    ctaHref: "/members",
    bullets: [
      "Install and test the three starter skills.",
      "Choose one first-build track.",
      "Run the real user path from a clean start.",
      "Package the README and next-build handoff.",
    ],
  },
];

export const productAssetHighlights = [
  { title: "60-Minute Quickstart", body: "The exact beginner path from account choice to the first read-only inspection." },
  { title: "Install + Verify Pack", body: "Current setup links, version checks, platform notes, and a safe setup receipt." },
  { title: "Dual-Agent Project Starter", body: "Project brief, AGENTS.md, CLAUDE.md, .gitignore, and baseline templates." },
  { title: "Core Prompt Scripts", body: "Copy-ready inspect, plan, build, verify, review, and handoff scripts." },
  { title: "Starter Skill Pack", body: "Three reusable skills: Project Map, Build One Slice, and Verify Before Done." },
  { title: "First Build Lab", body: "Three beginner-safe tracks with scope rules, prompts, and done criteria." },
  { title: "Verification + Handoff Checklist", body: "Clean-start QA, evidence capture, README update, and next-session handoff." },
  { title: "Troubleshooting Guide", body: "A stop-and-diagnose matrix for setup, permissions, context, tests, and scope drift." },
  { title: "Course Workbook", body: "All five lessons, workshops, examples, implementation tasks, and quality bars." },
];

export const productFaqItems = [
  {
    question: "Is this a streaming course?",
    answer:
      "No. Murad's public 60-day challenge is the proof behind the product, not the assignment. Buyers learn to set up Claude Code and Codex, build safely, install starter skills, and ship one useful result.",
  },
  {
    question: "Do I need to know how to code?",
    answer:
      "No. You need to be willing to use a terminal or supported app, follow small steps, review permissions, and test what the agent builds. The course teaches direction, scope, and verification before syntax.",
  },
  {
    question: "What is included at $47?",
    answer:
      "The complete five-module starter course, core prompt scripts, three starter skills, project templates, first-build tracks, troubleshooting, progress tracking, and completion tools.",
  },
  {
    question: "What does the Operator Bundle add?",
    answer:
      "The $97 bundle includes the starter course plus an expanded skill vault, advanced scripts, dual-agent review workflows, debugging systems, deployment checks, and reusable project blueprints.",
  },
  {
    question: "Will this build a full business for me?",
    answer:
      "No. It gives you a dependable way to start and finish useful AI-assisted builds. Results still depend on the problem you choose, the quality of your decisions, and whether you verify and ship the work.",
  },
];
