export const ASSET_SOURCES = [
  {
    name: "Poly Haven",
    href: "https://polyhaven.com/",
    license: "CC0",
    use: "Terrain textures, HDRIs, scanned trees, rocks, and natural props.",
    status: "approved",
  },
  {
    name: "ambientCG",
    href: "https://ambientcg.com/",
    license: "CC0",
    use: "PBR materials for grass, sand, rock, bark, leaves, and water normals.",
    status: "approved",
  },
  {
    name: "Kenney",
    href: "https://kenney.nl/assets",
    license: "CC0",
    use: "Optimized stylized game props, nature packs, UI-adjacent icons, and placeholders.",
    status: "approved",
  },
  {
    name: "OpenGameArt",
    href: "https://opengameart.org/",
    license: "Mixed, verify per asset",
    use: "Aircraft, cloud sprites, VFX, audio, and fallback game-ready assets.",
    status: "review",
  },
  {
    name: "Pixabay",
    href: "https://pixabay.com/",
    license: "Pixabay Content License",
    use: "Portfolio-safe supplemental models when CC0 quality is not enough.",
    status: "conditional",
  },
] as const;

export const ASSET_POLICY = [
  "Prefer CC0 for assets that ship inside the repository.",
  "Use Pixabay assets only when the model is integrated into the game and not redistributed as a standalone asset pack.",
  "Avoid logos, trademarked markings, recognizable characters, or assets based on protected IP.",
  "Record the source URL, author, license, and download date before adding binary assets.",
  "Keep runtime assets lightweight: GLB when possible, compressed textures, and simple collision geometry.",
] as const;

export const BUNDLED_ASSET_TARGETS = [
  {
    name: "Biplane Airplane Plane Low Poly",
    source: "Pixabay",
    href: "https://pixabay.com/3d-models/biplane-airplane-plane-low-poly-131/",
    author: "BlenderTimer / Daniel Roberts",
    license: "Pixabay Content License",
    targetPath: "/assets/game/models/airplanes/pixabay-biplane-low-poly-131.glb",
    notes: "Bundled GLB, 1,122 vertices, no textures, no animations. Used as an integrated portfolio game model, not as a redistributed standalone asset.",
  },
] as const;
