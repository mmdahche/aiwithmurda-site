/*
  /steps: the free setups behind the how-to reels (Instagram keyword STEPS, via ManyChat).
  One section per reel. Plain ESM only: siteMetadata.js and postbuild import nothing from here, but keep it simple.
  Copy rules: Murad's voice, short words, no promises the reel can't back up, every "catch" stated.
*/

export const stepsPage = {
  title: "Free AI setups from my videos",
  lede: "You commented STEPS. Here's every setup from my how-to videos, free. Find the video you came from, copy the prompt, and change the parts in [brackets] to fit your store.",
  note: "These are setups I use or tested. AI still makes mistakes, so check what it gives you before you trust it with money, stock or customers.",
};

export const stepsSections = [
  {
    id: "stock",
    title: "Ask your stock before you buy",
    video: "The Charizard Funko video",
    steps: [
      "Put all your stock in one list, like a Google Sheet or Excel file. Columns: item, barcode or SKU, quantity, price. If your register can export your stock, use that file.",
      "Start a new chat in ChatGPT or Claude, upload the file, and paste the first prompt.",
      "Before you buy anything, ask it in plain words: do we have this, and how many?",
    ],
    prompts: [
      { label: "Paste this with your stock file", text: "This file is my store's stock list. When I ask about an item, search the list and tell me: do we have it, the exact match, how many we have, and our price. Also list close matches (other sizes, versions or colors). If nothing matches, say so. Never guess a number that isn't in the file." },
      { label: "Then ask", text: "Someone wants to sell me a [item]. Do we have it? How many, and what do we sell it for?" },
    ],
    catches: [
      "The file is a snapshot. Upload a fresh export when your stock changes.",
      "Leave customer names and card details out of the file.",
    ],
  },
  {
    id: "feature",
    title: "Build the feature your store software won't give you",
    video: "The five-clicks video",
    steps: [
      "Write down the task you hate, click by click. Mine was typing the same price for every size.",
      "Explain it to Claude like you're training a new employee. Use the template below.",
      "Test it for a week next to your old way before you trust it.",
    ],
    prompts: [
      { label: "How I explain a feature to Claude", text: "I run a [type of store]. In my [software or spreadsheet], [task] takes too long. Here's exactly what I do now, click by click:\n1. [step]\n2. [step]\n3. [step]\nWhat I want instead: [for example: let me edit the price once and have every size copy it].\nRules: don't change anything else. Ask me before you delete or overwrite any data. Show me a test version first, and tell me how to undo it." },
    ],
    catches: [
      "This works on things you can change: your own system, a spreadsheet, or a tool with an API. Claude can't change software you don't control.",
      "I built my own register system with Claude Code. Start small: one task, then the next.",
    ],
  },
  {
    id: "chatgpt",
    title: "Claim your store in ChatGPT",
    video: "The ChatGPT profile video",
    steps: [
      "In ChatGPT, open Business Hub (chatgpt.com/business-hub, or from the sidebar) and search for your store.",
      "Pick your listing and confirm which ChatGPT account runs it, using one of the checks it offers (like phone, business email or website).",
      "Pass the ID check, then fix your hours, details and products.",
    ],
    prompts: [],
    links: [
      { label: "OpenAI's help page: Businesses in ChatGPT", href: "https://help.openai.com/en/articles/20001635" },
    ],
    catches: [
      "It's in beta (since November 10, 2026), and not every store is eligible yet.",
      "Claiming it won't rank you higher. It fixes what ChatGPT says about you and shows how often it mentions you.",
    ],
  },
  {
    id: "reviews",
    title: "Gemini reads your Google reviews",
    video: "The Google reviews video",
    steps: [
      "Open Gemini on the web (gemini.google.com) and connect your Google Business Profile.",
      "Ask it what customers keep saying in your reviews.",
      "Ask it to write a reply to one review in your voice, then paste the reply into your Google profile yourself.",
    ],
    prompts: [
      { label: "What are people saying", text: "Read my Google reviews. Give me the top 3 things customers love and the top 3 complaints, with how many reviews mention each one. Quote one short line for each." },
      { label: "Reply to a good review", text: "Write a reply to this review in my voice: friendly, short, no corporate words. Thank them, mention one specific thing they said, and invite them back.\n[paste the review]" },
      { label: "Reply to a bad review", text: "Write a calm reply to this review. Say sorry once, say what we're doing about it, and ask them to call or stop by so we can make it right. No excuses, no arguing.\n[paste the review]" },
    ],
    links: [
      { label: "Google's help page", href: "https://support.google.com/business/answer/17142585?hl=en" },
    ],
    catches: [
      "Web only, and it's still rolling out, so it may not show up for you yet.",
      "Google says it doesn't work yet if you manage more than one verified Business Profile.",
    ],
  },
  {
    id: "sales",
    title: "Claude builds your sales sheet",
    video: "The slow sellers video",
    steps: [
      "Export your sales from your register as a spreadsheet file (CSV or Excel). The last 90 days is a good start.",
      "Upload it to Claude and ask for a sheet of your slowest sellers.",
      "Ask which ones to put on sale first.",
    ],
    prompts: [
      { label: "The sheet", text: "This is my store's sales export. Build a sheet of my slowest sellers: items I still have in stock that haven't sold in the last [60] days. Columns: item, stock on hand, last sold date, days since last sale, cost, price, cash tied up (stock times cost). Sort by cash tied up, biggest first." },
      { label: "Then ask", text: "Which 10 should I put on sale first, and at what discount, without going below my cost?" },
    ],
    catches: [
      "Claude Sheets is in beta and only on paid Claude plans.",
      "It works from the file you upload, not a live link to your register.",
    ],
  },
  {
    id: "editing",
    title: "AI edits my videos: how I film for it",
    video: "The AI editing video",
    steps: [
      "Film one take: say every line until it sounds right, keep recording, and pause a second between lines.",
      "Give Claude Code the whole file and your script, and have it keep the best take of each line.",
      "Watch that rough cut before anything else gets added.",
    ],
    prompts: [
      { label: "The words I give Claude Code for the first cut", text: "This folder has my raw video [file name] and my script [script file], one sentence per line. Transcribe the whole video on this computer with word timestamps. For each script line, find every take and keep the best complete one (usually the last clean one). Cut out everything else: retakes, mistakes and pauses longer than 0.3 seconds. Never cut inside a word. Render a plain rough cut with no captions or effects, and give me a list of which take you picked for each line so I can check it." },
    ],
    catches: [
      "This needs Claude Code on a computer, not the Claude phone app.",
      "If you don't have ffmpeg or a transcriber installed, ask Claude Code to set them up first.",
    ],
  },
  {
    id: "invoice",
    title: "A supplier invoice photo becomes your stock list",
    video: "The invoice photo video",
    steps: [
      "Take a clear photo of the whole invoice.",
      "Send it to ChatGPT or Claude and ask for a table with item, count and cost.",
      "Ask it to match the columns your store system imports. Then check the totals against the invoice before you import.",
    ],
    prompts: [
      { label: "The table", text: "This is a photo of a supplier invoice. Make a table with one row per item: item name, supplier item number, quantity, unit cost, line total. Don't guess: if anything is hard to read, mark it ??. Then add up the line totals and compare them with the invoice total." },
      { label: "Match your import", text: "Now put the columns in this order so my system can import it: [paste your import file's column names]. Give it to me as a CSV file." },
    ],
    catches: [
      "Always check the totals before you import. One wrong count throws off your stock.",
    ],
  },
  {
    id: "store-page",
    title: "Teach AI your store once",
    video: "The project video",
    steps: [
      "Make a project in ChatGPT or Claude and name it after your store.",
      "Add one page with your hours, return policy and prices. Use the template below.",
      "Ask every store question inside that project.",
    ],
    prompts: [
      { label: "Project instructions", text: "You work for [store name]. Use the store page in this project for every answer. If something isn't on the page, say you're not sure and ask me. Keep replies short and friendly, and never promise anything the page doesn't say." },
      { label: "The store page (fill it in, then add it to the project)", text: "STORE: [name], [address], [phone], [website]\nHOURS: Mon [ ] Tue [ ] Wed [ ] Thu [ ] Fri [ ] Sat [ ] Sun [ ]\nHOLIDAYS: [days you're closed]\nWHAT WE SELL: [main categories and brands]\nPRICES: [how you price, sales you run, price matching yes or no]\nTRADE-INS / BUYING: [what you buy, how you pay]\nRETURNS: [how many days, receipt needed, store credit or refund]\nPAYMENT: [cash, cards, other]\nPICKUP / DELIVERY: [how it works]\nHOW WE TALK: [friendly, short, first names, no slang, etc.]\nNEVER SAY: [things the AI must never promise]" },
    ],
    catches: [
      "Update the page when your hours or rules change. The AI only knows what's on it.",
    ],
  },
];
