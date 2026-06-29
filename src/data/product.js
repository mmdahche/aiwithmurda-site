export const productKey = "future_proof_method";
export const productName = "The Future Proof Method";
export const productSubtitle = "New Wave Operator Kit";
export const productPriceCents = 4700;

export const productModules = [
  {
    key: "command-setup",
    title: "Module 1: Command Setup",
    body: "Create the operating folder, tracker habit, account checklist, and proof capture lane before building.",
    lesson: {
      focus: "Set up the operating surface so every build, prompt, proof asset, and offer note has a home.",
      output: "Command folder screenshot and first baseline entry.",
      useWith: ["Module Field Guide", "Module Roadmap", "Daily Operator Checklist"],
      starterPrompt:
        "Audit my AI workspace. List the folders, trackers, and proof habits I need before a public sprint.",
      deliverables: [
        "A command folder with prompts, proof, content, offers, and assets separated.",
        "A baseline tracker row with follower, revenue, pipeline, and shipped-build starting numbers.",
        "One named offer lane that the first week will try to prove.",
      ],
      proofQuestions: [
        "Can you find the next action, offer note, and proof folder in under 10 seconds?",
        "Does the baseline show the numbers you will report publicly?",
        "Would another operator understand where to drop a screenshot or build link?",
      ],
      failureTraps: [
        "Starting a build before the command folders exist.",
        "Keeping proof in chat history where it disappears.",
        "Tracking vanity activity without the money path beside it.",
      ],
    },
    operatorBrief: {
      window: "Day 0 to Day 1",
      mode: "Setup sprint",
      proof: "Folder tree screenshot, baseline tracker row, and named first offer lane.",
      streamBeat: "Show the command center setup without exposing private accounts, keys, customer data, or family details.",
    },
    todos: [
      { key: "command-folders", label: "Create the command folder structure." },
      { key: "baseline-tracker", label: "Open the tracker and set today's baseline." },
      { key: "first-offer", label: "Pick one offer to prove first." },
      { key: "proof-folders", label: "Create folders for prompts, proof, content, and offers." },
    ],
    done: "You can start a build day without searching for files, links, or the next action.",
  },
  {
    key: "problem-to-proof",
    title: "Module 2: Problem To Proof",
    body: "Choose a painful workflow, define the smallest useful fix, and name the proof metric before coding.",
    lesson: {
      focus: "Pick a workflow people understand quickly and define proof before touching code.",
      output: "One before-state receipt with pain, buyer, and proof metric.",
      useWith: ["Module Field Guide", "Prompt Workflow Pack", "Proof Receipts Template"],
      starterPrompt:
        "List painful workflows worth building in public. Score each by proof speed, value, and viewer clarity.",
      deliverables: [
        "A scored list of 10 workflows or bottlenecks.",
        "One chosen workflow with buyer, pain, before state, and proof metric.",
        "A one-sentence public explanation of why this workflow matters.",
      ],
      proofQuestions: [
        "Can a viewer understand the pain without knowing your whole business?",
        "Is the proof metric visible within one build session or one day?",
        "Does the workflow connect to revenue, time saved, leads, or trust?",
      ],
      failureTraps: [
        "Picking a giant app idea instead of a painful workflow.",
        "Choosing a problem because it sounds impressive, not because it is provable.",
        "Coding before naming what proof will count.",
      ],
    },
    operatorBrief: {
      window: "Days 1 to 3",
      mode: "Problem selection",
      proof: "One painful workflow scored by buyer pain, proof speed, viewer clarity, and money path.",
      streamBeat: "Let viewers see the scoring logic so the build feels chosen, not random.",
    },
    todos: [
      { key: "workflow-list", label: "List 10 painful workflows or bottlenecks." },
      { key: "score-workflows", label: "Score each by speed to proof and money path." },
      { key: "smallest-workflow", label: "Pick the smallest workflow worth showing." },
      { key: "before-state", label: "Write the before state in one sentence." },
    ],
    done: "You know exactly what problem the build solves and what proof would make a viewer care.",
  },
  {
    key: "ai-build-loop",
    title: "Module 3: AI Build Loop",
    body: "Use Claude Code, Codex, or your chosen stack to ship one narrow improvement without hiding the messy middle.",
    lesson: {
      focus: "Use AI as the build partner, but keep scope narrow enough to test live.",
      output: "A working slice with before/after proof and a short explanation.",
      useWith: ["Module Field Guide", "Prompt Workflow Pack", "Daily Operator Checklist"],
      starterPrompt:
        "Inspect this project first. Pick the smallest build slice that creates visible proof today, then give me the plan.",
      deliverables: [
        "A scoped build brief with files, user path, and stop condition.",
        "One working slice that improves the before state.",
        "A saved version, commit, or handoff that another AI can resume.",
      ],
      proofQuestions: [
        "Can the improvement be demonstrated in one screen or one short clip?",
        "Did you test the same path a real user or buyer would touch?",
        "Can you explain the change without reading implementation details?",
      ],
      failureTraps: [
        "Letting AI expand the scope because the first fix worked.",
        "Accepting generated code before running the user path.",
        "Skipping a save point and losing the teachable version.",
      ],
    },
    operatorBrief: {
      window: "Days 3 to 5",
      mode: "Live build loop",
      proof: "Working slice, tested user path, and one commit or handoff another AI can resume.",
      streamBeat: "Narrate the before state, the stuck point, the AI handoff, and the visible after state.",
    },
    todos: [
      { key: "inspect-first", label: "Ask AI to inspect before changing anything." },
      { key: "scope-slice", label: "Scope one build slice that can be shown today." },
      { key: "run-user-path", label: "Run the user path after every meaningful change." },
      { key: "save-working-version", label: "Commit or save the working version when the slice works." },
    ],
    done: "A real thing works better than it did before, and the change can be explained in under 30 seconds.",
  },
  {
    key: "proof-and-content",
    title: "Module 4: Proof And Content",
    body: "Turn the build into receipts: daily proof page, clip caption, recap, and one public asset.",
    lesson: {
      focus: "Package the work so viewers see what changed, what broke, and why it matters.",
      output: "One day receipt plus one public asset.",
      useWith: ["Module Field Guide", "Proof Receipts Template", "Daily Operator Checklist"],
      starterPrompt:
        "Turn this build into a receipt: before, after, failure, lesson, clip hook, and tomorrow's promise.",
      deliverables: [
        "One before/after proof receipt.",
        "One clip hook or short post built from the strongest moment.",
        "A day recap with best moment, failure, lesson, and tomorrow promise.",
      ],
      proofQuestions: [
        "Would the receipt make sense to someone who missed the stream?",
        "Does the content show a real change instead of only saying work happened?",
        "Does the post point back to the sprint, kit, or next live build?",
      ],
      failureTraps: [
        "Posting only effort instead of outcome.",
        "Hiding the failure that would make the lesson believable.",
        "Waiting until the next day when the moment is stale.",
      ],
    },
    operatorBrief: {
      window: "Same day as each build",
      mode: "Proof packaging",
      proof: "Daily receipt, clip hook, recap note, and one public asset.",
      streamBeat: "Turn the best moment, the failure, and the lesson into a receipt before shutdown.",
    },
    todos: [
      { key: "capture-proof", label: "Capture before and after proof." },
      { key: "log-receipt", label: "Log best moment, biggest failure, lesson, and tomorrow's promise." },
      { key: "clip-hook", label: "Write one clip hook from the proof." },
      { key: "post-asset", label: "Post or schedule one public asset." },
    ],
    done: "The day produced a receipt page and at least one asset that points back to the sprint.",
  },
  {
    key: "offer-follow-up",
    title: "Module 5: Offer And Follow-Up",
    body: "Connect proof to a simple offer so the sprint has a money path, not just attention.",
    lesson: {
      focus: "Translate proof into a buyer promise, CTA, objection answer, and follow-up.",
      output: "One improved offer surface and one logged result.",
      useWith: ["Module Field Guide", "Proof To Offer Canvas", "Proof Receipts Template"],
      starterPrompt:
        "Use this proof receipt to shape an offer: buyer, promise, objection, CTA, and warm follow-up message.",
      deliverables: [
        "One proof-backed offer promise or CTA improvement.",
        "One objection answer added to the page, post, email, or DM.",
        "One follow-up sent and one commercial result logged.",
      ],
      proofQuestions: [
        "Does the proof make the promise easier to believe?",
        "Is there a clear next step for someone with the pain?",
        "Did the follow-up create revenue, pipeline, a reply, or a sharper objection?",
      ],
      failureTraps: [
        "Letting proof die as content instead of using it to improve the offer.",
        "Making the CTA clever but unclear.",
        "Avoiding follow-up because the public post felt like enough.",
      ],
    },
    operatorBrief: {
      window: "Weekly review and proof spikes",
      mode: "Offer conversion",
      proof: "Improved CTA, answered objection, sent follow-up, and logged commercial result.",
      streamBeat: "Explain how one receipt changes the offer instead of letting proof stay as content only.",
    },
    todos: [
      { key: "improve-cta", label: "Improve one CTA or checkout promise." },
      { key: "buyer-objection", label: "Answer one buyer objection on the page." },
      { key: "warm-lead", label: "Follow up with one warm lead." },
      { key: "commercial-result", label: "Log revenue, pipeline, products sold, or calls booked." },
    ],
    done: "The day's proof moved someone closer to buying, joining, booking, or replying.",
  },
];

