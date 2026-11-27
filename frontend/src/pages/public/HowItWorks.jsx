import { useEffect, useRef, useState } from "react";
import {
  UserRound,
  ClipboardList,
  MapPin,
  Building2,
  Search,
  UserCheck,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FileCheck2,
  HeartHandshake,
  AlertCircle,
  Lightbulb,
} from "lucide-react";

import { Link } from "react-router-dom";

import PublicNavbar from "../../components/public/PublicNavbar";
import PublicFooter from "../../components/public/PublicFooter";

import "./HowItWorks.css";

/* Images (put these files in src/assets, swap for your own any time) */
import imgHero from "../../assets/hm-s-road.jpg"; // road worker with fresh asphalt
import imgTips from "../../assets/hm-w-review.jpg"; // technician repairing a traffic signal
import imgSeniorMain from "../../assets/hm-senior-main.jpg"; // nurse and senior citizen
import imgSeniorSide from "../../assets/hm-senior-side.jpg"; // volunteer helping senior

/* ==========================================================================
   DATA
========================================================================== */

const citizenSteps = [
  {
    number: "01",
    icon: UserRound,
    title: "Create Your Account",
    description:
      "Register on CivicFix using your details. Once your account is ready, you can access the citizen platform and submit civic complaints.",
    tag: "Get Started",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Report a Civic Issue",
    description:
      "Choose the type of problem you want to report. Provide a clear title, description and the information needed to understand the issue.",
    tag: "Submit a Report",
  },
  {
    number: "03",
    icon: MapPin,
    title: "Provide Issue Location",
    description:
      "Add the location where the problem occurred. You can also provide supporting photographs when available to help explain the issue.",
    tag: "Add Details",
  },
  {
    number: "04",
    icon: Search,
    title: "Department Review",
    description:
      "Your submitted complaint enters the review process. The responsible team examines the report and determines the appropriate next action.",
    tag: "Under Review",
  },
  {
    number: "05",
    icon: UserCheck,
    title: "Assignment and Action",
    description:
      "Once approved, the complaint can be assigned to the relevant department and staff for further action.",
    tag: "Work in Progress",
  },
  {
    number: "06",
    icon: CheckCircle2,
    title: "Follow the Resolution",
    description:
      "Check your complaint status and follow its progress through the CivicFix platform as the issue moves through the resolution process.",
    tag: "Track Progress",
  },
];

const workflowStages = [
  {
    icon: ClipboardList,
    title: "Submitted",
    description: "Your complaint has been successfully submitted to CivicFix.",
    color: "blue",
  },
  {
    icon: Search,
    title: "Under Review",
    description: "The complaint is being examined by the responsible team.",
    color: "purple",
  },
  {
    icon: CheckCircle2,
    title: "Approved",
    description: "The complaint has passed the review stage and can proceed.",
    color: "green",
  },
  {
    icon: UserCheck,
    title: "Assigned",
    description: "The complaint has been assigned for departmental action.",
    color: "orange",
  },
  {
    icon: RefreshCw,
    title: "In Progress",
    description: "The assigned team is working on the reported issue.",
    color: "blue",
  },
  {
    icon: FileCheck2,
    title: "Resolved",
    description:
      "The responsible team has marked the reported issue as resolved.",
    color: "green",
  },
];

const additionalStatuses = [
  {
    title: "Transferred",
    description:
      "The complaint has been transferred to another responsible department.",
  },
  {
    title: "Rejected",
    description: "The complaint has not been approved after review.",
  },
  {
    title: "Reopened",
    description:
      "A previously resolved complaint has been reopened for further attention.",
  },
  {
    title: "Verified and Closed",
    description:
      "The resolution has passed the verification process and the complaint is closed.",
  },
];

const tips = [
  "Choose the category that best matches the problem",
  "Write a clear title and a short, factual description",
  "Add the exact location where the issue occurred",
  "Attach photographs when you have them",
];

const responsibilities = [
  {
    icon: UserRound,
    title: "Citizens",
    description:
      "Submit accurate reports, provide useful details and follow complaint updates.",
  },
  {
    icon: Building2,
    title: "Department Managers",
    description:
      "Review complaints, coordinate departmental work and manage assignments.",
  },
  {
    icon: UserCheck,
    title: "Department Staff",
    description: "Handle assigned work and update the progress of complaints.",
  },
];

