import { Link } from 'react-router-dom';

import {
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Send,
  Heart,
  Clock,
} from 'lucide-react';

import './Footer.css';

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  // Replace with CivicFix's actual contact information.
  const contact = {
    email: 'CivicFix@gmail.com',
    phone: '+91 6635297810',
    location: 'Ernakulam,Kerala,India',
  };

  // Replace placeholder URLs with official CivicFix social accounts.
  const socialLinks = [
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/YOUR_PAGE',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.6V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.2v3h2.8v8h3.5Z"
          />
        </svg>
      ),
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/YOUR_PROFILE',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="12"
            cy="12"
            r="4"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
        </svg>
      ),
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/company/YOUR_PAGE',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M5.2 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3.5 9h3.4v11H3.5V9Zm5.5 0h3.3v1.5h.1A3.6 3.6 0 0 1 15.7 8c3.5 0 4.2 2.3 4.2 5.3V20h-3.4v-5.9c0-1.4 0-3.2-2-3.2s-2.2 1.5-2.2 3.1V20H9V9Z"
          />
        </svg>
      ),
    },
    {
      name: 'X',
      url: 'https://x.com/YOUR_PROFILE',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.4l7.3-8.4L1.8 2h6.4l4.4 6.8L18.9 2Zm-1.1 18h1.7L7.2 3.9H5.4L17.8 20Z"
          />
        </svg>
      ),
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com/@YOUR_CHANNEL',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M23 7.1a3 3 0 0 0-2.1-2.2C19 4.4 12 4.4 12 4.4s-7 0-8.9.5A3 3 0 0 0 1 7.1 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.9 3 3 0 0 0 2.1 2.2c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.2 31 31 0 0 0 .5-4.9 31 31 0 0 0-.5-4.9ZM9.7 15.5v-7l6 3.5-6 3.5Z"
          />
        </svg>
      ),
    },
  ];

  const handleNewsletterSubmit = (event) => {
    event.preventDefault();

    // Connect this form to your newsletter backend/API.
  };

  return (
    <footer className="public-footer">

      {/* ================= FOOTER TOP ================= */}

      <div className="footer-top">
        <div className="footer-container">

          <div className="footer-top-content">

            <div>
              <span className="footer-eyebrow">
                CIVIC ENGAGEMENT. COMMUNITY IMPACT.
              </span>

              <h2>
                Better communities
                <span> start with you.</span>
              </h2>

              <p>
                Be part of the change. Report civic issues,
                connect with public-service departments, and
                help create a better community.
              </p>
            </div>

            <div className="footer-top-actions">

              <Link
                to="/register"
                className="footer-primary-button"
              >
                Create Citizen Account
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/how-it-works"
                className="footer-text-button"
              >
                Discover CivicFix
                <ArrowUpRight size={16} />
              </Link>

            </div>

          </div>

        </div>
      </div>

      {/* ================= MAIN FOOTER ================= */}

      <div className="footer-main-section">

        <div className="footer-container">

          <div className="footer-main-grid">

            {/* BRAND */}

            <div className="footer-brand-column">

              <Link to="/" className="footer-brand">

                <span className="footer-brand-icon">
                  <svg viewBox="0 0 40 40" fill="none">
                    <rect
                      width="40"
                      height="40"
                      rx="11"
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

                <span className="footer-brand-name">
                  Civic<span>Fix</span>
                </span>

              </Link>

              <p className="footer-brand-description">
                CivicFix is a digital civic engagement platform
                designed to connect citizens with public-service
                departments. Report local issues, track progress,
                and contribute to better communities.
              </p>

              <div className="footer-trust-badge">
                <ShieldCheck size={17} />
                <span>
                  Empowering citizens through technology
                </span>
              </div>

              {/* SOCIAL MEDIA */}

              <div className="footer-social-section">

                <h4>Follow CivicFix</h4>

                <div className="footer-social-links">

                  {socialLinks.map((social) => (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.name}
                      title={social.name}
                    >
                      {social.icon}
                    </a>
                  ))}

                </div>

              </div>

            </div>

            {/* PLATFORM */}

            <div className="footer-column">

              <h3>Platform</h3>

              <div className="footer-column-links">

                <Link to="/">Home</Link>

                <Link to="/about">About CivicFix</Link>

                <Link to="/how-it-works">How It Works</Link>

                <Link to="/departments">Departments</Link>

                <Link to="/contact">Contact Us</Link>

              </div>

            </div>

            {/* CITIZENS */}

            <div className="footer-column">

              <h3>For Citizens</h3>

              <div className="footer-column-links">

                <Link to="/login">Citizen Login</Link>

                <Link to="/register">Create Account</Link>

                <Link to="/how-it-works">Report an Issue</Link>

                <Link to="/departments">Find Departments</Link>

                <Link to="/login">
                  Senior Citizen Services
                </Link>

              </div>

            </div>

            {/* RESOURCES */}

            <div className="footer-column">

              <h3>Resources</h3>

              <div className="footer-column-links">

                <Link to="/how-it-works">User Guide</Link>

                <Link to="/about">Our Mission</Link>

                <Link to="/contact">Help Center</Link>

                <Link to="/contact">Feedback</Link>

                <Link to="/contact">Support</Link>

              </div>

            </div>

            {/* CONTACT */}

            <div className="footer-column footer-contact-column">

              <h3>Contact Us</h3>

              <div className="footer-contact-list">

                <a
                  href={`mailto:${contact.email}`}
                  className="footer-contact-item"
                >
                  <span className="footer-contact-icon">
                    <Mail size={16} />
                  </span>

                  <span>
                    <small>Email us</small>
                    <strong>{contact.email}</strong>
                  </span>
                </a>

                <a
                  href={`tel:${contact.phone}`}
                  className="footer-contact-item"
                >
                  <span className="footer-contact-icon">
                    <Phone size={16} />
                  </span>

                  <span>
                    <small>Call us</small>
                    <strong>{contact.phone}</strong>
                  </span>
                </a>

                <div className="footer-contact-item">
                  <span className="footer-contact-icon">
                    <MapPin size={16} />
                  </span>

                  <span>
                    <small>Our location</small>
                    <strong>{contact.location}</strong>
                  </span>
                </div>

                <div className="footer-contact-item">
                  <span className="footer-contact-icon">
                    <Clock size={16} />
                  </span>

                  <span>
                    <small>Support hours</small>
                    <strong>Monday – Saturday</strong>
                  </span>
                </div>

              </div>

              <Link
                to="/contact"
                className="footer-contact-button"
              >
                Get in Touch
                <ArrowUpRight size={15} />
              </Link>

            </div>

          </div>

          {/* ================= NEWSLETTER ================= */}

          <div className="footer-newsletter">

            <div className="footer-newsletter-content">

              <div className="footer-newsletter-icon">
                <Send size={21} />
              </div>

              <div>
                <h3>Stay connected with CivicFix</h3>

                <p>
                  Get updates, community news, and important
                  platform announcements.
                </p>
              </div>

            </div>

            <form
              className="footer-newsletter-form"
              onSubmit={handleNewsletterSubmit}
            >

              <label
                htmlFor="footer-newsletter-email"
                className="footer-sr-only"
              >
                Email address
              </label>

              <input
                id="footer-newsletter-email"
                type="email"
                placeholder="Enter your email address"
                required
              />

              <button type="submit">
                Subscribe
                <ArrowRight size={16} />
              </button>

            </form>

          </div>

          {/* ================= BOTTOM FOOTER ================= */}

          <div className="footer-bottom">

            <p className="footer-copyright">
              © {currentYear} <strong>CivicFix</strong>.
              All rights reserved.
            </p>

            <div className="footer-bottom-links">

              <Link to="/contact">Privacy</Link>

              <Link to="/contact">Terms</Link>

              <Link to="/contact">Support</Link>

            </div>

            <p className="footer-made-with">
              Made with <Heart size={13} /> for better communities.
            </p>

          </div>

        </div>

      </div>

    </footer>
  );
}