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
    groupedNavReady: false,
    sectionRegistry: [],
    homepage: null
};

const FEATURED_BLOB_PALETTE = ['#7A0A45', '#005A5E', '#6B2820', '#3E2C5A', '#0E4D92', '#6B3F00'];
const MOBILE_FEATURED_MEDIA_QUERY = '(max-width: 768px)';

// ==========================================
// LINK SETS — code-owned markup for contact/about links
// ==========================================
const LINK_SETS = {
    aboutLinks: [
        {
            href: 'tools/guide.html',
            label: 'Guide to this website',
            icon: '<svg class="contact-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
            text: 'Guide to This Website'
        }
    ],
    contactLinks: [
        {
            href: 'mailto:contact@simonelongo.com',
            label: 'Email',
            external: true,
            icon: '<svg class="contact-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>',
            text: 'contact@simonelongo.com'
        },
        {
            href: 'https://github.com/SpacemanSpiff7',
            label: 'GitHub',
            external: true,
            icon: '<svg class="contact-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>',
            text: 'GitHub'
        },
        {
            href: 'https://www.linkedin.com/in/simone-longo-a9849892/',
            label: 'LinkedIn',
            external: true,
            icon: '<svg class="contact-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M8 11v5"/><path d="M8 8v.01"/><path d="M12 16v-5"/><path d="M16 16v-3a2 2 0 0 0-4 0"/></svg>',
            text: 'LinkedIn'
        },
        {
            href: 'https://www.instagram.com/smoneylongo/',
            label: 'Instagram',
            external: true,
            icon: '<svg class="contact-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r=".5"/></svg>',
            text: 'Instagram'
        }
    ]
};

// ==========================================
// SECTION TYPE RENDERERS
// ==========================================

function renderLinkSet(linkSetId, wrapperClass) {
    const links = LINK_SETS[linkSetId];
    if (!links || !links.length) return '';

    const cls = wrapperClass || (linkSetId === 'contactLinks' ? 'contact-links' : '');
    const linksHtml = links.map(link => {
        const externalAttrs = link.external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${link.href}" class="link-btn" aria-label="${link.label}"${externalAttrs}>${link.icon}<span class="link-btn-label">${link.text}</span></a>`;
    }).join('\n                ');

    if (cls) {
        return `<div class="${cls}">\n                ${linksHtml}\n            </div>`;
    }
    return linksHtml;
}

