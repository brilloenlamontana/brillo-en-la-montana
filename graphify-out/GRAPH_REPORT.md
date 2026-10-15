# Graph Report - brillo-en-la-montana  (2026-10-14)

## Corpus Check
- 121 files · ~137,008 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 41 file(s) not represented in the graph (top: .glb 33, (none) 3, .css 2)

## Summary
- 526 nodes · 1242 edges · 28 communities (27 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.83)
- Token cost: 947,213 input · 0 output

## Community Hubs (Navigation)
- 3D Avatar and Enemies
- App Shell, Auth and Routing
- Forest Map Scenery
- Imeri House and World Scene
- NPC Interaction and Modals
- Build Tooling Dev Deps
- Backpack Inventory System
- Student Registration and Univalle Data
- Docker Deployment and Entry
- HUD and Mobile Controls
- TS App Config
- TS Node Config
- Runtime Dependencies
- Human Character Sprites
- Oxlint Rules
- Mayor Quest Announcement
- Male Dwarf Sprite
- Female Dwarf Sprite
- Villager Dialog Scroll
- Male Dragonborn Sprite
- Male Elf Sprite
- Male Gnome Sprite
- Male Tiefling Sprite
- Female Elf Sprite
- Female Tiefling Sprite
- Female Gnome Sprite
- Univalle Branding
- TS Root Config

## God Nodes (most connected - your core abstractions)
1. `react` - 51 edges
2. `@react-three/drei` - 28 edges
3. `three` - 23 edges
4. `useAvatarStore` - 23 edges
5. `useProgressStore` - 20 edges
6. `useAuthStore` - 18 edges
7. `compilerOptions` - 18 edges
8. `useUIStore` - 15 edges
9. `compilerOptions` - 15 edges
10. `@react-three/rapier` - 14 edges

## Surprising Connections (you probably didn't know these)
- `CHARACTERS` --references--> `Humano 2D Character Sprite (male human hooded wanderer)`  [INFERRED]
  src/data/characters.ts → public/sprites-2d/man/Humano.png
- `Draconiana Sprite (female dragonborn character portrait)` --shares_data_with--> `CharacterOption`  [INFERRED]
  public/sprites-2d/woman/Draconiana.png → src/data/characters.ts
- `CHARACTERS` --references--> `Draconiana Sprite (female dragonborn character portrait)`  [INFERRED]
  src/data/characters.ts → public/sprites-2d/woman/Draconiana.png
- `StudentRegistrationModalProps` --references--> `UserData`  [EXTRACTED]
  src/components/modals/StudentRegistrationModal.tsx → src/store/authStore.ts
- `Docker without Compose (brillo-en-la-montana:latest)` --semantically_similar_to--> `app-prod (Production Service, Dockerfile)`  [INFERRED] [semantically similar]
  README.md → docker-compose.yml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Docker Deployment Setup (dev + prod)** — readme_docker_deployment, readme_dev_mode_hot_reload, readme_prod_mode_nginx, docker_compose_app, docker_compose_app_prod, readme_env_file [INFERRED 0.85]
- **Vite React Build and Lint Toolchain** — readme_react_typescript_vite_template, readme_vitejs_plugin_react, readme_vitejs_plugin_react_swc, readme_oxc, readme_oxlint [EXTRACTED 1.00]
- **Quest premise: green glow at La Cumbre de la Desesperacion, recover the town treasure** — public_sprites_2d_aseets_mayor_announcement_call_for_heroes, public_sprites_2d_aseets_mayor_announcement_resplandor_verde, public_sprites_2d_aseets_mayor_announcement_la_cumbre_de_la_desesperacion, public_sprites_2d_aseets_mayor_announcement_tesoro_del_pueblo [EXTRACTED 1.00]
- **Dwarf Warrior Loadout (hammer, shield, kilt)** — public_sprites_2d_man_enano_dwarf_character_class, public_sprites_2d_man_enano_war_hammer, public_sprites_2d_man_enano_heater_shield, public_sprites_2d_man_enano_tartan_kilt [INFERRED 0.85]
- **Humana Character Design Sheet** — public_sprites_2d_woman_humana, public_sprites_2d_woman_humana_human_woman_character, public_sprites_2d_woman_humana_woodland_leather_outfit, public_sprites_2d_woman_humana_full_body_front_pose, public_sprites_2d_woman_humana_cel_shaded_2d_art_style [INFERRED 0.85]

## Communities (28 total, 1 thin omitted)

