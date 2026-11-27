import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Target,
  Eye,
  ShieldCheck,
  Users,
  ClipboardList,
  HeartHandshake,
  MapPin,
  CheckCircle2,
  Building2,
  MessageCircle,
  HandHeart,
  Send,
  SearchCheck,
  Wrench,
  BadgeCheck,
} from "lucide-react";

import { Link } from "react-router-dom";

import PublicNavbar from "../../components/public/PublicNavbar";
import PublicFooter from "../../components/public/PublicFooter";

import "./About.css";

/* Images (put these files in src/assets, swap for your own any time) */
import imgHeroMain from "../../assets/hm-w-action.jpg"; // road crew at work
import imgHeroSmall from "../../assets/hm-s-signal.jpg"; // signal repair
import imgCommunity from "../../assets/hm-s-waste.jpg"; // waste collection crew
import imgSeniorMain from "../../assets/hm-senior-main.jpg"; // nurse and senior citizen
import imgSeniorSide from "../../assets/hm-senior-side.jpg"; // volunteer helping senior

/* ==========================================================================
   DATA
========================================================================== */

const values = [
  {
    icon: ShieldCheck,
    title: "Transparency",
    description:
      "Citizens deserve clear information about their complaints, the responsible departments and the resolution progress.",
  },
  {
    icon: Users,
    title: "Community Participation",
    description:
      "We encourage citizens to take an active part in improving their neighbourhoods and public spaces.",
  },
  {
    icon: HeartHandshake,
    title: "Responsibility",
    description:
      "We connect citizens with the appropriate departments so that reported problems receive proper attention.",
  },
  {
    icon: CheckCircle2,
    title: "Accountability",
    description:
      "A structured complaint process makes progress and outcomes easier to follow and review.",
  },
];

const features = [
  {
    icon: ClipboardList,
    title: "Report Civic Issues",
    description:
      "Submit complaints about roads, sanitation, drainage, public infrastructure and other civic problems.",
  },
  {
    icon: MapPin,
    title: "Location-Based Reporting",
    description:
      "Location details help identify where an issue has occurred and support the responsible department.",
  },
  {
    icon: Building2,
    title: "Department Coordination",
    description:
      "Complaints are directed to the relevant department for review, assignment and action.",
  },
  {
    icon: MessageCircle,
    title: "Track Progress",
    description:
      "Follow the status of submitted complaints and stay informed about updates along the way.",
  },
];

const steps = [
  {
    icon: Send,
    title: "Submit",
    text: "Sign in and describe the issue with the details and evidence the form asks for.",
  },
  {
    icon: SearchCheck,
    title: "Review",
    text: "The responsible department reviews the complaint through its existing workflow.",
  },
  {
    icon: Wrench,
    title: "Action",
    text: "Eligible complaints are assigned to department staff for follow-up work.",
  },
  {
    icon: BadgeCheck,
    title: "Verify",
    text: "Check the reported outcome and verify it or reopen the complaint when allowed.",
  },
];

const areas = [
  "Roads and streets",
  "Traffic signals",
  "Electricity and poles",
  "Water supply",
  "Drainage",
  "Waste collection",
  "Sanitation",
  "Healthcare facilities",
  "Senior citizen assistance",
  "Public spaces",
];

const seniorPoints = [
  "Submit an assistance request with the details that are needed",
  "Follow progress through clear status updates",
  "See assigned staff details and send messages",
];

/* ==========================================================================
   NAVBAR: stays visible while the page scrolls
   The navbar sits in a fixed shell, and a spacer of the same height keeps
   the page content from sliding underneath it.
========================================================================== */

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
        className="about-nav-spacer"
        style={{ height }}
        aria-hidden="true"
      />

      <div className="about-nav-shell" ref={shellRef}>
        <PublicNavbar />
      </div>
    </>
  );
}

/* ==========================================================================
   PAGE
========================================================================== */

