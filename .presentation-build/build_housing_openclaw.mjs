import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/tiffany/idx-exchange-openclaw";
const buildDir = path.join(workspaceDir, ".presentation-build");
const outputDir = path.join(workspaceDir, "artifacts");
const skillDir =
  "/Users/tiffany/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations";
const runtimeNodeModules =
  "/Users/tiffany/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const runtimePython =
  "/Users/tiffany/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const finalPath = path.join(outputDir, "openclaw-housing-email-workflows-v2.pptx");

await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });
try {
  await fs.symlink(runtimeNodeModules, path.join(buildDir, "node_modules"), "junction");
} catch {}

const { resolvePresentationFont, finalizePresentation } = await import(
  pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href
);
const family = resolvePresentationFont({ availableFonts: ["Aptos", "Arial", "Helvetica"] });

const W = 1280;
const H = 720;
const C = {
  ink: "#14263D",
  muted: "#5E7085",
  paper: "#F6F8FB",
  white: "#FFFFFF",
  coral: "#F26B5B",
  coralSoft: "#FDE7E3",
  teal: "#2A9D8F",
  tealSoft: "#DDF3F0",
  blue: "#4E7AC7",
  blueSoft: "#E6EEFB",
  gold: "#E3A72F",
  goldSoft: "#FFF0C8",
  line: "#D5DDE7",
};

const pres = Presentation.create({ slideSize: { width: W, height: H } });

function shape(
  slide,
  geometry,
  position,
  fill = "none",
  line = { fill: "none", width: 0 },
  borderRadius,
) {
  return slide.shapes.add({
    geometry,
    position,
    fill,
    line,
    ...(borderRadius ? { borderRadius } : {}),
  });
}

function text(slide, value, position, style = {}) {
  const s = shape(slide, "textbox", position, "none", { fill: "none", width: 0 });
  s.text = value;
  s.text.style = {
    typeface: family,
    fontSize: style.fontSize ?? 22,
    color: style.color ?? C.ink,
    bold: style.bold ?? false,
    italic: style.italic ?? false,
    autoFit: "shrinkTextOnOverflow",
    ...(style.align ? { align: style.align } : {}),
  };
  return s;
}

function title(slide, kicker, heading, sub = "") {
  text(
    slide,
    kicker.toUpperCase(),
    { left: 72, top: 40, width: 400, height: 24 },
    { fontSize: 14, color: C.coral, bold: true },
  );
  text(
    slide,
    heading,
    { left: 72, top: 70, width: 1136, height: 56 },
    { fontSize: 34, bold: true },
  );
  if (sub)
    text(
      slide,
      sub,
      { left: 72, top: 130, width: 1136, height: 38 },
      { fontSize: 18, color: C.muted },
    );
}

function footer(slide, n) {
  shape(slide, "line", { left: 72, top: 680, width: 1136, height: 0 }, "none", {
    style: "solid",
    fill: C.line,
    width: 1,
  });
  text(
    slide,
    "OpenClaw  /  housing workflows",
    { left: 72, top: 688, width: 360, height: 18 },
    { fontSize: 11, color: C.muted },
  );
  text(
    slide,
    String(n).padStart(2, "0"),
    { left: 1160, top: 688, width: 48, height: 18 },
    { fontSize: 11, color: C.muted, align: "right" },
  );
}

function note(slide, lines) {
  slide.speakerNotes.textFrame.setText(lines.join("\n"));
}

function box(slide, label, body, pos, opts = {}) {
  const b = shape(
    slide,
    "roundRect",
    pos,
    opts.fill ?? C.white,
    { style: "solid", fill: opts.line ?? C.line, width: 1 },
    18,
  );
  text(
    slide,
    label,
    { left: pos.left + 18, top: pos.top + 14, width: pos.width - 36, height: 24 },
    { fontSize: opts.labelSize ?? 16, bold: true, color: opts.labelColor ?? C.ink },
  );
  if (body)
    text(
      slide,
      body,
      { left: pos.left + 18, top: pos.top + 46, width: pos.width - 36, height: pos.height - 56 },
      { fontSize: opts.bodySize ?? 17, color: opts.bodyColor ?? C.muted },
    );
  return b;
}