### Community 0 - "3D Avatar and Enemies"
Cohesion: 0.07
Nodes (46): ecctrl, three, Avatar(), PLAYER_START_POSITION, PLAYER_USER_DATA, PlayerController(), STAND_STILL, ColliderBox (+38 more)

### Community 1 - "App Shell, Auth and Routing"
Cohesion: 0.11
Nodes (41): Draconiana Sprite (female dragonborn character portrait), Armored rogue/ranger outfit (cape, pauldron, sword, greaves), Dragonborn (Draconiano/Draconiana) fantasy race, firebase, react-router-dom, App(), LoginLayout(), LoginLayoutProps (+33 more)

### Community 2 - "Forest Map Scenery"
Cohesion: 0.08
Nodes (38): @react-three/drei, CameraColliderBoxes(), BosqueArboles(), BOSQUE_HONGOS_DISTANCES, BOSQUE_HONGOS_URLS, BosqueHongos(), BOSQUE_MANZANAS_DISTANCES, BOSQUE_MANZANAS_URLS (+30 more)

### Community 3 - "Imeri House and World Scene"
Cohesion: 0.07
Nodes (36): @react-three/fiber, Ambience(), CLOSED_DOOR_BOX, INTERIOR_BOXES, isCameraBlocker(), OPEN_DOOR_BOX, SHELL_BOXES, DOOR_CLOSE_ROTATION (+28 more)

### Community 4 - "NPC Interaction and Modals"
Cohesion: 0.11
Nodes (32): react-dom, @react-three/rapier, Recogibles(), Aldeano(), isPlayer(), TALK_SENSOR_HALF_EXTENTS, TALK_SENSOR_POSITION, AldeanoModal() (+24 more)

### Community 5 - "Build Tooling Dev Deps"
Cohesion: 0.05
Nodes (39): devDependencies, autoprefixer, oxlint, postcss, tailwindcss, @tailwindcss/vite, @types/node, @types/react (+31 more)

### Community 6 - "Backpack Inventory System"
Cohesion: 0.17
Nodes (21): BackpackButton(), BackpackIcon(), BackpackPanel(), SlotRect, SpinningItem(), MochilaItemIcon(), ITEM_KEYS, QuickItemBar() (+13 more)

### Community 7 - "Student Registration and Univalle Data"
Cohesion: 0.16
Nodes (17): Law1581ConsentModal(), Law1581ConsentModalContent(), Law1581ConsentModalProps, StudentRegistrationData, StudentRegistrationModal(), StudentRegistrationModalContent(), StudentRegistrationModalProps, Facultad (+9 more)

### Community 8 - "Docker Deployment and Entry"
Cohesion: 0.12
Nodes (19): app (Dev Service, Dockerfile.dev), app-prod (Production Service, Dockerfile), VITE_FIREBASE_* Build Args, VITE_ADMIN_EMAILS Build Arg, index.html Entry Page, Google Fonts (Open Sans, Snowburst One), #root Mount Point, Mobile Viewport Config (no zoom, viewport-fit=cover) (+11 more)

### Community 9 - "HUD and Mobile Controls"
Cohesion: 0.20
Nodes (13): react, HealthUI(), WorldScene(), LoadingScreen(), MobileControls(), MobileControlsProps, MobileControlsToggle(), MobileControlsToggleProps (+5 more)

### Community 10 - "TS App Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 11 - "TS Node Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 12 - "Runtime Dependencies"
Cohesion: 0.13
Nodes (15): dependencies, ecctrl, firebase, @gltf-transform/core, @gltf-transform/extensions, @gltf-transform/functions, leva, react (+7 more)

### Community 13 - "Human Character Sprites"
Cohesion: 0.32
Nodes (7): Humano 2D Character Sprite (male human hooded wanderer), Hooded Wanderer Outfit Design (earth-tone robe, pauldrons, belt pouch, bracers, boots), Human (Humano) Playable Race, Humana Female Character Sprite, Cel-Shaded Outlined 2D Art Style, Human Woman Character (Humana), Woodland Leather Outfit with Leaf Motifs

### Community 14 - "Oxlint Rules"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 15 - "Mayor Quest Announcement"
Cohesion: 0.53
Nodes (6): Mayor Announcement Scroll (sprite), Call for Brave Adventurers (quest hook), La Cumbre de la Desesperacion (location), Mayor (town authority NPC), Green Glow (resplandor verde), Town Treasure (tesoro de nuestro pueblo)

