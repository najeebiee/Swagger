const ROUTES = {
  home: 'Pages/home.html',
  user: 'Pages/user.html',
  codes: 'Pages/codes.html',
  sales: 'Pages/sales.html',
  userUpline: 'Pages/userUpline.html',
  sponsoredDownline: 'Pages/sponsoredDownline.html',
  binaryDownline: 'Pages/binaryDownline.html'
};

function initApp() {
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const route = event.currentTarget.dataset.route;
      if (route) {
        navigateTo(route);
      }
    });
  });

  window.addEventListener('hashchange', handleHashChange);
  handleHashChange();
}

function handleHashChange() {
  const routeFromHash = location.hash.replace('#', '') || 'home';
  navigateTo(routeFromHash);
}

function navigateTo(route) {
  const normalizedRoute = ROUTES[route] ? route : 'home';
  const path = ROUTES[normalizedRoute];
  setActiveLink(normalizedRoute);
  loadPage(normalizedRoute, path);
  if (location.hash !== `#${normalizedRoute}`) {
    history.replaceState(null, '', `#${normalizedRoute}`);
  }
}

async function loadPage(route, path) {
  const contentEl = document.getElementById('app-content');
  if (!contentEl) return;

  contentEl.innerHTML = '<p class="empty-state">Loading page...</p>';

  try {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to load page: ${response.status}`);
    }
    const html = await response.text();
    contentEl.innerHTML = html;

    if (route === 'sales' && typeof window.initSalesPage === 'function') {
      window.initSalesPage();
    }

    if (route === 'codes' && typeof window.initCodesPage === 'function') {
      window.initCodesPage();
    }

    if (route === 'user' && typeof window.initUsersPage === 'function') {
      window.initUsersPage();
    }

    if (route === 'userUpline' && typeof window.initUserUplinePage === 'function') {
      window.initUserUplinePage();
    }

    if (route === 'sponsoredDownline' && typeof window.initSponsoredDownlinePage === 'function') {
      window.initSponsoredDownlinePage();
    }

    if (route === 'binaryDownline' && typeof window.initBinaryDownlinePage === 'function') {
      window.initBinaryDownlinePage();
    }

    if (route === 'unilevelDownline' && typeof window.initUnilevelDownlinePage === 'function') {
      window.initUnilevelDownlinePage();
    }

  } catch (error) {
    console.error(error);
    contentEl.innerHTML = '<div class="empty-state">Sorry, we could not load that page. Please try again.</div>';
  }
}

function setActiveLink(route) {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    const isActive = link.dataset.route === route;
    link.classList.toggle('active', isActive);
  });
}

// Initialize once DOM is ready
window.addEventListener('DOMContentLoaded', initApp);
