#!/usr/bin/env node

/**
 * build-pmtiles.js
 * Convertit les GeoJSON admin en PMTiles via tippecanoe
 * Nécessite: tippecanoe installé (brew install tippecanoe)
 *
 * Usage: node scripts/build-pmtiles.js
 * Entrée: data/processed/admin_all_levels.geojson
 * Sortie: public/tiles/{level}.pmtiles
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '..', 'data', 'processed', 'admin_all_levels.geojson');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'tiles');

const LEVELS = ['districts', 'regions', 'depts', 'communes'];

const TILE_SPECS = {
  districts: {
    minZoom: 5,
    maxZoom: 9,
    layer: 'admin_districts',
    simplify: 10,
  },
  regions: {
    minZoom: 7,
    maxZoom: 10,
    layer: 'admin_regions',
    simplify: 8,
  },
  depts: {
    minZoom: 9,
    maxZoom: 11.5,
    layer: 'admin_depts',
    simplify: 6,
  },
  communes: {
    minZoom: 10,
    maxZoom: 13,
    layer: 'admin_communes',
    simplify: 4,
  },
};

function buildPMTiles() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error('❌ Fichier d\'entrée non trouvé. Lancez d\'abord merge-admin.js');
    process.exit(1);
  }

  // Vérifier tippecanoe
  try {
    execSync('tippecanoe --version', { stdio: 'ignore' });
  } catch {
    console.error('❌ tippecanoe non installé. Installez-le avec:');
    console.error('   macOS: brew install tippecanoe');
    console.error('   Ubuntu: apt install tippecanoe');
    process.exit(1);
  }

  // Créer le dossier de sortie
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const input = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

  for (const level of LEVELS) {
    const spec = TILE_SPECS[level];
    const outputFile = path.join(OUTPUT_DIR, `${level}.pmtiles`);

    console.log(`\n🔨 Construction: ${level}.pmtiles`);
    console.log(`   Zoom: ${spec.minZoom} → ${spec.maxZoom}`);

    // Filtrer les features par niveau
    const filtered = {
      type: 'FeatureCollection',
      features: input.features.filter((f) => {
        const featureLevel = f.properties.level;
        const levelMap = { districts: 'district', regions: 'region', depts: 'dept', communes: 'commune' };
        return featureLevel === levelMap[level];
      }),
    };

    // Écrire le fichier filtré temporaire
    const tempFile = path.join(OUTPUT_DIR, `_temp_${level}.geojson`);
    fs.writeFileSync(tempFile, JSON.stringify(filtered));

    // Construire PMTiles
    const cmd = [
      'tippecanoe',
      `-o "${outputFile}"`,
      '--force',
      '--generate-ids',
      '--read-parallel',
      '--no-tile-size-limit',
      '--simplification=5',
      `--minimum-zoom=${spec.minZoom}`,
      `--maximum-zoom=${spec.maxZoom}`,
      `--layer="${spec.layer}"`,
      `--generate-licenses`,
      `--name="${level}"`,
      `"${tempFile}"`,
    ].join(' ');

    try {
      execSync(cmd, { stdio: 'inherit' });
      console.log(`   ✅ ${level}.pmtiles créé`);

      // Supprimer le fichier temp
      fs.unlinkSync(tempFile);
    } catch (err) {
      console.error(`   ❌ Erreur: ${err.message}`);
    }
  }

  console.log('\n✅ Tous les PMTiles sont prêts!');
  console.log(`📁 Dossier: ${OUTPUT_DIR}`);
}

buildPMTiles();