function arrow(slide, from, to, color = C.muted) {
  slide.shapes.connect(from, to, {
    kind: "straight",
    fromSide: "right",
    toSide: "left",
    line: { style: "solid", fill: color, width: 2 },
    tail: { type: "triangle", width: "sm", length: "sm" },
  });
}

// 1. Cover
{
  const slide = pres.slides.add();
  slide.background.fill = C.ink;
  shape(slide, "ellipse", { left: 835, top: -120, width: 540, height: 540 }, C.coral, {
    fill: "none",
    width: 0,
  });
  shape(slide, "ellipse", { left: 1010, top: 400, width: 360, height: 360 }, C.teal, {
    fill: "none",
    width: 0,
  });
  text(
    slide,
    "OPENCLAW / PRODUCT WORKFLOW",
    { left: 72, top: 76, width: 500, height: 24 },
    { fontSize: 15, color: C.coralSoft, bold: true },
  );
  text(
    slide,
    "Housing search +\nemail workflows",
    { left: 72, top: 170, width: 700, height: 170 },
    { fontSize: 54, color: C.white, bold: true },
  );
  text(
    slide,
    "How OpenClaw turns a natural-language request into a stateful property workflow, then holds the line at the email approval boundary.",
    { left: 76, top: 390, width: 650, height: 78 },
    { fontSize: 23, color: "#D8E2EF" },
  );
  text(
    slide,
    "Repository summary  •  September 2026",
    { left: 76, top: 596, width: 520, height: 24 },
    { fontSize: 15, color: "#AAB9CB" },
  );
  note(slide, [
    "Sources: VISION.md; .agents/skills/property-search-orchestrator/SKILL.md; .agents/skills/property-email-workflows/SKILL.md.",
  ]);
}

// 2. OpenClaw execution layer
{
  const slide = pres.slides.add();
  slide.background.fill = C.paper;
  title(
    slide,
    "The OpenClaw role",
    "OpenClaw is the execution layer",
    "The user speaks once. OpenClaw routes the request, carries session state, and keeps side effects explicit.",
  );
  const gateway = box(
    slide,
    "OPENCLAW GATEWAY",
    "One sessionId\nOne conversation context\nChannel-agnostic execution",
    { left: 72, top: 230, width: 310, height: 170 },
    { fill: C.ink, line: C.ink, labelColor: C.white, bodyColor: "#D8E2EF", bodySize: 20 },
  );
  const property = box(
    slide,
    "PROPERTY WORKFLOW",
    "Intent routing\nCriteria collection\nListings + market data",
    { left: 470, top: 220, width: 300, height: 150 },
    { fill: C.blueSoft, line: C.blue, labelColor: C.blue },
  );
  const email = box(
    slide,
    "EMAIL WORKFLOW",
    "Reviewable draft\nExact approval phrase\nSingle delivery",
    { left: 470, top: 410, width: 300, height: 150 },
    { fill: C.coralSoft, line: C.coral, labelColor: C.coral },
  );
  const user = box(
    slide,
    "USER OUTCOME",
    "A useful answer\nwith a visible action boundary",
    { left: 865, top: 292, width: 300, height: 150 },
    { fill: C.tealSoft, line: C.teal, labelColor: C.teal, bodySize: 20 },
  );
  arrow(slide, gateway, property, C.blue);
  arrow(slide, gateway, email, C.coral);
  arrow(slide, property, user, C.teal);
  arrow(slide, email, user, C.teal);
  text(
    slide,
    "Session memory is the shared spine",
    { left: 410, top: 594, width: 450, height: 28 },
    { fontSize: 18, color: C.ink, bold: true, align: "center" },
  );
  note(slide, [
    "Sources: VISION.md (OpenClaw runs tasks in channels with rules; plugin-agnostic core); .agents/skills/property-search-orchestrator/SKILL.md (canonical sessionId); .agents/skills/property-email-workflows/SKILL.md (draft and approval boundary).",
  ]);
  footer(slide, 2);
}

