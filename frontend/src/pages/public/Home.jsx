import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Link } from 'react-router-dom';

import PublicNavbar from '../../components/public/PublicNavbar';
import PublicFooter from '../../components/public/PublicFooter';

import './Home.css';

/* ---- Existing images that are still sharp enough to use ---- */
import imgPower from '../../assets/e3.jpg'; // lineman on a utility pole
import imgWater from '../../assets/p3.jpg'; // plumber fixing a leaking pipe
import imgHealthcare from '../../assets/h2.jpg'; // nurse and patient in corridor

/* ---- New high-resolution images (generated from your pexels photos) ---- */
// Hero slideshow
import imgSlideRoad from '../../assets/hm-s-road.jpg';
import imgSlideSignal from '../../assets/hm-s-signal.jpg';
import imgSlideWaste from '../../assets/hm-s-waste.jpg';
import imgSlideHealth from '../../assets/hm-s-health.jpg';
import imgSlideSenior from '../../assets/hm-s-senior.jpg';
// Service cards
import imgCardRoad from '../../assets/hm-c-road.jpg';
import imgCardSignal from '../../assets/hm-c-signal.jpg';
import imgCardWaste from '../../assets/hm-c-waste.jpg';
import imgCardClean from '../../assets/hm-c-clean.jpg';
import imgCardSenior from '../../assets/hm-c-senior.jpg';
// Senior section
import imgSeniorMain from '../../assets/hm-senior-main.jpg';
import imgSeniorSide from '../../assets/hm-senior-side.jpg';
// Workflow
import imgFlowReview from '../../assets/hm-w-review.jpg';
import imgFlowAction from '../../assets/hm-w-action.jpg';
import imgFlowDone from '../../assets/hm-w-done.jpg';
// Final call to action
import imgCta from '../../assets/hm-cta.jpg';

/* ==========================================================================
   DATA
========================================================================== */

const SLIDE_DURATION = 6000;

/*
  Hero slideshow
  Every photo is high resolution and its caption matches what the photo shows.
*/
const slides = [
  {
    src: imgSlideRoad,
    alt: 'A road worker levelling fresh asphalt with a rake',
    tag: 'Roads and streets',
    title: 'Report damaged roads in minutes',
    text: 'Pin the location, add evidence and send it to the responsible department.',
    position: 'center 50%',
  },
  {
    src: imgSlideSignal,
    alt: 'A technician on a lift repairing a traffic signal',
    tag: 'Traffic signals',
    title: 'Faulty signals, flagged quickly',
    text: 'Tell the team about signals that are broken or unsafe at your junction.',
    position: 'center 40%',
  },
  {
    src: imgPower,
    alt: 'A lineman working on utility cables from a ladder',
    tag: 'Electricity and poles',
    title: 'Unsafe poles and cabling',
    text: 'Raise concerns about utility poles and overhead cabling in your area.',
    position: 'center 30%',
  },
  {
    src: imgWater,
    alt: 'A plumber repairing a leaking water pipe',
    tag: 'Water supply',
    title: 'Leaks and supply problems',
    text: 'Raise issues that affect water services and follow the repair.',
    position: 'center 40%',
  },
  {
    src: imgSlideWaste,
    alt: 'Waste collection crew wheeling bins along a busy street',
    tag: 'Waste collection',
    title: 'Missed pickups and uncollected waste',
    text: 'Report waste collection problems and sanitation concerns.',
    position: 'center 55%',
  },
  {
    src: imgSlideHealth,
    alt: 'A caregiver attending to a patient who is resting in bed',
    tag: 'Healthcare facilities',
    title: 'Concerns about public health services',
    text: 'Share feedback about healthcare services with the responsible team.',
    position: 'center 40%',
  },
  {
    src: imgSlideSenior,
    alt: 'A young volunteer helping a senior citizen with his medication',
    tag: 'Senior citizen assistance',
    title: 'Support for senior citizens',
    text: 'Request assistance for senior citizens and follow each request.',
    position: 'center 40%',
  },
];

const categories = [
  'Roads and streets',
  'Traffic signals',
  'Electricity and poles',
  'Water supply',
  'Drainage',
  'Waste collection',
  'Sanitation',
  'Healthcare facilities',
  'Senior citizen assistance',
  'Public spaces',
];

const rotatingWords = [
  'damaged roads',
  'faulty signals',
  'water leaks',
  'power concerns',
  'waste collection',
  'health services',
];

