import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Search,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Users,
  ClipboardList,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Landmark,
  Mail,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import api, { getApiErrorMessage } from "../../api/axios";
import PublicNavbar from "../../components/public/PublicNavbar";
import PublicFooter from "../../components/public/PublicFooter";

import "./Departments.css";

/* Images (put these files in src/assets, swap for your own any time) */
import imgHero from "../../assets/hm-s-signal.jpg"; // technician repairing a traffic signal
import imgRoad from "../../assets/hm-c-road.jpg"; // road works crew
import imgSignal from "../../assets/hm-c-signal.jpg"; // worker at a traffic signal
import imgWaste from "../../assets/hm-c-waste.jpg"; // waste collection worker
import imgSenior from "../../assets/hm-c-senior.jpg"; // senior citizen assistance

/* Photos shown on the department cards (they repeat if there are more departments) */
import imgDir1 from "../../assets/hm-d-1.jpg"; // domed government building
import imgDir2 from "../../assets/hm-d-4.jpg"; // municipal office
import imgDir3 from "../../assets/hm-d-5.jpg"; // local government office
import imgDir4 from "../../assets/hm-d-2.jpg"; // heritage administrative building
import imgDir5 from "../../assets/hm-d-6.jpg"; // college of technology
import imgDir6 from "../../assets/hm-d-3.jpg"; // waterfront building

/* ==========================================================================
   DATA
========================================================================== */

const highlights = [
  {
    icon: Building2,
    title: "Department Directory",
    text: "Explore the active departments available through the CivicFix platform.",
  },
  {
    icon: ClipboardList,
    title: "Organized Coordination",
    text: "Departments help organize the review, assignment and handling of civic complaints.",
  },
  {
    icon: Users,
    title: "Connected Teams",
    text: "Department managers and staff participate in handling assigned responsibilities.",
  },
];

const directoryImages = [
  { src: imgDir1, pos: "center 40%" },
  { src: imgDir2, pos: "center 55%" },
  { src: imgDir3, pos: "center 50%" },
  { src: imgDir4, pos: "center 40%" },
  { src: imgDir5, pos: "center 55%" },
  { src: imgDir6, pos: "center 50%" },
];

const areas = [
  {
    img: imgRoad,
    pos: "center 50%",
    title: "Roads and streets",
    text: "Road surfaces, repairs and street maintenance.",
  },
  {
    img: imgSignal,
    pos: "center 40%",
    title: "Traffic and utilities",
    text: "Signals, poles and public utility infrastructure.",
  },
  {
    img: imgWaste,
    pos: "center 45%",
    title: "Waste and sanitation",
    text: "Collection, cleanliness and public hygiene.",
  },
  {
    img: imgSenior,
    pos: "center 50%",
    title: "Community care",
    text: "Senior citizen assistance and public health services.",
  },
];

const processSteps = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Review Reports",
    text: "Submitted complaints are reviewed to understand the reported issue and determine the next action.",
  },
  {
    number: "02",
    icon: Users,
    title: "Coordinate Teams",
    text: "Department managers coordinate the relevant staff and responsibilities for handling reports.",
  },
  {
    number: "03",
    icon: CheckCircle2,
    title: "Update Progress",
    text: "Assigned teams work on complaints and update their progress through the platform.",
  },
];

/* ==========================================================================
   ANIMATION HELPERS
========================================================================== */

/* Adds "is-visible" to every .dept-reveal / .dept-stagger block once it
   scrolls into view, so sections fade and slide in one after another. */
function useScrollReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll(".dept-reveal, .dept-stagger");

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

/* Smoothly counts up to a number (used for the active departments badge) */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (typeof target !== "number") return undefined;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced || target === 0) {
      setValue(target);
      return undefined;
    }

    const start = performance.now();
    let frame;

    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      setValue(Math.round(target * eased));

      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

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
        className="dept-nav-spacer"
        style={{ height }}
        aria-hidden="true"
      />

      <div className="dept-nav-shell" ref={shellRef}>
        <PublicNavbar />
      </div>
    </>
  );
}

/* ==========================================================================
   PAGE
========================================================================== */