export const productTaskCount = productModules.reduce((total, module) => total + module.todos.length, 0);

export const memberStartPath = [
  {
    title: "1. Open the roadmap",
    body: "Download the Module Roadmap and use the checklist below as the live version.",
  },
  {
    title: "2. Do the next action",
    body: "Mark one task complete only after the work exists outside your head.",
  },
  {
    title: "3. Package proof",
    body: "Use the Proof To Offer Canvas when a receipt is strong enough to become a CTA.",
  },
];

export const memberOnboardingSteps = [
  {
    key: "quickstart",
    title: "Download the Quickstart Map",
    body: "Set up folders, tracker, prompt capture, proof capture, and shutdown rhythm.",
    assetTitle: "Quickstart Map",
  },
  {
    key: "field-guide",
    title: "Download the Module Field Guide",
    body: "Use the module worksheets instead of trying to remember the process.",
    assetTitle: "Module Field Guide",
  },
  {
    key: "module-one",
    title: "Open Module 1",
    body: "Start with Command Setup before building or recording anything public.",
    href: "/members/module/command-setup",
  },
  {
    key: "first-task",
    title: "Complete the first task",
    body: "Create the command folder structure and mark it complete.",
    moduleKey: "command-setup",
    taskKey: "command-folders",
  },
];