// 3. Search workflow
{
  const slide = pres.slides.add();
  slide.background.fill = C.white;
  title(
    slide,
    "Housing workflow",
    "A property request becomes structured work",
    "The orchestrator owns the handoff between requirements, listings, market context, recommendations, and knowledge.",
  );
  const p1 = box(
    slide,
    "01  CLASSIFY",
    "search\nmarket\nrecommend\nmixed\nknowledge",
    { left: 72, top: 235, width: 188, height: 205 },
    { fill: C.ink, line: C.ink, labelColor: C.white, bodyColor: "#D8E2EF", bodySize: 19 },
  );
  const p2 = box(
    slide,
    "02  REMEMBER",
    "Merge criteria into the\ncurrent sessionId. Ask only\nfor missing search fields.",
    { left: 318, top: 235, width: 230, height: 205 },
    { fill: C.blueSoft, line: C.blue, labelColor: C.blue, bodySize: 18 },
  );
  const p3 = box(
    slide,
    "03  RETRIEVE",
    "Listings from rets_property\nMarket stats from\ncalifornia_sold",
    { left: 606, top: 235, width: 230, height: 205 },
    { fill: C.tealSoft, line: C.teal, labelColor: C.teal, bodySize: 18 },
  );
  const p4 = box(
    slide,
    "04  RESPOND",
    "Save listing previews and\nmarket summaries. Format the\nanswer for the channel.",
    { left: 894, top: 235, width: 314, height: 205 },
    { fill: C.coralSoft, line: C.coral, labelColor: C.coral, bodySize: 18 },
  );
  arrow(slide, p1, p2, C.muted);
  arrow(slide, p2, p3, C.muted);
  arrow(slide, p3, p4, C.muted);
  shape(
    slide,
    "roundRect",
    { left: 72, top: 500, width: 1136, height: 85 },
    C.paper,
    { style: "solid", fill: C.line, width: 1 },
    16,
  );
  text(
    slide,
    "Contract",
    { left: 96, top: 521, width: 120, height: 24 },
    { fontSize: 16, color: C.coral, bold: true },
  );
  text(
    slide,
    "The live Gateway calls property_search with the unchanged user message and the canonical sessionId. The isolated CLI is reserved for smoke tests.",
    { left: 238, top: 515, width: 915, height: 48 },
    { fontSize: 20, color: C.ink },
  );
  note(slide, [
    "Sources: .agents/skills/property-search-orchestrator/SKILL.md; src/tools/orchestrate.ts; src/agents/tools/property-search-tool.ts.",
  ]);
  footer(slide, 3);
}

// 4. Routing map
{
  const slide = pres.slides.add();
  slide.background.fill = C.paper;
  title(
    slide,
    "Intent routing",
    "The same conversation can move across housing intents",
    "Routing stays deterministic at the boundary, while session memory preserves continuity between turns.",
  );
  const input = box(
    slide,
    "USER MESSAGE",
    "“Find a 3-bed in Oakland\nand tell me the market trend”",
    { left: 72, top: 282, width: 280, height: 122 },
    { fill: C.ink, line: C.ink, labelColor: C.white, bodyColor: "#D8E2EF", bodySize: 20 },
  );
  const route = box(
    slide,
    "CLASSIFY",
    "mixed",
    { left: 458, top: 298, width: 190, height: 90 },
    { fill: C.goldSoft, line: C.gold, labelColor: C.gold, bodySize: 28 },
  );
  const search = box(
    slide,
    "LISTINGS",
    "Requirements → listing agent",
    { left: 815, top: 205, width: 330, height: 92 },
    { fill: C.blueSoft, line: C.blue, labelColor: C.blue, bodySize: 18 },
  );
  const market = box(
    slide,
    "MARKET",
    "City → market stats agent",
    { left: 815, top: 355, width: 330, height: 92 },
    { fill: C.tealSoft, line: C.teal, labelColor: C.teal, bodySize: 18 },
  );
  const saved = box(
    slide,
    "SESSION MEMORY",
    "criteria + listingPreviews + market summaries",
    { left: 390, top: 500, width: 520, height: 86 },
    { fill: C.white, line: C.line, labelColor: C.ink, bodySize: 18 },
  );
  arrow(slide, input, route, C.muted);
  slide.shapes.connect(route, search, {
    kind: "elbow",
    fromSide: "right",
    toSide: "left",
    line: { style: "solid", fill: C.blue, width: 2 },
    tail: { type: "triangle", width: "sm", length: "sm" },
  });
  slide.shapes.connect(route, market, {
    kind: "elbow",
    fromSide: "right",
    toSide: "left",
    line: { style: "solid", fill: C.teal, width: 2 },
    tail: { type: "triangle", width: "sm", length: "sm" },
  });
  slide.shapes.connect(search, saved, {
    kind: "elbow",
    fromSide: "bottom",
    toSide: "top",
    line: { style: "solid", fill: C.blue, width: 2 },
    tail: { type: "triangle", width: "sm", length: "sm" },
  });
  slide.shapes.connect(market, saved, {
    kind: "elbow",
    fromSide: "bottom",
    toSide: "top",
    line: { style: "solid", fill: C.teal, width: 2 },
    tail: { type: "triangle", width: "sm", length: "sm" },
  });
  note(slide, [
    "Sources: src/tools/orchestrate.ts (search, market, recommend, knowledge, mixed); .agents/skills/property-search-orchestrator/SKILL.md (agent map and session memory).",
  ]);
  footer(slide, 4);
}

