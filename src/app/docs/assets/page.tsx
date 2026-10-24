import { DocumentationShell, GuideSection, GuideTable } from "@/components/ui/DocumentationShell";
import { ASSET_POLICY, ASSET_SOURCES, BUNDLED_ASSET_TARGETS } from "@/lib/assetCredits";

const sections = [
  { id: "bundled", label: "Bundled assets" }, { id: "audio", label: "Sound effects" },
  { id: "sources", label: "Source directory" }, { id: "licenses", label: "License policy" },
  { id: "intake", label: "Intake checklist" },
] as const;

export default function AssetRecordPage() {
  return (
    <DocumentationShell page="assets" title="Asset record" intro="Credits, sources and intake rules for Skybound Survival. This is a portfolio project; CC0 is the preferred source for third-party files." sections={sections}>
      <GuideSection id="bundled" title="Bundled third-party assets">
        <p>One aircraft model is currently bundled with the game.</p>
        {BUNDLED_ASSET_TARGETS.map((asset) => (
          <div key={asset.name} className="space-y-3 border-l border-wf-ink pl-5">
            <h3 className="text-xl font-medium text-wf-ink"><a href={asset.href} target="_blank" rel="noopener noreferrer">{asset.name}</a></h3>
            <p><strong>Source:</strong> {asset.source}. <strong>License:</strong> {asset.license}.</p>
            <p>{asset.notes}</p>
            <code className="block break-all border border-wf-hair p-3 text-sm text-wf-ink">{asset.targetPath}</code>
          </div>
        ))}
      </GuideSection>
      <GuideSection id="audio" title="Sound effects"><p>Combat and supply sounds are synthesized in the browser with original Web Audio code. No third-party audio clips are bundled or downloaded.</p></GuideSection>
      <GuideSection id="sources" title="Source directory">
        <p>These are candidate sources for new assets. A source listed here does not mean its files are included in the game.</p>
        <GuideTable label="Asset sources and review status" headers={["Source", "License", "Intended use", "Status"]} rows={ASSET_SOURCES.map((source) => [<a key={source.name} href={source.href} target="_blank" rel="noopener noreferrer">{source.name}</a>, source.license, source.use, source.status])} />
      </GuideSection>
      <GuideSection id="licenses" title="License policy">
        <h3 className="text-xl font-medium text-wf-ink">CC0 · preferred</h3>
        <p>Best fit for assets that may live in the repository. It allows use, modification, redistribution, and commercial use without required attribution, while still avoiding protected logos or recognizable third-party IP.</p>
        <h3 className="pt-3 text-xl font-medium text-wf-ink">Pixabay License · conditional</h3>
        <p>Acceptable for integrated portfolio visuals when quality is clearly better than CC0 alternatives. Do not redistribute the asset as a standalone pack, and avoid assets with brands, people, or implied endorsement.</p>
      </GuideSection>
      <GuideSection id="intake" title="Before adding an asset"><ul className="list-disc space-y-3 pl-5">{ASSET_POLICY.map((item) => <li key={item}>{item}</li>)}</ul></GuideSection>
    </DocumentationShell>
  );
}