export const buyerOnboardingEmails = [
  {
    key: "day-0-access",
    day: "Day 0",
    subject: "Your Future Proof Method access is ready",
    goal: "Get the buyer into the member hub and through the first setup files.",
    ctaLabel: "Open member hub",
    ctaHref: "/members",
    bullets: [
      "Download the Quickstart Map.",
      "Download the Module Field Guide.",
      "Open Module 1: Command Setup.",
      "Create the command folder before marking anything complete.",
    ],
  },
  {
    key: "day-1-command-setup",
    day: "Day 1",
    subject: "Start with Command Setup, not another idea",
    goal: "Push the buyer to complete Module 1 and create their operating surface.",
    ctaLabel: "Open Module 1",
    ctaHref: "/members/module/command-setup",
    bullets: [
      "Create folders for prompts, proof, content, and offers.",
      "Set the first baseline in the tracker.",
      "Pick one offer path to prove first.",
      "Capture a screenshot of the setup as the first receipt.",
    ],
  },
  {
    key: "day-3-problem-proof",
    day: "Day 3",
    subject: "Pick the workflow that can become proof",
    goal: "Move the buyer into Problem To Proof so the work has a clear buyer and metric.",
    ctaLabel: "Open Module 2",
    ctaHref: "/members/module/problem-to-proof",
    bullets: [
      "List 10 painful workflows or bottlenecks.",
      "Score the top three by proof speed, buyer pain, viewer clarity, and money path.",
      "Choose the smallest workflow worth showing.",
      "Write the before state in one sentence.",
    ],
  },
  {
    key: "day-7-week-review",
    day: "Day 7",
    subject: "Turn the first week into an offer improvement",
    goal: "Prompt the buyer to review proof, content, and the next offer move.",
    ctaLabel: "Open Proof To Offer Canvas",
    ctaHref: "/members/module/offer-follow-up",
    bullets: [
      "Choose the strongest proof receipt from the week.",
      "Name the buyer who already feels that pain.",
      "Rewrite one CTA or checkout promise.",
      "Follow up with one warm lead and log the result.",
    ],
  },
];

export const productAssetHighlights = [
  {
    title: "Module Roadmap",
    body: "The five-module path with to-do lists, done criteria, and proof outputs.",
  },
  {
    title: "Module Field Guide",
    body: "The working surface for each module: questions, worksheets, prompts, proof receipts, and exit criteria.",
  },
  {
    title: "Daily Operator Checklist",
    body: "Morning, live-build, clip, recap, and shutdown checklist for each sprint day.",
  },
  {
    title: "Launch Day Runbook",
    body: "Day 0 and Day 1 checklist for baseline cutover, OBS, stream commands, receipts, and shutdown.",
  },
  {
    title: "Prompt Workflow Pack",
    body: "Prompts for finding problems, scoping builds, judging outputs, and packaging proof.",
  },
  {
    title: "Proof Receipts Template",
    body: "Daily before/after receipt format for clips, recap posts, and the Day 60 review.",
  },
  {
    title: "Proof To Offer Canvas",
    body: "Worksheet for turning one build receipt into a buyer, promise, CTA, and follow-up list.",
  },
];

export const productFaqItems = [
  {
    question: "Is this a course or a live workshop?",
    answer:
      "It is a working kit first: module roadmap, checklists, prompts, proof templates, and member progress tracking. The livestream shows the messy middle, but the kit gives you the operating path.",
  },
  {
    question: "Why buy this if I can ask AI for prompts myself?",
    answer:
      "The value is the sequence: choosing the right workflow, proving the change, turning the proof into content, and connecting it to an offer. Random prompts do not give you that loop.",
  },
  {
    question: "Who is this for?",
    answer:
      "Builders, creators, operators, and small business owners who want to use AI to ship visible proof and create a simple money path. It is not for someone looking for a passive-income shortcut.",
  },
  {
    question: "What happens after I buy?",
    answer:
      "You create or use your Supabase profile, unlock the member hub, download the assets, and work through the trackable module checklist. New assets can be added as the 60-day sprint creates stronger proof.",
  },
  {
    question: "Will this make me money in 60 days?",
    answer:
      "No guarantee. The promise is an operating system for doing the work in public: build, measure, package proof, improve the offer, and follow up. The result depends on execution, market, and consistency.",
  },
];
