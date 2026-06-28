export const productKey = "future_proof_method";
export const productName = "The Future Proof Method";
export const productSubtitle = "New Wave Operator Kit";
export const productPriceCents = 4700;

export const productModules = [
  {
    key: "command-setup",
    title: "Module 1: Command Setup",
    body: "Create the operating folder, tracker habit, account checklist, and proof capture lane before building.",
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

export const productAssetHighlights = [
  {
    title: "Module Roadmap",
    body: "The five-module path with to-do lists, done criteria, and proof outputs.",
  },
  {
    title: "Daily Operator Checklist",
    body: "Morning, live-build, clip, recap, and shutdown checklist for each sprint day.",
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
