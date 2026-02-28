/**
 * Luis.land - Timeline Animation
 * 
 * Animation sequence:
 * 1. After 3 seconds, circle grows next to "Luis"
 * 2. After circle animation completes, SVG timeline becomes visible
 * 3. As user scrolls, the line draws and changes colors
 * 4. Content sections reveal with IntersectionObserver
 */

(function() {
  'use strict';

  // DOM Elements
  const originCircle = document.getElementById('origin-circle');
  const timelineSvg = document.getElementById('timeline-svg');
  const colorfulPath = document.getElementById('timeline-path-colorful');
  const pencilPath = document.getElementById('timeline-path-pencil');
  const scribbleContainer = document.getElementById('scribble-container');
  const scribblePath = document.getElementById('scribble-path');

  // Hide SVG stroke animations on mobile
  if (timelineSvg) timelineSvg.style.display = 'none';
  if (document.getElementById('eraser-icon')) document.getElementById('eraser-icon').style.display = 'none';
  const eraserIcon = document.getElementById('eraser-icon');
  const scrollIndicator = document.getElementById('scroll-indicator');
  const heroSubtitle = document.getElementById('hero-subtitle');
  const heroName = document.getElementById('hero-name');
  const nameCursor = document.getElementById('name-cursor');
  const firstStory = document.getElementById('first-story');
  const notebookSection = document.getElementById('notebook-section');
  const revealElements = document.querySelectorAll('.reveal');
  
  // Map elements
  const mapSection = document.getElementById('map-section');
  const mapBg = document.getElementById('map-bg');
  const mapPathSvg = document.getElementById('map-path-svg');
  const treasurePath = document.getElementById('treasure-path');
  const treasureMaskPath = document.getElementById('treasure-mask-path');
  const compassIcon = document.getElementById('compass-icon');
  
  // Sparkle effect elements
  const dividerFlash = document.getElementById('divider-flash');
  const sparkleContainer = document.getElementById('sparkle-container');
  const sectionDivider = document.querySelector('.section-divider');
  const sunsetSection = document.getElementById('sunset-section');

  // Color stops for the timeline (percentage -> color)
  const colorStops = [
    { at: 0,    color: '#1a1a1a' },
    { at: 0.33, color: '#3d3d3d' },
    { at: 0.66, color: '#2a2a2a' },
    { at: 1,    color: '#1a1a1a' }
  ];

  // State
  let pathLength = 0;
  let isTimelineReady = false;
  let initialAnimationComplete = false; // Track if initial animation has finished
  let isScrollLocked = true; // Lock scroll until initial animation completes
  let isProgrammaticScrolling = false; // True while scroll-to-top animation runs
  let isModalOpen = false; // True while the email modal is visible
  let subtitleStartY = 0; // Initial Y position of subtitle
  let lineStartX = 0; // X position where the line starts (circle center)
  let lineStartY = 0; // Y position where the line starts (circle center)
  let circleRadius = 0; // Radius of the origin circle
  let pencilTransitionStart = 0; // Path length where eraser/transition is located
  
  // Scribble state
  let isScribbling = false; // Whether we're currently in scribble mode
  let isReverseScribbling = false; // Whether we're undrawing the scribble
  let scribbleProgress = 0; // 0 to 1, how much of the scribble is drawn
  let scribbleScrollAccumulator = 0; // Accumulated scroll during scribble
  let SCRIBBLE_SCROLL_AMOUNT = 500; // Total scroll pixels needed to complete scribble (recalculated dynamically)
  let lastScrollY = 0; // Track last scroll position for direction detection
  
  // Hand-drawn scribble path (from assets/garabato.svg, scaled and repositioned)
  const SCRIBBLE_PATH = "M 16.582 53.489 C 15.1 73.284 17.674 79.855 22.796 97.863 C 28.473 117.82 43.902 134.396 57.171 149.597 C 94.18 191.992 141.422 227.769 192.555 250.853 C 226.572 266.21 259.26 271.895 294.549 255.415 C 304.528 250.755 313.152 244.475 321.812 237.776 C 331.286 230.446 342.671 222.571 347.693 211.167 C 353.597 197.76 346.412 181.869 340.554 169.996 C 335.36 159.469 329.693 147.804 321.082 139.557 C 308.276 127.293 287.552 127.206 271.465 122.236 C 252.211 116.287 231.976 110.767 211.579 114.83 C 194.489 118.234 179.178 128.471 165.69 138.978 C 141.513 157.812 115.472 182.848 109.678 214.351 C 106.03 234.187 125.834 254.049 138.28 266.574 C 166.6 295.074 194.28 322.051 237.356 320.67 C 248.181 320.323 258.129 317.916 268.279 314.32 C 277.632 311.006 289.022 307.531 295.289 299.208 C 299.319 293.856 299.753 286.027 300.261 279.632 C 301.56 263.28 299.745 246.893 297.975 230.664 C 295.727 210.055 294.891 186.781 284.483 168.245 C 269.387 141.36 233.277 147.112 208.733 155.473 C 197.826 159.189 187.695 163.347 177.229 168.242 C 170.928 171.189 164.669 174.238 158.541 177.53 C 122.906 196.673 64.189 232.236 82.357 281.689 C 89.707 301.696 119.343 315.856 135.668 326.589 C 153.319 338.193 171.122 351.444 191.877 356.971 C 201.118 359.431 210.981 359.611 220.476 359.402 C 232.321 359.142 243.87 356.599 254.221 347.952 C 261.585 341.8 263.802 330.138 264.256 322.421 C 265.248 305.573 264.562 288.426 263.872 271.585 C 262.399 235.672 261.444 192.493 218.079 183.066 C 178.378 174.436 140.39 197.368 111.279 221.776 C 97 233.747 81.103 248.484 83.947 268.799 C 87.288 292.659 117.017 312.529 133.878 326.426 C 170.207 356.369 212.283 388.997 261.346 390.115 C 270.563 390.325 281.428 391.432 290.451 388.926 C 295.064 387.644 295.67 383.981 298.998 381.829 C 310.5 374.392 320.293 362.958 330.187 353.617 C 347.725 337.058 370.901 319.431 375.392 294.207 C 379.687 270.085 372.003 242.012 354.606 224.311 C 347.516 217.098 334.496 212.838 326.09 206.649 C 309.758 194.625 292.672 183.223 272.007 180.61 C 264.306 179.636 251.54 179.656 244.217 180.888 C 231.138 183.089 223.115 186.66 211.621 193.256 C 185.365 208.322 153.165 237.935 151.821 271.531 C 150.168 312.845 181.683 350.455 202.368 382.993 C 207.041 390.343 209.521 389.601 213.719 397.234 C 214.74 399.091 219.405 410.196 220.417 412.146 C 221.299 413.845 222.232 422.28 221.694 424.736 C 220.791 428.865 219.856 432.994 219.034 437.14 C 217.265 446.061 211.466 469.388 218.434 478.604";
  let SCRIBBLE_SCALE = 2.5; // Scale factor for the scribble (recalculated dynamically)
  const SCRIBBLE_VIEWBOX_SIZE = 500; // Original viewBox of the scribble SVG
  // The scribble path starts at these coordinates in the original SVG
  const SCRIBBLE_START_X = 16.582;
  const SCRIBBLE_START_Y = 53.489;
  let scribblePathLength = 0; // Total length of the scribble path
  let scribblePosition = { x: 0, y: 0 }; // Position where scribble is placed
  let scribbleEndPoint = { x: 0, y: 0 }; // Final point of scribble in screen coordinates
  
  // Pencil style config (used for scribble)
  const PENCIL_COLOR = '#4a4a4a'; // Graphite gray
  const PENCIL_WIDTH_RATIO = 0.3; // Pencil/scribble is 30% of original stroke width
  
  // Eraser config
  const ERASER_SCALE = 0.25; // Scale of the eraser icon
  const ERASER_ORIGINAL_WIDTH = 570; // Original SVG width
  const ERASER_ORIGINAL_HEIGHT = 553; // Original SVG height
  let eraserTransitionPoint = { x: 0, y: 0 }; // Position where eraser appears
  
  // Waypoints for the timeline path (will be populated dynamically)
  // Each waypoint: { x, y, type: 'line' | 'curve' }
  let waypoints = [];

  /**
   * Lock scrolling on the page
   */
  function lockScroll() { /* disabled on mobile */ }

  function unlockScroll() {
    isScrollLocked = false;
    if (!isModalOpen) document.body.style.overflow = '';
  }

  /**
   * Returns the current vertical scroll offset in page coordinates.
   * getBoundingClientRect() uses the layout viewport coordinate system,
   * which corresponds to window.scrollY. visualViewport.pageTop can differ
   * during rubber-band scrolling on iOS, causing misalignment.
   */
  function getPageScrollY() {
    return window.scrollY;
  }

  /**
   * Returns the CSS-pixel width of the visible viewport.
   * getBoundingClientRect() returns CSS-pixel coordinates, so the SVG viewBox
   * must use the same unit. window.innerWidth can return a larger value in some
   * Chrome DevTools emulation modes (layout viewport > visual viewport), causing
   * SVG coordinates to be scaled down and misaligned with DOM element positions.
   * visualViewport.width always matches the CSS-pixel space used by getBoundingClientRect().
   */
  function getViewportWidth() {
    return window.visualViewport ? window.visualViewport.width : window.innerWidth;
  }

  /**
   * Generate waypoints for the timeline path based on content positions
   */
  function generateWaypoints() {
    const viewportWidth = getViewportWidth();
    const viewportHeight = (window.visualViewport ? window.visualViewport.height : window.innerHeight);
    const documentHeight = document.documentElement.scrollHeight;
    
    // Start point (circle center)
    waypoints = [
      { x: lineStartX, y: lineStartY, type: 'start' }
    ];
    
    if (firstStory) {
      const firstStoryRect = firstStory.getBoundingClientRect();
      const firstStoryTop = firstStoryRect.top + getPageScrollY();
      
      // The timeline ends before the first-story text, giving room for the scribble
      // Offset upward so the eraser and scribble start higher on the page
      // On mobile the gap between viewport bottom and firstStoryTop can be small,
      // so cap the offset adaptively to avoid placing the eraser inside the viewport.
      const gap = firstStoryTop - viewportHeight;
      const offset = gap > 560 ? 280 : Math.min(280, gap * 0.5);
      const eraserHalfHeight = (ERASER_ORIGINAL_HEIGHT * ERASER_SCALE) / 2 + 40;
      const eraserY = Math.max(firstStoryTop - offset, viewportHeight + eraserHalfHeight);
      waypoints.push({ x: lineStartX, y: eraserY, type: 'line' });
    } else {
      // Fallback: just a straight line to the bottom
      waypoints.push({ x: lineStartX, y: documentHeight, type: 'line' });
    }
    
    return waypoints;
  }

  /**
   * Generate SVG path data string from waypoints
   */
  function generatePathData() {
    if (waypoints.length < 2) return '';
    
    let pathData = `M ${waypoints[0].x} ${waypoints[0].y}`;
    
    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      
      if (curr.type === 'curve') {
        // Create a smooth cubic bezier curve for a rounded corner
        // Control point 1: continues vertically from prev point
        // Control point 2: comes horizontally into the curr point
        const cp1x = prev.x;
        const cp1y = prev.y + (curr.y - prev.y) * 0.9; // 90% down vertically
        const cp2x = prev.x + (curr.x - prev.x) * 0.1; // 10% across horizontally  
        const cp2y = curr.y;
        pathData += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${curr.x} ${curr.y}`;
      } else {
        // Simple line to
        pathData += ` L ${curr.x} ${curr.y}`;
      }
    }
    
    return pathData;
  }

  /**
   * Generate SVG path starting from circle position — disabled on mobile
   */
  function generatePathFromCircle() {
    // SVG stroke animations disabled on mobile version
  }
  
  /**
   * Update SVG viewBox based on scroll position
   */
  function updateViewBox() {
    if (!timelineSvg) return;
    
    const scrollY = getPageScrollY();
    const viewportWidth = getViewportWidth();
    // Use visualViewport.height on iOS Safari to get the actual visible height
    // (window.innerHeight can be larger than the visible area when the address bar is shown)
    const viewportHeight = (window.visualViewport ? window.visualViewport.height : window.innerHeight);
    
    // Shift the viewBox down as user scrolls
    timelineSvg.setAttribute('viewBox', `0 ${scrollY} ${viewportWidth} ${viewportHeight}`);
  }

  /**
   * Initialize the timeline paths for drawing animation
   */
  function initTimelinePath() {
    if (!colorfulPath || !pencilPath) return;
    
    // Hide eraser until notebook-section scrolls into view
    if (eraserIcon) eraserIcon.style.opacity = '0';
    
    // Generate path based on circle position
    generatePathFromCircle();

    if (pathLength === 0) {
      return;
    }
    
    // Set up colorful path for draw animation (fully hidden initially)
    colorfulPath.style.strokeDasharray = pathLength;
    colorfulPath.style.strokeDashoffset = pathLength;
    
    // Set up pencil path (fully hidden initially)
    pencilPath.style.strokeDasharray = `0 ${pathLength}`;
    pencilPath.style.strokeDashoffset = 0;
    
    // Position eraser at transition point (always visible)
    updateEraserPosition();
  }

  /**
   * Interpolate between two hex colors
   */
  function lerpColor(color1, color2, t) {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Convert hex color to RGB object
   */
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Get the color for a given scroll progress (0 to 1)
   */
  function getColorAtProgress(progress) {
    // Find the two color stops we're between
    for (let i = 0; i < colorStops.length - 1; i++) {
      const current = colorStops[i];
      const next = colorStops[i + 1];
      
      if (progress >= current.at && progress <= next.at) {
        // Calculate local progress between these two stops
        const localProgress = (progress - current.at) / (next.at - current.at);
        return lerpColor(current.color, next.color, localProgress);
      }
    }
    
    // Return last color if we're at the end
    return colorStops[colorStops.length - 1].color;
  }

  /**
   * Get the Y position at a given length along the path
   */
  function getYAtPathLength(length) {
    if (!colorfulPath || pathLength === 0) return lineStartY;
    const point = colorfulPath.getPointAtLength(Math.min(length, pathLength));
    return point.y;
  }

  /**
   * Get the path length needed to reach a target Y position
   * Uses binary search since the path may not be strictly vertical
   */
  function getPathLengthForY(targetY) {
    if (!colorfulPath || pathLength === 0) return 0;
    
    // Binary search to find the length where Y matches targetY
    let low = 0;
    let high = pathLength;
    let iterations = 0;
    const maxIterations = 50;
    
    while (high - low > 1 && iterations < maxIterations) {
      const mid = (low + high) / 2;
      const point = colorfulPath.getPointAtLength(mid);
      
      if (point.y < targetY) {
        low = mid;
      } else {
        high = mid;
      }
      iterations++;
    }
    
    return (low + high) / 2;
  }

  /**
   * Calculate the target line end Y position based on scroll
   * The line end should stay at the vertical center of the viewport
   */
  function getTargetLineEndY() {
    const scrollY = getPageScrollY();
    const viewportHeight = (window.visualViewport ? window.visualViewport.height : window.innerHeight);
    const viewportCenter = viewportHeight / 2;
    
    // The target end Y is at the center of the current viewport (in document coordinates)
    return scrollY + viewportCenter;
  }

  /**
   * Position the eraser icon at the transition point on the path
   */
  function updateEraserPosition() {
    if (!eraserIcon || !colorfulPath || pencilTransitionStart === 0) return;
    
    // Get the point on the path where transition happens
    const point = colorfulPath.getPointAtLength(pencilTransitionStart);
    eraserTransitionPoint = { x: point.x, y: point.y };
    
    // Calculate offset to center the eraser on the path
    const scaledWidth = ERASER_ORIGINAL_WIDTH * ERASER_SCALE;
    const scaledHeight = ERASER_ORIGINAL_HEIGHT * ERASER_SCALE;
    
    // Position eraser centered on the transition point
    // The eraser SVG has its content offset, so we adjust accordingly
    const offsetX = point.x - scaledWidth / 2 - 10;
    const offsetY = point.y - scaledHeight / 2 - 40;
    
    eraserIcon.setAttribute('transform', `translate(${offsetX}, ${offsetY}) scale(${ERASER_SCALE})`);
  }

  /**
   * Update the timeline drawing based on scroll position
   * 
   * Strategy:
   * - Colorful path: draws from start to the eraser/transition point (end of path)
   * - When reaching the end of the colorful path, we enter "scribble mode":
   *   - Scroll is locked but we capture scroll delta
   *   - The scribble draws based on accumulated scroll
   *   - Once scribble is complete, normal scroll resumes
   * - After scribble, a new path will continue (to be added later)
   */
  function updateTimeline() {
    if (!isTimelineReady || !colorfulPath || !initialAnimationComplete) return;
    
    const viewportHeight = (window.visualViewport ? window.visualViewport.height : window.innerHeight);
    const scrollY = getPageScrollY();
    
    // The initial animation ended with the line at the bottom of the viewport
    const initialLineEndY = viewportHeight;
    
    // The target is to have the line end at the center of the viewport
    const targetLineEndY = getTargetLineEndY();
    
    // Only start following scroll when the viewport center has scrolled past the initial line end
    const scrollThreshold = viewportHeight / 2;
    
    let currentLineEndY;
    if (scrollY < scrollThreshold) {
      // Below the threshold: shrink the line back toward the start point
      // At scrollY=0 the line is fully retracted; at scrollY=scrollThreshold it's at initialLineEndY
      const t = scrollY / scrollThreshold;
      currentLineEndY = lineStartY + (initialLineEndY - lineStartY) * t;

      // Subtitle: static on mobile, no animation
    } else {
    }
    
    // Find the path length needed to reach this Y position
    // Clamp to pathLength since the path ends at the eraser.
    // Small dead-zone: don't start drawing until the line would extend at least
    // one stroke-width past the origin. This absorbs any sub-pixel rounding
    // differences between the circle position and the path start, ensuring the
    // segment is completely hidden (not a faint dot) at rest.
    const MIN_DRAW_DISTANCE = circleRadius * 2;
    let targetLength = 0;
    if (currentLineEndY > lineStartY + MIN_DRAW_DISTANCE) {
      targetLength = Math.min(getPathLengthForY(currentLineEndY), pathLength);
    }
    
    // === SCRIBBLE MODE: disabled on mobile, just reveal the story content ===
    lastScrollY = scrollY;
    if (notebookSection && firstStory) {
      const storyContent = firstStory.closest('.story-content');
      if (storyContent) storyContent.classList.add('visible');
      const storyLines = firstStory.querySelectorAll('.story-line');
      storyLines.forEach(line => {
        line.classList.add('highlight-animated');
        line.style.setProperty('--highlight-progress', '100%');
      });
    }
  }

  /**
   * Set up IntersectionObserver for reveal animations
   */
  function setupRevealObserver() {
    const observerOptions = {
      root: null,
      // Negative bottom margin of 40% means elements trigger when their top reaches 3/5 (60%) of viewport
      rootMargin: '0px 0px -40% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        } else {
          // Remove visible class when element leaves viewport (reversible)
          entry.target.classList.remove('visible');
        }
      });
    }, observerOptions);

    revealElements.forEach(el => observer.observe(el));
  }

  /**
   * Animate the initial segment of the timeline
   */
  function animateInitialSegment() {
    if (!colorfulPath || pathLength === 0) {
      return;
    }
    
    const viewportHeight = window.innerHeight;
    // Initial animation draws the line to the bottom of the viewport
    const initialLineEndY = viewportHeight;
    const initialPathLength = getPathLengthForY(initialLineEndY);
    const initialDrawProgress = initialPathLength / pathLength;

    const targetOffset = pathLength * (1 - initialDrawProgress);
    const startOffset = pathLength;
    const duration = 1000;
    const startTime = performance.now();
    
    // Calculate how far the subtitle needs to move (to bottom of viewport)
    const subtitleTravelDistance = initialLineEndY - subtitleStartY - 50; // 50px padding from bottom
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      // Animate only colorful path (pencil doesn't appear until after transition point)
      const currentOffset = startOffset - (startOffset - targetOffset) * eased;
      colorfulPath.style.strokeDashoffset = currentOffset;
      
      // Subtitle: static on mobile, no animation
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete, allow scroll-based updates
        initialAnimationComplete = true;
        unlockScroll();
      }
    }
    
    requestAnimationFrame(animate);
  }

  /**
   * Start the initial animation sequence
   */
  function startAnimationSequence() {
    // Step 1: After 3 seconds, show the circle and start typewriter simultaneously
    setTimeout(() => {
      if (originCircle) {
        originCircle.classList.add('visible');
      }

      // Typewriter: type "Luis" over ~800ms, in sync with the circle appearing
      if (heroName && nameCursor) {
        const fullName = 'Luis';
        const charDelay = 150; // ms per character
        fullName.split('').forEach((char, i) => {
          setTimeout(() => {
            heroName.textContent += char;
          }, i * charDelay);
        });
        // Cursor stays blinking after typing — no extra logic needed,
        // the CSS animation handles it permanently
      }
      
      // Step 2: After circle animation (1s), show timeline and scroll indicator
      setTimeout(() => {
        if (timelineSvg) {
          // Make SVG visible FIRST — on iOS Safari, getTotalLength() returns 0
          // on elements with opacity:0, so we must show before measuring.
          timelineSvg.classList.add('visible');
          
          // One rAF so the browser applies layout before we measure path lengths
          requestAnimationFrame(() => {
            initTimelinePath();
            initTreasureMap();
            isTimelineReady = true;
            initialAnimationComplete = true;
            if (colorfulPath) {
              colorfulPath.style.strokeDasharray = pathLength;
              colorfulPath.style.strokeDashoffset = pathLength;
            }
            if (heroSubtitle) {
              heroSubtitle.style.transform = 'translateY(0)';
              heroSubtitle.style.opacity = '1';
            }
            unlockScroll();
            // Force a first update in case the user scrolled during init
            updateViewBox();
            updateTimeline();
          });
        }
        
        if (scrollIndicator) {
          scrollIndicator.classList.add('visible');
        }
      }, 1000);
      
    }, 3000);
  }

  /**
   * Handle scroll events with throttling
   */
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateViewBox();
        updateTimeline();
        updateTreasureMap();
        updateSilhouettes();
        ticking = false;
      });
      ticking = true;
    }
  }

  /**
   * Handle wheel events during scribble mode
   * When scribbling, we capture wheel delta to draw the scribble
   * instead of scrolling the page
   */
  function onWheel(e) {
    if (isProgrammaticScrolling) return;
    if (isScribbling) {
      e.preventDefault();
      
      // Accumulate scroll delta (positive = scroll down = draw more, negative = scroll up = erase)
      const delta = e.deltaY;
      
      scribbleScrollAccumulator += delta;
      
      // Check if user is trying to scroll up past the start
      if (scribbleScrollAccumulator < 0) {
        // User wants to exit scribble mode by scrolling up
        scribbleScrollAccumulator = 0;
        scribbleProgress = 0;
        isScribbling = false;
        isReverseScribbling = false; // Reset reverse mode flag
        unlockScroll();
        
        // Remove highlight animation class
        if (firstStory) {
          const storyLines = firstStory.querySelectorAll('.story-line');
          storyLines.forEach(line => {
            line.classList.remove('highlight-animated');
            line.style.setProperty('--highlight-progress', '0%');
          });
        }
        
        // Reset scribble path
        if (scribblePath && scribblePathLength > 0) {
          scribblePath.style.strokeDashoffset = scribblePathLength;
        }
        
        return;
      }
      
      // Clamp accumulator to max
      scribbleScrollAccumulator = Math.min(scribbleScrollAccumulator, SCRIBBLE_SCROLL_AMOUNT);
      scribbleProgress = scribbleScrollAccumulator / SCRIBBLE_SCROLL_AMOUNT;
      
      // If in reverse mode and user scrolls back down to complete, exit reverse mode
      if (isReverseScribbling && scribbleProgress >= 1) {
        isReverseScribbling = false;
        isScribbling = false;
        unlockScroll();
        return;
      }
      
      // Trigger timeline update
      updateTimeline();
    }
  }

  // ============================================
  // TREASURE MAP SECTION
  // ============================================
  
  // Map state
  let treasurePathLength = 0;
  let mapInitialized = false;
  let mapProgress = 0; // 0 to 1, how much of the treasure path is drawn
  
  // Sparkle effect state
  let sparklesPreloaded = false; // Whether sparkles have been preloaded
  let sparklesData = []; // Array of sparkle data objects for JS-controlled animation
  let pendingSparkleUpdate = null; // RAF handle for throttling
  let lastSparkleProgress = -1; // Track last progress to avoid redundant updates
  const SPARKLE_COUNT = 80; // Number of sparkles to spawn (reduced for mobile performance)
  // Sparkle animation is based on sunset section scroll, not map section
  
  // Map colors
  const MAP_COLORS = {
    land: ['#2d5a3f', '#3a7d52', '#4a9b66', '#2e6b4a'], // Greens
    water: ['#4a9fcf', '#5bb3e0', '#6bc5f0', '#3a8fbf'], // Light blues
  };
  
  /**
   * Generate random organic blob path
   */
  function generateBlobPath(cx, cy, radius, irregularity = 0.4, spikeyness = 0.2, numPoints = 8) {
    const angleStep = (Math.PI * 2) / numPoints;
    const points = [];
    
    for (let i = 0; i < numPoints; i++) {
      const angle = i * angleStep + (Math.random() - 0.5) * angleStep * irregularity;
      const r = radius + (Math.random() - 0.5) * radius * spikeyness * 2;
      points.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r
      });
    }
    
    // Create smooth curve through points
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length; i++) {
      const p0 = points[(i - 1 + points.length) % points.length];
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const p3 = points[(i + 2) % points.length];
      
      const cp1x = p1.x + (p2.x - p0.x) * 0.2;
      const cp1y = p1.y + (p2.y - p0.y) * 0.2;
      const cp2x = p2.x - (p3.x - p1.x) * 0.2;
      const cp2y = p2.y - (p3.y - p1.y) * 0.2;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    path += ' Z';
    
    return path;
  }
  
  /**
   * Generate the treasure map background with organic shapes
   */
  function generateMapBackground() {
    if (!mapBg || !mapSection) return;
    
    const width = mapSection.offsetWidth;
    const height = mapSection.offsetHeight;
    
    // Create SVG for map background
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    
    // Base water color
    const baseRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    baseRect.setAttribute('width', '100%');
    baseRect.setAttribute('height', '100%');
    baseRect.setAttribute('fill', '#5bb3e0');
    svg.appendChild(baseRect);
    
    // Generate random blobs for land masses
    const numBlobs = 15 + Math.floor(Math.random() * 10);
    
    for (let i = 0; i < numBlobs; i++) {
      const isLand = Math.random() > 0.4; // 60% land, 40% water variations
      const colors = isLand ? MAP_COLORS.land : MAP_COLORS.water;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const cx = Math.random() * width;
      const cy = Math.random() * height;
      const radius = 50 + Math.random() * 200;
      const irregularity = 0.3 + Math.random() * 0.4;
      const spikeyness = 0.2 + Math.random() * 0.3;
      const numPoints = 6 + Math.floor(Math.random() * 6);
      
      const blobPath = generateBlobPath(cx, cy, radius, irregularity, spikeyness, numPoints);
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', blobPath);
      path.setAttribute('fill', color);
      // Land is solid, water has some opacity variation
      path.setAttribute('opacity', isLand ? '1' : (0.7 + Math.random() * 0.3));
      svg.appendChild(path);
    }
    
    // Add some smaller detail blobs
    for (let i = 0; i < 20; i++) {
      const isLand = Math.random() > 0.5;
      const colors = isLand ? MAP_COLORS.land : MAP_COLORS.water;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const cx = Math.random() * width;
      const cy = Math.random() * height;
      const radius = 20 + Math.random() * 60;
      
      const blobPath = generateBlobPath(cx, cy, radius, 0.5, 0.3, 5 + Math.floor(Math.random() * 4));
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', blobPath);
      path.setAttribute('fill', color);
      // Land is solid, water has some opacity variation
      path.setAttribute('opacity', isLand ? '1' : (0.5 + Math.random() * 0.3));
      svg.appendChild(path);
    }
    
    mapBg.appendChild(svg);
  }
  
  /**
   * Generate the treasure path (baked normalized coordinates)
   * The first point is calculated to align with the scribble's end point
   */
  function generateTreasurePath() {
    if (!mapPathSvg || !treasurePath || !treasureMaskPath || !mapSection) return;
    
    const width = mapSection.offsetWidth;
    const height = mapSection.offsetHeight;
    
    // Get the map section's position on the page
    const mapSectionRect = mapSection.getBoundingClientRect();
    const mapSectionTop = mapSectionRect.top + getPageScrollY();
    
    // Calculate the first point based on scribble end point
    // Convert scribbleEndPoint (page coordinates) to map-section relative coordinates
    let firstPointX, firstPointY;
    
    if (scribbleEndPoint.x !== 0 && scribbleEndPoint.y !== 0) {
      // scribbleEndPoint is in page coordinates, convert to map-section relative
      firstPointX = scribbleEndPoint.x;
      firstPointY = scribbleEndPoint.y - mapSectionTop;
    } else {
      // Fallback if scribble hasn't been set up yet
      const marginX = 80;
      const usableWidth = width - marginX * 2;
      firstPointX = marginX + 0.50 * usableWidth;
      firstPointY = 0;
    }
    
    // Set viewBox
    mapPathSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    
    // Baked path points in normalized coordinates (0-1)
    // These create a sinuous S-curve pattern across the map
    // First point will be replaced with calculated position
    const normalizedPoints = [
      { x: 0.65, y: 0.035 },
      { x: 0.80, y: 0.070 },
      { x: 0.85, y: 0.105 },
      { x: 0.70, y: 0.140 },
      { x: 0.50, y: 0.175 },
      { x: 0.30, y: 0.210 },
      { x: 0.15, y: 0.245 },
      { x: 0.12, y: 0.280 },
      { x: 0.25, y: 0.315 },
      { x: 0.45, y: 0.350 },
      { x: 0.65, y: 0.385 },
      { x: 0.80, y: 0.420 },
      { x: 0.88, y: 0.455 },
      { x: 0.78, y: 0.490 },
      { x: 0.55, y: 0.525 },
      { x: 0.35, y: 0.560 },
      { x: 0.18, y: 0.595 },
      { x: 0.12, y: 0.630 },
      { x: 0.20, y: 0.665 },
      { x: 0.40, y: 0.700 },
      { x: 0.60, y: 0.735 },
      { x: 0.75, y: 0.770 },
      { x: 0.85, y: 0.805 },
      { x: 0.80, y: 0.840 },
      { x: 0.60, y: 0.875 },
      { x: 0.40, y: 0.910 },
      { x: 0.25, y: 0.945 },
      { x: 0.20, y: 0.980 },
      { x: 0.30, y: 1.000 }
    ];
    
    // Scale to actual dimensions with margin
    const marginX = 80;
    const usableWidth = width - marginX * 2;
    const pathPoints = normalizedPoints.map(p => ({
      x: marginX + p.x * usableWidth,
      y: p.y * height
    }));
    
    // Insert the calculated first point at the beginning
    pathPoints.unshift({ x: firstPointX, y: firstPointY });
    
    // Build smooth SVG path using Catmull-Rom to Bezier conversion
    let pathD = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p0 = pathPoints[i - 1] || pathPoints[i];
      const p1 = pathPoints[i];
      const p2 = pathPoints[i + 1];
      const p3 = pathPoints[i + 2] || p2;
      
      // Catmull-Rom to Bezier control points
      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      
      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    
    // Set the same path data for both the visible path and the mask
    treasurePath.setAttribute('d', pathD);
    treasureMaskPath.setAttribute('d', pathD);
    
    treasurePathLength = treasureMaskPath.getTotalLength();
    
    // Set initial state: mask path hidden (controls reveal animation)
    treasureMaskPath.style.strokeDasharray = treasurePathLength;
    treasureMaskPath.style.strokeDashoffset = treasurePathLength;
    
    // Position compass at the start of the treasure path
    if (compassIcon) {
      const startPoint = pathPoints[0];
      // getBoundingClientRect gives the actual rendered size (incl. overflow/scale),
      // which is what we need to truly centre the visual on the path start point.
      // getComputedStyle returns the CSS width (360px) which differs from the
      // rendered size when the SVG content overflows its bounds.
      const cr = compassIcon.getBoundingClientRect();
      const compassW = cr.width  || parseInt(getComputedStyle(compassIcon).width)  || 360;
      const compassH = cr.height || parseInt(getComputedStyle(compassIcon).height) || 360;
      const offsetX = startPoint.x - compassW / 2;
      const offsetY = startPoint.y - compassH / 2;
      compassIcon.style.left = `${offsetX}px`;
      compassIcon.style.top  = `${offsetY}px`;
    }
  }
  
  /**
   * Initialize the treasure map
   */
  function initTreasureMap() {
    if (mapInitialized) return;
    
    generateMapBackground();
    generateTreasurePath();
    mapInitialized = true;
  }
  
  /**
   * Update the treasure map based on scroll position
   */
  function updateTreasureMap() {
    if (!mapSection || !treasureMaskPath || treasurePathLength === 0) return;
    
    const rect = mapSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Calculate progress through the map section
    // Start when section top reaches viewport bottom, end when section bottom reaches viewport top
    const sectionStart = -rect.top;
    const sectionLength = rect.height - viewportHeight;
    
    if (sectionLength <= 0) return;
    
    // Map fade in: start when section enters viewport
    const fadeProgress = Math.min(Math.max(sectionStart / (viewportHeight * 0.5), 0), 1);
    if (mapBg) {
      if (fadeProgress > 0) {
        mapBg.classList.add('visible');
      } else {
        mapBg.classList.remove('visible');
      }
    }
    
    // Path drawing progress
    mapProgress = Math.min(Math.max(sectionStart / sectionLength, 0), 1);
    
    // Animate the mask path to reveal the dashed treasure path
    const offset = treasurePathLength * (1 - mapProgress);
    treasureMaskPath.style.strokeDashoffset = offset;
    
    // Animate compass needles when compass is visible at 50% viewport height
    if (compassIcon) {
      const compassRect = compassIcon.getBoundingClientRect();
      const triggerPoint = viewportHeight * 0.5;
      if (compassRect.top < triggerPoint && !compassIcon.classList.contains('animate')) {
        compassIcon.classList.add('animate');
      }
    }
    
    // Calculate sparkle progress based on divider position
    // Sparkles start when divider reaches top of viewport, end after scrolling 600px more
    if (sectionDivider && sunsetSection) {
      const dividerRect = sectionDivider.getBoundingClientRect();
      const SPARKLE_SCROLL_RANGE = 600; // pixels of scroll for full sparkle animation
      
      // When divider.top = 0 (at viewport top), sparkleProgress = 0
      // When divider.top = -600, sparkleProgress = 1
      if (dividerRect.top <= 0) {
        const sparkleProgress = Math.min(1, Math.max(0, -dividerRect.top / SPARKLE_SCROLL_RANGE));
        
        // Trigger divider illumination when sparkles start
        if (sparkleProgress > 0 && !sectionDivider.classList.contains('illuminating')) {
          sectionDivider.classList.add('illuminating');
        }
        
        updateSparkles(sparkleProgress);
      } else {
        // Divider not yet at top - reset
        if (sectionDivider.classList.contains('illuminating')) {
          sectionDivider.classList.remove('illuminating');
        }
        updateSparkles(0);
      }
    }
  }
  
  // ============================================
  // SPARKLE EFFECT SYSTEM
  // ============================================
  
  /**
   * Create a single sparkle element (preloaded, hidden)
   * Returns both the DOM element and its animation data
   */
  function createSparkle(index, totalSparkles) {
    // Wrapper for the trail (doesn't rotate)
    const wrapper = document.createElement('div');
    wrapper.className = 'sparkle-wrapper';
    
    // Trail element (triangular tail pointing up)
    const trail = document.createElement('div');
    trail.className = 'sparkle-trail';
    wrapper.appendChild(trail);
    
    // Inner sparkle (rotates)
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    wrapper.appendChild(sparkle);
    
    // Random horizontal position across the viewport width
    const xPos = Math.random() * 100;
    
    // Start above container top (negative Y), fully hidden by clip-path
    // When translateY increases, sparkles move into visible area (Y >= 0)
    const startY = -30 - Math.random() * 30; // Between -30 and -60
    
    // Random size between 8px and 25px
    const size = 8 + Math.random() * 17;
    
    // Longer fall distance (deep into sunset section)
    const fallDistance = 600 + Math.random() * 800;
    
    // Random fixed scale (0.4 to 1.0) - applied once at creation
    const fixedScale = 0.4 + Math.random() * 0.6;
    
    // Random fixed rotation (0 to 360deg) - applied once at creation
    const fixedRotation = Math.random() * 360;
    
    // Random delay offset (0 to 1) for staggered fall - affects when this sparkle starts moving
    const delayOffset = Math.random() * 0.3; // 0 to 0.3 of the progress range
    
    // Set wrapper styles (position, size)
    wrapper.style.left = `${xPos}%`;
    wrapper.style.top = `${startY}px`;
    wrapper.style.width = `${size}px`;
    wrapper.style.height = `${size}px`;
    
    // Apply fixed scale and rotation at creation time (not animated)
    wrapper.style.scale = fixedScale;
    sparkle.style.transform = `rotate(${fixedRotation}deg)`;
    
    // Store animation data for JS-controlled updates
    const data = {
      element: wrapper,
      sparkleElement: sparkle,
      trailElement: trail,
      startY: startY,
      fallDistance: fallDistance,
      delayOffset: delayOffset, // When this sparkle starts (0 = immediately, 0.3 = 30% into the animation)
      size: size,
      lastTranslateY: 0, // Track last position for velocity calculation
      trailScaleY: 1 // Current trail scale (-1 to 1)
    };
    
    return data;
  }
  
  /**
   * Preload sparkles (create them hidden)
   */
  function preloadSparkles() {
    if (sparklesPreloaded || !sparkleContainer) return;
    
    // Clear any existing sparkles
    sparkleContainer.innerHTML = '';
    sparklesData = [];
    
    // Create all sparkles using DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const data = createSparkle(i, SPARKLE_COUNT);
      sparklesData.push(data);
      fragment.appendChild(data.element);
    }
    sparkleContainer.appendChild(fragment);
    
    // Force browser to calculate styles now (during idle time)
    void sparkleContainer.offsetHeight;
    
    sparklesPreloaded = true;
  }
  
  /**
   * Update sparkles based on scroll progress (reversible)
   * Uses RAF throttling for better performance
   * @param {number} sparkleProgress - 0 to 1, where 0 = not started, 1 = fully fallen
   */
  function updateSparkles(sparkleProgress) {
    if (!sparklesPreloaded || sparklesData.length === 0) return;
    
    // Clamp progress
    sparkleProgress = Math.max(0, Math.min(1, sparkleProgress));
    
    // Skip if progress hasn't changed enough (threshold ~0.001 = barely perceptible)
    if (Math.abs(sparkleProgress - lastSparkleProgress) < 0.001) return;
    
    // Cancel any pending update and schedule a new one
    if (pendingSparkleUpdate) {
      cancelAnimationFrame(pendingSparkleUpdate);
    }
    
    pendingSparkleUpdate = requestAnimationFrame(() => {
      pendingSparkleUpdate = null;
      lastSparkleProgress = sparkleProgress;
      updateSparklesInternal(sparkleProgress);
    });
  }
  
  /**
   * Internal sparkle update - called via RAF
   * @param {number} sparkleProgress - 0 to 1
   */
  function updateSparklesInternal(sparkleProgress) {
    for (const data of sparklesData) {
      // Calculate this sparkle's individual progress considering its delay offset
      // If delayOffset is 0.2, sparkle starts at 20% of the animation and needs to finish by 100%
      const effectiveRange = 1 - data.delayOffset;
      let individualProgress;
      
      if (sparkleProgress <= data.delayOffset) {
        // Not started yet
        individualProgress = 0;
      } else {
        // Map the remaining range to 0-1
        individualProgress = (sparkleProgress - data.delayOffset) / effectiveRange;
        individualProgress = Math.min(1, individualProgress);
      }
      
      // Apply easing - ease-out for more movement at the start
      // Using cubic ease-out: 1 - (1 - x)^3
      const easedProgress = 1 - Math.pow(1 - individualProgress, 3);
      
      // Calculate current values using lerp
      const translateY = easedProgress * data.fallDistance;
      const scale = 1 - (easedProgress * 0.95); // Scale from 1 to 0.05
      const opacity = 1 - (easedProgress * 0.7 * (1 + easedProgress * 0.43)); // Fade more towards end
      
      // Calculate velocity for trail direction
      const velocity = translateY - data.lastTranslateY;
      data.lastTranslateY = translateY;
      
      // Lerp trail scale based on velocity
      // velocity > 0 = falling down = trail points up (scaleY = 1)
      // velocity < 0 = going up = trail points down (scaleY = -1)
      // velocity = 0 = stationary = trail compresses (scaleY = 0)
      const targetTrailScaleY = velocity > 0.5 ? 1 : (velocity < -0.5 ? -1 : 0);
      // Smooth lerp towards target (0.15 = smooth transition)
      data.trailScaleY += (targetTrailScaleY - data.trailScaleY) * 0.15;
      
      // Apply transforms (2 properties: transform, opacity)
      data.element.style.transform = `translateY(${translateY}px)`;
      data.element.style.opacity = opacity;
      data.trailElement.style.transform = `translateX(-50%) scaleY(${data.trailScaleY})`;
    }
  }
  
  /**
   * Spawn multiple sparkles (legacy - now uses preload + updateSparkles)
   */
  function spawnSparkles() {
    preloadSparkles();
  }

  // =================================================================
  // SILHOUETTE SYSTEM - Scroll-controlled animated silhouettes
  // =================================================================
  
  /**
   * Silhouette data storage
   */
  const silhouetteData = {
    container: null,
    elements: [],
    startupsSection: null,
    initialized: false
  };
  
  /**
   * Initialize silhouette system
   */
  function initSilhouettes() {
    silhouetteData.container = document.getElementById('silhouette-container');
    silhouetteData.startupsSection = document.getElementById('startups-section');
    
    if (!silhouetteData.container || !silhouetteData.startupsSection) {
      return;
    }
    
    silhouetteData.elements = Array.from(
      silhouetteData.container.querySelectorAll('.silhouette')
    );
    
    silhouetteData.initialized = true;
  }
  
  /**
   * Update silhouettes based on scroll position
   * Each silhouette appears sequentially as user scrolls through startups section
   */
  function updateSilhouettes() {
    if (!silhouetteData.initialized) return;
    
    const section = silhouetteData.startupsSection;
    const rect = section.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // sectionTop = distance from viewport top to section top
    // When section top is at viewport center: sectionTop = viewportHeight/2
    // When section top is at viewport top: sectionTop = 0
    const sectionTop = rect.top;
    
    // Animation triggers:
    // Start (progress=0): when section top is at viewport top (sectionTop = 0)
    // End (progress=1): when section top is well past viewport top (sectionTop = -viewportHeight * 0.8)
    const animationStartsAt = 0;  // section top at viewport top
    const animationEndsAt = -viewportHeight * 0.8;   // section 80% past top
    
    // Calculate progress (0 to 1)
    const scrollRange = animationStartsAt - animationEndsAt;
    const scrolled = animationStartsAt - sectionTop;
    const progress = Math.max(0, Math.min(1, scrolled / scrollRange));
    
    // Distribute silhouettes across the progress range
    const numSilhouettes = silhouetteData.elements.length;
    const trailLength = 3; // Number of silhouettes in the trail
    
    silhouetteData.elements.forEach((el, index) => {
      // Each silhouette appears at a different point in the progress
      const appearAt = index / numSilhouettes;
      const fadeRange = 0.05; // How much progress for full fade-in
      
      // Calculate how "active" this silhouette is (1 = current, 0 = not yet appeared)
      const silhouetteProgress = (progress - appearAt) / fadeRange;
      const isActive = Math.max(0, Math.min(1, silhouetteProgress));
      
      // Find which silhouette is currently the "lead" (most recent fully visible)
      const currentIndex = Math.floor(progress * numSilhouettes);
      const distanceFromCurrent = currentIndex - index;
      
      if (isActive <= 0) {
        // Not yet appeared
        el.style.opacity = 0;
        el.style.transform = 'translateY(20px)';
        el.style.filter = 'none';
      } else if (distanceFromCurrent <= 0) {
        // Current silhouette (the lead)
        el.style.opacity = isActive;
        el.style.transform = `translateY(${(1 - isActive) * 20}px)`;
        el.style.filter = 'none';
      } else if (distanceFromCurrent <= trailLength) {
        // Part of the trail - tint ochre and fade based on distance
        const trailOpacity = 1 - (distanceFromCurrent * 0.25);
        el.style.opacity = Math.max(0, trailOpacity);
        el.style.transform = 'translateY(0)';
        // Bright saturated ochre/amber tint
        el.style.filter = 'sepia(1) saturate(3) brightness(1.1) hue-rotate(-10deg)';
      } else {
        // Beyond trail - hidden
        el.style.opacity = 0;
        el.style.transform = 'translateY(0)';
        el.style.filter = 'none';
      }
    });
  }

  // =================================================================
  // 3D MODEL SYSTEM - Freelance section with orbiting camera
  // =================================================================
  
  /**
   * 3D scene data storage
   */
  const freelance3D = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    model: null,
    initialized: false
  };
  
  /**
   * Initialize 3D scene for freelance section
   */
  function initFreelance3D() {
    const canvas = document.getElementById('freelance-canvas');
    const section = document.getElementById('freelance-section');
    
    if (!canvas || !section || typeof THREE === 'undefined') {
      return;
    }

    // Defer until the section is actually in the viewport so clientWidth/Height
    // are non-zero. Without this, aspect = width/0 = Infinity which causes
    // Three.js to fail creating the WebGL context.
    if (section.clientHeight === 0) {
      const observer = new IntersectionObserver((entries, obs) => {
        if (entries[0].isIntersecting) {
          obs.disconnect();
          initFreelance3D();
        }
      }, { threshold: 0.01 });
      observer.observe(section);
      return;
    }

    try {
    
    // Scene
    freelance3D.scene = new THREE.Scene();

    // Camera
    const width = section.clientWidth;
    const height = section.clientHeight;
    freelance3D.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    freelance3D.camera.position.set(0, 5, 15);
    
    // Renderer
    freelance3D.renderer = new THREE.WebGLRenderer({ 
      canvas: canvas, 
      antialias: true 
    });
    freelance3D.renderer.setSize(width, height);
    freelance3D.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    freelance3D.renderer.setClearColor(0x222222, 1); // Dark gray background
    
    // Lights - cozy ambient + lamp as main light
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.25);
    freelance3D.scene.add(ambientLight);
    
    const fillLight = new THREE.DirectionalLight(0xffeedd, 0.2);
    fillLight.position.set(5, 10, 7);
    freelance3D.scene.add(fillLight);
    
    // Lamp point light - warm radial light (main light source)
    const lampLight = new THREE.PointLight(0xffaa55, 0.8, 15, 2);
    lampLight.position.set(-1.4, 0.05, -1.4);
    freelance3D.scene.add(lampLight);
    
    // Store reference to adjust later
    freelance3D.lampLight = lampLight;
    
    // Orbit Controls — use a detached element as domElement so OrbitControls never
    // registers touch/pointer listeners on the canvas, keeping scroll unblocked on mobile
    const detachedEl = document.createElement('div');
    freelance3D.controls = new THREE.OrbitControls(freelance3D.camera, detachedEl);
    freelance3D.controls.enableDamping = true;
    freelance3D.controls.dampingFactor = 0.05;
    freelance3D.controls.enableZoom = false;
    freelance3D.controls.enablePan = false;
    freelance3D.controls.autoRotate = true;
    freelance3D.controls.autoRotateSpeed = 0.5;
    freelance3D.controls.enableRotate = false;
    
    // Load MTL and OBJ model
    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath('assets/');
    mtlLoader.load('uploads_files_5312939_isometric1.mtl', (materials) => {
      materials.preload();
      
      const objLoader = new THREE.OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath('assets/');
      objLoader.load('uploads_files_5312939_isometric1.obj', (obj) => {
        freelance3D.model = obj;
        
        // Hide the outer cube container FIRST
        obj.traverse((child) => {
          if (child.name === 'Cube' || child.name === 'Plane.043') {
            child.visible = false;
          }
          
          // Fix Room_Base - has multiple materials
          if (child.name === 'Room_Base' && child.isMesh && Array.isArray(child.material)) {
            child.material = child.material.map(mat => {
              return new THREE.MeshLambertMaterial({
                color: mat.color,
                side: mat.side
              });
            });
          }
          
          // Fix materials - reduce specularity
          if (child.isMesh && child.material) {
            const mat = child.material;
            
            // Make all materials less shiny by default
            mat.shininess = Math.min(mat.shininess || 0, 30);
            
            if (mat.name && (mat.name.includes('Brown') || mat.name.includes('Wood'))) {
              mat.shininess = 10;
              mat.specular = new THREE.Color(0x222222);
            }
            // Fix wall and chalkboard materials - make them matte
            if (mat.name && (mat.name.includes('Green') || mat.name === 'Dark_green')) {
              mat.shininess = 5;
              mat.specular = new THREE.Color(0x111111);
            }
            // Fix cream/yellow walls - replace with Lambert (no specular at all)
            if (mat.name && (mat.name.includes('Cream') || mat.name.includes('Yellow') || mat.name === 'BACKGROUND' || mat.name === 'Dark_Yellow')) {
              child.material = new THREE.MeshLambertMaterial({
                color: mat.color,
                side: mat.side
              });
            }
          }
        });
        
        // Now center the model (only considering visible objects)
        const box = new THREE.Box3();
        obj.traverse((child) => {
          if (child.isMesh && child.visible) {
            box.expandByObject(child);
          }
        });
        const center = box.getCenter(new THREE.Vector3());
        obj.position.sub(center);
        
        // Scale to fit
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 5 / maxDim;
        obj.scale.setScalar(scale);
        
        freelance3D.scene.add(obj);
      });
    });
    
    freelance3D.initialized = true;
    
    // Animation loop
    function animate() {
      if (!freelance3D.initialized) return;
      requestAnimationFrame(animate);
      freelance3D.controls.update();
      freelance3D.renderer.render(freelance3D.scene, freelance3D.camera);
    }
    animate();
    
    // Handle resize
    window.addEventListener('resize', () => {
      if (!freelance3D.initialized) return;
      const width = section.clientWidth;
      const height = section.clientHeight;
      freelance3D.camera.aspect = width / height;
      freelance3D.camera.updateProjectionMatrix();
      freelance3D.renderer.setSize(width, height);
    });

    } catch (e) {
      // WebGL not available (e.g. iOS with WebGL disabled, or too many contexts).
      // Hide the canvas so the section degrades gracefully.
      console.warn('initFreelance3D: WebGL unavailable, skipping 3D scene.', e);
      if (canvas) canvas.style.display = 'none';
      if (section) section.style.background = '#222222';
    }
  }

  /**
   * Initialize everything
   */
  // ── Iso floor icons: random position, scale, rotation ──────────────
  // Registry of icon positions (in %) for footprint hit detection
  const isoIconRegistry = []; // { el, techName }

  function initIsoIcons() {
    const icons = document.querySelectorAll('.iso-icon');
    // Seed a simple deterministic-ish spread so icons don't overlap badly
    // Uses a margin zone to avoid the very edges of the floor plane
    const marginX = 8;  // % from left/right edge
    const marginY = 8;  // % from top/bottom edge

    // Keep track of placed positions to reduce overlap
    const placed = [];

    // Reset registry on re-init
    isoIconRegistry.length = 0;

    icons.forEach((icon) => {
      let left, top, attempts = 0;

      // Try to find a position not too close to existing ones
      do {
        left = marginX + Math.random() * (100 - marginX * 2);
        top  = marginY + Math.random() * (100 - marginY * 2);
        attempts++;
      } while (
        attempts < 30 &&
        placed.some(p => Math.hypot(p.l - left, p.t - top) < 14)
      );

      placed.push({ l: left, t: top });

      const scale    = 0.7 + Math.random() * 0.9;       // 0.7 – 1.6
      const rotation = Math.random() * 360;              // 0 – 360°
      const size     = Math.round(100 + Math.random() * 80); // 100 – 180px

      icon.style.left   = `${left}%`;
      icon.style.top    = `${top}%`;
      icon.style.width  = `${size}px`;
      icon.style.height = `${size}px`;
      // Counter-rotate from the floor's rotateX(55deg), then add random rotation
      icon.style.transform = `rotateX(-55deg) scale(${scale}) rotate(${rotation}deg)`;

      // Build tooltip element (once, appended to icon)
      const techName = icon.dataset.tech || '';
      if (techName) {
        isoIconRegistry.push({ el: icon, techName });
      }
    });
  }

  // ── Footprint autonomous walker ──────────────────────────────────────
  //
  // An autonomous agent walks the floor at constant speed using steering.
  // - When no cursor: steers toward a random waypoint that changes every 2s,
  //   always chosen far from the current position.
  // - When cursor on floor: steers toward the cursor position.
  // - Footprints are stamped at fixed stride intervals, alternating left/right.
  // - Each footprint lives 5s with a 1s fade-out.

  const FOOTPRINT_LIFETIME  = 5000;
  const FLOOR_ANGLE_DEG     = 55;
  const FLOOR_ANGLE_RAD     = FLOOR_ANGLE_DEG * Math.PI / 180;
  const PERSPECTIVE_PX      = 600;

  // Walker constants
  const WALK_SPEED          = 2.1;   // px/frame in floor space (~126px/s at 60fps)
  const STRIDE_LENGTH       = 34;    // px between footprints along path
  const STRIDE_WIDTH        = 14;    // px sideways separation between feet
  const STEER_STRENGTH      = 0.04;  // how sharply to turn (0=no turn, 1=instant)
  const WAYPOINT_INTERVAL   = 2000;  // ms between random waypoint changes
  const WAYPOINT_MIN_DIST   = 200;   // min distance for new random waypoint

  // Walker state
  const walker = {
    u: 0, v: 0,       // position in container px coords
    angle: 0,          // heading in radians (0 = up/away from viewer)
    distSinceStep: 0,  // accumulated distance since last footprint
    stepRight: true,   // next foot to place
  };

  let walkerTarget    = null;   // { u, v } current steering target
  let cursorFloor     = null;   // { u, v } or null when cursor not on floor
  let waypointTimer   = null;
  let walkerRAF       = null;
  let walkerContainer = null;
  let walkerW = 0, walkerH = 0;

  // ── Coord conversion ─────────────────────────────────────────────────

  function mouseToFloorCoords(mouseX, mouseY) {
    const stage     = document.querySelector('.iso-stage');
    const container = document.querySelector('.iso-icons');
    if (!stage || !container) return null;

    const stageRect = stage.getBoundingClientRect();
    const stageW    = stageRect.width;
    const stageH    = stageRect.height;
    const W         = container.offsetWidth;
    const H         = container.offsetHeight;

    const d    = PERSPECTIVE_PX;
    const sinT = Math.sin(FLOOR_ANGLE_RAD);
    const cosT = Math.cos(FLOOR_ANGLE_RAD);

    const mx = mouseX - stageRect.left;
    const my = mouseY - stageRect.top;

    const sx = mx - stageW * 0.5;
    const sy = my + stageH * 0.2;
    const oy = 1.2 * stageH;

    const denom = cosT * d + sy * sinT;
    if (Math.abs(denom) < 0.001) return null;

    const ly = d * (sy - oy) / denom;
    const D  = d - ly * sinT;
    const lx = sx * D / d;

    const u = lx + W * 0.5;
    const v = ly + H;

    return { u, v, lx, ly };
  }

  // ── Waypoint ─────────────────────────────────────────────────────────

  function pickRandomWaypoint() {
    if (!walkerW || !walkerH) return;
    const margin = 0.1;
    let u, v, attempts = 0;
    do {
      u = walkerW * (margin + Math.random() * (1 - margin * 2));
      v = walkerH * (margin + Math.random() * (1 - margin * 2));
      attempts++;
    } while (
      attempts < 20 &&
      Math.hypot(u - walker.u, v - walker.v) < WAYPOINT_MIN_DIST
    );
    walkerTarget = { u, v };
  }

  // ── Footprint stamp ───────────────────────────────────────────────────

  function stampFootprint(angleDeg) {
    if (!walkerContainer) return;

    const side  = walker.stepRight ? 1 : -1;
    walker.stepRight = !walker.stepRight;

    const angleRad = angleDeg * Math.PI / 180;
    const perpX    =  Math.cos(angleRad);
    const perpY    = -Math.sin(angleRad);

    const u = walker.u + perpX * STRIDE_WIDTH * side;
    const v = walker.v + perpY * STRIDE_WIDTH * side;

    const leftPct = (u / walkerW) * 100;
    const topPct  = (v / walkerH) * 100;
    if (leftPct < -5 || leftPct > 105 || topPct < -5 || topPct > 105) return;

    const toeOut = side * 10;
    const size   = 26 + Math.random() * 7;
    const mirror = side;

    const el = document.createElement('div');
    el.className = 'floor-footprint';
    el.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${leftPct}%;
      top:  ${topPct}%;
      translate: -50% -50%;
      transform: rotateX(-55deg) rotate(${angleDeg + toeOut}deg) scaleX(${mirror});
      transform-origin: center center;
      background: url('assets/right-shoe-footprint.png') center/contain no-repeat;
      pointer-events: none;
      opacity: 0.7;
      transition: opacity 1s ease;
    `;
    walkerContainer.appendChild(el);

    setTimeout(() => { el.style.opacity = '0'; }, FOOTPRINT_LIFETIME - 1000);
    setTimeout(() => { el.remove(); },             FOOTPRINT_LIFETIME);

    // ── Icon proximity check: compare in screen space ────────────────────
    // Both the footprint el and the icons share the same CSS transform
    // pipeline, so getBoundingClientRect() gives true screen positions.
    const fpRect = el.getBoundingClientRect();
    const fpCx = fpRect.left + fpRect.width  * 0.5;
    const fpCy = fpRect.top  + fpRect.height * 0.5;
    const HIT_RADIUS_PX = 55; // screen pixels

    isoIconRegistry.forEach(({ el: iconEl, techName }) => {
      const r  = iconEl.getBoundingClientRect();
      const cx = r.left + r.width  * 0.5;
      const cy = r.top  + r.height * 0.5;
      if (Math.hypot(fpCx - cx, fpCy - cy) < HIT_RADIUS_PX) {
        showIconTooltip(iconEl, techName);
      }
    });
  }

  // ── Icon tooltip billboard ────────────────────────────────────────────
  // A single fixed overlay element is repositioned to each icon's screen-space
  // center when a footprint passes nearby. No CSS transform inheritance.

  const isoTooltipOverlay = document.getElementById('iso-tooltip-overlay');
  let tooltipHideTimer = null;
  let tooltipsEnabled = true;

  function showIconTooltip(iconEl, techName) {
    if (!isoTooltipOverlay || !tooltipsEnabled) return;

    // Get the icon's bounding box in screen (viewport) coordinates
    const rect = iconEl.getBoundingClientRect();
    const cx = rect.left + rect.width  * 0.5;
    const cy = rect.top  + rect.height * 0.5;

    // Set text content
    isoTooltipOverlay.textContent = techName;

    // Position: centered horizontally above the icon center
    // We use translate so it doesn't matter how wide the text is
    isoTooltipOverlay.style.transform = `translate(calc(${cx}px - 50%), calc(${cy}px - 100% - 12px))`;

    // Show
    isoTooltipOverlay.classList.add('visible');

    // Reset any pending hide
    if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
    tooltipHideTimer = setTimeout(() => {
      isoTooltipOverlay.classList.remove('visible');
      tooltipHideTimer = null;
    }, 2200);
  }

  // ── Walker loop ───────────────────────────────────────────────────────

  function walkerTick() {
    walkerRAF = requestAnimationFrame(walkerTick);

    // Re-read dimensions every frame in case of resize
    if (walkerContainer) {
      walkerW = walkerContainer.offsetWidth;
      walkerH = walkerContainer.offsetHeight;
    }

    // Target: cursor if available, else random waypoint
    const target = cursorFloor || walkerTarget;
    if (!target || !walkerW || !walkerH) return;

    const dx = target.u - walker.u;
    const dy = target.v - walker.v;
    const distToTarget = Math.hypot(dx, dy);

    // Desired heading toward target
    const desiredAngle = Math.atan2(dx, -dy);

    // Steer: lerp current angle toward desired (shortest arc)
    let diff = desiredAngle - walker.angle;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    walker.angle += diff * STEER_STRENGTH;

    // Advance position at constant speed
    walker.u += Math.sin(walker.angle) * WALK_SPEED;
    walker.v -= Math.cos(walker.angle) * WALK_SPEED;

    // No hard clamp or bounce — waypoints are always inside bounds so
    // steering naturally pulls the walker back if it drifts to the edge.

    // Stamp footprint every STRIDE_LENGTH px
    walker.distSinceStep += WALK_SPEED;
    if (walker.distSinceStep >= STRIDE_LENGTH) {
      walker.distSinceStep = 0;
      stampFootprint(walker.angle * (180 / Math.PI));
    }

    // If close enough to random waypoint, pick a new one
    if (!cursorFloor && distToTarget < 40) {
      pickRandomWaypoint();
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────

  function initFootprints() {
    const stage = document.querySelector('.iso-stage');
    walkerContainer = document.querySelector('.iso-icons');
    if (!stage || !walkerContainer) return;

    walkerW = walkerContainer.offsetWidth;
    walkerH = walkerContainer.offsetHeight;

    // Start walker in the middle of the floor
    walker.u = walkerW * 0.5;
    walker.v = walkerH * 0.5;
    walker.angle = Math.random() * Math.PI * 2;

    // Pick first waypoint
    pickRandomWaypoint();

    // Rotate waypoint every 2s
    waypointTimer = setInterval(() => {
      if (!cursorFloor) pickRandomWaypoint();
    }, WAYPOINT_INTERVAL);

    // Track cursor on floor
    stage.addEventListener('mouseenter', () => {
      // Cursor took over — waypoint is irrelevant until mouseleave
    });
    stage.addEventListener('mousemove', (e) => {
      const coords = mouseToFloorCoords(e.clientX, e.clientY);
      if (coords) cursorFloor = coords;
    });
    stage.addEventListener('mouseleave', () => {
      cursorFloor = null;
      // Pick a fresh waypoint away from where the walker currently is
      pickRandomWaypoint();
    });

    // Start loop
    walkerRAF = requestAnimationFrame(walkerTick);
  }

  function init() {
    // Lock scroll initially
    lockScroll();
    
    setupRevealObserver();
    
    // Preload sparkles immediately on init
    preloadSparkles();
    
    // Initialize silhouette system
    initSilhouettes();
    
    // Initialize 3D scene
    initFreelance3D();

    // Randomise iso floor icons
    initIsoIcons();

    // Footprint system
    initFootprints();

    // Slow scroll-to-top CTA
    const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
    const scrollBlockOverlay = document.getElementById('scroll-block-overlay');
    if (scrollToTopBtn) {
      scrollToTopBtn.addEventListener('click', () => {
        const startY = window.scrollY;
        const duration = 24000; // ms — slow enough to appreciate the reversible effects
        let startTime = null;

        // Disable tooltips immediately; activate bouncy arrow animation
        tooltipsEnabled = false;
        if (isoTooltipOverlay) isoTooltipOverlay.textContent = '';
        scrollToTopBtn.classList.add('is-scrolling');

        // Block all touch/click input during the animation to prevent scroll corruption
        if (scrollBlockOverlay) scrollBlockOverlay.classList.add('active');

        // Signal to lockScroll() and updateTimeline() that we own the scroll
        isProgrammaticScrolling = true;
        isScribbling = false;
        isReverseScribbling = false;
        lastScrollY = window.scrollY; // prevent isScrollingUp from firing immediately
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        // Disable CSS smooth scroll — it cancels each scrollTo() call before applying it
        document.documentElement.style.scrollBehavior = 'auto';

        // Capture scribble state at the moment of click so we can reverse it
        const startScribbleAccumulator = scribbleScrollAccumulator;
        const startScribbleProgress = scribbleProgress;

        function easeInOutCubic(t) {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        function step(timestamp) {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = easeInOutCubic(progress);

          // Move scroll position
          const targetY = startY * (1 - eased);
          window.scrollTo(0, targetY);

          // Mirror scribble accumulator back to 0 in sync with the scroll
          scribbleScrollAccumulator = startScribbleAccumulator * (1 - eased);
          scribbleProgress = startScribbleProgress * (1 - eased);

          // Drive the scribble visuals directly
          if (scribblePath && scribblePathLength > 0) {
            scribblePath.style.strokeDashoffset = scribblePathLength * (1 - scribbleProgress);
          }
          if (firstStory) {
            const storyLines = firstStory.querySelectorAll('.story-line');
            const lineCount = storyLines.length;
            storyLines.forEach((line, index) => {
              const lineStart = index / lineCount;
              const lineEnd = (index + 1) / lineCount;
              let lineProgress = 0;
              if (scribbleProgress >= lineEnd) {
                lineProgress = 1;
              } else if (scribbleProgress > lineStart) {
                lineProgress = (scribbleProgress - lineStart) / (lineEnd - lineStart);
              }
              line.style.setProperty('--highlight-progress', `${lineProgress * 100}%`);
            });
          }

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            // Fully reset scribble state
            scribbleScrollAccumulator = 0;
            scribbleProgress = 0;
            isScribbling = false;
            isReverseScribbling = false;
            if (scribblePath && scribblePathLength > 0) {
              scribblePath.style.strokeDashoffset = scribblePathLength;
            }
            if (firstStory) {
              const storyLines = firstStory.querySelectorAll('.story-line');
              storyLines.forEach(line => {
                line.classList.remove('highlight-animated');
                line.style.setProperty('--highlight-progress', '0%');
              });
            }
            isProgrammaticScrolling = false;
            document.documentElement.style.overflow = '';
            document.documentElement.style.scrollBehavior = '';
            // Re-enable tooltips and restore idle arrow animation
            tooltipsEnabled = true;
            scrollToTopBtn.classList.remove('is-scrolling');
            // Remove input block overlay
            if (scrollBlockOverlay) scrollBlockOverlay.classList.remove('active');
          }
        }

        requestAnimationFrame(step);
      });
    }

    // Listen for scroll
    window.addEventListener('scroll', onScroll, { passive: true });
    
    // Listen for wheel events (for scribble mode)
    window.addEventListener('wheel', onWheel, { passive: false });
    
    // Start the animation sequence (treasure map is initialized after scribble setup)
    startAnimationSequence();
  }

  // ── GitHub stars fetch (owned + contributed repos, 1hr cache) ─
  async function fetchGithubStars() {
    const CACHE_KEY = 'gh_stars_cache';
    const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { ts, total } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) return total;
      }
    } catch (_) { /* ignore parse errors */ }

    // Collect unique repo full_names that luismoyano has starred or contributed to.
    // Strategy: search commits authored by the user — this surfaces both owned
    // and contributed-to repos. We page through until results are exhausted.
    const seen = new Set();
    let total = 0;
    let page = 1;

    while (true) {
      try {
        const res = await fetch(
          `https://api.github.com/search/commits?q=author:luismoyano&per_page=100&page=${page}`,
          { headers: { Accept: 'application/vnd.github.cloak-preview+json' } }
        );
        if (!res.ok) break;
        const data = await res.json();
        const items = data.items;
        if (!Array.isArray(items) || items.length === 0) break;

        for (const item of items) {
          const repo = item.repository;
          if (repo && !seen.has(repo.full_name)) {
            seen.add(repo.full_name);
            total += repo.stargazers_count || 0;
          }
        }

        // GitHub search API caps at 1000 results (10 pages of 100)
        if (items.length < 100 || page >= 10) break;
        page++;
      } catch (e) {
        break;
      }
    }

    // Fall back to owned repos if the commit search returned nothing
    if (total === 0) {
      let p = 1;
      while (true) {
    try {
    // Scene
    freelance3D.scene = new THREE.Scene();
          const res = await fetch(
            `https://api.github.com/users/luismoyano/repos?per_page=100&page=${p}`
          );
          if (!res.ok) break;
          const repos = await res.json();
          if (!Array.isArray(repos) || repos.length === 0) break;
          total += repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
          p++;
        } catch (e) {
          break;
        }
      }
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), total }));
    } catch (_) { /* quota exceeded or private browsing — ignore */ }

    return total;
  }

  function initFloatingButtons() {
    const starsEl = document.getElementById('fab-stars-count');
    if (starsEl) {
      fetchGithubStars().then(total => {
        if (total > 0) starsEl.textContent = total;
      });
    }
  }

  // ── Email modal ───────────────────────────────────────────────
  function initEmailModal() {
    const btn     = document.getElementById('fab-email');
    const modal   = document.getElementById('email-modal');
    const closeBtn = document.getElementById('email-modal-close');
    const backdrop = modal && modal.querySelector('.email-modal-backdrop');
    if (!btn || !modal) return;

    function openModal() {
      isModalOpen = true;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      closeBtn && closeBtn.focus();
    }

    function closeModal() {
      isModalOpen = false;
      modal.hidden = true;
      // Only restore scroll if the scribble system hasn't locked it independently
      if (!isScrollLocked) document.body.style.overflow = '';
      btn.focus();
    }

    btn.addEventListener('click', openModal);
    closeBtn && closeBtn.addEventListener('click', closeModal);
    backdrop && backdrop.addEventListener('click', closeModal);

    modal.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ── Hero arrows (hand-drawn, animate via stroke-dashoffset) ───

  /**
   * Measure the real pixel positions of the FAB buttons and scroll indicator,
   * then write SVG path data into the arrow elements using the 0–100 viewBox
   * coordinate space (preserveAspectRatio="none" maps 0–100 → hero width/height).
   *
   * Arrow origins are anchored to the hero-title so they stay near the name
   * regardless of viewport size.
   */
  function buildHeroArrowPaths() {
    const svg         = document.getElementById('hero-arrows-svg');
    const heroSection = svg && svg.closest('.hero');
    if (!svg || !heroSection) return;

    const heroRect = heroSection.getBoundingClientRect();
    const W = heroRect.width;
    const H = heroRect.height;

    // Convert a client-space point to 0–100 viewBox units
    function vb(clientX, clientY) {
      return {
        x: ((clientX - heroRect.left) / W) * 100,
        y: ((clientY - heroRect.top)  / H) * 100,
      };
    }

    // Centre of an element in viewBox units
    function centre(el) {
      const r = el.getBoundingClientRect();
      return vb(r.left + r.width / 2, r.top + r.height / 2);
    }

    // Bottom-centre of an element
    function bottomCentre(el) {
      const r = el.getBoundingClientRect();
      return vb(r.left + r.width / 2, r.bottom);
    }

    const emailBtn  = document.getElementById('fab-email');
    const githubBtn = document.getElementById('fab-github');
    const scrollInd = document.getElementById('scroll-indicator');

    if (!emailBtn || !githubBtn || !scrollInd) return;

    const email   = centre(emailBtn);
    const github  = centre(githubBtn);

    // For the scroll arrow we want the top of the indicator, not the bottom
    const scrollR = scrollInd.getBoundingClientRect();
    const scrollTop = vb(scrollR.left + scrollR.width / 2, scrollR.top);

    // Small arrowhead arms in viewBox units
    const ARM = 1.8;

    function setArrow(shaftId, headId, labelId, shaft, tip, labelOffset) {
      const shaftEl = document.getElementById(shaftId);
      const headEl  = document.getElementById(headId);
      const labelEl = document.getElementById(labelId);

      if (shaftEl) {
        shaftEl.setAttribute('d', shaft);
        // If already animated (ready class present), re-sync dash geometry to new path length
        if (shaftEl.classList.contains('ready')) {
          const len = shaftEl.getTotalLength();
          shaftEl.style.strokeDasharray  = len;
          shaftEl.style.strokeDashoffset = '0';
        }
      }

      if (headEl && tip) {
        const { tip: t, prev: p } = tip;
        const dx = t.x - p.x, dy = t.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len, uy = dy / len;
        const px = -uy, py = ux;
        const a1 = { x: t.x - ux * ARM + px * ARM * 0.6, y: t.y - uy * ARM + py * ARM * 0.6 };
        const a2 = { x: t.x - ux * ARM - px * ARM * 0.6, y: t.y - uy * ARM - py * ARM * 0.6 };
        headEl.setAttribute('d', `M ${a1.x.toFixed(2)} ${a1.y.toFixed(2)} L ${t.x.toFixed(2)} ${t.y.toFixed(2)} L ${a2.x.toFixed(2)} ${a2.y.toFixed(2)}`);
        // Re-sync arrowhead dash geometry on resize too
        if (headEl.classList.contains('ready')) {
          const hlen = headEl.getTotalLength();
          headEl.style.strokeDasharray  = hlen;
          headEl.style.strokeDashoffset = '0';
        }
      }

      if (labelEl && labelOffset) {
        labelEl.setAttribute('x', labelOffset.x.toFixed(2));
        labelEl.setAttribute('y', labelOffset.y.toFixed(2));
      }
    }

    // ── Arrow 1: email ───────────────────────────────────────────────
    // Botón email: centro (80.7, 4.4). Origen fijo en zona media-alta derecha.
    {
      const tx = email.x - 3,    ty = email.y + 5;   // tip: (77.7, 9.4)
      const ox = email.x - 19,   oy = email.y + 16;  // origen: (61.7, 20.4)
      const cp1x = ox + 8,  cp1y = oy - 6;
      const cp2x = tx - 4,  cp2y = ty + 8;
      const shaft = `M ${ox.toFixed(2)} ${oy.toFixed(2)} C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${tx.toFixed(2)} ${ty.toFixed(2)}`;
      setArrow('hero-arrow-email', 'hero-arrowhead-email', 'hero-label-email',
        shaft, { tip: { x: tx, y: ty }, prev: { x: cp2x, y: cp2y } },
        { x: ox, y: oy + 5 }
      );
    }

    // ── Arrow 2: github ──────────────────────────────────────────────
    // Botón github: centro (91.7, 4.4). Origen más abajo y a la derecha del de email.
    {
      const tx = github.x - 3,   ty = github.y + 5;  // tip: (88.7, 9.4)
      const ox = github.x - 16,  oy = github.y + 30; // origen: (75.7, 34.4)
      const cp1x = ox + 6,  cp1y = oy - 12;
      const cp2x = tx - 4,  cp2y = ty + 10;
      const shaft = `M ${ox.toFixed(2)} ${oy.toFixed(2)} C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${tx.toFixed(2)} ${ty.toFixed(2)}`;
      setArrow('hero-arrow-github', 'hero-arrowhead-github', 'hero-label-github',
        shaft, { tip: { x: tx, y: ty }, prev: { x: cp2x, y: cp2y } },
        { x: ox, y: oy + 5 }
      );
    }

    // ── Arrow 3: scroll indicator ────────────────────────────────────
    // Curva suave hacia abajo, sin giro en la base
    {
      const tx = scrollTop.x + 3,   ty = scrollTop.y - 5;
      const ox = scrollTop.x + 14,  oy = scrollTop.y - 20;
      const cp1x = ox - 2,  cp1y = oy + 8;
      const cp2x = tx + 4,  cp2y = ty - 8;
      const shaft = `M ${ox.toFixed(2)} ${oy.toFixed(2)} C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${tx.toFixed(2)} ${ty.toFixed(2)}`;
      setArrow('hero-arrow-scroll', 'hero-arrowhead-scroll', 'hero-label-scroll',
        shaft, { tip: { x: tx, y: ty }, prev: { x: cp2x, y: cp2y } },
        { x: ox + 6, y: oy - 2 }
      );
    }
  }

  function initHeroArrows() {
    // Each entry: shaft + its arrowhead + label, with start delay
    const arrows = [
      {
        shaftId:  'hero-arrow-email',
        headId:   'hero-arrowhead-email',
        labelId:  'hero-label-email',
        delay:    200,
        shaftDur: 700,   // ms to draw the shaft
        headDur:  300,   // ms to draw the arrowhead
      },
      {
        shaftId:  'hero-arrow-github',
        headId:   'hero-arrowhead-github',
        labelId:  'hero-label-github',
        delay:    650,
        shaftDur: 700,
        headDur:  300,
      },
      {
        shaftId:  'hero-arrow-scroll',
        headId:   'hero-arrowhead-scroll',
        labelId:  'hero-label-scroll',
        delay:    1100,
        shaftDur: 700,
        headDur:  300,
      },
    ];

    function animatePath(el, durationMs, easing, onDone) {
      if (!el) { if (onDone) onDone(); return; }
      const len = el.getTotalLength();
      // 1. Setup dash geometry while element is still invisible (opacity: 0 from CSS)
      el.style.transition = 'none';
      el.style.strokeDasharray  = len;
      el.style.strokeDashoffset = len;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // 2. Now activate both opacity fade-in and dash draw in the same frame
          el.style.transition = `opacity 0.15s ease, stroke-dashoffset ${durationMs}ms ${easing}`;
          el.classList.add('ready'); // triggers opacity 0 → 1
          el.style.strokeDashoffset = '0'; // triggers dash draw
          if (onDone) setTimeout(onDone, durationMs);
        });
      });
    }

    arrows.forEach(({ shaftId, headId, labelId, delay, shaftDur, headDur }) => {
      const shaft  = document.getElementById(shaftId);
      const head   = document.getElementById(headId);
      const label  = document.getElementById(labelId);

      setTimeout(() => {
        // 1. Draw the shaft
        animatePath(shaft, shaftDur, 'cubic-bezier(0.4,0,0.2,1)', () => {
          // 2. Draw the arrowhead immediately after shaft finishes
          animatePath(head, headDur, 'cubic-bezier(0.4,0,0.2,1)', () => {
            // 3. Fade in the label after the head is drawn
            if (label) label.classList.add('ready');
          });
        });
      }, delay);
    });
  }

  // ── i18n ───────────────────────────────────────────────────────
  let currentLang = localStorage.getItem('lang') || 'en';

  async function loadTranslations(lang) {
    const res = await fetch(`i18n/${lang}.json`);
    if (!res.ok) throw new Error(`Failed to load /i18n/${lang}.json`);
    return res.json();
  }

  function applyTranslations(data) {
    // textContent for regular elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (data[key] !== undefined) el.textContent = data[key];
    });

    // title attribute (tooltips)
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (data[key] !== undefined) el.setAttribute('title', data[key]);
    });

    // alt attribute (images)
    document.querySelectorAll('[data-i18n-alt]').forEach(el => {
      const key = el.getAttribute('data-i18n-alt');
      if (data[key] !== undefined) el.setAttribute('alt', data[key]);
    });
  }

  function setActiveLangButton(lang) {
    document.querySelectorAll('.fab-lang').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  async function switchLang(lang) {
    try {
      const data = await loadTranslations(lang);
      applyTranslations(data);
      currentLang = lang;
      localStorage.setItem('lang', lang);
      setActiveLangButton(lang);
      document.documentElement.lang = lang;
    } catch (e) {
    }
  }

  function initI18n() {
    document.querySelectorAll('.fab-lang').forEach(btn => {
      btn.addEventListener('click', () => switchLang(btn.dataset.lang));
    });
    // Apply saved / default language on load
    switchLang(currentLang);
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); initFloatingButtons(); initEmailModal(); buildHeroArrowPaths(); initHeroArrows(); initI18n(); });
  } else {
    init();
    initFloatingButtons();
    initEmailModal();
    buildHeroArrowPaths();
    initHeroArrows();
    initI18n();
  }

  // Rebuild on resize so arrows keep pointing at the FABs
  let _arrowResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(_arrowResizeTimer);
    _arrowResizeTimer = setTimeout(buildHeroArrowPaths, 150);
  });

  // Regenerate timeline path on viewport resize (handles mobile browser toolbar
  // appearing/disappearing, which changes 100vh and shifts hero layout).
  let _timelineResizeTimer;
  function onTimelineResize() {
    if (!isTimelineReady) return;
    // Don't regenerate if the user has scrolled past the hero (scribble territory)
    if (isScribbling || isReverseScribbling || scribbleProgress > 0) return;
    clearTimeout(_timelineResizeTimer);
    _timelineResizeTimer = setTimeout(() => {
      requestAnimationFrame(() => {
        generatePathFromCircle();
        if (pathLength > 0) {
          colorfulPath.style.strokeDasharray = pathLength;
          pencilPath.style.strokeDasharray = `0 ${pathLength}`;
        }
        updateViewBox();
        updateTimeline();
      });
    }, 200);
  }
  window.addEventListener('resize', onTimelineResize);
  // visualViewport fires on iOS when the keyboard or browser chrome changes size
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onTimelineResize);
  }
})();