/* Live tracker (illustration of the complaint workflow) */
const trackerSteps = [
  { label: 'Submitted', note: 'Complaint received', tone: 'amber' },
  { label: 'Under review', note: 'Department reviews it', tone: 'amber' },
  { label: 'Assigned', note: 'Passed to department staff', tone: 'blue' },
  { label: 'In progress', note: 'Follow-up work under way', tone: 'sky' },
  { label: 'Resolved', note: 'Outcome ready to review', tone: 'green' },
];

const serviceAreas = [
  {
    img: imgCardRoad,
    pos: 'center 50%',
    title: 'Roads and streets',
    text: 'Report damaged roads and surfaces that need maintenance.',
  },
  {
    img: imgCardSignal,
    pos: 'center 40%',
    title: 'Traffic signals',
    text: 'Flag faulty or unsafe signals at junctions.',
  },
  {
    img: imgPower,
    pos: 'center 30%',
    title: 'Electricity and poles',
    text: 'Raise concerns about utility poles and cabling.',
  },
  {
    img: imgWater,
    pos: 'center 30%',
    title: 'Water supply',
    text: 'Report leaks and issues affecting water services.',
  },
  {
    img: imgCardWaste,
    pos: 'center 45%',
    title: 'Waste collection',
    text: 'Report missed pickups and uncollected waste in your area.',
  },
  {
    img: imgCardClean,
    pos: 'center 50%',
    title: 'Sanitation and cleanliness',
    text: 'Flag overflowing bins, litter and unclean public spaces.',
  },
  {
    img: imgHealthcare,
    pos: 'center 40%',
    title: 'Healthcare facilities',
    text: 'Share concerns about public health services.',
  },
  {
    img: imgCardSenior,
    pos: 'center 50%',
    title: 'Senior citizen assistance',
    text: 'Request help for senior citizens and follow progress.',
  },
];

const features = [
  {
    number: '01',
    icon: 'pin',
    title: 'Report Civic Issues',
    description:
      'Submit a complaint about a civic issue and provide the information and supporting evidence required by the platform.',
  },
  {
    number: '02',
    icon: 'activity',
    title: 'Follow Your Complaint',
    description:
      'Access your submitted complaints and review the latest status information available from the system.',
  },
  {
    number: '03',
    icon: 'check',
    title: 'Track Resolution',
    description:
      'Review resolution details and use the verification or reopening actions when permitted by the complaint workflow.',
  },
];

const workflow = [
  {
    number: '01',
    title: 'Submit an issue',
    short: 'Sign in and describe the problem',
    description:
      'Sign in to your citizen account and submit a complaint with the required details.',
    img: imgWater,
    pos: 'center 35%',
    alt: 'A water pipe leak that a citizen might report',
  },
  {
    number: '02',
    title: 'Department review',
    short: 'The responsible team looks at it',
    description:
      'The responsible department reviews the complaint according to its existing workflow.',
    img: imgFlowReview,
    pos: 'center 40%',
    alt: 'A technician on a lift inspecting a traffic signal',
  },
  {
    number: '03',
    title: 'Assignment and action',
    short: 'Work is assigned and carried out',
    description:
      'Eligible complaints can be assigned to department staff for the permitted follow-up actions.',
    img: imgFlowAction,
    pos: 'center 60%',
    alt: 'A road crew carrying out work along the kerb',
  },
  {
    number: '04',
    title: 'Review the outcome',
    short: 'Verify or reopen when allowed',
    description:
      'Check the reported resolution and use any verification or reopening options available to you.',
    img: imgFlowDone,
    pos: 'center 60%',
    alt: 'A freshly laid asphalt road after the work is complete',
  },
];

/*
  OPTIONAL LIVE NUMBERS
  Add real figures here and a count-up strip appears automatically.
  Example: { value: 1250, suffix: '+', label: 'Complaints received' }
  Leave the array empty to hide the strip (nothing is invented).
*/
const impactStats = [];