// 5. Email workflow
{
  const slide = pres.slides.add();
  slide.background.fill = C.white;
  title(
    slide,
    "Email workflow",
    "Email is a two-step side effect",
    "OpenClaw can prepare a useful property email, but delivery stops until the person approves the exact draft.",
  );
  const draft = box(
    slide,
    "01  DRAFT",
    "email_draft\nValidate recipient\nClassify original query\nBuild content from session/data",
    { left: 72, top: 240, width: 255, height: 200 },
    { fill: C.blueSoft, line: C.blue, labelColor: C.blue, bodySize: 18 },
  );
  const review = box(
    slide,
    "02  REVIEW",
    "Show recipient, workflow,\nsubject, and body summary\nStatus: pending_approval",
    { left: 382, top: 240, width: 255, height: 200 },
    { fill: C.goldSoft, line: C.gold, labelColor: C.gold, bodySize: 18 },
  );
  const approve = box(
    slide,
    "03  APPROVE",
    "Require exact text:\n“I approve sending this email”\nUse the exact approval_id",
    { left: 692, top: 240, width: 255, height: 200 },
    { fill: C.coralSoft, line: C.coral, labelColor: C.coral, bodySize: 18 },
  );
  const send = box(
    slide,
    "04  SEND",
    "sendApprovedEmail\nDeliver once\nConsume approval state",
    { left: 1002, top: 240, width: 206, height: 200 },
    { fill: C.tealSoft, line: C.teal, labelColor: C.teal, bodySize: 18 },
  );
  arrow(slide, draft, review, C.muted);
  arrow(slide, review, approve, C.muted);
  arrow(slide, approve, send, C.muted);
  shape(
    slide,
    "roundRect",
    { left: 72, top: 503, width: 1136, height: 86 },
    C.ink,
    { style: "solid", fill: C.ink, width: 1 },
    16,
  );
  text(
    slide,
    "Guardrail",
    { left: 96, top: 525, width: 120, height: 24 },
    { fontSize: 16, color: C.coralSoft, bold: true },
  );
  text(
    slide,
    "No scheduled preference, draft creation, or model decision can substitute for fresh human confirmation.",
    { left: 238, top: 518, width: 920, height: 42 },
    { fontSize: 21, color: C.white },
  );
  note(slide, [
    "Sources: .agents/skills/property-email-workflows/SKILL.md; src/tools/email.ts; src/agents/tools/email-workflow-tools.ts.",
  ]);
  footer(slide, 5);
}

