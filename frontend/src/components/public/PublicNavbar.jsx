import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import './PublicNavbar.css';
import '../../styles/public-theme.css';


const navigation = [
  {
    label: 'Home',
    to: '/',
  },
  {
    label: 'About',
    to: '/about',
  },
  {
    label: 'How It Works',
    to: '/how-it-works',
  },
  {
    label: 'Departments',
    to: '/departments',
  },
  {
    label: 'Contact',
    to: '/contact',
  },
];


export default function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <header className="public-header">
      <div className="public-navbar container">

        <Link
          to="/"
          className="brand"
          aria-label="CivicFix home"
          onClick={closeMenu}
        >
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <rect
                width="40"
                height="40"
                rx="12"
                fill="currentColor"
              />

              <path
                d="M11 13.5L20 8L29 13.5V26.5L20 32L11 26.5V13.5Z"
                stroke="white"
                strokeWidth="2"
                strokeLinejoin="round"
              />

              <path
                d="M15.5 20L19 23.5L25.5 16.5"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <span className="brand-name">
            Civic<span>Fix</span>
          </span>
        </Link>

        <button
          type="button"
          className={`mobile-menu-button ${
            menuOpen ? 'mobile-menu-active' : ''
          }`}
          aria-label={
            menuOpen ? 'Close navigation' : 'Open navigation'
          }
          aria-expanded={menuOpen}
          aria-controls="public-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          id="public-navigation"
          className={`public-nav ${
            menuOpen ? 'public-nav-open' : ''
          }`}
          aria-label="Main navigation"
        >
          <div className="public-nav-links">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `public-nav-link ${
                    isActive ? 'public-nav-link-active' : ''
                  }`
                }
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="public-nav-actions">
            <Link
              to="/login"
              className="nav-login-button"
              onClick={closeMenu}
            >
              Login
            </Link>

            <Link
              to="/register"
              className="button button-primary nav-register-button"
              onClick={closeMenu}
            >
              Register
              <span aria-hidden="true"></span>
            </Link>
          </div>
        </nav>

      </div>
    </header>
  );
}