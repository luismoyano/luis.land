#!/usr/bin/env node
/**
 * Script to classify SVG paths by Y position and add layer classes
 * Layers (top to bottom):
 * - layer-bg: Background/sky paths (highest area, covers top)
 * - layer-mountain-1: Furthest mountains
 * - layer-mountain-2: Second mountain layer
 * - layer-mountain-3: Third mountain layer  
 * - layer-mountain-4: Closest mountains
 * - layer-valley-trees: Tree valley between mountains and terrain
 * - layer-terrain-1: Far terrain/ground
 * - layer-terrain-2: Middle terrain
 * - layer-terrain-3: Closest terrain/foreground
 */

const fs = require('fs');
const path = require('path');

// Read the original SVG
const svgPath = path.join(__dirname, '../assets/landscape.svg');
const svgContent = fs.readFileSync(svgPath, 'utf-8');

// SVG dimensions
const SVG_HEIGHT = 896;
const SVG_WIDTH = 1184;

// Layer boundaries (Y position ranges, 0 = top, 896 = bottom)
// Based on typical landscape composition
const LAYERS = [
  { name: 'layer-bg', minY: -Infinity, maxY: 50 },
  { name: 'layer-mountain-1', minY: 50, maxY: 280 },
  { name: 'layer-mountain-2', minY: 280, maxY: 380 },
  { name: 'layer-mountain-3', minY: 380, maxY: 480 },
  { name: 'layer-mountain-4', minY: 480, maxY: 560 },
  { name: 'layer-valley-trees', minY: 560, maxY: 640 },
  { name: 'layer-terrain-1', minY: 640, maxY: 720 },
  { name: 'layer-terrain-2', minY: 720, maxY: 800 },
  { name: 'layer-terrain-3', minY: 800, maxY: Infinity },
];

/**
 * Parse path d attribute and extract Y coordinates
 */
function getYCoordinates(d, translateY = 0) {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g);
  if (!numbers) return [];
  
  const yCoords = [];
  // In SVG paths, coordinates come in pairs (x,y)
  for (let i = 1; i < numbers.length; i += 2) {
    const y = parseFloat(numbers[i]);
    if (!isNaN(y)) {
      yCoords.push(y + translateY);
    }
  }
  return yCoords;
}

/**
 * Check if a path is the full background rectangle
 */
