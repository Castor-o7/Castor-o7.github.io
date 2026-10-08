/**
 * Noire Detective Portfolio — Interactions
 * Minimal, purposeful JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    // Smooth reveal on scroll
    initScrollReveal();
    
    // Parallax for geometric accents
    initParallax();
    
    // Active nav link highlighting
    initNavHighlight();
});

/**
 * Reveal elements as they enter viewport
 */
function initScrollReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const reveals = document.querySelectorAll('.case-card, .skill-category, .section-header');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add revealed class styles
    const style = document.createElement('style');
    style.textContent = `
        .revealed {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Subtle parallax on geometric accents
 */
function initParallax() {
    const geos = document.querySelectorAll('.geo');
    
    let ticking = false;
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrolled = window.pageYOffset;
                
                geos.forEach((geo, i) => {
                    const speed = 0.05 + (i * 0.02);
                    geo.style.transform = `translateY(${scrolled * speed}px) rotate(${45 + scrolled * 0.01}deg)`;
                });
                
                ticking = false;
            });
            
            ticking = true;
        }
    });
}

/**
 * Highlight active nav link based on scroll position
 */
function initNavHighlight() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(link => {
                    link.style.color = '';
                    if (link.getAttribute('href') === `#${entry.target.id}`) {
                        link.style.color = 'var(--accent)';
                    }
                });
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '-100px 0px -50% 0px'
    });

    sections.forEach(section => observer.observe(section));
}

/**
 * Typing effect for tagline (optional enhancement)
 * Uncomment to enable
 */
/*
function initTypingEffect() {
    const tagline = document.querySelector('.tagline');
    const text = tagline.textContent;
    tagline.textContent = '';
    
    let i = 0;
    const type = () => {
        if (i < text.length) {
            tagline.textContent += text.charAt(i);
            i++;
            setTimeout(type, 100);
        }
    };
    
    setTimeout(type, 500);
}
*/
