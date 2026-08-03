/**
 * GoodSleep Shareable Result Cards Generator
 * Compiles and downloads high-resolution (1200 x 630 px) PNG cards client-side.
 */
(function() {
  if (new URLSearchParams(window.location.search).has('embed')) {
    document.documentElement.classList.add('is-embed');
  }
})();

const GoodSleepShare = {
  // CSS design tokens mapping to concrete hexadecimal colors
  designTokens: {
    '--teal': '#1d9e75',
    '--teal-dark': '#0f6e56',
    '--teal-light': '#e1f5ee',
    '--purple': '#8b5cf6',
    '--purple-light': '#eeedfe',
    '--red': '#e24b4a',
    '--amber': '#f59e0b',
    '--text': '#f3f4f6',
    '--text-muted': '#9ca3af',
    '--border': '#374151',
    '--bg-card': '#111827',
    '--bg-soft': '#1f2937'
  },

  // Inlined SVG CSS rules for stand-alone rendering in canvas Image sandbox
  svgStyles: `
    .caffeine-chart-axis-label { font-size: 10px; fill: var(--text-hint); font-family: system-ui, -apple-system, sans-serif; }
    .caffeine-chart-line { fill: none; stroke: var(--teal); stroke-width: 3; stroke-linecap: round; }
    .caffeine-chart-threshold { stroke: var(--text-hint); stroke-dasharray: 4 4; stroke-width: 1; }
    .caffeine-chart-area { fill: url(#caffeine-gradient); opacity: 0.15; }
    .caffeine-chart-dot { fill: var(--teal-dark); stroke: #fff; stroke-width: 2; }
    
    .pp-clock-face { fill: var(--bg-soft); stroke: var(--border); stroke-width: 2px; }
    .pp-clock-tick { stroke: var(--text-hint); stroke-width: 1.5px; }
    .pp-clock-tick-major { stroke: var(--text-muted); stroke-width: 3px; }
    .pp-clock-slice { opacity: 0.85; }
    .pp-slice-core { fill: var(--teal); }
    .pp-slice-nap { fill: var(--purple); }
    .pp-clock-text { font-size: 11px; font-weight: 700; fill: var(--text-muted); font-family: system-ui, -apple-system, sans-serif; }
    
    .st-line { stroke: var(--teal); stroke-width: 3.5px; fill: none; }
    .st-line-area { fill: var(--teal-light); opacity: 0.15; }
    .st-grid { stroke: var(--border); stroke-width: 1px; stroke-dasharray: 2; }
    .st-bed-line { stroke: var(--red); stroke-width: 2px; stroke-dasharray: 4; }
    .st-axis-text { font-size: 10px; fill: var(--text-muted); font-weight: 600; font-family: system-ui, -apple-system, sans-serif; }
  `,

  /**
   * Serializes an SVG element and resolves its internal CSS variables.
   */
  serializeAndResolveSvg(svgElement) {
    const clone = svgElement.cloneNode(true);
    
    // Add inside style tag
    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = this.svgStyles;
    clone.insertBefore(styleEl, clone.firstChild);
    
    let svgStr = new XMLSerializer().serializeToString(clone);
    
    // Initialize token regexes once
    if (!this._tokenRegexes) {
      this._tokenRegexes = {};
      for (const token of Object.keys(this.designTokens)) {
        this._tokenRegexes[token] = new RegExp(`var\\(${token}\\)`, 'g');
      }
    }

    // Replace all CSS custom property occurrences with hex colors
    for (const [token, value] of Object.entries(this.designTokens)) {
      svgStr = svgStr.replace(this._tokenRegexes[token], value);
    }
    
    // Fallback for var(--text-hint) etc.
    svgStr = svgStr.replace(/var\(--text-hint\)/g, '#9ca3af');
    svgStr = svgStr.replace(/var\(--bg-soft\)/g, '#1f2937');
    svgStr = svgStr.replace(/var\(--border\)/g, '#374151');
    
    return svgStr;
  },

  /**
   * Draws a rounded rectangle on a canvas context.
   */
  drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === 'undefined') radius = 0;
    if (typeof radius === 'number') {
      radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
      radius = {...{tl: 0, tr: 0, br: 0, bl: 0}, ...radius};
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  },

  /**
   * Helper to wrap and split canvas text into lines.
   */
  getLines(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  },

  /**
   * Compiles the common layout frame (background glow, headers, footers).
   */
  drawBaseTemplate(ctx) {
    // 1. Dark Blue & Forest Green Gradient Background
    const grad = ctx.createLinearGradient(0, 0, 1200, 630);
    grad.addColorStop(0, '#0a1128');
    grad.addColorStop(1, '#05241c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 630);

    // 2. Ambient radial glow on the right
    const glow = ctx.createRadialGradient(900, 315, 50, 900, 315, 420);
    glow.addColorStop(0, 'rgba(29, 158, 117, 0.12)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1200, 630);

    // 3. Header Logo & Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px system-ui, -apple-system, sans-serif';
    ctx.fillText('🌙 GoodSleep', 60, 85);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '20px system-ui, -apple-system, sans-serif';
    ctx.fillText('|  Circadian & Sleep Science', 290, 83);

    // 4. Footer Branding
    ctx.fillStyle = 'rgba(29, 158, 117, 0.85)';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('goodsleep.rest', 1140, 565);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Circadian-optimized sleep schedules & tools', 60, 565);
  },

  /**
   * Finalizes the canvas download as a PNG file.
   */
  triggerDownload(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  },

  /**
   * Layout 1: Chronotype Animal Card (No SVG, custom graphics instead)
   */
  generateChronotypeCard(animalName, animalEmoji, tagline, stats, filename = 'goodsleep-chronotype.png') {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Base template
    this.drawBaseTemplate(ctx);

    // Category
    ctx.fillStyle = '#5dcaa5';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('CIRCADIAN CHRONOTYPE', 60, 180);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
    ctx.fillText(`You're a ${animalName}`, 60, 245);

    // Description text wrapping
    ctx.fillStyle = '#9ca3af';
    ctx.font = '19px system-ui, -apple-system, sans-serif';
    const lines = this.getLines(ctx, tagline, 500);
    let y = 295;
    lines.slice(0, 2).forEach(line => {
      ctx.fillText(line, 60, y);
      y += 28;
    });

    // Draw Stats Rows
    let startY = 370;
    stats.forEach(stat => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      this.drawRoundedRect(ctx, 60, startY, 500, 52, 8, true, true);

      // Label
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(stat.label, 80, startY + 30);

      // Value
      ctx.fillStyle = '#5dcaa5';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(stat.value, 540, startY + 30);

      ctx.textAlign = 'left';
      startY += 64;
    });

    // Right Side graphics: Animal Emoji Circle
    ctx.strokeStyle = 'rgba(29, 158, 117, 0.16)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(900, 315, 150, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(900, 315, 175, 0, Math.PI * 2);
    ctx.stroke();

    const innerGlow = ctx.createRadialGradient(900, 315, 20, 900, 315, 120);
    innerGlow.addColorStop(0, 'rgba(29, 158, 117, 0.18)');
    innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(900, 315, 130, 0, Math.PI * 2);
    ctx.fill();

    // Draw Emoji
    ctx.font = '120px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(animalEmoji, 900, 312);
    
    // Reset baseline
    ctx.textBaseline = 'alphabetic';

    // Trigger Download
    this.triggerDownload(canvas, filename);
  },

  /**
   * Layout 2: Shareable Card with embedded SVG (Caffeine or Polyphasic Clock)
   */
  generateSvgResultCard(category, mainTitle, tagline, stats, svgElement, filename = 'goodsleep-schedule.png') {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Base template
    this.drawBaseTemplate(ctx);

    // Left Column Info
    ctx.fillStyle = '#5dcaa5';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText(category.toUpperCase(), 60, 180);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
    ctx.fillText(mainTitle, 60, 245);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '18px system-ui, -apple-system, sans-serif';
    const lines = this.getLines(ctx, tagline, 500);
    let y = 295;
    lines.slice(0, 2).forEach(line => {
      ctx.fillText(line, 60, y);
      y += 26;
    });

    // Draw Stats
    let startY = 370;
    stats.forEach(stat => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      this.drawRoundedRect(ctx, 60, startY, 500, 52, 8, true, true);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(stat.label, 80, startY + 30);

      ctx.fillStyle = '#5dcaa5';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(stat.value, 540, startY + 30);

      ctx.textAlign = 'left';
      startY += 64;
    });

    // Resolve SVG with css rule sheets & variables
    const svgStr = this.serializeAndResolveSvg(svgElement);
    const svgBlob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      // Calculate best aspect ratio fit inside bounding box (x: 650 to 1140, y: 140 to 500)
      const boundingW = 480;
      const boundingH = 360;
      
      const svgViewBox = svgElement.viewBox.baseVal || { width: 500, height: 350 };
      const svgWidth = svgViewBox.width || 500;
      const svgHeight = svgViewBox.height || 350;
      
      const aspect = svgWidth / svgHeight;
      let drawW = boundingW;
      let drawH = boundingW / aspect;
      
      if (drawH > boundingH) {
        drawH = boundingH;
        drawW = boundingH * aspect;
      }
      
      const drawX = 650 + (boundingW - drawW) / 2;
      const drawY = 140 + (boundingH - drawH) / 2;
      
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      URL.revokeObjectURL(url);
      
      this.triggerDownload(canvas, filename);
    };
    img.src = url;
  },

  /**
   * Layout 3: Jet Lag Travel Route Card (combines text, route badges, and guidelines)
   */
  generateJetLagCard(routeLabel, offsetHours, daysNeeded, melatoninDose, melatoninTime, guidelines, filename = 'goodsleep-jetlag.png') {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Base template
    this.drawBaseTemplate(ctx);

    // Left Column Info
    ctx.fillStyle = '#5dcaa5';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('CIRCADIAN JET LAG PLAN', 60, 180);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
    ctx.fillText(routeLabel, 60, 245);

    // Draw Stats
    const stats = [
      { label: 'Timezone Shift Offset:', value: offsetHours },
      { label: 'Total Adaptation Period:', value: `${daysNeeded} Days` },
      { label: 'Circadian Reset Direction:', value: parseFloat(offsetHours) > 0 ? 'Eastward (Phase Advance)' : 'Westward (Phase Delay)' },
      { label: 'Melatonin Administration:', value: melatoninDose ? `${melatoninDose} at ${melatoninTime}` : 'None Required' }
    ];

    let startY = 295;
    stats.forEach(stat => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      this.drawRoundedRect(ctx, 60, startY, 500, 52, 8, true, true);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(stat.label, 80, startY + 30);

      ctx.fillStyle = '#5dcaa5';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(stat.value, 540, startY + 30);

      ctx.textAlign = 'left';
      startY += 64;
    });

    // Right Side Layout: Travel Routing Visual & Guidelines
    // Draw Route Badge Box
    ctx.fillStyle = 'rgba(139, 92, 246, 0.06)';
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
    this.drawRoundedRect(ctx, 660, 150, 480, 130, 12, true, true);

    // Render airports route
    const parts = routeLabel.split(' ➔ ');
    const origin = parts[0] || 'DEP';
    const dest = parts[1] || 'ARR';

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(origin, 740, 215);
    ctx.fillText(dest, 1060, 215);

    ctx.fillStyle = 'rgba(29, 158, 117, 0.85)';
    ctx.font = '32px system-ui, -apple-system, sans-serif';
    ctx.fillText('✈️', 900, 212);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText('FLIGHT PATH ROUTING', 900, 255);

    // Draw Guidelines Title
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5dcaa5';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('CORE RESET GUIDELINES', 660, 330);

    // Draw Guidelines list
    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    
    let textY = 365;
    guidelines.forEach(guide => {
      // Draw bullet point dot
      ctx.fillStyle = '#5dcaa5';
      ctx.beginPath();
      ctx.arc(670, textY - 6, 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw text
      ctx.fillStyle = '#d1d5db';
      const gLines = this.getLines(ctx, guide, 440);
      gLines.forEach(line => {
        ctx.fillText(line, 690, textY);
        textY += 26;
      });
      textY += 6;
    });

    // Trigger Download
    this.triggerDownload(canvas, filename);
  },

  /**
   * Layout 4: Sleep Quality Audit Card
   */
  generateAuditCard(scoreText, ratingText, tagline, stats, filename = 'goodsleep-sleep-audit.png') {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Base template
    this.drawBaseTemplate(ctx);

    // Category
    ctx.fillStyle = '#5dcaa5';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('SLEEP QUALITY AUDIT', 60, 180);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Score: ${scoreText}`, 60, 245);

    // Description text wrapping
    ctx.fillStyle = '#9ca3af';
    ctx.font = '19px system-ui, -apple-system, sans-serif';
    const lines = this.getLines(ctx, tagline, 500);
    let y = 295;
    lines.slice(0, 2).forEach(line => {
      ctx.fillText(line, 60, y);
      y += 28;
    });

    // Draw Stats Rows
    let startY = 370;
    stats.forEach(stat => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      this.drawRoundedRect(ctx, 60, startY, 500, 52, 8, true, true);

      // Label
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(stat.label, 80, startY + 30);

      // Value
      ctx.fillStyle = '#5dcaa5';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(stat.value, 540, startY + 30);

      ctx.textAlign = 'left';
      startY += 64;
    });

    // Right Side graphics: Glowing emoji ring
    ctx.strokeStyle = 'rgba(29, 158, 117, 0.16)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(900, 315, 150, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(900, 315, 175, 0, Math.PI * 2);
    ctx.stroke();

    const innerGlow = ctx.createRadialGradient(900, 315, 20, 900, 315, 120);
    innerGlow.addColorStop(0, 'rgba(29, 158, 117, 0.18)');
    innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(900, 315, 130, 0, Math.PI * 2);
    ctx.fill();

    // Draw Emoji & Rating Text
    ctx.font = '100px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📊', 900, 270);
    
    ctx.fillStyle = '#5dcaa5';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(ratingText, 900, 370);
    
    // Reset baseline
    ctx.textBaseline = 'alphabetic';

    // Trigger Download
    this.triggerDownload(canvas, filename);
  },

  /**
   * Compiles customized sharing text based on quiz results or planner settings.
   */
  getShareData(pageSlug) {
    const url = window.location.origin + window.location.pathname;
    let text = "";
    
    if (pageSlug === 'sleep-audit') {
      const score = localStorage.getItem('gs-sleep-audit-score');
      const disrupter = localStorage.getItem('gs-sleep-audit-disrupter');
      if (score) {
        text = `I just completed my Sleep Quality Audit on GoodSleep! My sleep score is ${score}/100${disrupter ? ` (Main disrupter: ${disrupter})` : ''}. Diagnose your sleep habits here: ${url}`;
      } else {
        text = `How good is your sleep? Take the GoodSleep Sleep Quality Audit to diagnose sleep disrupters and get your sleep score: ${url}`;
      }
    } else if (pageSlug === 'caffeine-calculator') {
      const data = window.activeCaffeineData;
      if (data) {
        let clearanceTime = "Safe at Bedtime";
        if (data.bedtimeCaffeine >= 20) {
          let m = data.bedtimeQueryMin;
          const endLimit = data.bedtimeQueryMin + 24 * 60;
          let clearedMin = -1;
          while (m < endLimit) {
            if (data.getCaffeineAtMinute(m % (24 * 60)) < 20) {
              clearedMin = m % (24 * 60);
              break;
            }
            m += 15;
          }
          if (clearedMin !== -1) {
            const hrs = Math.floor(clearedMin / 60);
            const mins = clearedMin % 60;
            const ampm = hrs >= 12 ? 'PM' : 'AM';
            const dispHrs = hrs % 12 === 0 ? 12 : hrs % 12;
            const dispMins = mins < 10 ? '0' + mins : mins;
            clearanceTime = `${dispHrs}:${dispMins} ${ampm}`;
          } else {
            clearanceTime = "Next Day";
          }
        }
        text = `Tracked my bedtime caffeine clearance with GoodSleep. My bedtime level is ${Math.round(data.bedtimeCaffeine)}mg, and sleep-safe clearance is ${clearanceTime}. Check yours: ${url}`;
      } else {
        text = `Optimize your deep sleep by tracking your caffeine clearance curve! Find your sleep-safe hour with the GoodSleep caffeine calculator: ${url}`;
      }
    } else if (pageSlug === 'chronotype') {
      const type = localStorage.getItem('gs-chronotype');
      if (type) {
        const chronotypeMap = {
          bear: { name: 'Bear', emoji: '🐻', peak: '10 AM - 2 PM' },
          lion: { name: 'Lion', emoji: '🦁', peak: '6 AM - 10 AM' },
          wolf: { name: 'Wolf', emoji: '🐺', peak: '5 PM - 10 PM' },
          dolphin: { name: 'Dolphin', emoji: '🐬', peak: '10 AM - 12 PM' }
        };
        const mapped = chronotypeMap[type.toLowerCase()] || { name: type, emoji: '🧬', peak: 'daytime' };
        text = `My biological chronotype is the ${mapped.emoji} ${mapped.name}! Peak energy: ${mapped.peak}. Take the quiz to find your sleep animal: ${url}`;
      } else {
        text = `Optimize your sleep by aligning with your biological clock! Discover your chronotype (Lion, Bear, Wolf, Dolphin) and peak energy hours: ${url}`;
      }
    } else if (pageSlug === 'polyphasic-sleep-planner') {
      const routineKey = localStorage.getItem('gs-polyphasic-routine');
      const hours = localStorage.getItem('gs-polyphasic-sleep-hours');
      if (routineKey) {
        const polyphasicMap = {
          'biphasic-siesta': 'Biphasic Siesta',
          'biphasic-segmented': 'Biphasic Segmented',
          'everyman-e2': 'Everyman E2',
          'everyman-e3': 'Everyman E3',
          'uberman': 'Uberman',
          'dymaxion': 'Dymaxion'
        };
        const routineName = polyphasicMap[routineKey] || routineKey;
        text = `I'm planning a ${routineName} polyphasic sleep schedule (${hours ? `${hours}h` : 'custom'} total sleep/day) using the GoodSleep sleep clock! Design your schedule: ${url}`;
      } else {
        text = `Optimize your sleep schedules with our interactive 24-hour circular polyphasic clock planner! Customize Biphasic, Everyman, or Uberman schedules: ${url}`;
      }
    } else if (pageSlug === 'jet-lag-planner') {
      const dep = localStorage.getItem('gs-jet-lag-dep');
      const dest = localStorage.getItem('gs-jet-lag-dest');
      const diff = localStorage.getItem('gs-jet-lag-diff');
      const days = localStorage.getItem('gs-jet-lag-days');
      if (dep && dest) {
        const diffVal = parseFloat(diff);
        const shiftText = diffVal > 0 ? `+${diffVal}h` : `${diffVal}h`;
        text = `Planning a jet lag adaptation plan on GoodSleep for a ${shiftText} shift from ${dep} to ${dest}. Total transition: ${days} days. Get your custom plan: ${url}`;
      } else {
        text = `Travelling across timezones? Beat jet lag with the GoodSleep circadian timezone transition planner. Calculate your melatonin, light, and sleep offset times: ${url}`;
      }
    } else if (pageSlug === 'shift-work-sleep-calculator') {
      const anchor = document.getElementById('stat-anchor')?.textContent;
      if (anchor) {
        text = `Planning my night-shift circadian blocks with the GoodSleep Shift Work Sleep Scheduler. Anchor sleep: ${anchor}. Calculate your circadian plan: ${url}`;
      } else {
        text = `Rotating or night shifts disrupt your circadian master clock. Calculate optimal sleep blocks, protect anchor sleep, and manage light cycles: ${url}`;
      }
    } else if (pageSlug === 'muscle-recovery-sleep-calculator') {
      const total = document.getElementById('stat-total')?.textContent;
      if (total) {
        text = `Calculated my bodybuilding sleep needs with the GoodSleep Muscle Recovery sleep calculator. Optimal recovery sleep: ${total}. Optimize your growth hormone and deep sleep: ${url}`;
      } else {
        text = `Calculate the exact sleep duration needed for muscle protein synthesis and optimal growth hormone release based on your training splits: ${url}`;
      }
    } else if (pageSlug === 'new-parent-sleep-sync') {
      const guarantee = document.getElementById('stat-guarantee')?.textContent;
      if (guarantee) {
        text = `Coordinated baby feeding duties and night shifts with the GoodSleep Parent Sleep Sync calculator. Uninterrupted sleep: ${guarantee} guaranteed. Sync your shifts: ${url}`;
      } else {
        text = `Coordinate nighttime shifts between parents to guarantee critical consolidated sleep windows during infant feeding cycles: ${url}`;
      }
    } else {
      text = `Optimize your circadian rhythms and improve sleep quality with interactive tools on GoodSleep: ${url}`;
    }
    
    return text;
  },

  /**
   * Opens the share dialog on X (Twitter).
   */
  shareX(pageSlug) {
    const text = this.getShareData(pageSlug);
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400,resizable=yes');
  },
  
  /**
   * Opens the share dialog on Reddit.
   */
  shareReddit(pageSlug) {
    const text = this.getShareData(pageSlug);
    const url = window.location.origin + window.location.pathname;
    const shareUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'width=600,height=600,resizable=yes');
  },
  
  /**
   * Opens the share dialog on WhatsApp.
   */
  shareWA(pageSlug) {
    const text = this.getShareData(pageSlug);
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'width=600,height=500,resizable=yes');
  }
};