function renderProjectFeatureSection(sectionConfig, project, sectionId, blobColor) {
    const bodyId = `${sectionId}-body`;
    const section = document.createElement('section');
    section.id = sectionId;
    section.className = 'snap-section featured-project';
    if (blobColor) {
        section.dataset.blobColor = blobColor;
    }
    section.dataset.projectId = project.id;

    section.innerHTML = `
                <div class="featured-project-content">
                    <h2 class="featured-project-heading">
                        <button class="featured-project-toggle" type="button" aria-expanded="true" aria-controls="${bodyId}">
                            <span class="featured-project-title">${project.title}</span>
                            <span class="featured-project-caret" aria-hidden="true">+</span>
                        </button>
                    </h2>
                    <div class="featured-project-body" id="${bodyId}">
                        <p>${project.shortDescription}</p>
                        <div class="project-actions">
                            ${project.actions.map(a => `<a href="${a.url}" class="project-btn${a.type === 'secondary' ? ' project-btn--secondary' : ''}" ${a.url && a.url.startsWith('#') ? `data-scroll-to="${a.url.slice(1)}"` : ''} ${a.url && !a.url.startsWith('#') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${a.text}</a>`).join('')}
                        </div>
                    </div>
                </div>
            `;
    return section;
}

function renderTextSection(sectionConfig, sectionId) {
    const section = document.createElement('section');
    section.id = sectionId;
    section.className = 'snap-section';

    let linkHtml = '';
    if (sectionConfig.linkSetId) {
        linkHtml = renderLinkSet(sectionConfig.linkSetId);
    }

    section.innerHTML = `
            <h2 class="section-title">${sectionConfig.title}</h2>
            <p class="section-text">${sectionConfig.body}</p>
            ${linkHtml}
        `;
    return section;
}

function renderLinkListSection(sectionConfig, sectionId) {
    const section = document.createElement('section');
    section.id = sectionId;
    section.className = 'snap-section';

    let linkHtml = '';
    if (sectionConfig.linkSetId) {
        linkHtml = renderLinkSet(sectionConfig.linkSetId);
    }

    section.innerHTML = `
            <h2 class="section-title">${sectionConfig.title}</h2>
            <p class="section-text">${sectionConfig.body}</p>
            ${linkHtml}
        `;
    return section;
}

// ==========================================
// CONFIG-DRIVEN SECTION REGISTRY BUILDER
// ==========================================

function buildSectionRegistry(homepage, projectsMap) {
    const registry = [];
    let featuredIndex = 0;

    homepage.sectionOrder.forEach(sectionId => {
        const sectionConfig = homepage.sectionsById[sectionId];
        if (!sectionConfig) {
            console.warn(`Section "${sectionId}" not found in sectionsById`);
            return;
        }

        const entry = {
            id: sectionId,
            label: sectionConfig.title || sectionConfig.navSubLabel || '',
            navTarget: null,
            progressTarget: sectionId,
            includeInProgress: sectionConfig.showDot !== false,
            blobColor: null,
            shapeId: sectionConfig.shapeId || 'defaultBlob',
            groupId: sectionConfig.groupId,
            showInSubnav: sectionConfig.showInSubnav || false,
            sectionConfig
        };

        switch (sectionConfig.type) {
            case 'hero':
                entry.label = 'Home';
                entry.navTarget = 'hero';
                break;

            case 'projectFeature': {
                const project = projectsMap[sectionConfig.projectId];
                if (!project) {
                    console.warn(`Project "${sectionConfig.projectId}" not found for section "${sectionId}"`);
                    return;
                }
                entry.label = sectionConfig.navSubLabel || project.title;
                entry.navTarget = 'hero'; // Featured sections highlight Home in old nav
                entry.blobColor = sectionConfig.blobColor || project.blobColor || FEATURED_BLOB_PALETTE[featuredIndex % FEATURED_BLOB_PALETTE.length];
                entry.project = project;
                featuredIndex++;
                break;
            }

            case 'text':
                entry.label = sectionConfig.title;
                entry.navTarget = sectionId;
                break;

            case 'linkList':
                entry.label = sectionConfig.title;
                entry.navTarget = sectionId;
                break;

            default:
                console.warn(`Unknown section type "${sectionConfig.type}" for "${sectionId}"`);
                return;
        }

        registry.push(entry);
    });

    // Append hardcoded terminal sections
    registry.push({
        id: 'projects-grid',
        label: 'Workbench',
        navTarget: 'projects-grid',
        progressTarget: 'projects-grid',
        includeInProgress: true,
        blobColor: null,
        shapeId: 'defaultBlob',
        groupId: 'workbench',
        showInSubnav: false
    });
    registry.push({
        id: 'blob-showcase',
        label: 'Blob Showcase',
        navTarget: 'projects-grid',
        progressTarget: 'blob-showcase',
        includeInProgress: true,
        blobColor: null,
        shapeId: 'defaultBlob',
        groupId: 'workbench',
        showInSubnav: false
    });

    return registry;
}

// ==========================================
// FEATURED SECTION COLLAPSE (mobile)
// ==========================================

function isMobileFeaturedLayout() {
    return window.matchMedia(MOBILE_FEATURED_MEDIA_QUERY).matches;
}

function setFeaturedSectionExpandedState(section, expanded) {
    const toggle = section.querySelector('.featured-project-toggle');
    const body = section.querySelector('.featured-project-body');

    if (!toggle || !body) {
        return;
    }

    section.classList.toggle('is-collapsed', !expanded);
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    body.hidden = !expanded;
}

function syncFeaturedSectionCollapseState() {
    const featuredSections = document.querySelectorAll('.featured-project');

    featuredSections.forEach((section) => {
        setFeaturedSectionExpandedState(section, true);
    });
}

function initFeaturedSectionCollapse() {
    syncFeaturedSectionCollapseState();

    document.addEventListener('click', (e) => {
        const toggle = e.target.closest('.featured-project-toggle');
        if (!toggle || !isMobileFeaturedLayout()) {
            return;
        }

        const section = toggle.closest('.featured-project');
        if (!section) {
            return;
        }

        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        setFeaturedSectionExpandedState(section, !isExpanded);
    });

    const mediaQuery = window.matchMedia(MOBILE_FEATURED_MEDIA_QUERY);
    const handleViewportChange = () => syncFeaturedSectionCollapseState();

    if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleViewportChange);
    } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleViewportChange);
    }
}

// ==========================================
// COMPONENT LOADING
// ==========================================

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

