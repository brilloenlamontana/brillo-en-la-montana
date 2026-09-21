import React, { useEffect, useRef } from 'react';

interface SnowEffectProps {
  particleCount?: number;
  className?: string;
}

export const SnowEffect: React.FC<SnowEffectProps> = ({
  particleCount = 90,
  className = 'fixed inset-0 pointer-events-none z-0',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: width / 2, y: height / 2, active: false };

    class Particle {
      x: number = 0;
      y: number = 0;
      radius: number = 1;
      speedY: number = 1;
      speedX: number = 0;
      opacity: number = 0.5;
      sway: number = 0.01;
      swayCounter: number = 0;
      isMystic: boolean = false;

      constructor(initialSpread = false) {
        this.reset(initialSpread);
      }

      reset(initialSpread = false) {
        this.x = Math.random() * width;
        this.y = initialSpread ? Math.random() * height : Math.random() * -height;
        this.radius = Math.random() * 2.5 + 0.8;
        this.speedY = Math.random() * 1.5 + 0.6;
        this.speedX = (Math.random() - 0.5) * 0.8;
        this.opacity = Math.random() * 0.7 + 0.25;
        this.sway = Math.random() * 0.02 + 0.005;
        this.swayCounter = Math.random() * Math.PI * 2;
        // ~12% chance of being a magical green/cyan aura spore from the Cumbre Beacon
        this.isMystic = Math.random() < 0.12;
      }

      update() {
        this.swayCounter += this.sway;
        this.x += this.speedX + Math.sin(this.swayCounter) * 0.5;
        this.y += this.speedY;

        // Subtle repulsion from cursor
        if (mouse.active) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            this.x += (dx / dist) * 1.5;
            this.y += (dy / dist) * 1.5;
          }
        }

        if (this.y > height + 10 || this.x < -20 || this.x > width + 20) {
          this.y = -10;
          this.x = Math.random() * width;
        }
      }

      draw(context: CanvasRenderingContext2D) {
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        if (this.isMystic) {
          context.fillStyle = `rgba(52, 211, 153, ${this.opacity * 0.9})`;
          context.shadowColor = '#34d399';
          context.shadowBlur = 8;
        } else {
          context.fillStyle = `rgba(240, 248, 255, ${this.opacity})`;
          context.shadowColor = 'transparent';
          context.shadowBlur = 0;
        }
        context.fill();
      }
    }

    let particles: Particle[] = [];

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(true));
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    initParticles();

    const renderLoop = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw(ctx);
      }
      animFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [particleCount]);

  return <canvas ref={canvasRef} className={className} />;
};
