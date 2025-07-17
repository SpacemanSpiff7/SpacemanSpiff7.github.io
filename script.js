// Component loading system
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, starting component loading...');
    
    // Load components
    loadComponent('nav-container', 'components/nav.html');
    loadComponent('home-container', 'components/home.html');
    loadComponent('projects-container', 'components/projects.html');
    loadComponent('about-container', 'components/about.html');
    loadComponent('contact-container', 'components/contact.html');
    
    // Initialize after components are loaded with a longer delay
    setTimeout(initializeApp, 200);
});

function loadComponent(containerId, componentPath) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with id '${containerId}' not found`);
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

function initializeApp() {
    console.log('Initializing app...');
    
    // Navigation functionality
    setupNavigation();
    
    // Shopping research tool functionality
    setupShoppingTool();
    
    // Smooth scrolling
    setupSmoothScrolling();
    
    // Intersection Observer for animations
    setupAnimations();
    
    // Copy functionality
    setupCopyButtons();
    
    console.log('App initialization complete');
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    const navToggle = document.querySelector('.nav-toggle');
    const navLinksContainer = document.querySelector('.nav-links');
    
    // Mobile navigation toggle
    if (navToggle && navLinksContainer) {
        navToggle.addEventListener('click', () => {
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', !isExpanded);
            navLinksContainer.classList.toggle('active');
        });
        
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
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetSection = link.getAttribute('data-section');
            
            // Remove active class from all nav links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked nav link and target section
            link.classList.add('active');
            const targetElement = document.getElementById(targetSection);
            if (targetElement) {
                targetElement.classList.add('active');
                
                // Smooth scroll to section
                targetElement.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Handle direct navigation to sections
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        setTimeout(() => {
            const targetLink = document.querySelector(`[data-section="${hash}"]`);
            if (targetLink) {
                targetLink.click();
            }
        }, 100);
    }
}

function setupShoppingTool() {
    const form = document.getElementById('shopping-form');
    const resultContainer = document.getElementById('result-container');
    const promptOutput = document.getElementById('prompt-output');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    if (!form) return;
    
    // Generate button functionality
    generateBtn.addEventListener('click', function() {
        generatePrompt();
    });
    
    // Clear button functionality
    clearBtn.addEventListener('click', function() {
        clearForm();
    });
    
    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        generatePrompt();
    });
    
    function generatePrompt() {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Show loading state
        generateBtn.textContent = 'Generating...';
        generateBtn.disabled = true;
        
        // Generate the prompt
        const prompt = createShoppingPrompt(data);
        
        // Display result with animation
        setTimeout(() => {
            promptOutput.textContent = prompt;
            resultContainer.style.display = 'block';
            resultContainer.scrollIntoView({ behavior: 'smooth' });
            
            // Reset button
            generateBtn.textContent = 'Generate Prompt';
            generateBtn.disabled = false;
        }, 500);
    }
    
    function clearForm() {
        form.reset();
        promptOutput.textContent = '';
        resultContainer.style.display = 'none';
    }
    
    function createShoppingPrompt(data) {
        const {
            product_type,
            budget_range,
            specific_features,
            use_case,
            quality_preference,
            timeline,
            additional_requirements
        } = data;
        
        let prompt = `I need help researching the best ${product_type} within a budget of ${budget_range}. `;
        
        if (specific_features) {
            prompt += `Key features I'm looking for include: ${specific_features}. `;
        }
        
        if (use_case) {
            prompt += `Primary use case: ${use_case}. `;
        }
        
        if (quality_preference) {
            prompt += `Quality preference: ${quality_preference}. `;
        }
        
        if (timeline) {
            prompt += `Timeline: ${timeline}. `;
        }
        
        if (additional_requirements) {
            prompt += `Additional requirements: ${additional_requirements}. `;
        }
        
        prompt += `\n\nPlease provide:\n`;
        prompt += `1. Top 3-5 recommendations with pros/cons\n`;
        prompt += `2. Price comparison across different retailers\n`;
        prompt += `3. Best time to buy (if applicable)\n`;
        prompt += `4. Alternative options to consider\n`;
        prompt += `5. Quality control checkpoints for final decision\n`;
        prompt += `6. Warranty and return policy considerations\n`;
        prompt += `7. User reviews and reliability data\n`;
        prompt += `8. Future-proofing considerations\n`;
        
        return prompt;
    }
}

function setupSmoothScrolling() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            
            // Skip if href is just "#" (invalid selector)
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function setupAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.card, .preview-card, .contact-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

function setupCopyButtons() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('copy-btn')) {
            const output = document.getElementById('prompt-output');
            if (output && output.textContent.trim()) {
                navigator.clipboard.writeText(output.textContent).then(() => {
                    // Show copied state
                    e.target.textContent = 'Copied!';
                    e.target.classList.add('copied');
                    
                    setTimeout(() => {
                        e.target.textContent = 'Copy';
                        e.target.classList.remove('copied');
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                });
            }
        }
    });
}

// Handle component loading events
document.addEventListener('componentLoaded', function(e) {
    const { containerId } = e.detail;
    
    // Re-initialize navigation if nav component is loaded
    if (containerId === 'nav-container') {
        setTimeout(setupNavigation, 50);
    }
    
    // Re-initialize shopping tool if home component is loaded
    if (containerId === 'home-container') {
        setTimeout(setupShoppingTool, 50);
    }
});

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

// Handle window resize for responsive design
window.addEventListener('resize', function() {
    // Debounce resize events
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        // Recalculate any layout-dependent elements
        setupAnimations();
    }, 250);
});

// Add loading states and error handling
window.addEventListener('error', function(e) {
    console.error('Application error:', e.error);
});

// Service Worker registration for PWA capabilities (commented out until sw.js is created)
// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', function() {
//         navigator.serviceWorker.register('/sw.js')
//             .then(function(registration) {
//                 console.log('SW registered: ', registration);
//             })
//             .catch(function(registrationError) {
//                 console.log('SW registration failed: ', registrationError);
//             });
//     });
// }