// ==========================================
// DOM CONTENT LOADED
// ==========================================

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
    // When nav shell loads, mark ready and try to build grouped nav if projects are also ready
    if (e.detail.containerId === 'nav-container') {
        setTimeout(() => {
            HOMEPAGE_STATE.navReady = true;
            maybeInitGroupedNav();
            maybeInitScrollHighlighting();
        }, 50);
    }
});

// ==========================================
// NAVIGATION SETUP
// ==========================================

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

        // Close mobile menu when clicking on a link (but not subnav parent toggles)
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                // Don't close menu if this link's parent has a subnav (accordion toggle)
                const parentGroup = link.closest('.nav-group');
                if (parentGroup && parentGroup.querySelector('.nav-subnav')) return;
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
                if (targetSection === 'hero') {
                    window.dispatchEvent(new CustomEvent('scrollToTop'));
                }
                section.scrollIntoView({ behavior: 'smooth' });

                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                if (typeof sa === 'function') sa('nav_click', { link_target: targetSection, nav_type: 'main' });
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
                window.dispatchEvent(new CustomEvent('scrollToTop'));
                heroSection.scrollIntoView({ behavior: 'smooth' });

                if (typeof sa === 'function') sa('nav_click', { link_target: 'hero', nav_type: 'logo' });
                // Update active state to home
                navLinks.forEach(l => l.classList.remove('active'));
                const homeLink = document.querySelector('.nav-link[data-section="hero"]');
                if (homeLink) {
                    homeLink.classList.add('active');
                }
            }
        });
    }
}

// ==========================================
// GROUPED NAV BUILDER
// ==========================================

function buildGroupedNav(homepage, sectionRegistry) {
    const navLinksContainer = document.querySelector('.nav-links');
    if (!navLinksContainer) return;

    // Clear existing nav items
    navLinksContainer.innerHTML = '';

    const { groupOrder, groupsById } = homepage;

    // Build a map of groupId -> registry entries with showInSubnav
    const subnavByGroup = new Map();
    sectionRegistry.forEach(entry => {
        if (entry.showInSubnav) {
            if (!subnavByGroup.has(entry.groupId)) {
                subnavByGroup.set(entry.groupId, []);
            }
            subnavByGroup.get(entry.groupId).push(entry);
        }
    });

    // Find the first section ID in each group for click-to-scroll
    const firstSectionByGroup = new Map();
    sectionRegistry.forEach(entry => {
        if (!firstSectionByGroup.has(entry.groupId)) {
            firstSectionByGroup.set(entry.groupId, entry.id);
        }
    });

    groupOrder.forEach(groupId => {
        const group = groupsById[groupId];
        if (!group) return;

        const li = document.createElement('li');
        li.className = 'nav-group';
        li.dataset.groupId = groupId;

        const firstSectionId = firstSectionByGroup.get(groupId) || groupId;

        const a = document.createElement('a');
        a.href = '#';
        a.className = 'nav-link';
        a.dataset.section = firstSectionId;
        a.textContent = group.label;
        if (groupId === 'home') {
            a.classList.add('active');
            a.setAttribute('aria-current', 'page');
        }
        li.appendChild(a);

        // Add subnav if group has hasSubnav and there are subnav items
        const subnavItems = subnavByGroup.get(groupId);
        if (group.hasSubnav && subnavItems && subnavItems.length > 0) {
            const subnavUl = document.createElement('ul');
            subnavUl.className = 'nav-subnav';

            subnavItems.forEach(entry => {
                const subLi = document.createElement('li');
                const subA = document.createElement('a');
                subA.href = '#';
                subA.className = 'nav-subnav-link';
                subA.dataset.section = entry.id;
                subA.textContent = entry.label;
                subLi.appendChild(subA);
                subnavUl.appendChild(subLi);
            });

            li.appendChild(subnavUl);

            // Desktop only: hover to expand (touch devices use click toggle)
            li.addEventListener('mouseenter', () => {
                if (!window.matchMedia(MOBILE_FEATURED_MEDIA_QUERY).matches) {
                    li.classList.add('subnav-open');
                }
            });
            li.addEventListener('mouseleave', () => {
                if (!window.matchMedia(MOBILE_FEATURED_MEDIA_QUERY).matches) {
                    li.classList.remove('subnav-open');
                }
            });

            // Mobile: click group label always toggles accordion, never scrolls
            a.addEventListener('click', (e) => {
                if (window.matchMedia(MOBILE_FEATURED_MEDIA_QUERY).matches) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    // Close other open subnavs
                    navLinksContainer.querySelectorAll('.nav-group.subnav-open').forEach(g => {
                        if (g !== li) g.classList.remove('subnav-open');
                    });
                    li.classList.toggle('subnav-open');
                }
            });

            // Subnav link click handlers
            subnavUl.querySelectorAll('.nav-subnav-link').forEach(subLink => {
                subLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = subLink.dataset.section;
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                        if (typeof sa === 'function') sa('nav_click', { link_target: targetId, nav_type: 'subnav' });
                    }
                    // Close mobile menu
                    const navToggle = document.querySelector('.nav-toggle');
                    if (navToggle) {
                        navLinksContainer.classList.remove('active');
                        navToggle.setAttribute('aria-expanded', 'false');
                    }
                    li.classList.remove('subnav-open');
                });
            });
        }

        navLinksContainer.appendChild(li);
    });

    // Set up navigation event handlers now that links exist
    setupNavigation();
}