// Expose globally
window.GoodSleepShare = GoodSleepShare;

// 🔌 WIDGET EMBED MODAL FUNCTIONS
window.openWidgetModal = function(pageSlug, pageTitle) {
  const escapeHTML = (str) => {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const safeSlug = escapeHTML(pageSlug);
  const safeTitle = escapeHTML(pageTitle);

  let modal = document.getElementById('widget-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'widget-modal';
    modal.className = 'widget-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(modal);
  }
  
  const embedCode = `<iframe src="https://goodsleep.rest/${safeSlug}?embed=true" width="100%" height="600" style="border: 1px solid var(--border, #1f2d29); border-radius: 12px; background: #0B1512;" title="${safeTitle}"></iframe>\n<p style="font-size: 12px; text-align: center; color: #9ca3af;">Interactive Calculator by <a href="https://goodsleep.rest" target="_blank" style="color: #5dcaa5; text-decoration: none; font-weight: 600;">GoodSleep</a></p>`;

  modal.innerHTML = `
    <div class="widget-modal-content" style="
      background: var(--bg-card, #111827);
      border: 1.5px solid var(--border, #374151);
      border-radius: var(--r, 16px);
      padding: 2rem;
      width: 90%;
      max-width: 500px;
      box-shadow: var(--shadow);
      position: relative;
    ">
      <button class="widget-close" onclick="closeWidgetModal()" style="
        position: absolute;
        top: 15px;
        right: 15px;
        background: transparent;
        border: none;
        color: var(--text-muted, #9ca3af);
        font-size: 24px;
        cursor: pointer;
        line-height: 1;
      ">&times;</button>
      <h3 style="margin-top: 0; font-size: 18px; font-weight: 700; color: var(--text, #ffffff);">🔌 Embed This Calculator</h3>
      <p style="font-size: 13.5px; color: var(--text-muted, #9ca3af); line-height: 1.5; margin-bottom: 1rem;">
        Add this interactive sleep tool to your own website or blog. Copy the code snippet below:
      </p>
      <textarea id="widget-code-text" readonly style="
        width: 100%;
        height: 120px;
        background: var(--bg-soft, #1f2937);
        border: 1px solid var(--border, #374151);
        border-radius: var(--r-sm, 8px);
        padding: 10px;
        color: var(--text, #ffffff);
        font-family: monospace;
        font-size: 12px;
        resize: none;
        margin-bottom: 1.25rem;
        box-sizing: border-box;
      ">${escapeHTML(embedCode)}</textarea>
      <div style="display: flex; gap: 10px;">
        <button id="widget-copy-btn" onclick="copyWidgetCode()" style="
          flex: 1;
          background: var(--teal, #1d9e75);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: var(--r-sm, 8px);
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        ">📋 Copy Embed Code</button>
        <button onclick="closeWidgetModal()" style="
          background: var(--bg-soft, #1f2937);
          border: 1.5px solid var(--border, #374151);
          color: var(--text, #ffffff);
          padding: 10px 16px;
          border-radius: var(--r-sm, 8px);
          font-weight: 600;
          cursor: pointer;
        ">Cancel</button>
      </div>
    </div>
  `;
  
  setTimeout(() => { modal.style.opacity = '1'; }, 10);
};

window.closeWidgetModal = function() {
  const modal = document.getElementById('widget-modal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => { modal.remove(); }, 300);
  }
};

window.copyWidgetCode = function() {
  const textarea = document.getElementById('widget-code-text');
  const btn = document.getElementById('widget-copy-btn');
  textarea.select();
  document.execCommand('copy');
  
  const originalText = btn.textContent;
  btn.textContent = '✅ Copied!';
  btn.style.background = '#1D9E75';
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.background = 'var(--teal, #1d9e75)';
  }, 2000);
};
