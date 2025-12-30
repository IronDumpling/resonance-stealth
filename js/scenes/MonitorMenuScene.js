/**
 * MonitorMenuScene.js
 * 监视器菜单场景 - 模式选择
 */

class MonitorMenuScene extends Scene {
    constructor() {
        super('monitor_menu');
        this.selectedOption = 0;
        this.options = [
            { id: 'radio', label: '1. RADIO INTERFACE', mode: DISPLAY_MODES.RADIO_DISPLAY },
            { id: 'robot', label: '2. ROBOT CONTROL', mode: DISPLAY_MODES.ROBOT_DISPLAY }
        ];
        this.blinkTimer = 0;
        this.showCursor = true;
    }
    
    enter(data) {
        super.enter(data);
        console.log('Monitor menu entered');
        this.selectedOption = 0;
        
        // Set display mode to MENU
        if (sceneManager) {
            sceneManager.switchDisplayMode(DISPLAY_MODES.MENU);
        }
    }
    
    update(deltaTime) {
        // Blink cursor
        this.blinkTimer += deltaTime;
        if (this.blinkTimer >= 0.5) {
            this.showCursor = !this.showCursor;
            this.blinkTimer = 0;
        }
    }
    
    render(ctx, canvas) {
        // Clear screen
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw title
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('OS v4.0.1 [CONNECTED]', canvas.width / 2, canvas.height * 0.25);
        
        // Draw separator
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.3, canvas.height * 0.3);
        ctx.lineTo(canvas.width * 0.7, canvas.height * 0.3);
        ctx.stroke();
        
        // Draw options
        ctx.font = '20px monospace';
        ctx.textAlign = 'left';
        
        const startY = canvas.height * 0.4;
        const lineHeight = 50;
        
        this.options.forEach((option, index) => {
            const y = startY + index * lineHeight;
            const isSelected = index === this.selectedOption;
            
            // Draw cursor for selected option
            if (isSelected && this.showCursor) {
                ctx.fillStyle = '#00ff00';
                ctx.fillText('>', canvas.width * 0.3 - 30, y);
            }
            
            // Draw option text
            ctx.fillStyle = isSelected ? '#00ff00' : '#00aa00';
            if (isSelected) {
                ctx.shadowColor = '#00ff00';
                ctx.shadowBlur = 10;
            }
            ctx.fillText(option.label, canvas.width * 0.3, y);
            ctx.shadowBlur = 0;
        });
        
        // Draw hint
        ctx.font = '14px monospace';
        ctx.fillStyle = '#00aa00';
        ctx.textAlign = 'center';
        ctx.fillText('USE ARROW KEYS OR NUMBER KEYS TO SELECT', canvas.width / 2, canvas.height * 0.75);
        ctx.fillText('PRESS ENTER TO CONFIRM', canvas.width / 2, canvas.height * 0.80);
    }
    
    handleInput(event) {
        const key = event.key.toLowerCase();
        
        // Arrow key navigation
        if (key === 'arrowup') {
            this.selectedOption = Math.max(0, this.selectedOption - 1);
            return true;
        }
        if (key === 'arrowdown') {
            this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
            return true;
        }
        
        // Number key selection
        if (key === '1') {
            this.selectedOption = 0;
            this.selectOption();
            return true;
        }
        if (key === '2') {
            this.selectedOption = 1;
            this.selectOption();
            return true;
        }
        
        // Enter to confirm
        if (key === 'enter') {
            this.selectOption();
            return true;
        }
        
        return false;
    }
    
    selectOption() {
        const option = this.options[this.selectedOption];
        console.log(`Selected option: ${option.id}`);
        
        // Switch display mode
        if (sceneManager) {
            sceneManager.switchDisplayMode(option.mode);
            
            // Activate radio system (runs in both modes)
            sceneManager.setRadioState(RADIO_STATE.ACTIVE);
            
            // Activate radio UI (should already be initialized in BootScene)
            if (radioUI) {
                radioUI.activate();
            } else {
                console.error('Radio UI not initialized! Should be created in BootScene.');
            }
            
            // Initialize radio display UI if needed
            if (option.mode === DISPLAY_MODES.RADIO_DISPLAY) {
                if (!radioDisplayUI && typeof initRadioDisplayUI === 'function' && radioSystem) {
                    initRadioDisplayUI(radioSystem);
                }
            }
            
            // Switch to appropriate scene
            if (option.id === 'radio') {
                sceneManager.switchScene(SCENES.RADIO, 'fade');
            } else if (option.id === 'robot') {
                sceneManager.switchScene(SCENES.ROBOT, 'fade');
            }
        }
    }
}