// ==========================================
// SCROLL HIGHLIGHTING
// ==========================================

function maybeInitGroupedNav() {
    if (!HOMEPAGE_STATE.navReady || !HOMEPAGE_STATE.projectsReady || HOMEPAGE_STATE.groupedNavReady) {
        return;
    }
    if (!HOMEPAGE_STATE.homepage) return;

    buildGroupedNav(HOMEPAGE_STATE.homepage, HOMEPAGE_STATE.sectionRegistry);
    HOMEPAGE_STATE.groupedNavReady = true;
    maybeInitScrollHighlighting();
}

function maybeInitScrollHighlighting() {
    if (!HOMEPAGE_STATE.navReady || !HOMEPAGE_STATE.projectsReady || !HOMEPAGE_STATE.groupedNavReady || HOMEPAGE_STATE.scrollHighlightingReady) {
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
    let currentSection = 'hero';
    let currentBlobSection = '';
    let currentGroupId = 'home';
    const sectionElements = sectionRegistry
        .map(sectionConfig => ({
            config: sectionConfig,
            element: document.getElementById(sectionConfig.id)
        }))
        .filter(section => section.element);

    function applySectionState(sectionConfig) {
        if (!sectionConfig) {
            return;
        }

        // Group-based nav highlighting
        const groupId = sectionConfig.groupId || 'home';
        if (groupId !== currentGroupId) {
            currentGroupId = groupId;

            // Highlight top-level nav group
            document.querySelectorAll('.nav-group').forEach(g => {
                const link = g.querySelector('.nav-link');
                if (link) {
                    link.classList.toggle('active', g.dataset.groupId === groupId);
                }
            });
        }

        // Subnav highlighting
        document.querySelectorAll('.nav-subnav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === sectionConfig.id);
        });

        if (sectionConfig.id !== currentBlobSection) {
            currentBlobSection = sectionConfig.id;
            window.dispatchEvent(new CustomEvent('sectionChanged', {
                detail: {
                    section: sectionConfig.id,
                    progressSection: sectionConfig.progressTarget || sectionConfig.id,
                    color: sectionConfig.blobColor || null,
                    shapeId: sectionConfig.shapeId || 'defaultBlob'
                }
            }));
            if (typeof sa === 'function') {
                clearTimeout(window._sectionDwellTimer);
                window._sectionDwellTimer = setTimeout(function() {
                    sa('section_visible', { section_id: sectionConfig.id, section_type: sectionConfig.type || '', section_index: sectionConfig._index || 0 });
                }, 500);
            }
        }
    }

    function getViewportMidpoint() {
        if (scrollContainer) {
            return scrollContainer.scrollTop + (scrollContainer.clientHeight / 2);
        }

        return window.scrollY + (window.innerHeight / 2);
    }

    function updateActiveSection() {
        if (!sectionElements.length) {
            return;
        }

        const viewportMidpoint = getViewportMidpoint();
        let nearestSection = sectionElements[0];
        let nearestDistance = Infinity;

        sectionElements.forEach(section => {
            // For very tall sections (carousel), use top edge + 1vh as the
            // anchor point so it only activates when viewport is actually there
            const effectiveHeight = Math.min(section.element.offsetHeight, window.innerHeight);
            const sectionMidpoint = section.element.offsetTop + (effectiveHeight / 2);
            const distance = Math.abs(sectionMidpoint - viewportMidpoint);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestSection = section;
            }
        });

        applySectionState(nearestSection.config);
    }

    let ticking = false;

    function requestSectionUpdate() {
        if (ticking) {
            return;
        }

        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            updateActiveSection();
        });
    }

    const scrollTarget = scrollContainer || window;
    scrollTarget.addEventListener('scroll', requestSectionUpdate, { passive: true });
    window.addEventListener('resize', requestSectionUpdate);

    // When carousel exits, reset cached section so we re-dispatch sectionChanged
    window.addEventListener('carouselExited', () => {
        currentBlobSection = '';
        requestSectionUpdate();
    });

    requestSectionUpdate();
}

