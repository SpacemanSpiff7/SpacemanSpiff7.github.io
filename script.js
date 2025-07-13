// Component loading functionality
async function loadComponent(componentName) {
    try {
        const response = await fetch(`components/${componentName}.html`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        return html;
    } catch (error) {
        console.error(`Error loading component ${componentName}:`, error);
        return '';
    }
}

// Load all components on page load
async function loadAllComponents() {
    const components = ['nav', 'home', 'projects', 'about', 'contact'];
    
    for (const component of components) {
        const html = await loadComponent(component);
        if (html) {
            // Insert component into the appropriate place
            if (component === 'nav') {
                document.body.insertAdjacentHTML('afterbegin', html);
            } else {
                document.getElementById('main-content').insertAdjacentHTML('beforeend', html);
            }
        }
    }
    
    // Initialize navigation after components are loaded
    initializeNavigation();
    addKeyboardNavigation();
    addSmoothScrolling();
}

// Navigation functionality with improved accessibility and performance
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetSection = link.getAttribute('data-section');
            if (!targetSection) return;
            
            // Update navigation state
            updateActiveSection(targetSection);
            
            // Update URL hash for bookmarking
            history.pushState(null, null, `#${targetSection}`);
        });
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', function() {
        const hash = window.location.hash.slice(1) || 'home';
        updateActiveSection(hash);
    });

    // Handle direct links with hash
    if (window.location.hash) {
        const hash = window.location.hash.slice(1);
        if (document.getElementById(hash)) {
            updateActiveSection(hash);
        }
    }
}

function updateActiveSection(sectionId) {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    const targetSection = document.getElementById(sectionId);
    
    if (!targetSection) return;

    // Remove active class from all nav links and sections
    navLinks.forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
    });
    sections.forEach(section => {
        section.classList.remove('active');
        section.setAttribute('aria-hidden', 'true');
    });
    
    // Add active class to clicked nav link and target section
    const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        activeLink.setAttribute('aria-current', 'page');
    }
    
    targetSection.classList.add('active');
    targetSection.removeAttribute('aria-hidden');
    
    // Focus management for accessibility
    targetSection.focus();
}

function addKeyboardNavigation() {
    // Add keyboard navigation for cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.setAttribute('tabindex', '0');
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const link = card.querySelector('a');
                if (link) {
                    link.click();
                }
            }
        });
    });
}

function addSmoothScrolling() {
    // Smooth scroll to sections when navigating
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetSection = this.getAttribute('data-section');
            const section = document.getElementById(targetSection);
            
            if (section) {
                setTimeout(() => {
                    section.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }, 100);
            }
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadAllComponents);

// Add loading states and error handling
window.addEventListener('error', function(e) {
    console.error('Page error:', e.error);
    // Could add user-friendly error messaging here
});

// Add performance monitoring
window.addEventListener('load', function() {
    // Log performance metrics
    if ('performance' in window) {
        const perfData = performance.getEntriesByType('navigation')[0];
        console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
    }
});
