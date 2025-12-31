/**
 * Radar Map - Visual display of radio signals and antenna direction
 */

class RadarMap {
    constructor(canvas, radioSystem) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.radio = radioSystem;
        
        // Scale: pixels per km
        this.scale = 50;
        
        // Center point (shelter position)
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        
        // Markers
        this.markers = [];
        
        // Ping waves
        this.pingWaves = [];
        
        // Player waves and response waves
        this.waves = [];
        this.responseWaves = [];
        
        // Animation
        this.scanAngle = 0;
        this.blinkTimer = 0;
        this.showMarkers = true;
        
        console.log('Radar Map created');
    }
    
    /**
     * Update radar state
     */
    update(deltaTime) {
        // Update scan line rotation
        this.scanAngle += deltaTime * 30; // 30 degrees per second
        if (this.scanAngle >= 360) {
            this.scanAngle -= 360;
        }
        
        // Update blink timer for markers
        this.blinkTimer += deltaTime;
        if (this.blinkTimer >= 0.5) {
            this.showMarkers = !this.showMarkers;
            this.blinkTimer = 0;
        }
        
        // Update ping waves
        for (let i = this.pingWaves.length - 1; i >= 0; i--) {
            const wave = this.pingWaves[i];
            wave.radius += deltaTime * 200; // Expand at 200 pixels/second
            wave.alpha -= deltaTime * 0.5;  // Fade out
            
            if (wave.alpha <= 0) {
                this.pingWaves.splice(i, 1);
            }
        }
        
        // Sync waves with radioSystem
        if (this.radio && this.radio.emittedWaves) {
            this.waves = this.radio.emittedWaves;
        }
    }
    
    /**
     * Render the radar map
     */
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        
        // Draw grid
        this.drawGrid();
        
        // Draw range circles
        this.drawRangeCircles();
        
        // Draw signal sources (if implemented)
        if (typeof this.drawSignalSources === 'function') {
            this.drawSignalSources();
        }
        
        // Draw scan line
        this.drawScanLine();
        
        // Draw antenna direction
        this.drawAntenna();
        
        // Draw waves
        this.drawWaves();
        
        // Draw ping waves
        this.drawPingWaves();
        
        // Draw markers
        this.drawMarkers();
        
        // Draw center point (shelter)
        this.drawCenter();
        
        // Draw compass labels
        this.drawCompassLabels();
    }
    
    /**
     * Draw grid lines
     */
    drawGrid() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        const gridSpacing = 50;
        for (let x = 0; x < w; x += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < h; y += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        
        // Center cross
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.centerX, 0);
        ctx.lineTo(this.centerX, h);
        ctx.moveTo(0, this.centerY);
        ctx.lineTo(w, this.centerY);
        ctx.stroke();
    }
    
    /**
     * Draw range circles
     */
    drawRangeCircles() {
        const ctx = this.ctx;
        
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.lineWidth = 1;
        
        // Draw circles at 2km, 4km, 6km, 8km, 10km
        for (let range = 2; range <= 10; range += 2) {
            const radius = range * this.scale;
            
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw range label
            ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${range}km`, this.centerX, this.centerY - radius - 5);
        }
    }
    
    /**
     * Draw signal sources
     */
    drawSignalSources() {
        if (!this.radio || !this.radio.signals) return;
        
        const ctx = this.ctx;
        
        // Draw only discovered signal sources on the radar
        for (const signal of this.radio.signals) {
            if (!signal.x || !signal.y) continue; // Skip signals without coordinates
            if (!signal.discovered) continue; // Only show discovered signals
            
            // Convert world coordinates to radar coordinates
            const dx = signal.x - this.radio.shelterX;
            const dy = signal.y - this.radio.shelterY;
            const distance = Math.sqrt(dx * dx + dy * dy) / 1000; // meters to km
            const angle = Math.atan2(dy, dx);
            
            const radarX = this.centerX + Math.cos(angle) * distance * this.scale;
            const radarY = this.centerY + Math.sin(angle) * distance * this.scale;
            
            // Draw signal indicator (pulsing dot)
            const pulsePhase = (Date.now() / 500) % 1;
            const pulseSize = 3 + Math.sin(pulsePhase * Math.PI * 2) * 1.5;
            
            // Color based on signal type
            let color = '#ffff00'; // Default yellow
            if (signal.type === 'astronaut') color = '#ff00ff'; // Magenta
            else if (signal.type === 'beacon') color = '#00ffff'; // Cyan
            
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            
            ctx.beginPath();
            ctx.arc(radarX, radarY, pulseSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            
            // Draw frequency label (small text)
            ctx.fillStyle = color;
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${signal.frequency.toFixed(1)}`, radarX, radarY - 8);
        }
    }
    
    /**
     * Draw rotating scan line
     */
    drawScanLine() {
        const ctx = this.ctx;
        const angle = this.scanAngle * Math.PI / 180;
        const maxRadius = Math.max(this.canvas.width, this.canvas.height);
        
        // Create gradient for scan line
        const gradient = ctx.createLinearGradient(
            this.centerX,
            this.centerY,
            this.centerX + Math.cos(angle) * maxRadius,
            this.centerY + Math.sin(angle) * maxRadius
        );
        gradient.addColorStop(0, 'rgba(0, 255, 0, 0.3)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(
            this.centerX + Math.cos(angle) * maxRadius,
            this.centerY + Math.sin(angle) * maxRadius
        );
        ctx.stroke();
    }
    
    /**
     * Draw antenna direction indicator
     */
    drawAntenna() {
        if (!this.radio) return;
        
        const ctx = this.ctx;
        const angle = this.radio.antennaAngle * Math.PI / 180;
        const length = 30; // 缩小：80 -> 50
        const beamWidth = 30 * Math.PI / 180; // 30 degree beam width
        
        // Draw beam cone
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.centerY);
        ctx.arc(
            this.centerX,
            this.centerY,
            length,
            angle - beamWidth / 2,
            angle + beamWidth / 2
        );
        ctx.closePath();
        ctx.fill();
        
        // Draw antenna direction line
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2; // 缩小：3 -> 2
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(
            this.centerX + Math.cos(angle) * length,
            this.centerY + Math.sin(angle) * length
        );
        ctx.stroke();
        
        // Draw arrow head (smaller triangle)
        const arrowSize = 6; // 缩小：10 -> 6
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(
            this.centerX + Math.cos(angle) * length,
            this.centerY + Math.sin(angle) * length
        );
        ctx.lineTo(
            this.centerX + Math.cos(angle - 2.5) * (length - arrowSize),
            this.centerY + Math.sin(angle - 2.5) * (length - arrowSize)
        );
        ctx.lineTo(
            this.centerX + Math.cos(angle + 2.5) * (length - arrowSize),
            this.centerY + Math.sin(angle + 2.5) * (length - arrowSize)
        );
        ctx.closePath();
        ctx.fill();
        
        // Draw angle text
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${Math.round(this.radio.antennaAngle)}°`,
            this.centerX,
            this.centerY - 100
        );
    }
    
    /**
     * Draw ping waves
     */
    drawPingWaves() {
        const ctx = this.ctx;
        
        for (const wave of this.pingWaves) {
            ctx.strokeStyle = `rgba(0, 255, 255, ${wave.alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, wave.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    /**
     * Draw signal markers
     */
    drawMarkers() {
        if (!this.showMarkers) return;
        
        const ctx = this.ctx;
        
        for (const marker of this.markers) {
            // Convert world coordinates to radar coordinates
            const dx = marker.x - this.radio.shelterX;
            const dy = marker.y - this.radio.shelterY;
            const distance = Math.sqrt(dx * dx + dy * dy) / 1000; // Convert to km
            const angle = Math.atan2(dy, dx);
            
            const radarX = this.centerX + Math.cos(angle) * distance * this.scale;
            const radarY = this.centerY + Math.sin(angle) * distance * this.scale;
            
            // Draw marker
            if (marker.signal) {
                // Signal marker
                ctx.fillStyle = marker.signal.type === 'astronaut' ? '#ff00ff' : '#ffff00';
            } else {
                // Generic marker
                ctx.fillStyle = '#ffffff';
            }
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            ctx.arc(radarX, radarY, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            
            // Draw label
            ctx.fillStyle = ctx.fillStyle;
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            const label = marker.signal ? marker.signal.callsign : (marker.label || 'MARK');
            ctx.fillText(label, radarX, radarY - 10);
        }
    }
    
    /**
     * Draw center point (shelter)
     */
    drawCenter() {
        const ctx = this.ctx;
        
        // Draw pulsing center dot
        const pulseSize = 3 + Math.sin(Date.now() / 200) * 2;
        
        ctx.fillStyle = '#00ff00';
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Draw label
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SHELTER', this.centerX, this.centerY + 20);
    }
    
    /**
     * Draw compass labels
     */
    drawCompassLabels() {
        const ctx = this.ctx;
        const radius = Math.min(this.canvas.width, this.canvas.height) / 2 - 30;
        
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // N, E, S, W
        const labels = [
            { text: 'N', angle: -90 },
            { text: 'E', angle: 0 },
            { text: 'S', angle: 90 },
            { text: 'W', angle: 180 }
        ];
        
        for (const label of labels) {
            const angle = label.angle * Math.PI / 180;
            const x = this.centerX + Math.cos(angle) * radius;
            const y = this.centerY + Math.sin(angle) * radius;
            
            ctx.fillText(label.text, x, y);
        }
    }
    
    /**
     * Add a marker to the map
     */
    addMarker(x, y, signal) {
        this.markers.push({ x, y, signal });
        console.log(`Marker added: ${signal.callsign} at (${x}, ${y})`);
    }
    
    /**
     * Show ping wave animation
     */
    showPingWave() {
        this.pingWaves.push({
            radius: 0,
            alpha: 1.0
        });
    }
    
    /**
     * Show emitted wave (for visual tracking)
     */
    showEmittedWave(wave) {
        // Wave is already in radioSystem.emittedWaves, 
        // which we sync in update() method
        console.log(`Wave visualization added for wave at ${wave.freq} MHz`);
    }
    
    /**
     * Draw waves (called in render)
     */
    drawWaves() {
        if (!this.waves || this.waves.length === 0) return;
        
        const ctx = this.ctx;
        
        for (const wave of this.waves) {
            // Convert world coordinates to radar coordinates
            const dx = wave.x - this.radio.shelterX;
            const dy = wave.y - this.radio.shelterY;
            const radarX = this.centerX + (dx / 1000) * this.scale;
            const radarY = this.centerY + (dy / 1000) * this.scale;
            
            // Convert radius to radar scale
            const radarR = (wave.r / 1000) * this.scale;
            
            // Calculate alpha based on age
            const age = (Date.now() - wave.emitTime) / 1000; // seconds
            const maxAge = 10; // 10 seconds fade
            const alpha = Math.max(0, 1 - age / maxAge);
            
            // Distinguish player waves from response waves
            if (wave.signal) {
                // Response wave (yellow, going back to player)
                ctx.strokeStyle = `rgba(255, 255, 0, ${alpha * 0.6})`;
            } else {
                // Player wave (cyan)
                ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.8})`;
            }
            
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(radarX, radarY, radarR, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    /**
     * Clear all markers
     */
    clearMarkers() {
        this.markers = [];
    }
}

