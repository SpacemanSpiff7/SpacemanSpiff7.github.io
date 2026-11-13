import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
function harness(hash = '#blog') {
    const windowEvents = new Map();
    const documentEvents = new Map();
    const ids = new Map();
    const addEvent = events => (name, callback) => events.set(name, [...(events.get(name) || []), callback]);
    function element(tag) {
        const el = { tag, children: [], dataset: {}, className: '', attrs: {}, events: new Map(), textContent: '',
            appendChild(child) { child.parentElement = this; this.children.push(child); return child; },
            append(...children) { children.forEach(child => this.appendChild(child)); },
            setAttribute(name, value) { this.attrs[name] = value; },
            getAttribute(name) { return name === 'data-section' ? this.dataset.section : this.attrs[name]; },
            hasAttribute(name) { return name === 'data-section' ? this.dataset.section !== undefined : name in this.attrs; },
            querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
            querySelectorAll(selector) { return this.children.flatMap(child => [child, ...child.querySelectorAll('*')])
                .filter(child => selector === '*' || child.className.split(' ').includes(selector.slice(1))); }
        };
        el.addEventListener = addEvent(el.events);
        el.classList = { add(...names) { el.className += ' ' + names.join(' '); },
            remove(name) { el.className = el.className.split(' ').filter(item => item !== name).join(' '); } };
        return el;
    }
    const nav = element('ul');
    const scroll = { scrollTop: 0, scrollTo({ top }) { this.scrollTop = top; } };
    const blog = { scrollIntoView() { scroll.scrollTop = 3200; } };
    ids.set('blog', blog);
    const history = { state: { otherState: true }, replaceState(state) { this.state = state; } };
    const context = vm.createContext({ console, setTimeout, clearTimeout, history,
        location: { hash, href: 'https://example.com/' + hash }, requestAnimationFrame: callback => callback(),
        window: { innerHeight: 900, addEventListener: addEvent(windowEvents), matchMedia: () => ({ matches: false }) },
        document: { documentElement: { style: { setProperty() {} } }, addEventListener: addEvent(documentEvents),
            createElement: element, getElementById: id => ids.get(id),
            querySelector: selector => selector === '.scroll-container' ? scroll : selector === '.nav-links' ? nav : null,
            querySelectorAll: selector => nav.querySelectorAll(selector) }
    });
    vm.runInContext(source, context);
    return { context, nav, scroll, history, windowEvents, documentEvents };
}

test('homepage Blog scrolls to its section while explicit page links remain native', () => {
    const h = harness();
    const data = JSON.parse(fs.readFileSync(new URL('../data/projects.json', import.meta.url), 'utf8'));
    const homepage = { ...data.homepage,
        groupOrder: [...data.homepage.groupOrder, 'guide'],
        groupsById: { ...data.homepage.groupsById, guide: { label: 'Guide', href: '/tools/guide.html' } }
    };
    const registry = h.context.buildSectionRegistry(homepage, Object.fromEntries(data.projects.map(project => [project.id, project])));
    h.context.buildGroupedNav(homepage, registry);
    const links = h.nav.querySelectorAll('.nav-link');
    const home = links.find(link => link.textContent === 'Home');
    const blog = links.find(link => link.textContent === 'Blog');
    const guide = links.find(link => link.textContent === 'Guide');
    assert.equal(home.dataset.section, 'hero');
    assert.equal(blog.href, '#blog');
    assert.equal(blog.dataset.section, 'blog');
    let prevented = false;
    for (const callback of blog.events.get('click') || []) callback({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(h.scroll.scrollTop, 3200);
    assert.equal(guide.href, '/tools/guide.html');
    assert.equal(guide.dataset.section, undefined);
    prevented = false;
    for (const callback of guide.events.get('click') || []) callback({ preventDefault() { prevented = true; } });
    assert.equal(prevented, false);
});

test('direct portfolio links land on Blog and Back restores the inner scroll position', () => {
    const h = harness();
    h.context.setupHomepageHistory();
    assert.equal(h.scroll.scrollTop, 3200);
    h.scroll.scrollTop = 4850;
    for (const callback of h.windowEvents.get('pagehide')) callback();
    assert.equal(h.history.state.portfolioScrollTop, 4850);
    assert.equal(h.history.state.otherState, true);
    h.scroll.scrollTop = 0;
    for (const callback of h.windowEvents.get('pageshow')) callback();
    assert.equal(h.scroll.scrollTop, 4850);
    for (const callback of h.windowEvents.get('hashchange')) callback();
    assert.equal(h.scroll.scrollTop, 3200);
});

test('malformed and unknown hashes leave the page usable', () => {
    for (const hash of ['#%not-encoded', '#missing-section', '']) {
        const h = harness(hash);
        assert.doesNotThrow(() => h.context.setupHomepageHistory());
        assert.equal(h.scroll.scrollTop, 0);
    }
});
