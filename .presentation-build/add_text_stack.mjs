import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/tiffany/idx-exchange-openclaw";
const buildDir = path.join(workspaceDir, ".presentation-build");
const outputDir = path.join(workspaceDir, "artifacts");
const skillDir =
  "/Users/tiffany/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations";
const runtimePython =
  "/Users/tiffany/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const sourcePath = path.join(outputDir, "openclaw-housing-email-workflows-v2.pptx");
const finalPath = path.join(outputDir, "openclaw-housing-email-workflows-v4-text-stack.pptx");
await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });

const { resolvePresentationFont, finalizePresentation } = await import(
  pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href
);
const family = resolvePresentationFont({ availableFonts: ["Helvetica", "Arial", "Aptos"] });
const p = await PresentationFile.importPptx(await FileBlob.load(sourcePath));
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
p.slides.insert({ after: p.slides.getItem(1) });
const s = p.slides.getItem(2);
s.background.fill = C.paper;
for (const [id, value] of [
  ["sh/6d0fytg3", "04"],
  ["sh/fu9sn2p0", "05"],
  ["sh/pkr6tgjy", "06"],
  ["sh/hcrqlcj6", "07"],
]) {
  p.resolve(id).text = value;
}

function shape(geometry, position, fill = "none", line = { fill: "none", width: 0 }, borderRadius) {
  return s.shapes.add({
    geometry,
    position,
    fill,
    line,
    ...(borderRadius ? { borderRadius } : {}),
  });
}
function text(value, position, style = {}) {
  const t = shape("textbox", position);
  t.text = value;
  t.text.style = {
    typeface: family,
    fontSize: style.fontSize ?? 18,
    color: style.color ?? C.ink,
    bold: style.bold ?? false,
    autoFit: "shrinkTextOnOverflow",
    ...(style.align ? { align: style.align } : {}),
  };
  return t;
}
function box(label, body, pos, fill, line, labelColor, bodyColor = C.muted) {
  const b = shape("roundRect", pos, fill, { style: "solid", fill: line, width: 1 }, 16);
  text(
    label,
    { left: pos.left + 16, top: pos.top + 12, width: pos.width - 32, height: 24 },
    { fontSize: 15, color: labelColor, bold: true },
  );
  text(
    body,
    { left: pos.left + 16, top: pos.top + 44, width: pos.width - 32, height: pos.height - 54 },
    { fontSize: 16, color: bodyColor },
  );
  return b;
}
function arrow(from, to, color = C.muted) {
  s.shapes.connect(from, to, {
    kind: "straight",
    fromSide: "right",
    toSide: "left",
    line: { style: "solid", fill: color, width: 2 },
    tail: { type: "triangle", width: "sm", length: "sm" },
  });
}

text(
  "TECHNICAL TEXT STACK",
  { left: 72, top: 40, width: 420, height: 24 },
  { fontSize: 14, color: C.coral, bold: true },
);
text(
  "The message path is layered and explicit",
  { left: 72, top: 70, width: 1136, height: 56 },
  { fontSize: 34, bold: true },
);
text(
  "A text request moves through channel ingress, Gateway routing, typed tools, session memory, and durable delivery.",
  { left: 72, top: 130, width: 1136, height: 38 },
  { fontSize: 18, color: C.muted },
);

const nodes = [];
nodes.push(
  box(
    "01  CHANNEL",
    "WhatsApp, Discord,\nweb chat, or another\nchannel plugin",
    { left: 72, top: 230, width: 195, height: 164 },
    C.ink,
    C.ink,
    C.white,
    "#D8E2EF",
  ),
);
nodes.push(
  box(
    "02  GATEWAY",
    "Normalize the inbound\nmessage and resolve the\ncanonical sessionId",
    { left: 300, top: 230, width: 195, height: 164 },
    C.blueSoft,
    C.blue,
    C.blue,
  ),
);
nodes.push(
  box(
    "03  AGENT TOOLS",
    "TypeBox schemas expose\nproperty_search,\nemail_draft, email_approve",
    { left: 528, top: 230, width: 220, height: 164 },
    C.goldSoft,
    C.gold,
    C.gold,
  ),
);
nodes.push(
  box(
    "04  WORKFLOW",
    "orchestrate.ts routes\nsearch, market, mixed,\nrecommend, knowledge",
    { left: 781, top: 230, width: 195, height: 164 },
    C.tealSoft,
    C.teal,
    C.teal,
  ),
);
nodes.push(
  box(
    "05  DELIVERY",
    "message_handler formats\nthe reply; email.ts holds\nthe approval boundary",
    { left: 1009, top: 230, width: 199, height: 164 },
    C.coralSoft,
    C.coral,
    C.coral,
  ),
);
for (let i = 0; i < nodes.length - 1; i++) arrow(nodes[i], nodes[i + 1]);

shape(
  "roundRect",
  { left: 72, top: 465, width: 1136, height: 122 },
  C.white,
  { style: "solid", fill: C.line, width: 1 },
  16,
);
text(
  "Runtime",
  { left: 96, top: 490, width: 110, height: 24 },
  { fontSize: 16, color: C.coral, bold: true },
);
text(
  "TypeScript ESM on Node.js\nSQLite/Kysely owns runtime state and caches\nNodemailer handles the final email transport after approval",
  { left: 240, top: 483, width: 910, height: 72 },
  { fontSize: 19, color: C.ink },
);
text(
  "Source files: src/tools/message_handler.ts  •  src/tools/orchestrate.ts  •  src/agents/tools/property-search-tool.ts  •  src/agents/tools/email-workflow-tools.ts  •  src/tools/email.ts",
  { left: 72, top: 614, width: 1136, height: 24 },
  { fontSize: 12, color: C.muted },
);
shape("line", { left: 72, top: 680, width: 1136, height: 0 }, "none", {
  style: "solid",
  fill: C.line,
  width: 1,
});
text(
  "OpenClaw  /  housing workflows",
  { left: 72, top: 688, width: 360, height: 18 },
  { fontSize: 11, color: C.muted },
);
text(
  "03",
  { left: 1160, top: 688, width: 48, height: 18 },
  { fontSize: 11, color: C.muted, align: "right" },
);
s.speakerNotes.textFrame.setText(
  [
    "This slide adds the technical text stack behind the housing and email workflows.",
    "Sources: package.json; VISION.md; src/tools/message_handler.ts; src/tools/orchestrate.ts; src/agents/tools/property-search-tool.ts; src/agents/tools/email-workflow-tools.ts; src/tools/email.ts; AGENTS.md.",
  ].join("\n"),
);

const candidate = path.join(buildDir, "housing-openclaw-text-stack-candidate.pptx");
await (await PresentationFile.exportPptx(p)).save(candidate);
for (let i = 0; i < p.slides.items.length; i++) {
  const preview = await p.export({ slide: p.slides.items[i], format: "png", scale: 1 });
  await fs.writeFile(
    path.join(buildDir, `text-stack-slide-${i + 1}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}
const stagingDir = path.join(buildDir, ".codex-finalizer");
await fs.mkdir(stagingDir, { recursive: true });
const result = await finalizePresentation({
  explicitTotalSlideCount: 8,
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
  requiredNativeChartOwnerSlides: [],
  fontPolicy: { basis: "design", families: [family] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, `${path.basename(finalPath)}.validation.json`),
});
console.log(JSON.stringify({ finalPath, candidate, result }, null, 2));