### Community 16 - "Male Dwarf Sprite"
Cohesion: 0.40
Nodes (6): Enano (Dwarf) Male Character Sprite, Enano (Dwarf) Character Class, Flat Cartoon 2D Sprite Art Style, Heater Shield with Diamond Emblem, Tartan Kilt and Cape Outfit, War Hammer

### Community 17 - "Female Dwarf Sprite"
Cohesion: 0.40
Nodes (3): Enana (Female Dwarf) 2D Sprite, Fantasy Warrior Outfit (sword, leather armor, belts, dagger, boots), Female Dwarf Warrior Character

### Community 18 - "Villager Dialog Scroll"
Cohesion: 0.50
Nodes (4): preguntas-aldeanos.png (Villager Question Scroll Sprite), Help Offer Prompt ("¿Desea que te ayudemos?"), Parchment Scroll Dialog Panel, Villager (Aldeano) NPC

### Community 19 - "Male Dragonborn Sprite"
Cohesion: 0.67
Nodes (4): Draconiano Male Sprite (2D character art), Double-bladed Battle Axe with runic sigils, Draconiano (dragon-humanoid race), Purple/violet monochrome character palette

### Community 20 - "Male Elf Sprite"
Cohesion: 0.50
Nodes (3): Elfo Sprite (Male Elf Archer), Elf Ranger / Archer Character, Longbow and Quiver Equipment

### Community 21 - "Male Gnome Sprite"
Cohesion: 0.67
Nodes (4): Gnomo Sprite (2D character art), Gnomo (Gnome / elf-like mountain character), Scroll Bundle (carried rolled papers), Crossed-Tools Medallion

### Community 22 - "Male Tiefling Sprite"
Cohesion: 0.67
Nodes (4): Male 2D Character Sprite Set (sprites-2d/man), Tiflin (Male Tiefling Character Sprite), Rogue-style Outfit (crimson cloak, cowl, belt, sheathed dagger, wrapped gloves), Tiefling Race (horns, tail, pointed ears, red skin, glowing eyes)

### Community 23 - "Female Elf Sprite"
Cohesion: 0.67
Nodes (4): Elfa Sprite (Female Elf Archer), Blue Ranger Outfit (hooded cloak, quiver, longbow, armored boots), Elf Archer Character Archetype, Female 2D Character Sprite Set

### Community 24 - "Female Tiefling Sprite"
Cohesion: 0.50
Nodes (4): Tiflin.png (Female Tiefling 2D Character Sprite), Full-Body Flat-Shaded Character Illustration Style, Red Adventurer Outfit (halter top, sash belt, harem pants, tall boots), Tiefling (Fantasy Race)

### Community 25 - "Female Gnome Sprite"
Cohesion: 1.00
Nodes (3): Gnomo (Woman) 2D Sprite, Forest Adventurer Attire, Gnome Character (Female Variant)

### Community 26 - "Univalle Branding"
Cohesion: 1.00
Nodes (3): Univalle Brand Red (#ea1f01), Univalle Logo (univalle.svg), Universidad del Valle (Univalle)

## Knowledge Gaps
- **36 isolated node(s):** `@gltf-transform/core`, `@gltf-transform/extensions`, `@gltf-transform/functions`, `leva`, `sharp` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 191 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `HUD and Mobile Controls` to `3D Avatar and Enemies`, `App Shell, Auth and Routing`, `Forest Map Scenery`, `Imeri House and World Scene`, `NPC Interaction and Modals`, `Build Tooling Dev Deps`, `Backpack Inventory System`, `Student Registration and Univalle Data`, `Docker Deployment and Entry`?**
  _High betweenness centrality (0.263) - this node is a cross-community bridge._
- **What connects `@gltf-transform/core`, `@gltf-transform/extensions`, `@gltf-transform/functions` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `3D Avatar and Enemies` be split into smaller, more focused modules?**
  _Cohesion score 0.06746031746031746 - nodes in this community are weakly interconnected._
- **Why does `@react-three/drei` connect `Forest Map Scenery` to `3D Avatar and Enemies`, `Imeri House and World Scene`, `NPC Interaction and Modals`, `Build Tooling Dev Deps`, `Backpack Inventory System`, `HUD and Mobile Controls`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `App Shell, Auth and Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.11252268602540835 - nodes in this community are weakly interconnected._
- **Should `Forest Map Scenery` be split into smaller, more focused modules?**
  _Cohesion score 0.07686932215234102 - nodes in this community are weakly interconnected._
- **Should `Imeri House and World Scene` be split into smaller, more focused modules?**
  _Cohesion score 0.0730804810360777 - nodes in this community are weakly interconnected._