// Fix for mobile viewport height (handles dynamic address bar)
function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Set on load and resize
setViewportHeight();
window.addEventListener('resize', setViewportHeight);

const HOMEPAGE_STATE = {
    navReady: false,
    projectsReady: false,
    scrollHighlightingReady: false,
    sectionRegistry: []
};

const BASE_SECTION_CONFIG = [
    { id: 'hero', label: 'Home', navTarget: 'hero', progressTarget: 'hero', includeInProgress: true },
    { id: 'about', label: 'About', navTarget: 'about', progressTarget: 'about', includeInProgress: true },
    { id: 'contact', label: 'Contact', navTarget: 'contact', progressTarget: 'contact', includeInProgress: true },
    { id: 'projects-grid', label: 'Projects', navTarget: 'projects-grid', progressTarget: 'projects-grid', includeInProgress: true },
    { id: 'blob-showcase', label: 'Blob Showcase', navTarget: 'projects-grid', progressTarget: 'projects-grid', includeInProgress: false }
];

const FEATURED_BLOB_PALETTE = ['#7A0A45', '#005A5E', '#6B2820', '#3E2C5A', '#0E4D92', '#6B3F00'];

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
    // Initialize navigation when nav component loads
    if (e.detail.containerId === 'nav-container') {
        setTimeout(() => {
            setupNavigation();
            HOMEPAGE_STATE.navReady = true;
            maybeInitScrollHighlighting();
        }, 50);
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

    // Note: setupScrollHighlighting is now called from loadProjects()
    // after featured sections are dynamically created
}

function getBaseSectionConfig(id) {
    return BASE_SECTION_CONFIG.find(section => section.id === id);
}

function createFeaturedSectionConfig(project, index) {
    return {
        id: `featured-${project.id}`,
        label: project.title,
        navTarget: 'hero',
        progressTarget: `featured-${project.id}`,
        includeInProgress: true,
        blobColor: project.blobColor || FEATURED_BLOB_PALETTE[index % FEATURED_BLOB_PALETTE.length],
        project
    };
}

function buildSectionRegistry(featuredProjects) {
    const hero = getBaseSectionConfig('hero');
    const about = getBaseSectionConfig('about');
    const contact = getBaseSectionConfig('contact');
    const projectsGrid = getBaseSectionConfig('projects-grid');
    const blobShowcase = getBaseSectionConfig('blob-showcase');

    return [
        hero,
        ...featuredProjects.map((project, index) => createFeaturedSectionConfig(project, index)),
        about,
        contact,
        projectsGrid,
        blobShowcase
    ];
}

function maybeInitScrollHighlighting() {
    if (!HOMEPAGE_STATE.navReady || !HOMEPAGE_STATE.projectsReady || HOMEPAGE_STATE.scrollHighlightingReady) {
        return;
    }

    const navLinks = document.querySelectorAll('.nav-link');
    if (!navLinks.length) {
        return;
    }

    setupScrollHighlighting(navLinks, HOMEPAGE_STATE.sectionRegistry);
    HOMEPAGE_STATE.scrollHighlightingReady = true;
}

function setupScrollHighlighting(navLinks, sectionRegistry) {
    const scrollContainer = document.querySelector('.scroll-container');
    const sectionsById = new Map(sectionRegistry.map(section => [section.id, section]));

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
                const sectionConfig = sectionsById.get(sectionId);
                const navTarget = sectionConfig ? sectionConfig.navTarget : null;

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
                        detail: {
                            section: sectionId,
                            progressSection: sectionConfig && sectionConfig.progressTarget ? sectionConfig.progressTarget : sectionId,
                            color: sectionConfig && sectionConfig.blobColor ? sectionConfig.blobColor : null
                        }
                    }));
                }
            }
        });
    }, observerOptions);

    // Observe all sections
    sectionRegistry.forEach(sectionConfig => {
        const section = document.getElementById(sectionConfig.id);
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

        // Get featured projects
        const featuredProjects = projectData.featured
            .map(id => projectData.projects.find(p => p.id === id))
            .filter(Boolean);

        // Get insertion point (after hero section, before about section)
        const heroSection = document.getElementById('hero');
        const aboutSection = document.getElementById('about');

        const sectionRegistry = buildSectionRegistry(featuredProjects);
        const featuredSections = sectionRegistry.filter(section => section.project);

        // Dynamically create and populate featured sections
        featuredSections.forEach((sectionConfig) => {
            const { project } = sectionConfig;
            // Create new section element
            const section = document.createElement('section');
            section.id = sectionConfig.id;
            section.className = 'snap-section featured-project';
            if (sectionConfig.blobColor) {
                section.dataset.blobColor = sectionConfig.blobColor;
            }
            section.dataset.projectId = project.id;

            // Populate with project content
            section.innerHTML = `
                <div class="featured-project-content">
                    <h2>${project.title}</h2>
                    <p>${project.shortDescription}</p>
                    <div class="project-actions">
                        ${project.actions.map(a => `<a href="${a.url}" class="project-btn${a.type === 'secondary' ? ' project-btn--secondary' : ''}" ${a.url && a.url.startsWith('#') ? `data-scroll-to="${a.url.slice(1)}"` : ''} ${a.url && !a.url.startsWith('#') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${a.text}</a>`).join('')}
                    </div>
                </div>
            `;

            // Insert before about section
            if (heroSection && aboutSection) {
                heroSection.parentNode.insertBefore(section, aboutSection);
            }
        });

        // Populate projects grid (workbench - works in progress, 2 columns)
        const grid = document.querySelector('.projects-grid');
        if (grid) {
            const visibleProjects = projectData.projects.filter(p => !p.hidden);
            grid.innerHTML = visibleProjects.map(project => `
                <div class="project-card">
                    <h3>${project.title}</h3>
                    <p>${project.shortDescription}</p>
                    <div class="project-actions">
                        ${project.actions.map(a => `<a href="${a.url}" class="project-btn${a.type === 'secondary' ? ' project-btn--secondary' : ''}" ${a.url && a.url.startsWith('#') ? `data-scroll-to="${a.url.slice(1)}"` : ''} ${a.url && !a.url.startsWith('#') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${a.text}</a>`).join('')}
                    </div>
                </div>
            `).join('');
        }

        // Handle scroll-to links (e.g. #blob-showcase)
        document.addEventListener('click', (e) => {
            const scrollLink = e.target.closest('[data-scroll-to]');
            if (scrollLink) {
                e.preventDefault();
                const el = document.getElementById(scrollLink.dataset.scrollTo);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
        });

        HOMEPAGE_STATE.sectionRegistry = sectionRegistry;
        HOMEPAGE_STATE.projectsReady = true;

        initProgressIndicator(sectionRegistry);
        maybeInitScrollHighlighting();

    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// Progress indicator - dynamically generated from the section registry
function initProgressIndicator(sectionRegistry) {
    const container = document.querySelector('.progress-indicator');
    if (!container) return;
    container.innerHTML = '';

    const sections = sectionRegistry.filter(section => section.includeInProgress);

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
        const sectionId = e.detail.progressSection || e.detail.section;
        const dots = container.querySelectorAll('.progress-dot');
        dots.forEach(dot => {
            dot.classList.toggle('active', dot.dataset.section === sectionId);
        });
    });
}
