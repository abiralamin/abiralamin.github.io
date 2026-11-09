/* ============================================================
   Abir Al-Amin — Portfolio
   Vanilla JS: navigation, scroll spy, reveals, GitHub projects,
   contact form (mailto), back-to-top, footer year.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Config (edit these if needed) ---------- */
  var GITHUB_USERNAME = 'abiralamin';
  var GITHUB_API_URL = 'https://api.github.com/users/' + GITHUB_USERNAME + '/repos';
  var EMAIL = 'abiralaminn@gmail.com';
  var WEB3FORMS_ACCESS_KEY = 'd9db79c2-b58f-4341-9551-91bbedfdb8fd';
  var WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
  var MAX_PROJECTS = 9;          // how many repos to display
  var PER_PAGE = 100;            // repos per API page

  /* ==========================================================
     Navigation: mobile toggle + scrolled state
     ========================================================== */
  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');

  function closeMenu() {
    navLinks.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  navToggle.addEventListener('click', function () {
    var open = navLinks.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  // Close mobile menu when a link is clicked
  navLinks.addEventListener('click', function (e) {
    if (e.target.classList.contains('nav__link')) closeMenu();
  });

  // Close menu on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navLinks.classList.contains('is-open')) {
      closeMenu();
      navToggle.focus();
    }
  });

  // Sticky nav border after scrolling
  var onScrollNav = function () {
    nav.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  /* ==========================================================
     Scroll spy: highlight active nav link
     ========================================================== */
  var sections = Array.prototype.slice.call(
    document.querySelectorAll('main section[id]')
  );
  var navLinkEls = Array.prototype.slice.call(
    document.querySelectorAll('.nav__link')
  );

  function setActiveLink(id) {
    navLinkEls.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('href') === '#' + id);
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActiveLink(entry.target.id);
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ==========================================================
     Scroll reveal animations
     ========================================================== */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ==========================================================
     Back to top
     ========================================================== */
  var backToTop = document.getElementById('backToTop');
  function updateBackToTop() {
    backToTop.classList.toggle('is-hidden', window.scrollY < 600);
  }
  window.addEventListener('scroll', updateBackToTop, { passive: true });
  updateBackToTop();
  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ==========================================================
     Footer year
     ========================================================== */
  document.getElementById('year').textContent = String(new Date().getFullYear());

  /* ==========================================================
     Contact form -> Web3Forms (free static-site form backend)
     Sign up at https://web3forms.com, create a form, and paste
     the access key into WEB3FORMS_ACCESS_KEY above.
     ========================================================== */
  var contactForm = document.getElementById('contactForm');
  var contactSubmit = contactForm.querySelector('.contact__submit');

  function setFormStatus(msg, isError) {
    var status = document.getElementById('contactStatus');
    if (!status) {
      status = document.createElement('p');
      status.id = 'contactStatus';
      status.className = 'contact__status';
      contactForm.appendChild(status);
    }
    status.textContent = msg;
    status.classList.toggle('contact__status--error', !!isError);
  }

  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();

    if (WEB3FORMS_ACCESS_KEY === 'YOUR_ACCESS_KEY') {
      // Key not configured yet — fall back to mailto so the form still works
      var name = document.getElementById('cf-name').value.trim();
      var sender = document.getElementById('cf-email').value.trim();
      var message = document.getElementById('cf-message').value.trim();
      var subject = encodeURIComponent('Portfolio message from ' + (name || 'a visitor'));
      var body = encodeURIComponent('Name: ' + name + '\nEmail: ' + sender + '\n\n' + message + '\n');
      window.location.href = 'mailto:' + EMAIL + '?subject=' + subject + '&body=' + body;
      return;
    }

    var data = new FormData(contactForm);
    data.append('access_key', WEB3FORMS_ACCESS_KEY);
    data.append('subject', 'New message from portfolio — ' + (data.get('name') || 'visitor'));
    data.append('from_name', 'Abir Al-Amin Portfolio');

    contactSubmit.disabled = true;
    contactSubmit.textContent = 'Sending…';
    setFormStatus('');

    fetch(WEB3FORMS_ENDPOINT, { method: 'POST', body: data })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        if (result.success) {
          setFormStatus('Message sent — thank you! I\'ll get back to you soon.', false);
          contactForm.reset();
        } else {
          setFormStatus(result.message || 'Something went wrong. Please try again or email me directly.', true);
        }
      })
      .catch(function () {
        setFormStatus('Network error. Please try again or email me directly.', true);
      })
      .finally(function () {
        contactSubmit.disabled = false;
        contactSubmit.textContent = 'Send Message';
      });
  });

  /* ==========================================================
     GitHub projects
     ========================================================== */
  var grid = document.getElementById('projectsGrid');
  var loading = document.getElementById('projectsLoading');
  var errorBox = document.getElementById('projectsError');
  var filtersBox = document.getElementById('projectFilters');
  var repos = [];
  var activeFilter = 'all';

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function starSvg() {
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z"/></svg>';
  }

  function arrowSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  }

  function renderFilters() {
    // Collect unique languages, sorted by frequency then alphabetically
    var counts = {};
    repos.forEach(function (r) {
      if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
    });
    var langs = Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a] || a.localeCompare(b);
    });

    // Remove previously generated buttons (keep the "All" button)
    filtersBox.querySelectorAll('[data-filter]:not([data-filter="all"])').forEach(function (b) {
      b.remove();
    });

    langs.forEach(function (lang) {
      var btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.filter = lang;
      btn.textContent = lang;
      filtersBox.appendChild(btn);
    });
  }

  function projectCard(repo) {
    var card = document.createElement('article');
    card.className = 'project-card';
    card.dataset.language = repo.language || '';

    var stars =
      '<span class="project-card__stars">' + starSvg() +
      ' ' + repo.stargazers_count.toLocaleString() + '</span>';

    var desc = repo.description
      ? escapeHtml(repo.description)
      : '<em>No description provided.</em>';

    var langBadge = repo.language
      ? '<span class="project-card__lang">' + escapeHtml(repo.language) + '</span>'
      : '<span class="project-card__lang">Other</span>';

    card.innerHTML =
      '<div class="project-card__top">' +
        '<a class="project-card__name" href="' + escapeHtml(repo.html_url) +
          '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(repo.name) + '</a>' +
        stars +
      '</div>' +
      '<p class="project-card__desc">' + desc + '</p>' +
      '<div class="project-card__meta">' +
        langBadge +
        '<a class="project-card__link" href="' + escapeHtml(repo.html_url) +
          '" target="_blank" rel="noopener noreferrer">' +
          'View Project ' + arrowSvg() + '</a>' +
      '</div>';

    return card;
  }

  function renderProjects() {
    grid.innerHTML = '';

    var filtered = repos.filter(function (r) {
      return activeFilter === 'all' || r.language === activeFilter;
    });

    if (!filtered.length) {
      var empty = document.createElement('p');
      empty.className = 'projects__empty';
      empty.textContent = 'No projects found for this filter.';
      grid.appendChild(empty);
      return;
    }

    filtered.forEach(function (repo) {
      grid.appendChild(projectCard(repo));
    });
  }

  filtersBox.addEventListener('click', function (e) {
    var btn = e.target.closest('.filter-btn');
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    filtersBox.querySelectorAll('.filter-btn').forEach(function (b) {
      b.classList.toggle('is-active', b === btn);
    });
    renderProjects();
  });

  function showError() {
    loading.hidden = true;
    errorBox.hidden = false;
  }

  function fetchRepos() {
    return fetch(GITHUB_API_URL + '?per_page=' + PER_PAGE + '&sort=updated', {
      headers: { 'Accept': 'application/vnd.github+json' }
    }).then(function (res) {
      if (!res.ok) throw new Error('GitHub API responded ' + res.status);
      return res.json();
    });
  }

  // If the first page doesn't cover everything, fetch remaining pages
  function fetchAllRepos() {
    return fetchRepos().then(function (firstPage) {
      // GitHub returns up to `per_page` repos; Link header indicates more.
      // Simple approach: if we got a full page, fetch page 2 as well.
      if (firstPage.length < PER_PAGE) return firstPage;
      return fetch(GITHUB_API_URL + '?per_page=' + PER_PAGE + '&page=2&sort=updated')
        .then(function (res) { return res.ok ? res.json() : []; })
        .then(function (secondPage) { return firstPage.concat(secondPage); });
    });
  }

  fetchAllRepos()
    .then(function (data) {
      // Exclude forks, sort by most recently updated, cap count
      repos = data
        .filter(function (r) { return !r.fork; })
        .sort(function (a, b) {
          return new Date(b.updated_at) - new Date(a.updated_at);
        })
        .slice(0, MAX_PROJECTS);

      loading.hidden = true;
      renderFilters();
      renderProjects();
    })
    .catch(function () {
      showError();
    });
})();