function isFullBackgroundRect(pathElement) {
  const dMatch = pathElement.match(/d="([^"]+)"/);
  if (!dMatch) return false;
  
  const d = dMatch[1].trim();
  
  // Check for simple rectangle covering the entire SVG
  // Pattern: M0,0 L1184,0 L1184,896 L0,896 Z (or similar)
  const rectPattern = /^M\s*0\s*[,\s]\s*0.*L\s*1184\s*[,\s]\s*0.*L\s*1184\s*[,\s]\s*896.*L\s*0\s*[,\s]\s*896/i;
  if (rectPattern.test(d)) {
    return true;
  }
  
  // Also check simpler patterns
  if (d.includes('M0,0') && d.includes('1184') && d.includes('896')) {
    const numbers = d.match(/-?\d+/g);
    if (numbers) {
      const hasWidth = numbers.includes('1184');
      const hasHeight = numbers.includes('896');
      const startsAtZero = d.startsWith('M0,0') || d.startsWith('M 0,0') || d.startsWith('M0 0');
      if (hasWidth && hasHeight && startsAtZero && numbers.length <= 16) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if path is a large sky/background shape
 * These typically start at Y=0 and cover a large horizontal area
 */
function isLargeSkyShape(pathElement, yCoords, translateY) {
  if (yCoords.length < 4) return false;
  
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  const height = maxY - minY;
  
  // If the shape starts near the top and has significant height
  if (minY <= 10 && height > 200) {
    // Check if path data suggests a sky shape (starts at 0,0)
    const dMatch = pathElement.match(/d="([^"]+)"/);
    if (dMatch) {
      const d = dMatch[1];
      if (d.startsWith('M0,0') || d.startsWith('M 0,0')) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Extract position info from a path element
 */
function getPathPositionInfo(pathElement) {
  // Check for transform translate
  const transformMatch = pathElement.match(/transform="translate\(([^,)]+)[,\s]([^)]+)\)"/);
  let translateX = 0;
  let translateY = 0;
  if (transformMatch) {
    translateX = parseFloat(transformMatch[1]) || 0;
    translateY = parseFloat(transformMatch[2]) || 0;
  }
  
  // Extract d attribute
  const dMatch = pathElement.match(/d="([^"]+)"/);
  if (!dMatch) {
    return { minY: SVG_HEIGHT, centerY: SVG_HEIGHT, maxY: SVG_HEIGHT, translateY };
  }
  
  const d = dMatch[1];
  const yCoords = getYCoordinates(d, translateY);
  
  if (yCoords.length === 0) {
    return { minY: SVG_HEIGHT, centerY: SVG_HEIGHT, maxY: SVG_HEIGHT, translateY };
  }
  
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  const centerY = yCoords.reduce((a, b) => a + b, 0) / yCoords.length;
  
  return { minY, centerY, maxY, translateY, yCoords };
}

/**
 * Determine which layer a path belongs to based on its Y position
 */
function getLayerForPath(pathElement) {
  // Check for full background rectangle first
  if (isFullBackgroundRect(pathElement)) {
    return 'layer-bg';
  }
  
  const posInfo = getPathPositionInfo(pathElement);
  
  // Check for large sky shapes
  if (posInfo.yCoords && isLargeSkyShape(pathElement, posInfo.yCoords, posInfo.translateY)) {
    return 'layer-bg';
  }
  
  // Use weighted position - favor the topmost point but consider the visual center
  // Smaller shapes should be classified by their center, larger ones by their top
  const heightSpan = posInfo.maxY - posInfo.minY;
  
  let effectiveY;
  if (heightSpan > 300) {
    // Very large shapes - use the center more
    effectiveY = posInfo.minY * 0.3 + posInfo.centerY * 0.7;
  } else if (heightSpan > 100) {
    // Medium shapes
    effectiveY = posInfo.minY * 0.5 + posInfo.centerY * 0.5;
  } else {
    // Small shapes - use center
    effectiveY = posInfo.centerY;
  }
  
  for (const layer of LAYERS) {
    if (effectiveY >= layer.minY && effectiveY < layer.maxY) {
      return layer.name;
    }
  }
  
  // Default to terrain-3 if beyond all ranges
  return 'layer-terrain-3';
}

/**
 * Process SVG and add classes to paths
 */
function processSVG(content) {
  // Find all path elements
  const pathRegex = /<path\s+([^>]+)>/g;
  
  let result = content;
  const paths = [];
  let match;
  
  // Collect all paths
  while ((match = pathRegex.exec(content)) !== null) {
    paths.push({
      full: match[0],
      attrs: match[1]
    });
  }
  
  console.log(`Found ${paths.length} paths`);
  
  // Process each path
  const layerCounts = {};
  
  for (const pathInfo of paths) {
    const layer = getLayerForPath(pathInfo.full);
    layerCounts[layer] = (layerCounts[layer] || 0) + 1;
    
    // Build new path element
    let newAttrs = pathInfo.attrs;
    
    // Remove existing fill attribute
    newAttrs = newAttrs.replace(/fill="[^"]*"\s*/g, '');
    
    // Add class and fill="inherit"
    if (newAttrs.includes('class="')) {
      newAttrs = newAttrs.replace(/class="([^"]*)"/, `class="$1 ${layer}"`);
    } else {
      newAttrs = `class="${layer}" ${newAttrs}`;
    }
    
    // Add fill="inherit"
    newAttrs = `fill="inherit" ${newAttrs}`;
    
    const newPath = `<path ${newAttrs}>`;
    result = result.replace(pathInfo.full, newPath);
  }
  
  console.log('\nPaths per layer:');
  const layerOrder = LAYERS.map(l => l.name);
  const sortedEntries = Object.entries(layerCounts).sort((a, b) => {
    return layerOrder.indexOf(a[0]) - layerOrder.indexOf(b[0]);
  });
  
  for (const [layer, count] of sortedEntries) {
    console.log(`  ${layer}: ${count}`);
  }
  
  return result;
}

// Process and save
const processedSVG = processSVG(svgContent);

// Save to a new file
const outputPath = path.join(__dirname, '../assets/landscape-classified.svg');
fs.writeFileSync(outputPath, processedSVG);
console.log(`\nSaved to: ${outputPath}`);
