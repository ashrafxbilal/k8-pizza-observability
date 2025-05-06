/**
 * Bento UI JavaScript for K8s Pizza Observability
 * Modern Gen-Z inspired interactive elements
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize all components
  initThemeToggle();
  initCustomCursor();
  initCopyButtons();
  initReactions();
  initAnimations();
});

/**
 * Theme Toggle Functionality
 */
function initThemeToggle() {
  const themeToggle = document.querySelector('.theme-toggle');
  
  // Check for saved theme preference or respect OS preference
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
    document.body.classList.add('dark-mode');
  }

  // Toggle theme on click
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  });
}

/**
 * Custom Cursor Effect
 */
function initCustomCursor() {
  const cursor = document.querySelector('.cursor');
  const cursorFollower = document.querySelector('.cursor-follower');
  
  if (!cursor || !cursorFollower) return;
  
  document.addEventListener('mousemove', (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
    cursor.style.opacity = '1';
    
    // Follower has a slight delay for smooth effect
    setTimeout(() => {
      cursorFollower.style.left = `${e.clientX}px`;
      cursorFollower.style.top = `${e.clientY}px`;
      cursorFollower.style.opacity = '1';
    }, 80);
  });
  
  // Add active class on interactive elements
  const interactiveElements = document.querySelectorAll('a, button, .bento-item, .reaction, .copy-btn');
  
  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('active');
      cursorFollower.classList.add('active');
    });
    
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('active');
      cursorFollower.classList.remove('active');
    });
  });
  
  // Hide cursor when leaving window
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget && !e.toElement) {
      cursor.style.opacity = '0';
      cursorFollower.style.opacity = '0';
    }
  });
  
  // Show cursor when entering window
  document.addEventListener('mouseover', () => {
    cursor.style.opacity = '1';
    cursorFollower.style.opacity = '1';
  });
  
  // Hide default cursor
  document.body.style.cursor = 'none';
  
  // But show default cursor on mobile/touch devices
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.body.style.cursor = 'auto';
    cursor.style.display = 'none';
    cursorFollower.style.display = 'none';
  }
}

/**
 * Copy Button Functionality
 */
function initCopyButtons() {
  const copyButtons = document.querySelectorAll('.copy-btn');
  
  copyButtons.forEach(button => {
    button.addEventListener('click', () => {
      const codeBlock = button.closest('.code-block').querySelector('code');
      const textToCopy = codeBlock.textContent;
      
      navigator.clipboard.writeText(textToCopy).then(() => {
        // Visual feedback
        button.classList.add('copied');
        
        // Reset after 2 seconds
        setTimeout(() => {
          button.classList.remove('copied');
        }, 2000);
      });
    });
  });
}

/**
 * Emoji Reactions
 */
function initReactions() {
  const reactions = document.querySelectorAll('.reaction');
  
  reactions.forEach(reaction => {
    reaction.addEventListener('click', () => {
      // Toggle active state
      reaction.classList.toggle('active');
      
      // Update count
      const countEl = reaction.querySelector('.count');
      let count = parseInt(countEl.textContent);
      
      if (reaction.classList.contains('active')) {
        count++;
      } else {
        count = Math.max(0, count - 1);
      }
      
      countEl.textContent = count;
      
      // Add a little bounce animation
      reaction.style.animation = 'none';
      setTimeout(() => {
        reaction.style.animation = 'pulse 0.5s';
      }, 10);
    });
  });
}

/**
 * Scroll Animations
 */
function initAnimations() {
  // Simple implementation of AOS (Animate On Scroll)
  const animatedElements = document.querySelectorAll('[data-aos]');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('aos-animate');
      }
    });
  }, { threshold: 0.1 });
  
  animatedElements.forEach(el => {
    // Add delay if specified
    if (el.dataset.aosDelay) {
      el.style.transitionDelay = `${parseInt(el.dataset.aosDelay)}ms`;
    }
    
    observer.observe(el);
  });
}