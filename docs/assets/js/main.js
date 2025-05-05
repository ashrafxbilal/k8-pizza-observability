// K8s Pizza Observability - Interactive Documentation

document.addEventListener('DOMContentLoaded', function() {
  // Initialize animation on scroll
  initAnimateOnScroll();
  
  // Initialize dark mode toggle
  initDarkModeToggle();
  
  // Add logo to header
  addLogoToHeader();
  
  // Add class to images
  enhanceImages();
  
  // Initialize interactive demo if present
  initInteractiveDemo();
  
  // Add favicon
  addFavicon();
});

/**
 * Initialize animation for elements when they scroll into view
 */
function initAnimateOnScroll() {
  const animatedElements = document.querySelectorAll('h2, h3, p, .card, img, pre, blockquote');
  
  // Add animation class to all elements that should animate
  animatedElements.forEach(el => {
    if (!el.classList.contains('animate-on-scroll')) {
      el.classList.add('animate-on-scroll');
    }
  });
  
  // Check which elements are visible on page load
  checkVisibility();
  
  // Check which elements are visible on scroll
  window.addEventListener('scroll', checkVisibility);
  
  function checkVisibility() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    animatedElements.forEach(el => {
      const elementTop = el.getBoundingClientRect().top;
      const elementVisible = 150;
      
      if (elementTop < window.innerHeight - elementVisible) {
        el.classList.add('visible');
      }
    });
  }
}

/**
 * Initialize dark mode toggle functionality
 */
function initDarkModeToggle() {
  // Create dark mode toggle button
  const darkModeToggle = document.createElement('div');
  darkModeToggle.className = 'dark-mode-toggle';
  darkModeToggle.setAttribute('role', 'button');
  darkModeToggle.setAttribute('aria-label', 'Toggle dark mode');
  darkModeToggle.setAttribute('tabindex', '0');
  darkModeToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
  document.body.appendChild(darkModeToggle);
  
  // Check for saved user preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }
  
  // Toggle dark mode on click
  darkModeToggle.addEventListener('click', toggleDarkMode);
  
  // Also toggle on keyboard enter/space
  darkModeToggle.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDarkMode();
    }
  });
  
  function toggleDarkMode() {
    document.body.classList.toggle('dark-theme');
    
    // Save user preference
    if (document.body.classList.contains('dark-theme')) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  }
}

/**
 * Add logo to the page header
 */
function addLogoToHeader() {
  const header = document.querySelector('.page-header');
  
  if (header) {
    // Create logo container
    const logoContainer = document.createElement('div');
    logoContainer.className = 'logo-container';
    
    // Create logo image
    const logo = document.createElement('img');
    logo.className = 'logo';
    logo.src = './assets/images/k8s-pizza-logo.svg';
    logo.alt = 'Kubernetes Pizza Observability Logo';
    
    // Add logo to container
    logoContainer.appendChild(logo);
    
    // Add container to header (before any other elements)
    header.insertBefore(logoContainer, header.firstChild);
  }
}

/**
 * Enhance images with classes and effects
 */
function enhanceImages() {
  // Add screenshot class to specific images
  const images = document.querySelectorAll('img');
  
  images.forEach(img => {
    // Check if image is a screenshot
    if (img.src.includes('slack-confirmation.jpeg') || 
        img.src.includes('kubectl.jpeg')) {
      img.classList.add('screenshot');
    }
  });
}

/**
 * Initialize interactive demo if present
 */
function initInteractiveDemo() {
  // Create a demo container
  const demoSection = document.createElement('div');
  demoSection.className = 'demo-container';
  demoSection.innerHTML = `
    <h3>Interactive CPU Load Simulator</h3>
    <p>See how the system would respond to different CPU load levels:</p>
    <div class="cpu-simulator">
      <div class="cpu-slider-container">
        <input type="range" min="0" max="100" value="50" class="cpu-slider" id="cpuSlider">
        <div class="cpu-value">CPU Load: <span id="cpuValue">50</span>%</div>
      </div>
      <div class="cpu-gauge">
        <svg viewBox="0 0 200 100">
          <path class="cpu-gauge-bg" d="M20,90 A70,70 0 0,1 180,90" fill="none" stroke="#eee" stroke-width="10" />
          <path id="cpuGaugeFill" d="M20,90 A70,70 0 0,1 180,90" fill="none" stroke="#2ED573" stroke-width="10" stroke-dasharray="251.2" stroke-dashoffset="125.6" />
          <text x="100" y="85" text-anchor="middle" class="cpu-gauge-text" id="cpuGaugeText">50%</text>
        </svg>
      </div>
      <div class="cpu-status" id="cpuStatus">Normal operation</div>
    </div>
  `;
  
  // Find a good place to insert the demo
  const insertPoint = document.querySelector('h2:contains("Workflow"), h2:contains("Components")');
  if (insertPoint) {
    insertPoint.parentNode.insertBefore(demoSection, insertPoint.nextSibling);
    
    // Initialize the CPU slider functionality
    setTimeout(() => {
      const cpuSlider = document.getElementById('cpuSlider');
      const cpuValue = document.getElementById('cpuValue');
      const cpuGaugeFill = document.getElementById('cpuGaugeFill');
      const cpuGaugeText = document.getElementById('cpuGaugeText');
      const cpuStatus = document.getElementById('cpuStatus');
      
      if (cpuSlider && cpuValue && cpuGaugeFill && cpuGaugeText && cpuStatus) {
        cpuSlider.addEventListener('input', function() {
          const value = this.value;
          cpuValue.textContent = value;
          cpuGaugeText.textContent = value + '%';
          
          // Calculate gauge fill
          const dashOffset = 251.2 - (value / 100 * 251.2);
          cpuGaugeFill.style.strokeDashoffset = dashOffset;
          
          // Change color based on value
          let color = '#2ED573';
          let statusText = 'Normal operation';
          
          if (value > 80) {
            color = '#FF4757';
            statusText = 'Alert triggered! Ordering pizza...';
          } else if (value > 60) {
            color = '#FFCC29';
            statusText = 'Warning: CPU load increasing';
          }
          
          cpuGaugeFill.style.stroke = color;
          cpuStatus.textContent = statusText;
          cpuStatus.style.color = color;
        });
      }
    }, 500);
  }
}

/**
 * Add favicon to the page
 */
function addFavicon() {
  const head = document.querySelector('head');
  
  if (head) {
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/svg+xml';
    favicon.href = './assets/images/k8s-pizza-logo.svg';
    
    head.appendChild(favicon);
  }
}

// Helper function to find elements by text content
Element.prototype.contains = function(text) {
  return this.textContent.includes(text);
};