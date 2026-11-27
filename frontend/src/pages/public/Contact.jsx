import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Mail,
  MessageSquare,
  Headset,
  FileText,
  ShieldCheck,
  Clock,
  Send,
  User,
  AtSign,
  ChevronDown,
  CheckCircle2,
  CircleHelp,
  Lightbulb,
} from "lucide-react";

import PublicNavbar from "../../components/public/PublicNavbar";
import PublicFooter from "../../components/public/PublicFooter";
import "./Contact.css";

/* Images (put these files in src/assets, swap for your own any time) */
import imgHero from "../../assets/hm-d-1.jpg"; // domed government building
import imgHelp from "../../assets/hm-s-senior.jpg"; // volunteer helping a citizen

/* ==========================================================================
   DATA
========================================================================== */

const contactTopics = [
  {
    icon: FileText,
    title: "Complaint-related queries",
    description:
      "Need help understanding complaint submission, status updates, or the complaint process?",
    link: "/how-it-works",
    linkText: "Explore how it works",
  },
  {
    icon: ShieldCheck,
    title: "Account assistance",
    description:
      "Find guidance about citizen registration, login, and accessing your CivicFix account.",
    link: "/login",
    linkText: "Go to citizen login",
  },
  {
    icon: MessageSquare,
    title: "Department information",
    description:
      "Find information about the departments responsible for handling civic complaints.",
    link: "/departments",
    linkText: "View departments",
  },
];

const helpItems = [
  {
    icon: CircleHelp,
    title: "Need help using CivicFix?",
    text: "Explore the complaint process and citizen portal information.",
  },
  {
    icon: Clock,
    title: "Looking for an update?",
    text: "Check your complaint status through your citizen account.",
  },
  {
    icon: ShieldCheck,
    title: "Need department details?",
    text: "Browse the available CivicFix departments.",
  },
];

const messageTips = [
  "Say clearly what you need help with in the subject line",
  "Mention the complaint category, if your question is about a complaint",
  "Describe what happened and what you expected",
  "Share the email address linked to your CivicFix account",
];

const faqs = [
  {
    question: "How can I report a civic issue?",
    answer:
      "Create a citizen account, sign in, and use the complaint submission facility to provide the issue details and supporting information.",
  },
  {
    question: "How can I check my complaint status?",
    answer:
      "Sign in to your citizen account and access your complaints to review the status information available for your submitted reports.",
  },
  {
    question: "Which department handles my complaint?",
    answer:
      "The responsible department depends on the category and location of the reported issue. Visit the Departments page to explore the available departments.",
  },
  {
    question: "Can I reopen a resolved complaint?",
    answer:
      "The ability to reopen a complaint depends on its current status and the actions permitted by the CivicFix complaint workflow.",
  },
];

/* ==========================================================================
   HELPERS
========================================================================== */

/* Adds "is-visible" to every .contact-reveal / .contact-stagger block once
   it scrolls into view, so sections fade and slide in one after another. */
function useScrollReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll(
      ".contact-reveal, .contact-stagger"
    );

    if (typeof IntersectionObserver === "undefined") {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);
}

/* Navbar stays visible while the page scrolls. It sits in a fixed shell
   and a spacer of the same height keeps content from sliding underneath. */
function StickyNav() {
  const shellRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const node = shellRef.current;

    if (!node) return undefined;

    const measure = () => setHeight(node.offsetHeight);

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);

      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        className="contact-nav-spacer"
        style={{ height }}
        aria-hidden="true"
      />

      <div className="contact-nav-shell" ref={shellRef}>
        <PublicNavbar />
      </div>
    </>
  );
}

/* ==========================================================================
   PAGE
========================================================================== */

