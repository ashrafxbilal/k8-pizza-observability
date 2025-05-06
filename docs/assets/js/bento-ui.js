/**
 * Bento UI JavaScript for K8s Pizza Observability
 * Modern, Gen-Z inspired interactive elements
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize all components
  initThemeToggle();
  initCustomCursor();
  initScrollAnimations();
  initEmojiReactions();
  initTooltips();
});

/**
 * Theme Toggle Functionality
 */
function initThemeToggle() {
  // Create theme toggle button if it doesn't exist
  if (!document.querySelector('.theme-toggle')) {
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = '🌙'; // Default to dark mode icon
    themeToggle.setAttribute('aria-label', 'Toggle dark mode');
    document.body.appendChild(themeToggle);

    // Check for saved theme preference or respect OS preference
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
      document.body.classList.add('dark-theme');
      themeToggle.innerHTML = '☀️';
    } else {
      themeToggle.innerHTML = '🌙';
    }

    // Toggle theme on click
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      
      if (document.body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '☀️';
      } else {
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '🌙';
      }
    });
  }
}

/**
 * Custom Cursor Effect
 */
function initCustomCursor() {
  // Create custom cursor element if it doesn't exist
  if (!document.querySelector('.custom-cursor')) {
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);

    // Update cursor position on mouse move
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    });

    // Scale cursor on interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .card, .emoji-reaction');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
        cursor.style.mixBlendMode = 'difference';
      });
      
      el.addEventListener('mouseleave', () => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursor.style.mixBlendMode = 'difference';
      });
    });

    // Hide cursor when leaving window
    document.addEventListener('mouseout', (e) => {
      if (e.relatedTarget === null) {
        cursor.style.opacity = '0';
      }
    });

    document.addEventListener('mouseover', () => {
      cursor.style.opacity = '1';
    });
  }
}

/**
 * Scroll Animations
 */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  animatedElements.forEach(el => {
    observer.observe(el);
  });
}

/**
 * Emoji Reactions
 */
function initEmojiReactions() {
  const reactionContainers = document.querySelectorAll('.emoji-reactions');
  
  reactionContainers.forEach(container => {
    const reactions = container.querySelectorAll('.emoji-reaction');
    
    reactions.forEach(reaction => {
      reaction.addEventListener('click', () => {
        // Toggle active state
        reaction.classList.toggle('active');
        
        // Update count if it exists
        const countEl = reaction.querySelector('.count');
        if (countEl) {
          let count = parseInt(countEl.textContent);
          if (reaction.classList.contains('active')) {
            count++;
          } else {
            count = Math.max(0, count - 1);
          }
          countEl.textContent = count;
        }
        
        // Add a little bounce animation
        reaction.style.animation = 'none';
        setTimeout(() => {
          reaction.style.animation = 'bounce 0.5s';
        }, 10);
      });
    });
  });
  
  // Add bounce animation to stylesheet if it doesn't exist
  if (!document.querySelector('#emoji-animations')) {
    const style = document.createElement('style');
    style.id = 'emoji-animations';
    style.textContent = `
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Tooltips
 */
function initTooltips() {
  // No additional initialization needed as tooltips use CSS
  // This function is a placeholder for potential future enhancements
}

/**
 * Create Bento Grid Layout
 * This function can be called to convert regular content into a bento grid
 */
function createBentoGrid(selector, options = {}) {
  const container = document.querySelector(selector);
  if (!container) return;
  
  // Default options
  const defaults = {
    columns: 3,
    gap: '1.5rem',
    featured: true
  };
  
  const settings = {...defaults, ...options};
  
  // Add bento grid class
  container.classList.add(settings.featured ? 'bento-grid-featured' : 'bento-grid');
  container.style.gap = settings.gap;
  
  // Get all direct children
  const children = Array.from(container.children);
  
  // Add card class to all children if they don't have it
  children.forEach((child, index) => {
    if (!child.classList.contains('card')) {
      child.classList.add('card');
    }
    
    // Add animation delay for staggered entrance
    child.classList.add('animate-on-scroll');
    child.style.transitionDelay = `${index * 0.1}s`;
    
    // Add random emoji to cards without explicit emoji
    if (!child.hasAttribute('data-emoji')) {
      const emojis = ['🍕', '🚀', '⚡', '🔥', '✨', '🛠️', '🧩', '🎮', '🎯', '🎨'];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      child.setAttribute('data-emoji', randomEmoji);
      child.classList.add('card-emoji');
    }
  });
  
  // Make first child featured if option is enabled
  if (settings.featured && children.length > 0) {
    children[0].classList.add('card-featured');
  }
}