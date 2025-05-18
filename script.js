class DieterClock {
    constructor() {
        // DOM Elements
        this.analogClock = document.querySelector('.analog-clock');
        this.digitalClock = document.querySelector('.digital-clock');
        this.digitalTime = this.digitalClock.querySelector('time');
        this.timezoneDisplay = this.digitalClock.querySelector('.timezone');
        this.gridOverlay = document.querySelector('.grid-overlay');
        this.trailContainer = document.querySelector('.second-trail-container');
        
        // Clock dots
        this.centerDot = document.querySelector('.center-dot');
        this.hourDot = document.querySelector('.hour-dot');
        this.minuteDot = document.querySelector('.minute-dot');
        this.secondDot = document.querySelector('.second-dot');
        
        // Trail management
        this.trails = [];
        this.maxTrails = 6;
        this.trailInterval = 50; // ms between trails
        this.lastTrailTime = 0;
        
        // Audio setup
        this.setupAudio();
        
        // State
        this.isDigital = false;
        this.themes = ['theme-warm', 'theme-cool', 'theme-night', 'theme-paper', 'theme-chalk'];
        this.themeIndex = 0;
        this.isFocusMode = false;
        this.showGrid = false;
        this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        this.timezoneAbbr = this.getTimezoneAbbr();
        this.lastSecond = -1;
        this.lastAngle = 0;
        this.isTransitioning = false;

        // Animation state
        this.lastFrameTime = 0;
        this.animationFrame = null;
        this.dotScales = {
            hour: 1,
            minute: 1,
            second: 1
        };

        // Sound state
        this.isSoundEnabled = true;
        
        // Initialize
        this.setupEventListeners();
        this.startClock();
        this.checkTimeBasedTheme();
        
        // Add particle system
        this.setupParticles();
    }

    setupParticles() {
        this.particles = [];
        this.particleContainer = document.createElement('div');
        this.particleContainer.className = 'particle-container';
        this.particleContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
        `;
        document.body.appendChild(this.particleContainer);
    }

    createParticle(x, y, color) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: ${color};
            border-radius: 50%;
            pointer-events: none;
            opacity: 0.8;
            transform: translate(${x}px, ${y}px);
            transition: all 0.6s var(--transition-spring);
        `;
        this.particleContainer.appendChild(particle);
        
        // Animate particle
        setTimeout(() => {
            particle.style.transform = `translate(${x + (Math.random() - 0.5) * 100}px, ${y + (Math.random() - 0.5) * 100}px)`;
            particle.style.opacity = '0';
        }, 50);
        
        // Remove particle
        setTimeout(() => {
            particle.remove();
        }, 600);
    }

    emitParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.createParticle(x, y, color);
        }
    }

    getTimezoneAbbr() {
        const date = new Date();
        const options = { timeZoneName: 'short' };
        const timeParts = date.toLocaleTimeString('en-US', options).split(' ');
        return timeParts[timeParts.length - 1];
    }

    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleShortcut(e.key.toLowerCase());
        });

        // Click handlers for keyboard shortcuts
        document.querySelectorAll('.key-group').forEach(group => {
            const key = group.querySelector('kbd').textContent.toLowerCase();
            group.addEventListener('click', () => {
                this.handleShortcut(key);
                
                // Add click feedback
                const kbd = group.querySelector('kbd');
                kbd.style.transform = 'translateY(1px)';
                setTimeout(() => {
                    kbd.style.transform = '';
                }, 100);
            });
        });

        // Touch gestures
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
        });

        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndTime = Date.now();
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const deltaTime = touchEndTime - touchStartTime;

            if (deltaTime < 300) {
                if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 30) {
                    this.toggleMode();
                } else if (Math.abs(deltaY) > 50 && Math.abs(deltaX) < 30) {
                    this.cycleTheme();
                }
            }
        });

        // Check time-based theme periodically
        setInterval(() => this.checkTimeBasedTheme(), 60000);
    }

    handleShortcut(key) {
        switch(key) {
            case 'm':
                this.toggleMode();
                break;
            case 't':
                this.cycleTheme();
                break;
            case 'f':
                this.toggleFocusMode();
                break;
            case 'g':
                this.toggleGrid();
                break;
            case 's':
                this.toggleSound();
                break;
        }
    }

    toggleMode() {
        // Prevent rapid mode switching
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        this.isDigital = !this.isDigital;
        
        // Play mode switch sound
        this.playModeSound();
        
        if (this.isDigital) {
            this.analogClock.style.opacity = '0';
            this.analogClock.style.transform = 'translate(-50%, -50%) scale(0.9)';
            
            setTimeout(() => {
                this.analogClock.hidden = true;
                this.digitalClock.hidden = false;
                
                requestAnimationFrame(() => {
                    this.digitalClock.classList.add('visible');
                    setTimeout(() => {
                        this.isTransitioning = false;
                    }, 300);
                });
            }, 300);
        } else {
            this.digitalClock.classList.remove('visible');
            
            setTimeout(() => {
                this.digitalClock.hidden = true;
                this.analogClock.hidden = false;
                
                requestAnimationFrame(() => {
                    this.analogClock.style.opacity = '1';
                    this.analogClock.style.transform = 'translate(-50%, -50%) scale(1)';
                    setTimeout(() => {
                        this.isTransitioning = false;
                    }, 300);
                });
            }, 300);
        }

        this.showToast(this.isDigital ? 'Digital Mode' : 'Analog Mode');
    }

    cycleTheme() {
        const currentTheme = this.themes[this.themeIndex];
        document.body.classList.remove(currentTheme);
        
        // Get current dot color for particles
        const currentColor = getComputedStyle(document.body).getPropertyValue('--dot-color');
        
        // Validate and update theme index
        this.themeIndex = (this.themeIndex + 1) % this.themes.length;
        const newTheme = this.themes[this.themeIndex];
        
        // Create particles at clock center
        const rect = this.analogClock.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        this.emitParticles(centerX, centerY, currentColor, 15);
        
        // Apply new theme with transition
        requestAnimationFrame(() => {
            document.body.classList.add(newTheme);
            this.showToast(`Theme: ${newTheme.replace('theme-', '').replace('-', ' ')}`);
            
            // Update meta theme-color
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) {
                metaTheme.content = getComputedStyle(document.body).getPropertyValue('--bg-color').trim();
            }
        });
    }

    toggleFocusMode() {
        this.isFocusMode = !this.isFocusMode;
        document.body.classList.toggle('focus-mode', this.isFocusMode);
        
        if (this.isFocusMode) {
            // Enter fullscreen
            const element = document.documentElement;
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            }
            
            // Hide cursor after 2 seconds of no movement
            this.cursorTimeout = setTimeout(() => {
                document.body.style.cursor = 'none';
            }, 2000);
            
            // Reset cursor timeout on mouse movement
            this.mouseMoveHandler = () => {
                document.body.style.cursor = '';
                clearTimeout(this.cursorTimeout);
                this.cursorTimeout = setTimeout(() => {
                    document.body.style.cursor = 'none';
                }, 2000);
            };
            document.addEventListener('mousemove', this.mouseMoveHandler);
            
            // Handle ESC key
            this.escHandler = (e) => {
                if (e.key === 'Escape') {
                    this.exitFocusMode();
                }
            };
            document.addEventListener('keydown', this.escHandler);
            
            // Handle exit button click
            this.exitButton = document.querySelector('.exit-focus');
            if (this.exitButton) {
                this.exitButton.addEventListener('click', () => this.exitFocusMode());
            }
            
            this.showToast('Focus Mode On');
        } else {
            this.exitFocusMode();
        }
    }
    
    exitFocusMode() {
        if (!this.isFocusMode) return;
        
        this.isFocusMode = false;
        document.body.classList.remove('focus-mode');
        
        // Exit fullscreen with a promise-based approach
        const exitFullscreen = () => {
            return new Promise((resolve) => {
                if (document.fullscreenElement) {
                    document.exitFullscreen().then(resolve).catch(resolve);
                } else if (document.webkitFullscreenElement) {
                    document.webkitExitFullscreen();
                    resolve();
                } else if (document.msFullscreenElement) {
                    document.msExitFullscreen();
                    resolve();
                } else {
                    resolve();
                }
            });
        };

        // Execute cleanup in sequence
        exitFullscreen().then(() => {
            // Remove event listeners
            if (this.mouseMoveHandler) {
                document.removeEventListener('mousemove', this.mouseMoveHandler);
            }
            if (this.escHandler) {
                document.removeEventListener('keydown', this.escHandler);
            }
            
            // Reset cursor
            document.body.style.cursor = '';
            clearTimeout(this.cursorTimeout);
            
            // Force show keyboard controls
            const shortcuts = document.querySelector('.shortcuts');
            if (shortcuts) {
                shortcuts.style.removeProperty('display');
                shortcuts.style.removeProperty('opacity');
                shortcuts.style.visibility = 'visible';
            }

            // Reset any focus mode styles
            document.body.style.removeProperty('overflow');
            this.analogClock.style.removeProperty('transform');
            this.digitalClock.style.removeProperty('transform');

            // Show toast after everything is reset
            this.showToast('Focus Mode Off');
        });
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        document.body.classList.toggle('show-grid', this.showGrid);
        this.gridOverlay.setAttribute('aria-hidden', !this.showGrid);
        this.showToast(this.showGrid ? 'Grid Visible' : 'Grid Hidden');
    }

    checkTimeBasedTheme() {
        const hour = new Date().getHours();
        
        // Night mode (8 PM - 6 AM)
        if ((hour >= 20 || hour < 6) && !document.body.classList.contains('theme-night')) {
            this.themes.forEach(theme => document.body.classList.remove(theme));
            document.body.classList.add('theme-night');
            this.themeIndex = this.themes.indexOf('theme-night');
        }
        // Day mode (6 AM - 8 PM)
        else if (hour >= 6 && hour < 20 && document.body.classList.contains('theme-night')) {
            document.body.classList.remove('theme-night');
            this.themeIndex = 0; // Reset to first theme
            document.body.classList.add(this.themes[this.themeIndex]);
        }
    }

    showToast(message) {
        if (!this.toast) {
            this.toast = document.createElement('div');
            this.toast.className = 'toast';
            document.body.appendChild(this.toast);
        }

        // Remove existing show class and reset animation
        this.toast.classList.remove('show');
        void this.toast.offsetWidth; // Force reflow for animation reset

        this.toast.textContent = message;
        this.toast.classList.add('show');

        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            this.toast.classList.remove('show');
        }, 2000);
    }

    setupAudio() {
        try {
            // Initialize Web Audio API with error handling
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master volume control
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3; // Set default volume to 30%
            this.masterGain.connect(this.audioContext.destination);
            
            // Create different sounds
            this.createTickSound();
            this.createModeSound();
            this.createSecondSound();
        } catch (error) {
            console.warn('Audio initialization failed:', error);
            // Create dummy audio functions to prevent errors
            this.playTick = () => {};
            this.playModeSound = () => {};
            this.playSecondSound = () => {};
        }
    }

    setVolume(value) {
        if (this.masterGain) {
            // Clamp volume between 0 and 1
            const volume = Math.max(0, Math.min(1, value));
            this.masterGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        }
    }

    createTickSound() {
        const createTick = () => {
            if (!this.audioContext) return;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            // Configure oscillator for a more subtle tick
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1500, this.audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + 0.01);
            
            // Configure gain for a softer sound
            gain.gain.setValueAtTime(0.01, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + 0.05);
            
            // Connect nodes through master gain
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            // Start and stop
            osc.start(this.audioContext.currentTime);
            osc.stop(this.audioContext.currentTime + 0.05);
        };

        this.playTick = () => {
            if (this.audioContext && this.audioContext.state === 'running') {
                createTick();
            } else if (this.audioContext) {
                this.audioContext.resume().then(createTick).catch(console.warn);
            }
        };
    }

    createModeSound() {
        const createMode = () => {
            if (!this.audioContext) return;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            // Configure oscillator for a mode switch sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
            
            // Configure gain
            gain.gain.setValueAtTime(0.02, this.audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.02, this.audioContext.currentTime + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + 0.1);
            
            // Connect nodes through master gain
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            // Start and stop
            osc.start(this.audioContext.currentTime);
            osc.stop(this.audioContext.currentTime + 0.1);
        };

        this.playModeSound = () => {
            if (this.audioContext && this.audioContext.state === 'running') {
                createMode();
            } else if (this.audioContext) {
                this.audioContext.resume().then(createMode).catch(console.warn);
            }
        };
    }

    createSecondSound() {
        const createSecond = () => {
            if (!this.audioContext) return;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            // Configure oscillator for a very subtle movement sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2000, this.audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1800, this.audioContext.currentTime + 0.02);
            
            // Configure gain for an extremely soft sound
            gain.gain.setValueAtTime(0.005, this.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + 0.02);
            
            // Connect nodes through master gain
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            // Start and stop
            osc.start(this.audioContext.currentTime);
            osc.stop(this.audioContext.currentTime + 0.02);
        };

        this.playSecondSound = () => {
            if (this.audioContext && this.audioContext.state === 'running') {
                createSecond();
            } else if (this.audioContext) {
                this.audioContext.resume().then(createSecond).catch(console.warn);
            }
        };
    }

    createTrail(angle) {
        // Clean up old trails
        while (this.trails.length >= this.maxTrails) {
            const oldTrail = this.trails.shift();
            if (oldTrail && oldTrail.parentNode) {
                oldTrail.remove();
            }
        }

        const trail = document.createElement('div');
        trail.className = 'second-trail';
        trail.style.setProperty('--angle', `${angle}deg`);
        this.trailContainer.appendChild(trail);
        this.trails.push(trail);
        
        // Remove trail after animation
        setTimeout(() => {
            if (trail.parentNode) {
                trail.remove();
            }
            const index = this.trails.indexOf(trail);
            if (index > -1) {
                this.trails.splice(index, 1);
            }
        }, 800);
    }

    updateAnalogClock(now) {
        const hours = now.getHours() % 12;
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        const milliseconds = now.getMilliseconds();

        // Calculate angles with improved precision
        const hourAngle = ((hours + minutes / 60) * 30);
        const minuteAngle = ((minutes + seconds / 60) * 6);
        const secondAngle = ((seconds + milliseconds / 1000) * 6);

        // Handle trails
        const currentTime = Date.now();
        if (currentTime - this.lastTrailTime >= this.trailInterval && !this.isDigital) {
            this.createTrail(secondAngle);
            this.lastTrailTime = currentTime;
        }

        // Play sounds based on movement
        if (seconds !== this.lastSecond && !this.isDigital) {
            this.playTick();
            this.lastSecond = seconds;
        }

        if (Math.abs(secondAngle - this.lastAngle) > 1 && !this.isDigital) {
            this.playSecondSound();
        }
        this.lastAngle = secondAngle;

        // Update dot positions with smooth transitions
        requestAnimationFrame(() => {
            const hourTransform = `rotate(${hourAngle}deg) translateY(-100px) scale(${this.dotScales.hour})`;
            const minuteTransform = `rotate(${minuteAngle}deg) translateY(-120px) scale(${this.dotScales.minute})`;
            const secondTransform = `rotate(${secondAngle}deg) translateY(-140px) scale(${this.dotScales.second})`;

            this.hourDot.style.transform = hourTransform;
            this.minuteDot.style.transform = minuteTransform;
            this.secondDot.style.transform = secondTransform;

            if (seconds !== this.lastSecond) {
                this.dotScales.second = 1.2;
                setTimeout(() => {
                    this.dotScales.second = 1;
                    this.secondDot.style.transform = secondTransform;
                }, 100);
            }
        });
    }

    updateDigitalDisplay(now) {
        if (!this.digitalTime) return;
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const timeString = `${hours}:${minutes}:${seconds}`;
        this.digitalTime.textContent = timeString;
        this.digitalTime.setAttribute('datetime', now.toISOString());
        
        if (this.timezoneDisplay) {
            this.timezoneDisplay.textContent = this.timezoneAbbr;
        }
    }

    startClock() {
        const updateClock = () => {
            const now = new Date();
            
            if (!this.isDigital) {
                this.updateAnalogClock(now);
            }
            
            // Update digital display regardless of mode to keep it in sync
            this.updateDigitalDisplay(now);
            
            // Request next frame
            this.animationFrame = requestAnimationFrame(updateClock);
        };
        
        // Start the animation loop
        updateClock();
        
        // Check time-based theme periodically
        setInterval(() => this.checkTimeBasedTheme(), 60000);
    }

    toggleSound() {
        this.isSoundEnabled = !this.isSoundEnabled;
        
        // Set master gain volume based on sound state
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(
                this.isSoundEnabled ? 0.3 : 0, 
                this.audioContext.currentTime
            );
        }
        
        this.showToast(this.isSoundEnabled ? 'Sound On' : 'Sound Off');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const clock = new DieterClock();
}); 