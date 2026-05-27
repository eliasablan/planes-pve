# Game Asset Credits

The public documentation route at `/docs` is the human-facing version of this record. This file stays with the asset folders so bundled files can be audited later.

## Current Bundled Third-Party Assets

- Biplane Airplane Plane Low Poly
  - Source: https://pixabay.com/3d-models/biplane-airplane-plane-low-poly-131/
  - Author: BlenderTimer / Daniel Roberts
  - License: Pixabay Content License
  - Local path: `/assets/game/models/airplanes/pixabay-biplane-low-poly-131.glb`
  - Downloaded: 2026-05-27
  - Notes: GLB, 1,122 vertices, no textures, no animations. Integrated as an in-game aircraft model, not redistributed as a standalone asset pack.
- Terrain, water, clouds, and nature props are currently generated in code.

## Planned / Optional Assets

| Asset | Source | License | Target path | Notes |
| --- | --- | --- | --- | --- |
| Biplane Airplane Plane Low Poly | https://pixabay.com/3d-models/biplane-airplane-plane-low-poly-131/ | Pixabay Content License | `/assets/game/models/airplanes/pixabay-biplane-low-poly-131.glb` | Bundled. GLB, 1,122 vertices, no textures, no animations. |

## Approved / Review Sources

| Source | License | Status | Use |
| --- | --- | --- | --- |
| Poly Haven | CC0 | Approved | Terrain textures, HDRIs, trees, rocks, natural props |
| ambientCG | CC0 | Approved | PBR materials for ground, bark, leaves, rock, water normals |
| Kenney | CC0 | Approved | Lightweight stylized game-ready props and placeholders |
| OpenGameArt | Mixed per asset | Review required | Aircraft, cloud sprites, VFX, audio |
| Pixabay | Pixabay Content License | Conditional | Portfolio-safe supplemental models when CC0 is not enough |

## Intake Rules

- Prefer CC0 for assets that ship inside the repository.
- Use Pixabay assets only when integrated into the game, not redistributed as standalone asset files.
- Avoid logos, trademarked markings, recognizable characters, and protected IP.
- Record source URL, author, license, and download date before adding binary assets.
- Keep files lightweight: GLB when possible, compressed textures, and simple collision geometry.