const faqs = [
  {
    question: 'Who can submit a complaint?',
    answer:
      'Citizens with a registered CivicFix account can submit complaints. Create an account, sign in and use the complaint form.',
  },
  {
    question: 'Can I attach evidence to a complaint?',
    answer:
      'Yes. The complaint form lets you add the supporting information and evidence that the platform requires or allows.',
  },
  {
    question: 'How do I follow the progress of my complaint?',
    answer:
      'Open My Complaints from your citizen dashboard to see the latest status information, along with notifications and messages.',
  },
  {
    question: 'Can I request help for a senior citizen?',
    answer:
      'Yes. The citizen portal includes senior citizen assistance, where you can submit a request and follow its updates.',
  },
  {
    question: 'What if the issue is not really fixed?',
    answer:
      'When the complaint workflow permits it, you can verify the resolution or reopen the complaint from its details page.',
  },
];

/* ==========================================================================
   HOOKS
========================================================================== */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }

    const query = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    setReduced(query.matches);

    const onChange = (event) => setReduced(event.matches);

    query.addEventListener?.('change', onChange);

    return () => query.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}

function useInView({ threshold = 0.15, once = false } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);

          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [threshold, once]);

  return [ref, inView];
}

function useNow(interval = 1000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), interval);

    return () => clearInterval(timer);
  }, [interval]);

  return now;
}

function useScrollState() {
  const [state, setState] = useState({ progress: 0, past: false });

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;

      const max =
        document.documentElement.scrollHeight - window.innerHeight;

      const top = window.scrollY;

      setState({
        progress: max > 0 ? Math.min(1, top / max) : 0,
        past: top > 700,
      });
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);

      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return state;
}

/* ==========================================================================
   SMALL BUILDING BLOCKS
========================================================================== */

/*
  Keeps the navbar pinned to the top while scrolling.
  The navbar sits in a fixed shell, so it stays visible even if a parent
  element (like .public-site) has overflow rules that break position: sticky.
  A spacer with the same height keeps the page content from jumping under it.
*/
function StickyNav() {
  const shellRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const node = shellRef.current;

    if (!node) return undefined;

    const measure = () => setHeight(node.offsetHeight);

    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);

      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        className="hm-nav-spacer"
        style={{ height }}
        aria-hidden="true"
      />

      <div className="hm-nav-shell" ref={shellRef}>
        <PublicNavbar />
      </div>
    </>
  );
}

