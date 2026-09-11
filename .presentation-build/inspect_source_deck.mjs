import { FileBlob, PresentationFile } from "@oai/artifact-tool";
const p = await PresentationFile.importPptx(
  await FileBlob.load(
    "/Users/tiffany/idx-exchange-openclaw/artifacts/openclaw-housing-email-workflows-v2.pptx",
  ),
);
const s = await p.inspect({ kind: "slide,textbox,shape,notes,layout", maxChars: 20000 });
console.log(s.ndjson);