// 6. Relationship / boundary
{
  const slide = pres.slides.add();
  slide.background.fill = C.paper;
  title(
    slide,
    "Shared session, separate boundaries",
    "Housing data can flow into email without collapsing the controls",
    "The shared session makes the experience continuous. Each workflow still owns its own contract and side effects.",
  );
  const headers = ["", "Housing workflow", "Email workflow"];
  const rows = [
    ["Input", "Natural-language property request", "Original housing query + recipient"],
    [
      "State",
      "criteria, listingPreviews, market summaries",
      "approvalId + pending/approved status",
    ],
    ["Action", "Query listings or market data", "Create a draft, then send once"],
    ["Boundary", "Canonical sessionId", "Exact confirmation phrase"],
  ];
  const x = [72, 250, 650];
  const w = [160, 370, 558];
  for (let i = 0; i < 3; i++) {
    shape(
      slide,
      "rect",
      { left: x[i], top: 220, width: w[i], height: 54 },
      i === 0 ? C.ink : i === 1 ? C.blue : C.coral,
      { style: "solid", fill: i === 0 ? C.ink : i === 1 ? C.blue : C.coral, width: 1 },
    );
    text(
      slide,
      headers[i],
      { left: x[i] + 16, top: 236, width: w[i] - 32, height: 24 },
      { fontSize: 17, color: C.white, bold: true },
    );
  }
  rows.forEach((row, r) => {
    const top = 274 + r * 82;
    for (let i = 0; i < 3; i++) {
      shape(
        slide,
        "rect",
        { left: x[i], top, width: w[i], height: 82 },
        i === 0 ? "#E8EDF3" : C.white,
        { style: "solid", fill: C.line, width: 1 },
      );
      text(
        slide,
        row[i],
        { left: x[i] + 16, top: top + 22, width: w[i] - 32, height: 42 },
        { fontSize: i === 0 ? 17 : 18, color: i === 0 ? C.ink : C.muted, bold: i === 0 },
      );
    }
  });
  note(slide, [
    "Sources: .agents/skills/property-search-orchestrator/SKILL.md; .agents/skills/property-email-workflows/SKILL.md; src/tools/session_memory.ts; src/tools/email.ts.",
  ]);
  footer(slide, 6);
}

// 7. Closing
{
  const slide = pres.slides.add();
  slide.background.fill = C.ink;
  text(
    slide,
    "WHAT THIS SHOWS",
    { left: 72, top: 74, width: 300, height: 24 },
    { fontSize: 15, color: C.coralSoft, bold: true },
  );
  text(
    slide,
    "A useful OpenClaw workflow\nkeeps the action visible",
    { left: 72, top: 142, width: 850, height: 126 },
    { fontSize: 46, color: C.white, bold: true },
  );
  const takeaways = [
    ["Stateful", "The same session carries search criteria and results across turns."],
    ["Deterministic", "Intent routing chooses the appropriate property path."],
    ["Human-controlled", "Email delivery requires review and exact approval."],
  ];
  takeaways.forEach((t, i) => {
    const left = 72 + i * 370;
    shape(
      slide,
      "roundRect",
      { left, top: 350, width: 330, height: 150 },
      i === 0 ? C.blue : i === 1 ? C.teal : C.coral,
      { fill: "none", width: 0 },
      18,
    );
    text(
      slide,
      t[0],
      { left: left + 20, top: 372, width: 280, height: 28 },
      { fontSize: 24, color: C.white, bold: true },
    );
    text(
      slide,
      t[1],
      { left: left + 20, top: 418, width: 280, height: 58 },
      { fontSize: 17, color: "#F3F7FB" },
    );
  });
  text(
    slide,
    "OpenClaw’s product value is the seam between conversation and action.",
    { left: 72, top: 595, width: 920, height: 30 },
    { fontSize: 21, color: "#D8E2EF" },
  );
  note(slide, [
    "Sources: VISION.md; .agents/skills/property-search-orchestrator/SKILL.md; .agents/skills/property-email-workflows/SKILL.md.",
  ]);
}

const candidate = path.join(buildDir, "housing-openclaw-candidate.pptx");
await (await PresentationFile.exportPptx(pres)).save(candidate);
for (let i = 0; i < pres.slides.items.length; i++) {
  const preview = await pres.export({ slide: pres.slides.items[i], format: "png", scale: 1 });
  await fs.writeFile(
    path.join(buildDir, `slide-${i + 1}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const requirements = {
  explicitTotalSlideCount: 7,
  requiredNativeChartOwnerSlides: [],
  fontPolicy: { basis: "design", families: [family] },
};
const stagingDir = path.join(buildDir, ".codex-finalizer");
await fs.mkdir(stagingDir, { recursive: true });
const result = await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath: candidate,
  finalPath,
  pythonExecutable: runtimePython,
  integrityValidatorPath: path.join(
    skillDir,
    "container_tools/inspect_presentation_package_integrity.py",
  ),
  layoutValidatorPath: path.join(
    skillDir,
    "container_tools/inspect_presentation_layout_geometry.py",
  ),
  layoutArgs: [
    "--expected-slide-size-emu",
    "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
  ],
  requiredNativeTableOwnerSlides: [],
  fontPolicy: requirements.fontPolicy,
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, `${path.basename(finalPath)}.validation.json`),
});
console.log(JSON.stringify({ finalPath, candidate, result }, null, 2));