/* Fades and slides content in as it scrolls into view */
function Reveal({
  as: Tag = 'div',
  delay = 0,
  className = '',
  children,
  ...rest
}) {
  const [ref, inView] = useInView({ threshold: 0.12, once: true });
  const [settled, setSettled] = useState(false);

  /* After the entrance, drop the delay so hover effects stay snappy */
  useEffect(() => {
    if (!inView) return undefined;

    const timer = setTimeout(() => setSettled(true), delay + 800);

    return () => clearTimeout(timer);
  }, [inView, delay]);

  return (
    <Tag
      ref={ref}
      className={`hm-reveal ${inView ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: settled ? '0ms' : `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

function CountUp({ value, suffix = '', duration = 1600 }) {
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView({ threshold: 0.4, once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;

    if (reduced) {
      setDisplay(value);
      return undefined;
    }

    const start = performance.now();
    let frame;

    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplay(Math.round(value * eased));

      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref}>
      {display.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

/* Cycles through words with a short slide animation */
function RotatingWord({ words }) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return undefined;

    const timer = setInterval(
      () => setIndex((value) => (value + 1) % words.length),
      2400
    );

    return () => clearInterval(timer);
  }, [reduced, words.length]);

  return (
    <span className="hm-rotator" aria-live="off">
      <span key={index} className="hm-rotator-word">
        {words[index]}
      </span>
    </span>
  );
}

/* ==========================================================================
   ICONS
========================================================================== */

function Icon({ children, size = 20, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

const ArrowIcon = () => (
  <Icon size={18}>
    <path d="M5 12H19M12 5L19 12L12 19" />
  </Icon>
);

const ChevronLeft = () => (
  <Icon>
    <path d="M15 5L8 12L15 19" />
  </Icon>
);

const ChevronRight = () => (
  <Icon>
    <path d="M9 5L16 12L9 19" />
  </Icon>
);

const PlayIcon = () => (
  <Icon size={16}>
    <path d="M7 4.5L19 12L7 19.5V4.5Z" fill="currentColor" />
  </Icon>
);

const PauseIcon = () => (
  <Icon size={16}>
    <path d="M8 5V19M16 5V19" strokeWidth="3" />
  </Icon>
);

const ShieldIcon = () => (
  <Icon size={22}>
    <path d="M12 3L20 6V11.5C20 16.2 16.8 20 12 21C7.2 20 4 16.2 4 11.5V6L12 3Z" />
    <path d="M8.5 12L10.8 14.3L15.8 9.3" />
  </Icon>
);

const PinIcon = () => (
  <Icon size={24}>
    <path d="M12 21C12 21 19 14.8 19 9.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icon>
);

const ActivityIcon = () => (
  <Icon size={24}>
    <path d="M3 12H7L10 4L14 20L17 12H21" />
  </Icon>
);

const CheckCircleIcon = () => (
  <Icon size={24}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5L11 15.5L16.5 9.5" />
  </Icon>
);

const PlusIcon = () => (
  <Icon size={18}>
    <path d="M12 5V19M5 12H19" />
  </Icon>
);

const UpIcon = () => (
  <Icon size={20}>
    <path d="M12 19V5M5 12L12 5L19 12" />
  </Icon>
);

const ClockIcon = () => (
  <Icon size={16}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7V12L15 14" />
  </Icon>
);

const featureIcons = {
  pin: PinIcon,
  activity: ActivityIcon,
  check: CheckCircleIcon,
};

/* ==========================================================================
   HERO: blurred backdrop + image slideshow + live tracker
========================================================================== */

function LiveTracker() {
  const reduced = usePrefersReducedMotion();
  const now = useNow(1000);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced) return undefined;

    const last = step === trackerSteps.length - 1;

    const timer = setTimeout(
      () => setStep((value) => (value + 1) % trackerSteps.length),
      last ? 3400 : 2300
    );

    return () => clearTimeout(timer);
  }, [step, reduced]);

  const active = reduced ? trackerSteps.length - 1 : step;
  const current = trackerSteps[active];

  return (
    <aside
      className="hm-tracker"
      aria-label="Example of the complaint workflow"
    >
      <div className="hm-tracker-head">
        <div className="hm-tracker-title">
          <span className="hm-live">
            <i />
            Live
          </span>

          <strong>Example complaint</strong>

          <span
            key={active}
            className={`hm-status hm-status-${current.tone}`}
          >
            {current.label}
          </span>
        </div>

        <span className="hm-clock">
          <ClockIcon />
          {now.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
          {' · '}
          {now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      </div>

      <ol className="hm-tracker-steps">
        {trackerSteps.map((item, i) => (
          <li
            key={item.label}
            className={`${i < active ? 'is-done' : ''} ${
              i === active ? 'is-active' : ''
            }`}
          >
            <span className="hm-tracker-dot">
              {i < active ? '✓' : i + 1}
            </span>

            <span className="hm-tracker-copy">
              <strong>{item.label}</strong>
              <small>{item.note}</small>
            </span>
          </li>
        ))}
      </ol>

      <p className="hm-tracker-note">
        Illustration of the workflow. Your own complaints show
        their real status.
      </p>
    </aside>
  );
}

function Hero() {
  const reduced = usePrefersReducedMotion();

  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  const touchStart = useRef(null);
  const total = slides.length;

  const next = useCallback(
    () => setIndex((value) => (value + 1) % total),
    [total]
  );

  const prev = useCallback(
    () => setIndex((value) => (value - 1 + total) % total),
    [total]
  );

  const autoplay = !reduced && !userPaused;
  const holding = hovering || focused;

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      prev();
    }
  };

  const handleTouchStart = (event) => {
    touchStart.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (touchStart.current === null) return;

    const delta =
      event.changedTouches[0].clientX - touchStart.current;

    touchStart.current = null;

    if (Math.abs(delta) > 45) {
      if (delta < 0) next();
      else prev();
    }
  };

  return (
    <section className="hm-hero">
      {/* Blurred, tinted copy of the active photo fills the whole hero */}
      <div className="hm-hero-backdrop" aria-hidden="true">
        {slides.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt=""
            className={i === index ? 'is-active' : ''}
          />
        ))}

        <span className="hm-hero-tint" />
      </div>

      <span className="hm-orb hm-orb-one" aria-hidden="true" />
      <span className="hm-orb hm-orb-two" aria-hidden="true" />
      <span className="hm-grid-pattern" aria-hidden="true" />

      <div className="hm-container hm-hero-grid">
        <div className="hm-hero-copy">
          <h1>
            Better communities
            <br />

            <span>start with action.</span>
          </h1>

          <p className="hm-lead">
            Report civic issues, follow complaint progress, and
            access a clearer process for engaging with the services
            responsible for your community.
          </p>

          <p className="hm-report-line">
            <span>Report</span>

            <RotatingWord words={rotatingWords} />
          </p>

          <div className="hm-actions">
            <Link to="/register" className="hm-btn hm-btn-primary hm-btn-lg">
              Get Started
              <ArrowIcon />
            </Link>

            <Link
              to="/how-it-works"
              className="hm-btn hm-btn-ghost hm-btn-lg"
            >
              See How It Works
            </Link>
          </div>

          <div className="hm-assurance">
            <span className="hm-assurance-icon">
              <ShieldIcon />
            </span>

            <div>
              <strong>One platform, clear progress</strong>

              <span>
                Follow the complaint workflow from submission to
                the available resolution updates.
              </span>
            </div>
          </div>
        </div>

        <div className="hm-hero-visual">
          <div
            className="hm-slider"
            role="region"
            aria-roledescription="carousel"
            aria-label="Civic service areas"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onFocus={(event) => {
              if (event.target.matches?.(':focus-visible')) {
                setFocused(true);
              }
            }}
            onBlur={() => setFocused(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {autoplay && (
              <span
                key={index}
                className="hm-progress"
                style={{
                  animationDuration: `${SLIDE_DURATION}ms`,
                  animationPlayState: holding ? 'paused' : 'running',
                }}
                onAnimationEnd={next}
                aria-hidden="true"
              />
            )}

            <div className="hm-slides">
              {slides.map((slide, i) => (
                <figure
                  key={slide.src}
                  className={`hm-slide ${i === index ? 'is-active' : ''}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${total}`}
                  aria-hidden={i !== index}
                >
                  <img
                    src={slide.src}
                    alt={slide.alt}
                    style={{ objectPosition: slide.position }}
                    loading="eager"
                    decoding="async"
                  />

                  <figcaption>
                    <span className="hm-slide-tag">{slide.tag}</span>

                    <strong>{slide.title}</strong>

                    <span>{slide.text}</span>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className="hm-slider-controls">
              <div className="hm-dots" role="tablist" aria-label="Choose slide">
                {slides.map((slide, i) => (
                  <button
                    key={slide.tag}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Show slide ${i + 1}: ${slide.tag}`}
                    className={`hm-dot ${i === index ? 'is-active' : ''}`}
                    onClick={() => setIndex(i)}
                  />
                ))}
              </div>

              <div className="hm-arrows">
                {!reduced && (
                  <button
                    type="button"
                    className="hm-arrow"
                    onClick={() => setUserPaused((value) => !value)}
                    aria-label={
                      userPaused ? 'Play slideshow' : 'Pause slideshow'
                    }
                  >
                    {userPaused ? <PlayIcon /> : <PauseIcon />}
                  </button>
                )}

                <button
                  type="button"
                  className="hm-arrow"
                  onClick={prev}
                  aria-label="Previous slide"
                >
                  <ChevronLeft />
                </button>

                <button
                  type="button"
                  className="hm-arrow"
                  onClick={next}
                  aria-label="Next slide"
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hm-container hm-hero-live">
        <LiveTracker />
      </div>
    </section>
  );
}

/* ==========================================================================
   WORKFLOW SHOWCASE: stepper + photo that changes with each stage
========================================================================== */

function WorkflowShowcase() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [ref, inView] = useInView({ threshold: 0.3 });

  useEffect(() => {
    if (reduced || hovering || !inView) return undefined;

    const timer = setTimeout(
      () => setActive((value) => (value + 1) % workflow.length),
      5500
    );

    return () => clearTimeout(timer);
  }, [active, reduced, hovering, inView]);

  const current = workflow[active];

  return (
    <div
      className="hm-showcase"
      ref={ref}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <ol className="hm-step-list">
        {workflow.map((item, i) => (
          <li key={item.number}>
            <button
              type="button"
              className={`hm-step ${
                i === active ? 'is-active' : ''
              } ${i < active ? 'is-done' : ''}`}
              onClick={() => setActive(i)}
              aria-current={i === active ? 'step' : undefined}
            >
              <span className="hm-step-number">
                {i < active ? '✓' : item.number}
              </span>

              <span className="hm-step-text">
                <strong>{item.title}</strong>
                <small>{item.short}</small>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="hm-showcase-media">
        {workflow.map((item, i) => (
          <img
            key={item.number}
            src={item.img}
            alt={i === active ? item.alt : ''}
            style={{ objectPosition: item.pos }}
            className={i === active ? 'is-active' : ''}
            loading="lazy"
          />
        ))}

        <span className="hm-showcase-shade" />

        <div key={current.number} className="hm-showcase-caption">
          <span className="hm-showcase-number">{current.number}</span>

          <div>
            <h3>{current.title}</h3>

            <p>{current.description}</p>
          </div>
        </div>

        <div className="hm-showcase-meter" aria-hidden="true">
          {workflow.map((item, i) => (
            <span
              key={item.number}
              className={i <= active ? 'is-filled' : ''}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   FAQ ACCORDION
========================================================================== */

function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <div className="hm-faq">
      {faqs.map((item, i) => {
        const isOpen = open === i;

        return (
          <div
            key={item.question}
            className={`hm-faq-item ${isOpen ? 'is-open' : ''}`}
          >
            <h3>
              <button
                type="button"
                className="hm-faq-question"
                aria-expanded={isOpen}
                aria-controls={`hm-faq-${i}`}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                <span>{item.question}</span>

                <span className="hm-faq-icon">
                  <PlusIcon />
                </span>
              </button>
            </h3>

            <div
              id={`hm-faq-${i}`}
              className="hm-faq-answer"
              role="region"
            >
              <div>
                <p>{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   PAGE
========================================================================== */

export default function Home() {
  const marquee = [...categories, ...categories];
  const { progress, past } = useScrollState();

  return (
    <div className="public-site hm-page">
      <div
        className="hm-scroll-progress"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />

      {/* Navbar stays visible while scrolling */}
      <StickyNav />

      <main>
        <Hero />

        {/* ---------------- Service categories ticker ---------------- */}

        <section
          className="hm-ticker"
          aria-label="Civic service areas"
        >
          <div className="hm-marquee">
            <ul className="hm-marquee-track">
              {marquee.map((item, i) => (
                <li
                  key={`${item}-${i}`}
                  aria-hidden={i >= categories.length}
                >
                  <i />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------- Optional live numbers ---------------- */}

        {impactStats.length > 0 && (
          <section className="hm-stats">
            <div className="hm-container hm-stats-grid">
              {impactStats.map((stat) => (
                <div className="hm-stat" key={stat.label}>
                  <strong>
                    <CountUp value={stat.value} suffix={stat.suffix} />
                  </strong>

                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------------- Service areas (photo cards) ---------------- */}

        <section className="hm-section hm-services">
          <div className="hm-container">
            <Reveal className="hm-heading">
            

              <h2>Issues that affect everyday community life.</h2>

              <p>
                Examples of the kinds of civic concerns citizens can
                bring to the responsible departments.
              </p>
            </Reveal>

            <div className="hm-service-grid">
              {serviceAreas.map((area, i) => (
                <Reveal
                  as="article"
                  key={area.title}
                  delay={(i % 4) * 80}
                  className="hm-service"
                >
                  <img
                    src={area.img}
                    alt={area.title}
                    style={{ objectPosition: area.pos }}
                    loading="lazy"
                  />

                  <span className="hm-service-shade" />

                  <div className="hm-service-body">
                    <h3>{area.title}</h3>

                    <p>{area.text}</p>

                    <Link to="/register" className="hm-service-link">
                      Report an issue
                      <ArrowIcon />
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal className="hm-center" delay={60}>
              <Link to="/departments" className="hm-btn hm-btn-outline">
                View departments
                <ArrowIcon />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ---------------- What CivicFix offers ---------------- */}

        <section className="hm-section hm-features">
          <div className="hm-container">
            <Reveal className="hm-heading">
              

              <h2>A clearer way to engage with civic services.</h2>

              <p>
                Access the complaint-management workflow through a
                single citizen-facing platform designed to organize
                reporting, updates, and resolution information.
              </p>
            </Reveal>

            <div className="hm-feature-grid">
              {features.map((feature, i) => {
                const FeatureIcon = featureIcons[feature.icon];

                return (
                  <Reveal
                    as="article"
                    key={feature.number}
                    delay={i * 100}
                    className={`hm-feature hm-feature-${i + 1}`}
                  >
                    <div className="hm-feature-top">
                      <span className="hm-feature-icon">
                        <FeatureIcon />
                      </span>

                      <span className="hm-feature-number">
                        {feature.number}
                      </span>
                    </div>

                    <h3>{feature.title}</h3>

                    <p>{feature.description}</p>

                    <Link to="/how-it-works" className="hm-feature-link">
                      Learn more
                      <ArrowIcon />
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------------- Senior citizen assistance ---------------- */}

        <section className="hm-section hm-senior">
          <div className="hm-container hm-senior-grid">
            <Reveal className="hm-senior-media">
              <div className="hm-senior-main">
                <img
                  src={imgSeniorMain}
                  alt="A nurse checking the blood pressure of a senior citizen at home"
                  style={{ objectPosition: 'center 45%' }}
                  loading="lazy"
                />
              </div>

              <div className="hm-senior-side">
                <img
                  src={imgSeniorSide}
                  alt="A volunteer helping a senior citizen with his medication"
                  style={{ objectPosition: 'center 40%' }}
                  loading="lazy"
                />
              </div>

              

            
            </Reveal>

            <Reveal className="hm-senior-copy" delay={120}>
             
              <h2>Help for the people who need it most.</h2>

              <p>
                Citizens can submit an assistance request for a senior
                citizen and follow it from one place, with status
                updates, assigned staff details and messages when they
                are available.
              </p>

              <ul className="hm-checklist">
                <li>
                  <span>
                    <CheckCircleIcon />
                  </span>
                  Submit a request with the details that are needed
                </li>

                <li>
                  <span>
                    <CheckCircleIcon />
                  </span>
                  Follow progress through clear status updates
                </li>

                <li>
                  <span>
                    <CheckCircleIcon />
                  </span>
                  See assigned staff details and send messages
                </li>
              </ul>

              <Link to="/register" className="hm-btn hm-btn-primary">
                Get started
                <ArrowIcon />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ---------------- Workflow ---------------- */}

        <section className="hm-section hm-workflow">
          <div className="hm-container">
            <Reveal className="hm-heading">
             

              <h2>From reporting to resolution.</h2>

              <p>
                CivicFix organizes the complaint process into clear
                stages. Available actions and status updates depend
                on the existing complaint workflow.
              </p>
            </Reveal>

            <Reveal>
              <WorkflowShowcase />
            </Reveal>

            <Reveal className="hm-center" delay={80}>
              <Link to="/how-it-works" className="hm-btn hm-btn-primary">
                Explore the process
                <ArrowIcon />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}

        <section className="hm-section hm-faq-section">
          <div className="hm-container hm-faq-grid">
            <Reveal className="hm-faq-intro">
             
              <h2>Good to know before you start.</h2>

              <p>
                CivicFix makes reporting civic issues simple and convenient, allowing citizens to submit complaints about problems such as damaged roads, garbage, broken streetlights, and drainage issues. Users can provide descriptions, locations, and photos, then track their complaints through different stages, from submission and department assignment to ongoing work and resolution. With efficient coordination between department managers and staff, CivicFix promotes transparency, faster issue resolution, and better community development.
              </p>

              <Link to="/register" className="hm-btn hm-btn-primary">
                Create Citizen Account
                <ArrowIcon />
              </Link>
            </Reveal>

            <Reveal delay={100}>
              <Faq />
            </Reveal>
          </div>
        </section>

        {/* ---------------- Final call to action ---------------- */}

        <section className="hm-section hm-cta-section">
          <div className="hm-container">
            <Reveal className="hm-cta">
              <img
                className="hm-cta-bg"
                src={imgCta}
                alt=""
                aria-hidden="true"
                loading="lazy"
              />

              <span className="hm-cta-tint" aria-hidden="true" />
              <span className="hm-cta-ring" aria-hidden="true" />

              <div className="hm-cta-content">
                <span className="hm-cta-eyebrow">YOUR CITIZEN PORTAL</span>

                <h2>
                  Make your civic concerns
                  <br />

                  part of the process.
                </h2>

                <p>
                  Create a citizen account to access complaint
                  submission, status tracking, and other available
                  citizen services.
                </p>

                <div className="hm-cta-actions">
                  <Link to="/register" className="hm-btn hm-btn-white">
                    Create Citizen Account
                    <ArrowIcon />
                  </Link>

                  <Link to="/login" className="hm-cta-login">
                    Already registered?
                    <strong> Sign in</strong>
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <PublicFooter />

      <button
        type="button"
        className={`hm-top ${past ? 'is-visible' : ''}`}
        onClick={() =>
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
        aria-label="Back to top"
        tabIndex={past ? 0 : -1}
      >
        <UpIcon />
      </button>
    </div>
  );
}