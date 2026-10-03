const fs = require('fs');
const path = require('path');

const moves = [
  ['src/components/models-3d/enemies/models-3d/Golem.tsx', 'src/components/models-3d/enemies/golem/Golem.tsx'],
  ['src/components/models-3d/enemies/models-3d/Zumbador.tsx', 'src/components/models-3d/enemies/zumbador/Zumbador.tsx'],
  ['src/components/models-3d/enemies/models-3d/ZumbadorSwarm.tsx', 'src/components/models-3d/enemies/zumbador/ZumbadorSwarm.tsx'],
  ['src/components/models-3d/npcs/models-3d/Aldeano.tsx', 'src/components/models-3d/npcs/aldeano/Aldeano.tsx'],
  ['src/components/modals/AldeanoModal.tsx', 'src/components/models-3d/npcs/aldeano/AldeanoModal.tsx'],
  ['src/components/models-3d/npcs/models-3d/Imeri.tsx', 'src/components/models-3d/npcs/imeri/Imeri.tsx'],
  ['src/components/models-3d/map/models-3d/BosqueOscuridad.tsx', 'src/components/models-3d/map/bosqueOscuridad/BosqueOscuridad.tsx'],
  ['src/components/models-3d/map/models-3d/CasaImeri.tsx', 'src/components/models-3d/map/casaImeri/CasaImeri.tsx'],
  ['src/components/models-3d/map/models-3d/PantanoTristeza.tsx', 'src/components/models-3d/map/pantanoTristeza/PantanoTristeza.tsx'],
  ['src/components/models-3d/map/models-3d/Pinares.tsx', 'src/components/models-3d/map/pinares/Pinares.tsx'],
  ['src/components/models-3d/map/models-3d/Rocas.tsx', 'src/components/models-3d/map/rocas/Rocas.tsx'],
  ['src/components/models-3d/map/models-3d/Terreno.tsx', 'src/components/models-3d/map/terreno/Terreno.tsx'],
  ['src/components/models-3d/map/models-3d/VillaBoj.tsx', 'src/components/models-3d/map/villaBoj/VillaBoj.tsx'],
  ['src/components/models-3d/objects/Card.tsx', 'src/components/models-3d/objects/card/Card.tsx'],
  ['src/components/modals/AnnouncementModal.tsx', 'src/components/models-3d/objects/card/AnnouncementModal.tsx']
];

moves.forEach(([oldPath, newPath]) => {
  if (fs.existsSync(oldPath)) {
    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.renameSync(oldPath, newPath);
  } else {
    console.warn('File not found:', oldPath);
  }
});

function replaceInFile(filePath, searchRegex, replaceValue) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(searchRegex, replaceValue);
    fs.writeFileSync(filePath, content);
  }
}

// Update Enemies.tsx
replaceInFile('src/components/models-3d/enemies/Enemies.tsx', /models-3d\/Golem/g, 'golem/Golem');
replaceInFile('src/components/models-3d/enemies/Enemies.tsx', /models-3d\/ZumbadorSwarm/g, 'zumbador/ZumbadorSwarm');

// Update Npcs.tsx
replaceInFile('src/components/models-3d/npcs/Npcs.tsx', /models-3d\/Imeri/g, 'imeri/Imeri');
replaceInFile('src/components/models-3d/npcs/Npcs.tsx', /models-3d\/Aldeano/g, 'aldeano/Aldeano');

// Update Map.tsx
replaceInFile('src/components/models-3d/map/Map.tsx', /models-3d\/BosqueOscuridad/g, 'bosqueOscuridad/BosqueOscuridad');
replaceInFile('src/components/models-3d/map/Map.tsx', /models-3d\/CasaImeri/g, 'casaImeri/CasaImeri');
replaceInFile('src/components/models-3d/map/Map.tsx', /models-3d\/PantanoTristeza/g, 'pantanoTristeza/PantanoTristeza');
replaceInFile('src/components/models-3d/map/Map.tsx', /models-3d\/Pinares/g, 'pinares/Pinares');
replaceInFile('src/components/models-3d/map/Map.tsx', /models-3d\/Rocas/g, 'rocas/Rocas');
replaceInFile('src/components/models-3d/map/Map.tsx', /models-3d\/Terreno/g, 'terreno/Terreno');
replaceInFile('src/components/models-3d/map/Map.tsx', /models-3d\/VillaBoj/g, 'villaBoj/VillaBoj');

// Update Objects.tsx
replaceInFile('src/components/models-3d/objects/Objects.tsx', /\.\/Card/g, './card/Card');

// Update WorldPage.tsx
replaceInFile('src/pages/WorldPage.tsx', /\.\.\/components\/modals\/AnnouncementModal/g, '../components/models-3d/objects/card/AnnouncementModal');
replaceInFile('src/pages/WorldPage.tsx', /\.\.\/components\/modals\/AldeanoModal/g, '../components/models-3d/npcs/aldeano/AldeanoModal');

// Fix relative imports in AldeanoModal.tsx
replaceInFile('src/components/models-3d/npcs/aldeano/AldeanoModal.tsx', /\.\.\/\.\.\/store/g, '../../../../../store');

// Fix relative imports in AnnouncementModal.tsx
replaceInFile('src/components/models-3d/objects/card/AnnouncementModal.tsx', /\.\.\/\.\.\/store/g, '../../../../../store');
replaceInFile('src/components/models-3d/objects/card/AnnouncementModal.tsx', /\.\.\/\.\.\/services/g, '../../../../../services');

// Clean up old models-3d empty folders
const dirsToClean = [
  'src/components/models-3d/enemies/models-3d',
  'src/components/models-3d/npcs/models-3d',
  'src/components/models-3d/map/models-3d'
];

dirsToClean.forEach(dir => {
  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
});

console.log('Refactoring complete.');