export default function Contact() {
  const [openFaq, setOpenFaq] = useState(0);

  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [formMessage, setFormMessage] = useState("");

  useScrollReveal();

  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFormMessage("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // The current backend source does not establish a public
    // contact-message submission endpoint.
    setFormMessage(
      "Your details have been validated, but message submission is not connected to the backend yet."
    );
  };

  return (
    <>
      <StickyNav />

      <main className="contact-page">
        {/* ---------------- HERO ---------------- */}

        <section className="contact-hero">
          <div className="contact-container contact-hero-grid">
            <div className="contact-hero-content">
             
              <h1>
                Let&rsquo;s make your
                <span> voice heard.</span>
              </h1>

              <p>
                Have a question about CivicFix? Need guidance with
                reporting a civic issue or using the citizen portal?
                Find the right information and explore the available
                support resources.
              </p>

              <div className="contact-actions">
                <a
                  href="#contact-form"
                  className="contact-btn contact-btn-primary"
                >
                  Send a message
                  <ArrowRight size={18} />
                </a>

                <Link
                  to="/how-it-works"
                  className="contact-btn contact-btn-outline"
                >
                  How it works
                </Link>
              </div>

              <div className="contact-assurance">
                <span className="contact-icon-box">
                  <ShieldCheck size={22} />
                </span>

                <div>
                  <strong>Citizen-focused assistance</strong>

                  <span>
                    Find guidance about the CivicFix complaint and
                    citizen service process.
                  </span>
                </div>
              </div>
            </div>

            <div className="contact-hero-visual">
              <div className="contact-hero-photo">
                <img
                  src={imgHero}
                  alt="A white domed government building behind a decorative fence"
                  style={{ objectPosition: "center 40%" }}
                />
              </div>

              
            </div>
          </div>
        </section>

        {/* ---------------- OPTIONS ---------------- */}

        <section className="contact-section contact-options">
          <div className="contact-container">
            <div className="contact-heading contact-reveal">
             
              <h2>
                How can we
                <span> help you today?</span>
              </h2>

              <p>
                Explore the available CivicFix resources to find
                information about complaints, citizen accounts, and
                department services.
              </p>
            </div>

            <div className="contact-grid-3 contact-stagger">
              {contactTopics.map((item, index) => {
                const Icon = item.icon;

                return (
                  <article className="contact-card" key={item.title}>
                    <div className="contact-card-top">
                      <span className="contact-icon-box">
                        <Icon size={24} />
                      </span>

                      <span className="contact-card-number">
                        0{index + 1}
                      </span>
                    </div>

                    <h3>{item.title}</h3>

                    <p>{item.description}</p>

                    <Link to={item.link} className="contact-link">
                      {item.linkText}
                      <ArrowRight size={17} />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------- FORM ---------------- */}

        <section
          className="contact-section contact-form-section"
          id="contact-form"
        >
          <div className="contact-container contact-form-layout">
            <div className="contact-form-intro contact-reveal">
             
              <h2>
                Have something
                <span> to tell us?</span>
              </h2>

              <p>
                Use the form to prepare your enquiry. The current
                project backend does not yet expose a verified public
                contact-message endpoint, so this form does not claim
                to send or store your message.
              </p>

              <div className="contact-help-list">
                {helpItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div className="contact-help-item" key={item.title}>
                      <span className="contact-icon-box">
                        <Icon size={20} />
                      </span>

                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="contact-form-card contact-reveal">
              <div className="contact-form-heading">
                <span className="contact-icon-box">
                  <Mail size={22} />
                </span>

                <div>
                  <h3>Send an enquiry</h3>
                  <p>Fill in the details below.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="contact-form-grid">
                  <label className="contact-field">
                    <span>
                      Full name <b>*</b>
                    </span>

                    <div className="contact-input-wrap">
                      <User size={18} />

                      <input
                        type="text"
                        name="name"
                        placeholder="Enter your full name"
                        value={form.name}
                        onChange={updateForm}
                        maxLength={120}
                        autoComplete="name"
                        required
                      />
                    </div>
                  </label>

                  <label className="contact-field">
                    <span>
                      Email address <b>*</b>
                    </span>

                    <div className="contact-input-wrap">
                      <AtSign size={18} />

                      <input
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        value={form.email}
                        onChange={updateForm}
                        maxLength={254}
                        autoComplete="email"
                        required
                      />
                    </div>
                  </label>

                  <label className="contact-field contact-field-full">
                    <span>
                      Subject <b>*</b>
                    </span>

                    <div className="contact-input-wrap">
                      <MessageSquare size={18} />

                      <input
                        type="text"
                        name="subject"
                        placeholder="What would you like to ask about?"
                        value={form.subject}
                        onChange={updateForm}
                        maxLength={180}
                        required
                      />
                    </div>
                  </label>

                  <label className="contact-field contact-field-full">
                    <span>
                      Your message <b>*</b>
                    </span>

                    <textarea
                      name="message"
                      placeholder="Write your message here..."
                      value={form.message}
                      onChange={updateForm}
                      rows={6}
                      maxLength={3000}
                      required
                    />
                  </label>
                </div>

                {formMessage && (
                  <div className="contact-notice" role="status">
                    <CircleHelp size={18} />
                    <span>{formMessage}</span>
                  </div>
                )}

                <div className="contact-form-bottom">
                  <p>
                    <ShieldCheck size={16} />
                    Your message is not submitted or stored.
                  </p>

                  <button
                    type="submit"
                    className="contact-btn contact-btn-primary"
                  >
                    Validate message
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* ---------------- WRITING TIPS (new section) ---------------- */}

        <section className="contact-section contact-tips">
          <div className="contact-container contact-split">
            <div className="contact-photo-frame contact-reveal">
              <img
                src={imgHelp}
                alt="A volunteer helping a senior citizen with his medication"
                style={{ objectPosition: "center 40%" }}
                loading="lazy"
              />

              
            </div>

            <div className="contact-split-copy contact-reveal">
             

              <h2>
                Tips for a
                <span> helpful message</span>
              </h2>

              <p>
                The clearer your question, the easier it is to point you
                to the right information and the right team.
              </p>

              <ul className="contact-checklist">
                {messageTips.map((tip) => (
                  <li key={tip}>
                    <CheckCircle2 size={22} />
                    {tip}
                  </li>
                ))}
              </ul>

              <a
                href="#contact-form"
                className="contact-btn contact-btn-primary"
              >
                Write your message
                <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}

        <section className="contact-section contact-faq-section">
          <div className="contact-container">
            <div className="contact-heading contact-reveal">
             

              <h2>
                Frequently asked
                <span> questions</span>
              </h2>

              <p>
                Find answers to common questions about using the
                CivicFix platform.
              </p>
            </div>

            <div className="contact-faq-list contact-reveal">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;

                return (
                  <article
                    className={`contact-faq-item ${isOpen ? "is-open" : ""}`}
                    key={faq.question}
                  >
                    <h3>
                      <button
                        type="button"
                        className="contact-faq-question"
                        onClick={() => setOpenFaq(isOpen ? -1 : index)}
                        aria-expanded={isOpen}
                        aria-controls={`contact-faq-${index}`}
                      >
                        <span className="contact-faq-number">
                          0{index + 1}
                        </span>

                        <span className="contact-faq-text">
                          {faq.question}
                        </span>

                        <ChevronDown
                          size={20}
                          className="contact-faq-chevron"
                        />
                      </button>
                    </h3>

                    <div
                      id={`contact-faq-${index}`}
                      className="contact-faq-answer"
                      role="region"
                    >
                      <div>
                        <p>{faq.answer}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* The blue "Better communities start with you" call to action
            comes from PublicFooter, so the page ends with just that one. */}
      </main>

      <PublicFooter />
    </>
  );
}