function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useScrollReveal();

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Use the existing CivicFix active-departments endpoint.
      const response = await api.get("/departments/active/");

      const data = response.data;

      const departmentList = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setDepartments(departmentList);
    } catch (err) {
      setDepartments([]);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return departments;

    return departments.filter((department) => {
      const searchableValues = [
        department.name,
        department.department_name,
        department.description,
        department.short_description,
        department.code,
        department.email,
        department.contact_email,
        department.phone,
        department.phone_number,
        department.location,
        department.address,
      ];

      return searchableValues.some((value) =>
        String(value || "").toLowerCase().includes(query)
      );
    });
  }, [departments, search]);

  const getDepartmentName = (department) =>
    department.name || department.department_name || "Department";

  const getDepartmentDescription = (department) =>
    department.description ||
    department.short_description ||
    department.about ||
    "This department is part of the CivicFix public service directory.";

  const getDepartmentContact = (department) =>
    department.email ||
    department.contact_email ||
    department.phone ||
    department.phone_number ||
    "";

  const getDepartmentLocation = (department) =>
    department.location || department.address || "";

  const animatedCount = useCountUp(loading ? null : departments.length);

  const clearSearch = () => setSearch("");

  return (
    <>
      <StickyNav />

      <main className="dept-page">
        {/* ---------------- HERO ---------------- */}

        <section className="dept-hero">
          <div className="dept-container dept-hero-grid">
            <div className="dept-hero-content">
             

              <h1>
                The departments behind
                <span> better communities.</span>
              </h1>

              <p>
                Explore the departments connected through CivicFix. Find
                the teams responsible for handling civic services and
                coordinating responses to reported community issues.
              </p>

              <div className="dept-actions">
                <a href="#directory" className="dept-btn dept-btn-primary">
                  Browse directory
                  <ArrowRight size={18} />
                </a>

                <Link to="/how-it-works" className="dept-btn dept-btn-outline">
                  How it works
                </Link>
              </div>

              <ul className="dept-hero-points">
                <li>
                  <ShieldCheck size={18} />
                  Organized services
                </li>
                <li>
                  <Building2 size={18} />
                  Department directory
                </li>
                <li>
                  <ClipboardList size={18} />
                  Issue coordination
                </li>
              </ul>
            </div>

            <div className="dept-hero-visual">
              <div className="dept-hero-photo">
                <img
                  src={imgHero}
                  alt="A technician on a lift repairing a traffic signal"
                  style={{ objectPosition: "center 40%" }}
                />
              </div>

            
            </div>
          </div>
        </section>

        {/* ---------------- INTRODUCTION ---------------- */}

        <section className="dept-section dept-intro">
          <div className="dept-container">
            <div className="dept-heading dept-reveal">
              

              <h2>
                Discover the teams
                <span> serving your community</span>
              </h2>

              <p>
                CivicFix provides a shared platform where citizens can
                discover participating departments and understand the
                teams involved in civic issue management.
              </p>
            </div>

            <div className="dept-grid-3 dept-stagger">
              {highlights.map((item) => {
                const Icon = item.icon;

                return (
                  <article className="dept-card-plain" key={item.title}>
                    <span className="dept-icon-box">
                      <Icon size={24} />
                    </span>

                    <h3>{item.title}</h3>

                    <p>{item.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------- DIRECTORY ---------------- */}

        <section
          className="dept-section dept-directory"
          id="directory"
        >
          <div className="dept-container">
            <div className="dept-directory-head dept-reveal">
              <div>
               

                <h2>Department directory</h2>

                <p>
                  Browse the departments currently available on the
                  CivicFix platform.
                </p>
              </div>

              <button
                type="button"
                className="dept-refresh"
                onClick={loadDepartments}
                disabled={loading}
              >
                <RefreshCw
                  size={16}
                  className={loading ? "dept-spin" : ""}
                />
                Refresh
              </button>
            </div>

            {/* Search */}
            <div className="dept-search-area dept-reveal">
              <div className="dept-search-box">
                <Search size={19} />

                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search departments by name, description or contact..."
                  aria-label="Search departments"
                />

                {search && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Clear search"
                  >
                    <X size={17} />
                  </button>
                )}
              </div>

              <div className="dept-result-count">
                <Building2 size={16} />

                <span>
                  {loading
                    ? "Loading departments..."
                    : `${filteredDepartments.length} department${
                        filteredDepartments.length === 1 ? "" : "s"
                      } found`}
                </span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="dept-message dept-error" role="alert">
                <AlertCircle size={20} />

                <div>
                  <strong>Unable to load departments</strong>

                  <p>{error}</p>

                  <button type="button" onClick={loadDepartments}>
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Loading (skeleton cards) */}
            {loading && (
              <div
                className="dept-cards-grid"
                aria-busy="true"
                aria-label="Loading departments"
              >
                {[0, 1, 2].map((item) => (
                  <div className="dept-skeleton" key={item}>
                    <span className="dept-skeleton-media" />

                    <div className="dept-skeleton-body">
                      <span className="dept-skeleton-line short" />
                      <span className="dept-skeleton-line title" />
                      <span className="dept-skeleton-line" />
                      <span className="dept-skeleton-line" />
                      <span className="dept-skeleton-line half" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!loading && !error && filteredDepartments.length === 0 && (
              <div className="dept-state">
                <span className="dept-icon-box dept-icon-box-lg">
                  {search ? <Search size={28} /> : <Building2 size={28} />}
                </span>

                <h3>
                  {search
                    ? "No matching departments"
                    : "No departments available"}
                </h3>

                <p>
                  {search
                    ? "Try another search term to find a department."
                    : "There are currently no active departments available in the directory."}
                </p>

                {search && (
                  <button
                    type="button"
                    className="dept-state-button"
                    onClick={clearSearch}
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}

            {/* Cards */}
            {!loading && !error && filteredDepartments.length > 0 && (
              <div className="dept-cards-grid">
                {filteredDepartments.map((department, index) => {
                  const name = getDepartmentName(department);
                  const description = getDepartmentDescription(department);
                  const contact = getDepartmentContact(department);
                  const location = getDepartmentLocation(department);
                  const photo = directoryImages[index % directoryImages.length];

                  return (
                    <article
                      className="dept-card"
                      style={{ "--i": Math.min(index, 8) }}
                      key={department.id ?? department.pk ?? `${name}-${index}`}
                    >
                      <div className="dept-card-media">
                        <img
                          src={photo.src}
                          alt=""
                          style={{ objectPosition: photo.pos }}
                          loading="lazy"
                        />

                        <span className="dept-active-badge">
                          <i />
                          Active
                        </span>
                      </div>

                      <div className="dept-card-main">
                        <span className="dept-icon-box dept-card-icon">
                          <Building2 size={24} />
                        </span>

                        <div className="dept-card-body">
                          <span className="dept-card-label">
                            CivicFix department
                          </span>

                          <h3>{name}</h3>

                          <p>{description}</p>

                          {location && (
                            <div className="dept-card-detail">
                              <MapPin size={16} />
                              <span>{location}</span>
                            </div>
                          )}

                          {contact && (
                            <div className="dept-card-detail">
                              <Mail size={16} />
                              <span>{contact}</span>
                            </div>
                          )}
                        </div>

                        <div className="dept-card-footer">
                          <span>Department information</span>
                          <ArrowRight size={17} />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ---------------- AREAS (new section) ---------------- */}

        <section className="dept-section dept-areas">
          <div className="dept-container">
            <div className="dept-heading dept-reveal">
              

              <h2>
                Civic areas
                <span> handled by our teams</span>
              </h2>

              <p>
                Departments take care of everyday services that keep
                public spaces safe, clean and well maintained.
              </p>
            </div>

            <div className="dept-areas-grid dept-stagger">
              {areas.map((area) => (
                <article className="dept-area" key={area.title}>
                  <img
                    src={area.img}
                    alt={area.title}
                    style={{ objectPosition: area.pos }}
                    loading="lazy"
                  />

                  <span className="dept-area-shade" />

                  <div className="dept-area-body">
                    <h3>{area.title}</h3>

                    <p>{area.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- PROCESS ---------------- */}

        <section className="dept-section dept-process">
          <div className="dept-container">
            <div className="dept-heading dept-reveal">
             

              <h2>
                From citizen report
                <span> to department action</span>
              </h2>

              <p>
                Departments participate in the complaint management
                process through review, assignment and resolution
                activities.
              </p>
            </div>

            <div className="dept-grid-3 dept-stagger">
              {processSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <article className="dept-card-plain" key={step.number}>
                    <div className="dept-process-top">
                      <span className="dept-icon-box">
                        <Icon size={24} />
                      </span>

                      <span className="dept-process-number">
                        {step.number}
                      </span>
                    </div>

                    <h3>{step.title}</h3>

                    <p>{step.text}</p>
                  </article>
                );
              })}
            </div>

            <div className="dept-center dept-reveal">
              <Link to="/how-it-works" className="dept-btn dept-btn-primary">
                Learn how CivicFix works
                <ArrowRight size={18} />
              </Link>
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

export default Departments;