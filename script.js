// Fix for mobile viewport height (handles dynamic address bar)
function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Set on load and resize
setViewportHeight();
window.addEventListener('resize', setViewportHeight);

// Component loading system
let loadedComponents = new Set();
const requiredComponents = ['nav-container'];

document.addEventListener('DOMContentLoaded', function() {
    // Skip if this is a standalone page
    if (window.SKIP_MAIN_SCRIPT) {
        return;
    }

    // Load navigation component
    if (document.getElementById('nav-container')) {
        loadComponent('nav-container', 'components/nav.html');
    }

    // Load projects data and populate sections
    loadProjects();
});

document.addEventListener('componentLoaded', function(e) {
    loadedComponents.add(e.detail.containerId);

    // Re-initialize navigation if nav component is loaded
    if (e.detail.containerId === 'nav-container') {
        setTimeout(setupNavigation, 50);
    }
});

function loadComponent(containerId, componentPath) {
    const container = document.getElementById(containerId);
    if (!container) {
        return;
    }

    fetch(componentPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;

            // Trigger custom event for component loaded
            const event = new CustomEvent('componentLoaded', {
                detail: { containerId, componentPath }
            });
            document.dispatchEvent(event);
        })
        .catch(error => {
            console.error(`Error loading component ${componentPath}:`, error);
        });
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const navToggle = document.querySelector('.nav-toggle');
    const navLinksContainer = document.querySelector('.nav-links');

    // Mobile navigation toggle
    if (navToggle && navLinksContainer) {
        const toggleMenu = (e) => {
            e.preventDefault();
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', !isExpanded);
            navLinksContainer.classList.toggle('active');
        };

        navToggle.addEventListener('click', toggleMenu);
        navToggle.addEventListener('touchstart', toggleMenu, { passive: false });

        // Close mobile menu when clicking on a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navLinksContainer.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navLinksContainer.contains(e.target)) {
                navLinksContainer.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Simple navigation - scroll to section IDs
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (!link.hasAttribute('data-section')) {
                return;
            }

            e.preventDefault();

            const targetSection = link.getAttribute('data-section');
            const section = document.getElementById(targetSection);

            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });

                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });

    // Logo navigation - scroll to hero section
    const navLogo = document.querySelector('.nav-logo');
    if (navLogo) {
        navLogo.addEventListener('click', (e) => {
            e.preventDefault();
            const heroSection = document.getElementById('hero');
            if (heroSection) {
                heroSection.scrollIntoView({ behavior: 'smooth' });

                // Update active state to home
                navLinks.forEach(l => l.classList.remove('active'));
                const homeLink = document.querySelector('.nav-link[data-section="hero"]');
                if (homeLink) {
                    homeLink.classList.add('active');
                }
            }
        });
    }

    // Set up scroll-based nav highlighting
    setupScrollHighlighting(navLinks);
}

function setupScrollHighlighting(navLinks) {
    const scrollContainer = document.querySelector('.scroll-container');

    // Map sections to nav items
    // Hero + featured-1,2,3,4 → 'hero' (Home)
    // about → 'about'
    // contact → 'contact'
    // projects-grid → 'projects-grid'
    const sectionToNav = {
        'hero': 'hero',
        'featured-1': 'hero',
        'featured-2': 'hero',
        'featured-3': 'hero',
        'featured-4': 'hero',
        'about': 'about',
        'contact': 'contact',
        'projects-grid': 'projects-grid'
    };

    // Create Intersection Observer
    // Use scrollContainer if it exists, otherwise use viewport (null = viewport)
    const observerOptions = {
        root: scrollContainer || null,
        rootMargin: '-40% 0px -40% 0px',  // Trigger when section is in middle 20%
        threshold: 0
    };

    let currentSection = 'hero';

    let currentBlobSection = 'hero';

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                const navTarget = sectionToNav[sectionId];

                // Update nav highlighting (based on nav target)
                if (navTarget && navTarget !== currentSection) {
                    currentSection = navTarget;

                    navLinks.forEach(link => {
                        const linkSection = link.getAttribute('data-section');
                        if (linkSection === navTarget) {
                            link.classList.add('active');
                        } else {
                            link.classList.remove('active');
                        }
                    });
                }

                // Notify animations.js of section change (using actual section ID)
                if (sectionId !== currentBlobSection) {
                    currentBlobSection = sectionId;
                    window.dispatchEvent(new CustomEvent('sectionChanged', {
                        detail: { section: sectionId }
                    }));
                }
            }
        });
    }, observerOptions);

    // Observe all sections
    Object.keys(sectionToNav).forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            observer.observe(section);
        }
    });
}

// Load and populate projects
async function loadProjects() {
    try {
        const response = await fetch('data/projects.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const projectData = await response.json();

        // Populate featured projects (one per section)
        const featuredProjects = projectData.projects.filter(project =>
            projectData.featured.includes(project.id)
        );

        featuredProjects.forEach((project, index) => {
            const section = document.getElementById(`featured-${index + 1}`);
            if (section) {
                section.innerHTML = `
                    <h2>${project.title}</h2>
                    <p>${project.shortDescription}</p>
                    <div class="tags">
                        ${project.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    <a href="${project.actions[0].url}"
                       class="link-btn"
                       ${project.actions[0].external ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                        ${project.actions[0].text}
                    </a>
                `;
            }
        });

        // Populate projects grid (all projects, 2 columns)
        const grid = document.querySelector('.projects-grid');
        if (grid) {
            grid.innerHTML = projectData.projects.map(project => `
                <div class="project-card">
                    <h3>${project.title}</h3>
                    <p>${project.shortDescription}</p>
                    <a href="${project.actions[0].url}"
                       class="link-btn"
                       ${project.actions[0].external ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                        ${project.actions[0].text}
                    </a>
                </div>
            `).join('');
        }

        // Initialize progress indicator with dynamic featured count
        initProgressIndicator(featuredProjects.length);

    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Progress indicator - dynamically generated based on projects.json
function initProgressIndicator(featuredCount) {
    const container = document.querySelector('.progress-indicator');
    if (!container) return;

    // Build sections array dynamically
    const sections = [
        { id: 'hero', label: 'Home' }
    ];

    // Add featured sections based on projects.json count
    for (let i = 1; i <= featuredCount; i++) {
        sections.push({ id: `featured-${i}`, label: `Featured ${i}` });
    }

    sections.push(
        { id: 'about', label: 'About' },
        { id: 'contact', label: 'Contact' },
        { id: 'projects-grid', label: 'Projects' }
    );

    // Create line
    const line = document.createElement('div');
    line.className = 'progress-line';
    container.appendChild(line);

    // Create dots
    sections.forEach((section, index) => {
        const dot = document.createElement('button');
        dot.className = 'progress-dot' + (index === 0 ? ' active' : '');
        dot.dataset.section = section.id;
        dot.setAttribute('aria-label', section.label);
        dot.addEventListener('click', () => {
            const el = document.getElementById(section.id);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        });
        container.appendChild(dot);
    });

    // Listen to section changes (dispatched by setupScrollHighlighting)
    window.addEventListener('sectionChanged', (e) => {
        const sectionId = e.detail.section;
        const dots = container.querySelectorAll('.progress-dot');
        dots.forEach(dot => {
            dot.classList.toggle('active', dot.dataset.section === sectionId);
        });
    });
}

// Performance optimization: Lazy load images
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('img[loading="lazy"]');

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }
});

// Handle window resize
window.addEventListener('resize', function() {
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        // Any resize-dependent logic here
    }, 250);
});

// Error handling
window.addEventListener('error', function(e) {
    console.error('Application error:', e.error);
});
