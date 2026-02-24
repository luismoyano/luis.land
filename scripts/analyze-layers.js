#!/usr/bin/env node
/**
 * Script to analyze SVG layer distribution
 * Shows which layers are furthest (top of image) vs closest (bottom)
 * 
 * In a sunset scene:
 * - Top of image (low Y) = far away mountains = should be DARKER (silhouettes)
 * - Bottom of image (high Y) = close terrain = should be LIGHTER (catches horizon glow)
 */

const fs = require('fs');
const path = require('path');

// Read the classified SVG
const svgPath = path.join(__dirname, '../assets/landscape-classified.svg');
const svgContent = fs.readFileSync(svgPath, 'utf-8');

// Layer info storage
const layers = {};

// Parse all paths and collect Y data per layer
const pathRegex = /<path\s+([^>]+)>/g;
let match;

while ((match = pathRegex.exec(svgContent)) !== null) {
  const attrs = match[1];
  
  // Extract class
  const classMatch = attrs.match(/class="([^"]+)"/);
  if (!classMatch) continue;
  
  const classes = classMatch[1].split(' ');
  const layerClass = classes.find(c => c.startsWith('layer-'));
  if (!layerClass) continue;
  
  // Extract d attribute for Y analysis
  const dMatch = attrs.match(/d="([^"]+)"/);
  if (!dMatch) continue;
  
  // Check for transform translate
  const transformMatch = attrs.match(/transform="translate\(([^,)]+)[,\s]([^)]+)\)"/);
  let translateY = 0;
  if (transformMatch) {
    translateY = parseFloat(transformMatch[2]) || 0;
  }
  
  // Extract Y coordinates
  const d = dMatch[1];
  const numbers = d.match(/-?\d+(?:\.\d+)?/g);
  if (!numbers) continue;
  
  const yCoords = [];
  for (let i = 1; i < numbers.length; i += 2) {
    const y = parseFloat(numbers[i]);
    if (!isNaN(y)) {
      yCoords.push(y + translateY);
    }
  }
  
  if (yCoords.length === 0) continue;
  
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  const avgY = yCoords.reduce((a, b) => a + b, 0) / yCoords.length;
  
  // Store layer data
  if (!layers[layerClass]) {
    layers[layerClass] = {
      count: 0,
      minYs: [],
      maxYs: [],
      avgYs: []
    };
  }
  
  layers[layerClass].count++;
  layers[layerClass].minYs.push(minY);
  layers[layerClass].maxYs.push(maxY);
  layers[layerClass].avgYs.push(avgY);
}

// Calculate statistics per layer
console.log('='.repeat(80));
console.log('LAYER ANALYSIS - Depth Ordering');
console.log('='.repeat(80));
console.log('');
console.log('SVG coordinate system: Y=0 is TOP, Y=896 is BOTTOM');
console.log('');
console.log('In a SUNSET scene (light at horizon/bottom):');
console.log('  - LOW Y (top)    = FAR mountains  = DARKER (silhouettes against sky)');
console.log('  - HIGH Y (bottom) = CLOSE terrain = LIGHTER (catches warm horizon glow)');
console.log('');
console.log('='.repeat(80));

const layerStats = [];

for (const [layerName, data] of Object.entries(layers)) {
  const avgMinY = data.minYs.reduce((a, b) => a + b, 0) / data.minYs.length;
  const avgMaxY = data.maxYs.reduce((a, b) => a + b, 0) / data.maxYs.length;
  const avgAvgY = data.avgYs.reduce((a, b) => a + b, 0) / data.avgYs.length;
  const overallMinY = Math.min(...data.minYs);
  const overallMaxY = Math.max(...data.maxYs);
  
  layerStats.push({
    name: layerName,
    count: data.count,
    avgMinY,
    avgMaxY,
    avgAvgY,
    overallMinY,
    overallMaxY
  });
}

// Sort by average Y position (top to bottom = far to close)
layerStats.sort((a, b) => a.avgAvgY - b.avgAvgY);

console.log('');
console.log('LAYERS SORTED BY DEPTH (far to close):');
console.log('-'.repeat(80));
console.log('');

layerStats.forEach((layer, index) => {
  const depthLabel = index < layerStats.length / 2 ? 'FAR (darker)' : 'CLOSE (lighter)';
  console.log(`${index + 1}. ${layer.name}`);
  console.log(`   Paths: ${layer.count}`);
  console.log(`   Y Range: ${layer.overallMinY.toFixed(0)} - ${layer.overallMaxY.toFixed(0)}`);
  console.log(`   Avg Y: ${layer.avgAvgY.toFixed(0)} → ${depthLabel}`);
  console.log('');
});

console.log('='.repeat(80));
console.log('');
console.log('RECOMMENDED COLOR ORDERING (Firewatch sunset style):');
console.log('-'.repeat(80));
console.log('');

// Firewatch palette from dark to light
const firewatchPalette = [
  { color: '#0d0404', desc: 'Near black silhouette' },
  { color: '#180808', desc: 'Very dark' },
  { color: '#250d0d', desc: 'Dark burgundy' },
  { color: '#351212', desc: 'Dark red-brown' },
  { color: '#4d1818', desc: 'Deep maroon' },
  { color: '#702520', desc: 'Dark crimson' },
  { color: '#9a3525', desc: 'Burnt sienna' },
  { color: '#c45030', desc: 'Warm orange (horizon glow)' },
];

// Skip layer-bg
const nonBgLayers = layerStats.filter(l => l.name !== 'layer-bg');

console.log('CSS to apply (copy this):');
console.log('');

nonBgLayers.forEach((layer, index) => {
  const paletteIndex = Math.min(index, firewatchPalette.length - 1);
  const colorInfo = firewatchPalette[paletteIndex];
  console.log(`.sunset-mountains-svg .${layer.name} {`);
  console.log(`  fill: ${colorInfo.color}; /* ${colorInfo.desc} */`);
  console.log(`}`);
  console.log('');
});