/* ==========================================================================
   NAVBAR: stays visible while the page scrolls
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
        className="hiw-nav-spacer"
        style={{ height }}
        aria-hidden="true"
      />

      <div className="hiw-nav-shell" ref={shellRef}>
        <PublicNavbar />
      </div>
    </>
  );
}

/* ==========================================================================
   PAGE
========================================================================== */

function HowItWorks() {
  return (
    <>
      <StickyNav />

      <main className="hiw-page">
        {/* ---------------- HERO ---------------- */}

        <section className="hiw-hero">
          <div className="hiw-container hiw-hero-grid">
            <div className="hiw-hero-content">
             

              <h1>
                From reporting
                <span> to resolution.</span>
              </h1>

              <p>
                CivicFix makes civic issue reporting more organized and
                accessible. Discover how citizens report problems, how
                departments handle them and how progress can be tracked.
              </p>

              <div className="hiw-actions">
                <Link to="/register" className="hiw-btn hiw-btn-primary">
                  Get started
                  <ArrowRight size={18} />
                </Link>

                <Link to="/about" className="hiw-btn hiw-btn-outline">
                  About CivicFix
                </Link>
              </div>

              <ul className="hiw-hero-points">
                <li>
                  <ShieldCheck size={18} />
                  Organized reporting
                </li>
                <li>
                  <Clock size={18} />
                  Progress tracking
                </li>
                <li>
                  <Building2 size={18} />
                  Department coordination
                </li>
              </ul>
            </div>

            <div className="hiw-hero-visual">
              <div className="hiw-hero-photo">
                <img
                  src={imgHero}
                  alt="A road worker levelling fresh asphalt with a rake"
                  style={{ objectPosition: "center 50%" }}
                />
              </div>

              <div className="hiw-flow-card">
                <div className="hiw-flow-head">
                  <div>
                    <span className="hiw-flow-label">Complaint journey</span>

                    <h3>Issue progress</h3>
                  </div>

                  <span className="hiw-flow-head-icon">
                    <ClipboardCheck size={22} />
                  </span>
                </div>

                <ol className="hiw-flow-list">
                  <li className="is-done">
                    <span className="hiw-flow-dot">
                      <CheckCircle2 size={16} />
                    </span>

                    <div>
                      <strong>Issue submitted</strong>
                      <small>Complaint received</small>
                    </div>
                  </li>

                  <li className="is-done">
                    <span className="hiw-flow-dot">
                      <Search size={16} />
                    </span>

                    <div>
                      <strong>Under review</strong>
                      <small>Complaint being examined</small>
                    </div>
                  </li>

                  <li className="is-active">
                    <span className="hiw-flow-dot">
                      <UserCheck size={16} />
                    </span>

                    <div>
                      <strong>Department action</strong>
                      <small>Assigned for action</small>
                    </div>
                  </li>

                  <li>
                    <span className="hiw-flow-dot">
                      <FileCheck2 size={16} />
                    </span>

                    <div>
                      <strong>Resolution</strong>
                      <small>Final outcome</small>
                    </div>
                  </li>
                </ol>

                <p className="hiw-flow-foot">
                  <ShieldCheck size={16} />
                  Follow your complaint through its status updates.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- INTRODUCTION ---------------- */}

        <section className="hiw-section hiw-intro">
          <div className="hiw-container">
            <div className="hiw-heading">
              

              <h2>
                A clearer way to
                <span> report civic issues</span>
              </h2>

              <p>
                The CivicFix process connects citizen reports with the
                teams responsible for reviewing and handling civic
                issues.
              </p>
            </div>

            <div className="hiw-highlight">
              <span className="hiw-icon-box hiw-icon-box-lg">
                <ClipboardCheck size={30} />
              </span>

              <div>
                <h3>One platform. A structured workflow.</h3>

                <p>
                  From submitting a complaint to following its progress,
                  CivicFix provides a central place for citizens and
                  responsible teams to take part in the reporting
                  process.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- CITIZEN STEPS ---------------- */}

        <section className="hiw-section hiw-steps">
          <div className="hiw-container">
            <div className="hiw-heading">
             
              <h2>
                How to report an issue
                <span> step by step</span>
              </h2>

              <p>
                Follow these steps to submit a civic complaint and stay
                informed about its progress.
              </p>
            </div>

            <div className="hiw-steps-grid">
              {citizenSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <article className="hiw-card hiw-step" key={step.number}>
                    <div className="hiw-step-top">
                      <span className="hiw-icon-box">
                        <Icon size={24} />
                      </span>

                      <span className="hiw-step-number">{step.number}</span>
                    </div>

                    <h3>{step.title}</h3>

                    <p>{step.description}</p>

                    <span className="hiw-tag">{step.tag}</span>
                  </article>
                );
              })}
            </div>

            <div className="hiw-center">
              <Link to="/register" className="hiw-btn hiw-btn-primary">
                Register as a citizen
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        {/* ---------------- COMPLAINT STATUS ---------------- */}

        <section className="hiw-section hiw-status">
          <div className="hiw-container">
            <div className="hiw-heading">
            
              <h2>
                Understand your
                <span> complaint status</span>
              </h2>

              <p>
                Your complaint can move through different stages
                depending on the review, assignment and resolution
                process.
              </p>
            </div>

            <div className="hiw-status-grid">
              {workflowStages.map((stage, index) => {
                const Icon = stage.icon;

                return (
                  <article className="hiw-card hiw-stage" key={stage.title}>
                    <span className={`hiw-stage-icon ${stage.color}`}>
                      <Icon size={22} />
                    </span>

                    <div>
                      <span className="hiw-stage-number">
                        Stage {String(index + 1).padStart(2, "0")}
                      </span>

                      <h3>{stage.title}</h3>

                      <p>{stage.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hiw-additional">
              <div className="hiw-additional-head">
                <AlertCircle size={20} />

                <h3>Other possible status updates</h3>
              </div>

              <div className="hiw-additional-grid">
                {additionalStatuses.map((status) => (
                  <article key={status.title}>
                    <h4>{status.title}</h4>

                    <p>{status.description}</p>
                  </article>
                ))}
              </div>

              
            </div>
          </div>
        </section>

        {/* ---------------- TIPS (new section) ---------------- */}

        <section className="hiw-section hiw-tips">
          <div className="hiw-container hiw-split">
            <div className="hiw-photo-frame">
              <img
                src={imgTips}
                alt="A technician on a lift repairing a traffic signal"
                style={{ objectPosition: "center 40%" }}
                loading="lazy"
              />

              
            </div>

            <div className="hiw-split-copy">
           

              <h2>
                Tips for a
                <span> strong report</span>
              </h2>

              <p>
                The more clearly an issue is described, the easier it is
                for the responsible team to understand it and decide on
                the next action.
              </p>

              <ul className="hiw-checklist">
                {tips.map((tip) => (
                  <li key={tip}>
                    <CheckCircle2 size={22} />
                    {tip}
                  </li>
                ))}
              </ul>

              <Link to="/register" className="hiw-btn hiw-btn-primary">
                Report an issue
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>

        {/* ---------------- ROLES ---------------- */}

        <section className="hiw-section hiw-roles">
          <div className="hiw-container">
            <div className="hiw-heading">
             

              <h2>
                Everyone has a role
                <span> in civic improvement</span>
              </h2>

              <p>
                CivicFix brings citizens, department managers and staff
                together through an organized complaint management
                process.
              </p>
            </div>

            <div className="hiw-roles-grid">
              {responsibilities.map((role) => {
                const Icon = role.icon;

                return (
                  <article className="hiw-card" key={role.title}>
                    <span className="hiw-icon-box">
                      <Icon size={25} />
                    </span>

                    <h3>{role.title}</h3>

                    <p>{role.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------- SENIOR CITIZEN ASSISTANCE ---------------- */}

        <section className="hiw-section hiw-senior">
          <div className="hiw-container hiw-split hiw-split-reverse">
            <div className="hiw-split-copy">
             

              <h2>
                Senior citizen
                <span> assistance</span>
              </h2>

              <p>
                CivicFix provides a dedicated senior citizen assistance system to help elderly citizens receive the support they need. Assistance requests can be submitted and managed through a dedicated workflow, allowing senior citizen managers to review requests, coordinate with staff, and assign tasks efficiently. Assigned staff members can provide assistance, update request progress, and ensure that each request receives appropriate attention. This streamlined process improves coordination, transparency, and accessibility while helping senior citizens receive timely and reliable support.
              </p>

              <Link to="/login" className="hiw-btn hiw-btn-primary">
                Access CivicFix
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="hiw-senior-media">
              <div className="hiw-senior-main">
                <img
                  src={imgSeniorMain}
                  alt="A nurse checking the blood pressure of a senior citizen at home"
                  style={{ objectPosition: "center 45%" }}
                  loading="lazy"
                />
              </div>

              <div className="hiw-senior-side">
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

export default HowItWorks;