// ==========================================
// LOAD PROJECTS — config-driven from homepage registry
// ==========================================

async function loadProjects() {
    try {
        const response = await fetch('data/projects.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const projectData = await response.json();

        // Build project lookup map
        const projectsMap = {};
        projectData.projects.forEach(p => { projectsMap[p.id] = p; });

        const homepage = projectData.homepage;
        if (!homepage) {
            console.error('No homepage config found in projects.json');
            return;
        }

        // Remove hardcoded about and contact sections from DOM
        const aboutSection = document.getElementById('about');
        const contactSection = document.getElementById('contact');
        if (aboutSection) aboutSection.remove();
        if (contactSection) contactSection.remove();

        // Build section registry from config
        const sectionRegistry = buildSectionRegistry(homepage, projectsMap);

        // Get insertion point (before projects-grid)
        const projectsGrid = document.getElementById('projects-grid');

        // Render each section from config
        homepage.sectionOrder.forEach(sectionId => {
            if (sectionId === 'hero') return; // Hero is pre-built in HTML

            const sectionConfig = homepage.sectionsById[sectionId];
            if (!sectionConfig) return;

            const registryEntry = sectionRegistry.find(e => e.id === sectionId);
            if (!registryEntry) return;

            let sectionEl;

            switch (sectionConfig.type) {
                case 'projectFeature': {
                    const project = projectsMap[sectionConfig.projectId];
                    if (!project) return;
                    sectionEl = renderProjectFeatureSection(sectionConfig, project, sectionId, registryEntry.blobColor);
                    break;
                }
                case 'text':
                    sectionEl = renderTextSection(sectionConfig, sectionId);
                    break;
                case 'linkList':
                    sectionEl = renderLinkListSection(sectionConfig, sectionId);
                    break;
                default:
                    return;
            }

            if (sectionEl && projectsGrid) {
                projectsGrid.parentNode.insertBefore(sectionEl, projectsGrid);
            }
        });

        // Populate projects grid (workbench)
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

            // Analytics: track link clicks in featured, project cards, and contact sections
            if (typeof sa === 'function') {
                const link = e.target.closest('a');
                if (link) {
                    const featured = link.closest('.featured-project');
                    if (featured) {
                        sa('featured_click', { project_id: featured.dataset.projectId || '', action_type: link.classList.contains('project-btn--secondary') ? 'secondary' : 'primary', action_url: link.getAttribute('href') || '' });
                    } else {
                        const card = link.closest('.project-card');
                        if (card) {
                            sa('project_card_click', { project_id: card.querySelector('h3')?.textContent || '', action_url: link.getAttribute('href') || '' });
                        } else {
                            const contact = link.closest('.contact-links');
                            if (contact) {
                                var href = link.getAttribute('href') || '';
                                var linkType = href.startsWith('mailto:') ? 'email' : href.includes('github') ? 'github' : href.includes('linkedin') ? 'linkedin' : href.includes('instagram') ? 'instagram' : 'other';
                                sa('contact_click', { link_type: linkType });
                            }
                        }
                    }
                }
            }
        });

        HOMEPAGE_STATE.sectionRegistry = sectionRegistry;
        HOMEPAGE_STATE.homepage = homepage;
        HOMEPAGE_STATE.projectsReady = true;


        // Build grouped nav (deferred until nav shell is also ready)
        maybeInitGroupedNav();

        initFeaturedSectionCollapse();
        initProgressIndicator(sectionRegistry);
        maybeInitScrollHighlighting();

        // Recalculate carousel layout now that dynamic sections are in the DOM
        if (typeof window.recalcCarouselLayout === 'function') {
            window.recalcCarouselLayout();
        }

    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// ==========================================
// PROGRESS INDICATOR
// ==========================================

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
            if (el) {
                if (section.id === 'hero') {
                    window.dispatchEvent(new CustomEvent('scrollToTop'));
                }
                el.scrollIntoView({ behavior: 'smooth' });
                if (typeof sa === 'function') sa('progress_dot_click', { target_section: section.id });
            }
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