function About() {
  return (
    <>
      <StickyNav />

      <main className="about-page">
        {/* ---------------- HERO ---------------- */}

        <section className="about-hero">
          <div className="about-container about-hero-grid">
            <div className="about-hero-content">
            
              <h1>
                Building better communities through
                <span> civic action.</span>
              </h1>

              <p>
                CivicFix is a civic issue reporting and management
                platform that connects citizens with the departments
                responsible for maintaining their communities, with a
                clear process from report to resolution.
              </p>

              <div className="about-actions">
                <Link to="/how-it-works" className="about-btn about-btn-primary">
                  Discover how it works
                  <ArrowRight size={18} />
                </Link>

                <Link to="/departments" className="about-btn about-btn-outline">
                  Explore departments
                </Link>
              </div>

              <ul className="about-hero-points">
                <li>
                  <CheckCircle2 size={18} />
                  Report civic problems
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  Reach the right department
                </li>
                <li>
                  <CheckCircle2 size={18} />
                  Follow complaint progress
                </li>
              </ul>
            </div>

            <div className="about-hero-visual">
              <div className="about-hero-photo">
                <img
                  src={imgHeroMain}
                  alt="A road crew carrying out maintenance work along a street"
                  style={{ objectPosition: "center 60%" }}
                />
              </div>

              <div className="about-hero-photo-small">
                <img
                  src={imgHeroSmall}
                  alt="A technician on a lift repairing a traffic signal"
                  style={{ objectPosition: "center 40%" }}
                />
              </div>

              
            </div>
          </div>
        </section>

        {/* ---------------- WHO WE ARE ---------------- */}

        <section className="about-section about-who">
          <div className="about-container about-split">
            <div className="about-photo-frame">
              <img
                src={imgCommunity}
                alt="Waste collection crew wheeling bins along a busy street"
                style={{ objectPosition: "center 55%" }}
                loading="lazy"
              />
            </div>

            <div className="about-split-copy">
             

              <h2>
                Making civic engagement simpler and more
                <span> accessible.</span>
              </h2>

              <p>
                CivicFix provides a digital platform where citizens can
                report civic issues and communicate their concerns
                through a structured process, so that every report
                reaches the team responsible for it.
              </p>

              <div className="about-mv">
                <article className="about-mv-card">
                  <span className="about-icon-box">
                    <Target size={22} />
                  </span>

                  <div>
                    <h3>Our mission</h3>

                    <p>
                      To make civic issue reporting easier, improve
                      communication between citizens and departments,
                      and support an organized approach to resolving
                      community problems.
                    </p>
                  </div>
                </article>

                <article className="about-mv-card">
                  <span className="about-icon-box about-icon-box-teal">
                    <Eye size={22} />
                  </span>

                  <div>
                    <h3>Our vision</h3>

                    <p>
                      To contribute to cleaner, safer and better
                      maintained communities through participation,
                      transparency and coordinated public service
                      management.
                    </p>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- VALUES ---------------- */}

        <section className="about-section about-values">
          <div className="about-container">
            <div className="about-heading">
            

              <h2>
                The values behind
                <span> CivicFix</span>
              </h2>

              <p>
                Our platform is built around principles that encourage
                meaningful citizen participation and responsible civic
                administration.
              </p>
            </div>

            <div className="about-grid-4">
              {values.map((item) => {
                const Icon = item.icon;

                return (
                  <article className="about-card" key={item.title}>
                    <span className="about-icon-box">
                      <Icon size={24} />
                    </span>

                    <h3>{item.title}</h3>

                    <p>{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------- PLATFORM ---------------- */}

        <section className="about-section about-platform">
          <div className="about-container">
            <div className="about-heading about-heading-left">
            

              <h2>
                How CivicFix supports
                <span> citizens</span>
              </h2>

              <p>
                A structured digital experience that helps citizens
                report problems and follow their progress.
              </p>
            </div>

            <div className="about-grid-4">
              {features.map((item, i) => {
                const Icon = item.icon;

                return (
                  <article
                    className="about-card about-feature"
                    key={item.title}
                  >
                    <div className="about-feature-top">
                      <span className="about-icon-box">
                        <Icon size={24} />
                      </span>

                      <span className="about-feature-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <h3>{item.title}</h3>

                    <p>{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------- HOW IT WORKS (new section) ---------------- */}

        <section className="about-section about-process">
          <div className="about-container">
            <div className="about-heading">
            

              <h2>
                From reporting to
                <span> resolution</span>
              </h2>

              <p>
                Every complaint follows clear stages. Available
                actions and status updates depend on the existing
                complaint workflow.
              </p>
            </div>

            <ol className="about-steps">
              {steps.map((step, i) => {
                const Icon = step.icon;

                return (
                  <li className="about-step" key={step.title}>
                    <span className="about-step-icon">
                      <Icon size={24} />
                    </span>

                    <span className="about-step-number">
                      Step {i + 1}
                    </span>

                    <h3>{step.title}</h3>

                    <p>{step.text}</p>
                  </li>
                );
              })}
            </ol>

            <div className="about-areas" aria-label="Civic service areas">
              <span className="about-areas-label">Issues we cover</span>

              <ul>
                {areas.map((area) => (
                  <li key={area}>{area}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------------- SENIOR CITIZEN ASSISTANCE ---------------- */}

        <section className="about-section about-senior">
          <div className="about-container about-split about-split-reverse">
            <div className="about-split-copy">
             
              <h2>
                Supporting senior citizens through
                <span> dedicated assistance.</span>
              </h2>

              <p>
                CivicFix also supports senior citizen assistance
                through a dedicated service workflow. It helps
                coordinate assistance requests and connects those
                requests with the responsible management teams and
                staff.
              </p>

              <ul className="about-checklist">
                {seniorPoints.map((point) => (
                  <li key={point}>
                    <CheckCircle2 size={22} />
                    {point}
                  </li>
                ))}
              </ul>

              <Link to="/login" className="about-btn about-btn-primary">
                Get started
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="about-senior-media">
              <div className="about-senior-main">
                <img
                  src={imgSeniorMain}
                  alt="A nurse checking the blood pressure of a senior citizen at home"
                  style={{ objectPosition: "center 45%" }}
                  loading="lazy"
                />
              </div>

              <div className="about-senior-side">
                <img
                  src={imgSeniorSide}
                  alt="A volunteer helping a senior citizen with his medication"
                  style={{ objectPosition: "center 40%" }}
                  loading="lazy"
                />
              </div>

              
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

export default About;