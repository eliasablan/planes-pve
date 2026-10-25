import { DocumentationShell, GuideSection, GuideTable } from "@/components/ui/DocumentationShell";
import { ROLE_STATS } from "@/lib/pveRules";

const sections = [
  { id: "quick-start", label: "First flight" }, { id: "controls", label: "Controls" },
  { id: "weapons", label: "Weapons & aiming" }, { id: "enemies", label: "Enemy aircraft" },
  { id: "supplies", label: "Resupply" }, { id: "survival", label: "Waves & survival" },
  { id: "scoring", label: "Score & ranking" },
] as const;

export default function DocumentationPage() {
  return (
    <DocumentationShell page="guide" title="Pilot’s handbook" intro="Everything you need to fly, fight and survive over the island. Learn your aircraft, read the threats and plan your next supply pickup." sections={sections}>
      <GuideSection id="quick-start" title="Your first flight">
        <p>Press <strong>Play</strong> to start airborne above the island with <strong>100 health, 120 gun rounds and 3 missiles</strong>. Move the mouse gently to steer; keep it near the centre of the screen to steady your flight.</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Line up an enemy with your crosshair. The target marker says <strong>Fire</strong> when your selected weapon has a firing solution.</li>
          <li>Hold click or Space to fire. Use the gun for lighter aircraft and save missiles for heavy targets.</li>
          <li>Clear the wave, then fly through supply boxes ahead of you. Keep enough height to clear the mountains.</li>
        </ol>
        <p>Your run ends when health reaches zero. Enemy attacks have a <strong>6.5-second grace period</strong> at the start, giving you time to orient yourself.</p>
      </GuideSection>
      <GuideSection id="controls" title="Flight controls">
        <GuideTable label="Keyboard and mouse controls" headers={["Input", "Action", "How to use it"]} rows={[
          ["Mouse", "Steer", "Move away from centre to turn; return towards centre to steady the aircraft."],
          ["W / S", "Throttle up / down", "Adjust engine power."], ["A / D", "Roll left / right", "Bank the aircraft."],
          ["↑ / ↓", "Pitch", "Control the nose vertically."], ["← / →", "Yaw", "Turn the nose left or right."],
          ["Click / Space", "Fire", "Hold to keep firing the selected weapon."], ["1 / 2", "Gun / missile", "Select your weapon."],
          ["Shift", "Air brake", "Hold to slow down."], ["O", "Mouse steering", "Toggle mouse steering to use keyboard flight controls."],
          ["M", "Radar size", "Cycle the radar through four sizes."],
          ["P / Esc", "Pause", "Freeze the run and open the briefing: objective, enemies, supplies and controls."],
        ]} />
        <p>Sound and display settings are available from the controls inside the game.</p>
      </GuideSection>
      <GuideSection id="weapons" title="Weapons and aiming">
        <GuideTable label="Player weapon statistics" headers={["Weapon", "Damage per hit", "Fire interval", "Range"]} rows={[
          ["Machine gun", "12", "0.15 seconds", "780 world units"], ["Missile", "80", "2 seconds", "1,200 world units"],
        ]} />
        <p>The gun needs a tighter aim; missiles accept a wider angle around the crosshair. A shot spends ammunition even when it misses. <strong>Mountains block shots and target acquisition</strong>, so gain height or move around the ridge to get a clear line of sight.</p>
        <p>Hits are resolved when you fire. The target marker tracks an enemy near your crosshair; bring it into the centre until it reads <strong>Fire</strong>. When enemies overlap, damage goes to the nearest eligible target.</p>
      </GuideSection>
      <GuideSection id="enemies" title="Know the enemy">
        <p>Colours identify each aircraft’s role. Health and damage stay the same across waves; later waves add more aircraft.</p>
        <GuideTable label="Enemy health and attack statistics" headers={["Aircraft", "Health", "Damage / hit", "Shots / burst", "Reload after burst"]} rows={Object.entries(ROLE_STATS).map(([role, stats]) => [
          <span key={role} className="inline-flex items-center gap-2 capitalize"><span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: stats.color }} />{role}</span>, stats.hp, stats.damage, stats.burst, `${stats.reloadMs / 1000} seconds`,
        ])} />
        <ul className="list-disc space-y-3 pl-5">
          <li><strong>Scout, green:</strong> the fastest and lightest aircraft. Closes in and circles you. Three gun hits or one missile will destroy it.</li>
          <li><strong>Fighter, red:</strong> a balanced threat with the longest burst. Takes six gun hits or one missile.</li>
          <li><strong>Bomber, yellow:</strong> slow, durable and able to attack from farther away. Takes ten gun hits or two missiles.</li>
        </ul>
        <p>Enemy attacks are spaced by at least <strong>2.3 seconds</strong> within a burst, followed by the reload above. Each hit removes the listed health immediately; enemies also need a clear line of sight through the terrain.</p>
      </GuideSection>
      <GuideSection id="supplies" title="Keep your aircraft supplied">
        <p>Clear a wave to spawn boxes ahead of your current heading. Fly close to a box to collect it automatically; the pickup radius is <strong>85 world units</strong>. Boxes sit above the terrain, so check their altitude as you approach.</p>
        <GuideTable label="Supply rewards and availability" headers={["Supply", "Restores", "Capacity", "Appears after"]} rows={[
          ["Gun ammunition", "+60 rounds", "180 rounds", "Every wave"], ["Repair", "+50 health", "100 health", "Every even wave"], ["Missile", "+1 missile", "5 missiles", "Every fifth wave"],
        ]} />
        <p>Rewards stop at capacity. A box is consumed even if you are already full. If you run out of gun ammunition while enemies remain and no ammo box is available, an <strong>emergency ammo box appears after 5 seconds</strong>.</p>
      </GuideSection>
      <GuideSection id="survival" title="Waves, terrain and survival">
        <p>Every wave starts with a scout, a fighter and a bomber. One extra aircraft joins every two waves, up to <strong>8 enemies per wave</strong>. The next wave arrives <strong>2.4 seconds</strong> after the last enemy is destroyed.</p>
        <p><strong>Hitting the ground or the sea is fatal.</strong> Watch your ground clearance, especially when diving or turning near a ridge. Terrain can provide cover from enemy fire, but you still need room to manoeuvre.</p>
        <p>The combat area has a fixed boundary. A warning appears beyond 3,800 world units from the centre; beyond 4,600, your aircraft takes <strong>20 damage per second</strong>. Turn back when the warning appears.</p>
      </GuideSection>
      <GuideSection id="scoring" title="Your score and the global ranking">
        <GuideTable label="Scoring rewards" headers={["Achievement", "Points"]} rows={[
          ["Destroy a scout", "100"], ["Destroy a fighter", "160"], ["Destroy a bomber", "260"], ["Clear a wave", "180 + (25 × wave number)"],
        ]} />
        <p>When your run ends, save a qualifying score with an arcade name of <strong>3–12 letters or numbers</strong>. The global top 10 is shared across devices. Runs are recorded with their start time and approximate country; no account is required.</p>
        <p>If the score service is unavailable, you can keep flying. Retry recording or saving from the game-over screen before leaving it. Earlier scores saved only in your browser stay on that device and are not uploaded automatically.</p>
        <p>Choose <strong>Fly again</strong> for a fresh run, or <strong>Start screen</strong> to return to the menu.</p>
      </GuideSection>
    </DocumentationShell>
  );
}
