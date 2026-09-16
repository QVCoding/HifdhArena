// =====================================================================
// Quran Tester - shared picker module
// =====================================================================
// Used by: minimaltest.html, irab.html, commonphrase.html, occurrencetest.html
// (and their -ar.html Arabic counterparts, where they exist)
//
// Include with a plain <script src="quran-picker.js"></script> - no
// build step, no modules. Everything lives under the global
// QuranPicker object so it can't clash with each page's own variables
// or function names.
//
// This module only touches elements it's told about via the option
// objects passed in below, so each app keeps its own element ids,
// markup, and wording (including language) - nothing here is
// hardcoded to one app's structure or text.
// =====================================================================

const QuranPicker = (function () {

    // =====================================================================
    // Metadata loading (app_quran_metadata.xml -> {suras, juzs, pages})
    // =====================================================================

    async function loadMetadataXML(url) {
        url = url || 'app_quran_metadata.xml';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Could not fetch ' + url + ' (HTTP ' + response.status + ')');
        }
        const text = await response.text();
        const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');

        const metadata = { suras: [], juzs: [], pages: [] };

        xmlDoc.querySelectorAll('sura').forEach(sura => {
            metadata.suras.push({
                index: parseInt(sura.getAttribute('index')),
                name: sura.getAttribute('name'),
                ayas: sura.hasAttribute('ayas') ? parseInt(sura.getAttribute('ayas')) : undefined,
                start: sura.hasAttribute('start') ? parseInt(sura.getAttribute('start')) : undefined
            });
        });
        xmlDoc.querySelectorAll('juz').forEach(juz => {
            metadata.juzs.push({
                index: parseInt(juz.getAttribute('index')),
                sura: parseInt(juz.getAttribute('sura')),
                aya: parseInt(juz.getAttribute('aya'))
            });
        });
        xmlDoc.querySelectorAll('page').forEach(page => {
            metadata.pages.push({
                index: parseInt(page.getAttribute('index')),
                sura: parseInt(page.getAttribute('sura')),
                aya: parseInt(page.getAttribute('aya'))
            });
        });

        // Defensive sort - the ranges below assume ascending sura/aya order.
        metadata.suras.sort((a, b) => a.index - b.index);
        metadata.juzs.sort((a, b) => a.sura - b.sura || a.aya - b.aya);
        metadata.pages.sort((a, b) => a.sura - b.sura || a.aya - b.aya);

        return metadata;
    }

    // Binary search (assumes the list is sorted ascending by sura/aya).
    function findRangeIndex(list, sura, aya) {
        let lo = 0, hi = list.length - 1, result = 1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            const item = list[mid];
            if (sura > item.sura || (sura === item.sura && aya >= item.aya)) {
                result = item.index;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        return result;
    }

    function findJuz(metadata, sura, aya) { return findRangeIndex(metadata.juzs, sura, aya); }
    function findPage(metadata, sura, aya) { return findRangeIndex(metadata.pages, sura, aya); }

    // =====================================================================
    // Loading indicator (animated dots on elements with class "loading-dots")
    // =====================================================================

    let loadingDotsInterval = null;
    let loadingDotsCount = 0;

    function tickLoadingDots() {
        loadingDotsCount = (loadingDotsCount % 3) + 1;
        const dots = '.'.repeat(loadingDotsCount);
        document.querySelectorAll('.loading-dots').forEach(el => { el.textContent = dots; });
    }

    function startLoadingAnimation() {
        if (loadingDotsInterval) return;
        tickLoadingDots();
        loadingDotsInterval = setInterval(tickLoadingDots, 500);
    }

    function stopLoadingAnimation() {
        if (loadingDotsInterval) {
            clearInterval(loadingDotsInterval);
            loadingDotsInterval = null;
        }
    }

    // =====================================================================
    // Select-all checkbox wiring
    // =====================================================================

    // Wires a "select all" checkbox to a group of checkboxes sharing
    // itemClass, keeping the "select all" box in sync when items are
    // toggled individually. Safe to call even if allId isn't on the page.
    function wireSelectAll(allId, itemClass) {
        const allBox = document.getElementById(allId);
        if (!allBox) return;
        allBox.addEventListener('change', () => {
            document.querySelectorAll('.' + itemClass).forEach(cb => { cb.checked = allBox.checked; });
        });
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains(itemClass)) {
                const all = document.querySelectorAll('.' + itemClass);
                const checked = document.querySelectorAll('.' + itemClass + ':checked');
                allBox.checked = (all.length === checked.length);
            }
        });
    }

    // =====================================================================
    // Populate the Surah / Juz checkbox lists
    // =====================================================================

    // opts:
    //   surahListId, juzListId  - ids of the containers to fill (default 'surah-list'/'juz-list')
    //   surahClass, juzClass    - class for each checkbox (default 'surah-cb'/'juz-cb')
    //   surahLabelHTML(sura)    - returns the HTML to put after the checkbox for a surah (optional)
    //   juzLabelHTML(juzNumber) - returns the HTML to put after the checkbox for a juz (optional)
    //
    // The label-building callbacks let each app keep its own exact
    // wording and language - this module never hardcodes any text.
    function populateSurahAndJuzLists(metadata, opts) {
        opts = opts || {};
        const surahClass = opts.surahClass || 'surah-cb';
        const juzClass = opts.juzClass || 'juz-cb';

        const surahList = document.getElementById(opts.surahListId || 'surah-list');
        if (surahList) {
            surahList.innerHTML = '';
            metadata.suras.forEach(sura => {
                const label = document.createElement('label');
                const inner = opts.surahLabelHTML
                    ? opts.surahLabelHTML(sura)
                    : ('<span>' + sura.index + '. ' + sura.name + '</span>');
                label.innerHTML = '<input type="checkbox" class="' + surahClass + '" value="' + sura.index + '" checked>' + inner;
                surahList.appendChild(label);
            });
        }

        const juzList = document.getElementById(opts.juzListId || 'juz-list');
        if (juzList) {
            juzList.innerHTML = '';
            for (let i = 1; i <= 30; i++) {
                const label = document.createElement('label');
                const inner = opts.juzLabelHTML ? opts.juzLabelHTML(i) : ('<span>Juz ' + i + '</span>');
                label.innerHTML = '<input type="checkbox" class="' + juzClass + '" value="' + i + '" checked>' + inner;
                juzList.appendChild(label);
            }
        }
    }

    // =====================================================================
    // Page range parsing/validation
    // =====================================================================

    // Parses text like "1-10,15,450-500".
    // Returns: null if the text is blank (meaning "no restriction"),
    // undefined if the text is present but invalid, or an array of page
    // numbers if valid. Language-independent - no strings to translate.
    function parsePageRange(rangeText) {
        rangeText = (rangeText || '').trim();
        if (rangeText === '') return null;

        // Only digits, commas, dashes and whitespace are allowed.
        if (/[^0-9,\-\s]/.test(rangeText)) return undefined;

        const pages = new Set();
        for (let part of rangeText.split(',')) {
            part = part.trim();
            if (part === '') continue;

            if (part.includes('-')) {
                const rangeParts = part.split('-');
                if (rangeParts.length !== 2) return undefined;
                const startStr = rangeParts[0].trim(), endStr = rangeParts[1].trim();
                if (!/^[0-9]+$/.test(startStr) || !/^[0-9]+$/.test(endStr)) return undefined;
                const start = parseInt(startStr), end = parseInt(endStr);
                if (start < 1 || end > 604 || start > end) return undefined;
                for (let i = start; i <= end; i++) pages.add(i);
            } else {
                if (!/^[0-9]+$/.test(part)) return undefined;
                const page = parseInt(part);
                if (page < 1 || page > 604) return undefined;
                pages.add(page);
            }
        }

        if (pages.size === 0) return undefined;
        return Array.from(pages);
    }

    // =====================================================================
    // Core picker UI wiring (tabs, portion-type toggle, page-range field,
    // select-all boxes)
    // =====================================================================

    // opts:
    //   portionTypeName   - name of the "entire Quran / select portion" radio group.
    //                       Omit this if the app always shows the tabs with no such
    //                       toggle (e.g. commonphrase.html).
    //   filterOptionsId   - id of the box to show/hide on portion-type change
    //                       (only used if portionTypeName is given; default 'filter-options')
    //   pageRangeId       - id of the page-range text input (default 'page-range')
    //   pageRangeErrorId  - id of the element to show/hide on invalid input (default 'page-range-error')
    //   surahSelectAllId, surahClass, juzSelectAllId, juzClass - as elsewhere in this module
    function wireCorePickerUI(opts) {
        opts = opts || {};
        const pageRangeId = opts.pageRangeId || 'page-range';
        const pageRangeErrorId = opts.pageRangeErrorId || 'page-range-error';
        const surahClass = opts.surahClass || 'surah-cb';
        const juzClass = opts.juzClass || 'juz-cb';

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const panel = document.getElementById('tab-' + btn.dataset.tab);
                if (panel) panel.classList.add('active');
            });
        });

        if (opts.portionTypeName) {
            document.querySelectorAll('input[name="' + opts.portionTypeName + '"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const box = document.getElementById(opts.filterOptionsId || 'filter-options');
                    if (box) box.style.display = (e.target.value === 'select') ? 'block' : 'none';
                });
            });
        }

        const pageRangeInput = document.getElementById(pageRangeId);
        const pageRangeError = document.getElementById(pageRangeErrorId);
        if (pageRangeInput) {
            pageRangeInput.addEventListener('input', () => {
                // Don't validate while the person is still typing (e.g.
                // mid-way through "5-10") - just clear any existing error.
                if (pageRangeError) pageRangeError.style.display = 'none';
            });
            pageRangeInput.addEventListener('blur', (e) => {
                const pages = parsePageRange(e.target.value);
                if (pageRangeError) pageRangeError.style.display = (pages === undefined) ? 'block' : 'none';
            });
        }

        wireSelectAll(opts.surahSelectAllId || 'surah-select-all', surahClass);
        wireSelectAll(opts.juzSelectAllId || 'juz-select-all', juzClass);
    }

    // =====================================================================
    // Filtering a list of records by the current Surah/Juz/Page selection
    // =====================================================================

    // sourceArray: array of records, each with .sura, .juz, and .page fields.
    // opts:
    //   portionTypeName - as above; omit if there's no "entire Quran" toggle
    //   surahClass, juzClass, pageRangeId - as above
    // Returns [] if the current tab's selection is empty/invalid (caller
    // is expected to validate the page-range field separately before
    // calling this, same as the existing apps already do).
    function getFilteredByPortion(sourceArray, opts) {
        opts = opts || {};
        const surahClass = opts.surahClass || 'surah-cb';
        const juzClass = opts.juzClass || 'juz-cb';
        const pageRangeId = opts.pageRangeId || 'page-range';

        if (opts.portionTypeName) {
            const portionType = document.querySelector('input[name="' + opts.portionTypeName + '"]:checked');
            if (portionType && portionType.value === 'entire') return sourceArray;
        }

        const activeTabBtn = document.querySelector('.tab-btn.active');
        const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : null;

        if (activeTab === 'surah') {
            const selected = new Set(Array.from(document.querySelectorAll('.' + surahClass + ':checked')).map(cb => parseInt(cb.value)));
            if (selected.size === 0) return [];
            return sourceArray.filter(item => selected.has(item.sura));
        } else if (activeTab === 'juz') {
            const selected = new Set(Array.from(document.querySelectorAll('.' + juzClass + ':checked')).map(cb => parseInt(cb.value)));
            if (selected.size === 0) return [];
            return sourceArray.filter(item => selected.has(item.juz));
        } else if (activeTab === 'page') {
            const pages = parsePageRange(document.getElementById(pageRangeId).value);
            if (pages === undefined) return [];
            if (pages === null) return sourceArray;
            const pageSet = new Set(pages);
            return sourceArray.filter(item => pageSet.has(item.page));
        }

        return sourceArray;
    }

    // =====================================================================
    // Generic settings persistence (save/restore a settings panel to
    // localStorage under a storage key of the caller's choosing)
    // =====================================================================

    // fields: array of descriptors, each one of:
    //   { key, type: 'checkbox', id }
    //   { key, type: 'text', id }
    //   { key, type: 'radioGroup', name }
    //   { key, type: 'checkboxGroup', class }
    //   { type: 'activeTab' }   - remembers which .tab-btn/.tab-panel pair is active
    //
    // Any element that doesn't exist on the page is silently skipped, so
    // the same field list can be reused on a page that only has some of
    // the fields (or given a different field list per app entirely).
    //
    // Each app must be given its own, distinct storageKey - sharing one
    // key across apps would mean their saved settings overwrite each
    // other.
    function createSettingsStore(storageKey, fields) {

        function save() {
            const settings = {};
            fields.forEach(field => {
                if (field.type === 'checkbox') {
                    const el = document.getElementById(field.id);
                    if (el) settings[field.key] = el.checked;
                } else if (field.type === 'text') {
                    const el = document.getElementById(field.id);
                    if (el) settings[field.key] = el.value;
                } else if (field.type === 'radioGroup') {
                    const checked = document.querySelector('input[name="' + field.name + '"]:checked');
                    if (checked) settings[field.key] = checked.value;
                } else if (field.type === 'checkboxGroup') {
                    const boxes = document.querySelectorAll('.' + field.class);
                    if (boxes.length > 0) {
                        settings[field.key] = Array.from(boxes).filter(cb => cb.checked).map(cb => cb.value);
                    }
                } else if (field.type === 'activeTab') {
                    const activeBtn = document.querySelector('.tab-btn.active');
                    if (activeBtn) settings.activeTab = activeBtn.dataset.tab;
                }
            });
            try {
                localStorage.setItem(storageKey, JSON.stringify(settings));
            } catch (e) {
                console.warn('Could not save settings to localStorage.', e);
            }
        }

        function load() {
            try {
                const raw = localStorage.getItem(storageKey);
                return raw ? JSON.parse(raw) : null;
            } catch (e) {
                return null;
            }
        }

        // Applies previously-saved settings to whichever relevant elements
        // currently exist in the DOM. Safe to call more than once (e.g.
        // once early, and again after a checkbox list has been populated).
        function apply(settings) {
            if (!settings) return;

            fields.forEach(field => {
                if (field.type === 'checkbox') {
                    const el = document.getElementById(field.id);
                    if (el && typeof settings[field.key] === 'boolean') el.checked = settings[field.key];
                } else if (field.type === 'text') {
                    const el = document.getElementById(field.id);
                    if (el && typeof settings[field.key] === 'string') el.value = settings[field.key];
                } else if (field.type === 'radioGroup') {
                    if (typeof settings[field.key] === 'string') {
                        document.querySelectorAll('input[name="' + field.name + '"]').forEach(r => {
                            r.checked = (r.value === settings[field.key]);
                        });
                    }
                } else if (field.type === 'checkboxGroup') {
                    const boxes = document.querySelectorAll('.' + field.class);
                    if (boxes.length > 0 && Array.isArray(settings[field.key])) {
                        const wanted = new Set(settings[field.key]);
                        boxes.forEach(cb => { cb.checked = wanted.has(cb.value); });
                    }
                } else if (field.type === 'activeTab') {
                    if (typeof settings.activeTab === 'string') {
                        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === settings.activeTab));
                        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + settings.activeTab));
                    }
                }
            });
        }

        return { save, load, apply };
    }

    // =====================================================================
    // Pluralisation
    // =====================================================================
    //
    // Arabic has six grammatical number categories (zero/one/two/few/many/
    // other), not just singular/plural - "3 things" and "15 things" need
    // different noun forms, not just a different digit. Rather than
    // reimplementing Arabic numeral agreement by hand, this uses the
    // browser's built-in Intl.PluralRules, which already encodes each
    // language's real CLDR plural rules.
    //
    // forms: an object with any of zero/one/two/few/many/other - only
    // 'other' is required, since CLDR guarantees every count falls back to
    // it (English only ever produces 'one'/'other'). Include '{n}' in a
    // form wherever the count itself should be shown.
    function pluralize(count, forms, lang) {
        lang = (lang === 'ar') ? 'ar' : 'en';
        let category;
        try {
            category = new Intl.PluralRules(lang).select(count);
        } catch (e) {
            category = (count === 1) ? 'one' : 'other';
        }
        const template = (forms[category] !== undefined) ? forms[category] : forms.other;
        return template.replace('{n}', count);
    }

    // =====================================================================
    // Theme
    // =====================================================================
    //
    // One shared localStorage key across all apps, so the choice carries
    // over between them. 'gold' is the default and needs no [data-theme]
    // attribute at all - see styles.css for what each theme name maps to.
    //
    // Each app's <head> also has its own small inline script that applies
    // the saved theme immediately, before the page paints - the functions
    // here only handle applying a NEW choice after the page has already
    // loaded (i.e. a click on one of the side menu's theme buttons).

    const THEME_STORAGE_KEY = 'quranTester:theme';
    const THEME_ORDER = ['gold', 'plain-light', 'plain-dark'];

    function getCurrentTheme() {
        try {
            return localStorage.getItem(THEME_STORAGE_KEY) || 'gold';
        } catch (e) {
            return 'gold';
        }
    }

    function applyTheme(theme) {
        if (theme === 'gold') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }

    function setTheme(theme) {
        applyTheme(theme);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch (e) {
            console.warn('Could not save theme choice to localStorage.', e);
        }
    }

    // =====================================================================
    // Side menu (theme, language switch, app list, GitHub link)
    // =====================================================================
    //
    // One shared component, injected into every page via wireSideMenu().
    // Editing APPS below is the only change needed to add a new app to the
    // menu everywhere at once.

    const REPO_URL = 'https://github.com/QVCoding/Quran_Tester';

    // The homepage's filename per language - used for the Home link (from
    // any page) and, when currentAppId is 'home', for the language switch.
    const HOME_FILES = { en: 'index.html', ar: 'index-ar.html' };

    // Each app's filename/label in each language it exists in. For an
    // Arabic-only app (irab), both languages point at the same file - this
    // is what makes it show up in both languages' app lists while never
    // offering a language-switch box (there's nothing else to switch to).
    const APPS = [
        { id: 'minimaltest',
          en: { file: 'minimaltest.html', label: 'Smallest Phrase Hifdh-Tester' },
          ar: { file: 'minimaltest-ar.html', label: 'اختبار أقصر عبارة للحفظ' } },
        { id: 'commonphrase',
          en: { file: 'commonphrase.html', label: 'Common Phrase Finder' },
          ar: { file: 'commonphrase-ar.html', label: 'الباحث عن العبارات المشتركة' } },
        { id: 'occurrencetest',
          en: { file: 'occurrencetest.html', label: 'Occurrence Tester' },
          ar: { file: 'occurrencetest-ar.html', label: 'اختبار مواضع تكرار العبارات' } },
        { id: 'irab',
          en: { file: 'irab.html', label: "I'rab Tester" },
          ar: { file: 'irab.html', label: 'اختبار الإعراب كلمة كلمة' } }
    ];

    // Theme button text, per menu language. Language names themselves
    // ("English"/"العربية") are shown the same way regardless of which
    // page you're on - that's their own name in each language, not
    // something to translate.
    const THEME_LABELS_BY_LANG = {
        en: { gold: 'Gold', 'plain-light': 'Light', 'plain-dark': 'Dark' },
        ar: { gold: 'ذهبي', 'plain-light': 'فاتح', 'plain-dark': 'داكن' }
    };
    const LANGUAGE_NAMES = { en: 'English', ar: 'العربية' };

    const SIDE_MENU_STRINGS = {
        en: { menuLabel: 'Menu', close: 'Close', theme: 'Theme', apps: 'Apps', home: 'Home' },
        ar: { menuLabel: 'القائمة', close: 'إغلاق', theme: 'المظهر', apps: 'التطبيقات', home: 'الرئيسية' }
    };

    // currentAppId must match one of the ids in APPS above. lang is 'en' or 'ar'.
    function wireSideMenu(currentAppId, lang) {
        lang = (lang === 'ar') ? 'ar' : 'en';
        const strings = SIDE_MENU_STRINGS[lang];
        const themeLabels = THEME_LABELS_BY_LANG[lang];
        const currentApp = APPS.find(a => a.id === currentAppId);

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'side-menu-toggle';
        toggleBtn.setAttribute('aria-label', strings.menuLabel);
        toggleBtn.innerHTML = '&#9776;';

        const overlay = document.createElement('div');
        overlay.className = 'side-menu-overlay';

        const panel = document.createElement('div');
        panel.className = 'side-menu-panel';

        let html = '';
        html += '<button type="button" class="side-menu-close" aria-label="' + strings.close + '">&times;</button>';

        html += '<div class="side-menu-section" style="text-align: center;">';
        if (currentAppId === 'home') {
            html += '<span class="side-menu-toggle-btn active" style="display: inline-block; padding: 6px 18px; font-size: 12px;">' + strings.home + '</span>';
        } else {
            html += '<a class="side-menu-toggle-btn" style="display: inline-block; padding: 6px 18px; font-size: 12px;" href="' + HOME_FILES[lang] + '">' + strings.home + '</a>';
        }
        html += '</div>';

        html += '<div class="side-menu-section">';
        html += '<div class="side-menu-heading" style="text-align: center;">' + strings.theme + '</div>';
        html += '<div class="side-menu-theme-row">';
        THEME_ORDER.forEach(theme => {
            html += '<button type="button" class="side-menu-toggle-btn" data-theme-choice="' + theme + '">' + themeLabels[theme] + '</button>';
        });
        html += '</div></div>';

        // Only offer a language switch if there are actually two distinct
        // files to switch between - either this app (via APPS), or the
        // homepage itself (via HOME_FILES). Both boxes always read
        // "English"/"العربية" regardless of the current page's language -
        // the current one is shown as a plain (non-clickable) box, the
        // other as a link to switch.
        const langFiles = (currentAppId === 'home')
            ? HOME_FILES
            : (currentApp && currentApp.en.file !== currentApp.ar.file) ? { en: currentApp.en.file, ar: currentApp.ar.file } : null;

        if (langFiles) {
            html += '<div class="side-menu-section">';
            html += '<div class="side-menu-lang-row">';
            ['en', 'ar'].forEach(l => {
                if (l === lang) {
                    html += '<span class="side-menu-toggle-btn active">' + LANGUAGE_NAMES[l] + '</span>';
                } else {
                    html += '<a class="side-menu-toggle-btn" href="' + langFiles[l] + '">' + LANGUAGE_NAMES[l] + '</a>';
                }
            });
            html += '</div></div>';
        }

        html += '<div class="side-menu-section">';
        html += '<div class="side-menu-heading">' + strings.apps + '</div>';
        html += '<ul class="side-menu-list">';
        APPS.forEach(app => {
            const target = app[lang];
            if (app.id === currentAppId) {
                html += '<li class="current"><span>' + target.label + '</span></li>';
            } else {
                html += '<li><a href="' + target.file + '">' + target.label + '</a></li>';
            }
        });
        html += '</ul></div>';

        html += '<a class="side-menu-github" href="' + REPO_URL + '" target="_blank" rel="noopener">GitHub &#8599;</a>';

        panel.innerHTML = html;

        document.body.appendChild(toggleBtn);
        document.body.appendChild(overlay);
        document.body.appendChild(panel);

        function reflectActiveTheme() {
            const current = getCurrentTheme();
            panel.querySelectorAll('[data-theme-choice]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.themeChoice === current);
            });
        }

        function openMenu() {
            panel.classList.add('open');
            overlay.classList.add('open');
            reflectActiveTheme();
        }
        function closeMenu() {
            panel.classList.remove('open');
            overlay.classList.remove('open');
        }

        toggleBtn.addEventListener('click', openMenu);
        overlay.addEventListener('click', closeMenu);
        panel.querySelector('.side-menu-close').addEventListener('click', closeMenu);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

        panel.querySelectorAll('[data-theme-choice]').forEach(btn => {
            btn.addEventListener('click', () => {
                setTheme(btn.dataset.themeChoice);
                reflectActiveTheme();
            });
        });
    }

    return {
        loadMetadataXML,
        findJuz,
        findPage,
        startLoadingAnimation,
        stopLoadingAnimation,
        wireSelectAll,
        populateSurahAndJuzLists,
        parsePageRange,
        wireCorePickerUI,
        getFilteredByPortion,
        createSettingsStore,
        pluralize,
        wireSideMenu
    };

})();
