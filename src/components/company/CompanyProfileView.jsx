import React, { useEffect, useMemo, useState } from "react";
import { Button, Empty, Image, Skeleton, Tag } from "antd";
import {
  ApartmentOutlined,
  AimOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  GiftOutlined,
  GlobalOutlined,
  HeartOutlined,
  IdcardOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  RiseOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { LEADER_CATEGORIES, MILESTONE_TYPES, hasText, imageUrl, safeWebUrl } from "./companyApi";

export const SECTIONS = [
  { id: "overview", label: "Overview", icon: <BankOutlined /> },
  { id: "mission", label: "Mission & values", icon: <AimOutlined /> },
  { id: "leadership", label: "Leadership", icon: <CrownOutlined /> },
  { id: "departments", label: "Departments", icon: <ApartmentOutlined /> },
  { id: "journey", label: "Journey", icon: <RiseOutlined /> },
  { id: "culture", label: "Culture", icon: <HeartOutlined /> },
  { id: "employee-info", label: "Employee info", icon: <IdcardOutlined /> },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const categoryLabel = Object.fromEntries(LEADER_CATEGORIES.map((c) => [c.value, c.label]));
const categoryOrder = { founder: 0, ceo: 1, management: 2 };
const typeMeta = {
  milestone: { label: "Milestone", color: "blue" },
  achievement: { label: "Achievement", color: "green" },
  award: { label: "Award", color: "gold" },
  event: { label: "Event", color: "purple" },
};
MILESTONE_TYPES.forEach((t) => {
  if (typeMeta[t.value]) typeMeta[t.value].label = t.label;
});

const initials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

/** Multi-line plain text. Never rendered as HTML. */
const Text = ({ children }) => (hasText(children) ? <p className="cp-text">{children}</p> : null);

const SectionEmpty = ({ message, canEdit, onAdd }) => (
  <div className="cp-empty">
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={message}>
      {canEdit && (
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          Add details
        </Button>
      )}
    </Empty>
  </div>
);

const Section = ({ id, title, subtitle, icon, empty, emptyMessage, canEdit, onEdit, children }) => (
  <section id={`cp-${id}`} className="cp-section">
    <header className="cp-section-head">
      <span className="cp-section-icon" aria-hidden="true">{icon}</span>
      <div className="cp-section-title">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {canEdit && !empty && (
        <Button size="small" icon={<EditOutlined />} onClick={() => onEdit?.(id)}>
          Edit
        </Button>
      )}
    </header>
    {empty ? <SectionEmpty message={emptyMessage} canEdit={canEdit} onAdd={() => onEdit?.(id)} /> : children}
  </section>
);

const Fact = ({ icon, label, children }) =>
  children ? (
    <div className="cp-fact">
      <span className="cp-fact-icon" aria-hidden="true">{icon}</span>
      <div>
        <dt>{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  ) : null;

export const CompanyProfileSkeleton = () => (
  <div className="cp-page" aria-busy="true" aria-label="Loading company profile">
    <div className="cp-hero">
      <Skeleton.Image active className="cp-skel-cover" style={{ width: "100%", height: 180 }} />
      <div className="cp-hero-body">
        <Skeleton avatar={{ size: 88, shape: "square" }} active paragraph={{ rows: 2 }} />
      </div>
    </div>
    {[0, 1, 2].map((i) => (
      <div className="cp-card" key={i}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </div>
    ))}
  </div>
);

/**
 * Read-only presentation of a company profile.
 *  canEdit        admin only – shows the small "Edit" shortcuts that open the editor
 *  onEditSection  (sectionId) => void
 * No form, upload or delete control exists in this component.
 */
const CompanyProfileView = ({ profile, canEdit = false, onEditSection }) => {
  const { overview: o, mission, values, leadership, departments, milestones, culture, employeeInfo: info } = profile;
  const [active, setActive] = useState("overview");

  const website = safeWebUrl(o.website);
  const emailOk = EMAIL_RE.test((o.email || "").trim());
  const phoneHref = hasText(o.phone) ? `tel:${o.phone.replace(/[^\d+]/g, "")}` : "";

  const sortedLeaders = useMemo(
    () => [...leadership].sort((a, b) => (categoryOrder[a.category] ?? 9) - (categoryOrder[b.category] ?? 9)),
    [leadership]
  );
  const sortedMilestones = useMemo(
    () => [...milestones].sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0)),
    [milestones]
  );

  const factsPresent = [o.industry, o.companyType, o.yearEstablished, o.companySize, o.headquarters].some(
    (v) => v !== null && v !== undefined && String(v).trim() !== ""
  );
  const contactPresent = !!(website || emailOk || phoneHref);
  const overviewEmpty = !hasText(o.about) && !factsPresent && !contactPresent;
  const missionEmpty = !hasText(mission.mission) && !hasText(mission.vision) && values.length === 0 && mission.objectives.length === 0;
  const cultureTexts = [
    ["Work environment", culture.workEnvironment],
    ["Company culture", culture.culture],
    ["Employee engagement", culture.engagement],
    ["Team activities", culture.teamActivities],
  ].filter(([, v]) => hasText(v));
  const cultureEmpty = cultureTexts.length === 0 && culture.photos.length === 0;
  const infoEmpty =
    ![info.workingDays, info.workingHours, info.officeLocation, info.guidelines, info.holidays].some(hasText) &&
    info.benefits.length === 0;

  // highlight the section currently in view
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id.replace(/^cp-/, ""));
        });
      },
      { rootMargin: "-140px 0px -60% 0px" }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(`cp-${s.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const goTo = (id) => {
    const el = document.getElementById(`cp-${id}`);
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    setActive(id);
  };

  const sectionProps = (id) => ({ id, canEdit, onEdit: onEditSection });

  return (
    <div className="cp-page">
      {/* ---------------------------------------------------------- hero */}
      <div className="cp-hero">
        <div className="cp-cover">
          {hasText(o.cover) ? <img src={imageUrl(o.cover)} alt="" /> : <div className="cp-cover-fallback" />}
        </div>
        <div className="cp-hero-body">
          <div className="cp-logo">
            {hasText(o.logo) ? <img src={imageUrl(o.logo)} alt={`${o.name} logo`} /> : <BankOutlined />}
          </div>
          <div className="cp-hero-text">
            <h2>{o.name || "Company name not set"}</h2>
            {hasText(o.tagline) && <p className="cp-tagline">{o.tagline}</p>}
            <div className="cp-chips">
              {hasText(o.industry) && <Tag>{o.industry}</Tag>}
              {hasText(o.companyType) && <Tag>{o.companyType}</Tag>}
              {hasText(o.headquarters) && (
                <Tag icon={<EnvironmentOutlined />}>{o.headquarters}</Tag>
              )}
              {o.yearEstablished ? <Tag icon={<CalendarOutlined />}>Est. {o.yearEstablished}</Tag> : null}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ section nav */}
      <nav className="cp-nav" aria-label="Company profile sections">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`cp-nav-item${active === s.id ? " is-active" : ""}`}
            onClick={() => goTo(s.id)}
            aria-current={active === s.id ? "true" : undefined}
          >
            {s.icon}
            <span>{s.label}</span>
          </button>
        ))}
      </nav>

      {/* ---------------------------------------------------- overview */}
      <Section
        {...sectionProps("overview")}
        title="About the company"
        icon={<BankOutlined />}
        empty={overviewEmpty}
        emptyMessage="Company overview details have not been added yet."
      >
        <div className="cp-grid cp-grid-overview">
          {hasText(o.about) && (
            <div className="cp-card">
              <h4 className="cp-card-title">Who we are</h4>
              <Text>{o.about}</Text>
            </div>
          )}
          {(factsPresent || contactPresent) && (
            <div className="cp-card">
              <h4 className="cp-card-title">Company details</h4>
              <dl className="cp-facts">
                <Fact icon={<ApartmentOutlined />} label="Industry">{o.industry}</Fact>
                <Fact icon={<BankOutlined />} label="Company type">{o.companyType}</Fact>
                <Fact icon={<CalendarOutlined />} label="Established">{o.yearEstablished || ""}</Fact>
                <Fact icon={<UserOutlined />} label="Company size">{o.companySize ? `${o.companySize} employees` : ""}</Fact>
                <Fact icon={<EnvironmentOutlined />} label="Headquarters">{o.headquarters}</Fact>
                <Fact icon={<GlobalOutlined />} label="Website">
                  {website && (
                    <a href={website} target="_blank" rel="noopener noreferrer">
                      {o.website}
                    </a>
                  )}
                </Fact>
                <Fact icon={<MailOutlined />} label="Official email">
                  {emailOk && <a href={`mailto:${o.email.trim()}`}>{o.email.trim()}</a>}
                </Fact>
                <Fact icon={<PhoneOutlined />} label="Contact number">
                  {phoneHref && <a href={phoneHref}>{o.phone}</a>}
                </Fact>
              </dl>
            </div>
          )}
        </div>
      </Section>

      {/* ------------------------------------------ mission & values */}
      <Section
        {...sectionProps("mission")}
        title="Mission, vision & values"
        icon={<AimOutlined />}
        empty={missionEmpty}
        emptyMessage="The mission, vision and values have not been added yet."
      >
        {(hasText(mission.mission) || hasText(mission.vision)) && (
          <div className="cp-grid cp-grid-2">
            {hasText(mission.mission) && (
              <div className="cp-card cp-card-accent">
                <h4 className="cp-card-title">Our mission</h4>
                <Text>{mission.mission}</Text>
              </div>
            )}
            {hasText(mission.vision) && (
              <div className="cp-card cp-card-accent">
                <h4 className="cp-card-title">Our vision</h4>
                <Text>{mission.vision}</Text>
              </div>
            )}
          </div>
        )}
        {values.length > 0 && (
          <>
            <h4 className="cp-subhead">Core values</h4>
            <div className="cp-grid cp-grid-3">
              {values.map((v) => (
                <div className="cp-card cp-value" key={v.id}>
                  <h5>{v.title}</h5>
                  <Text>{v.description}</Text>
                </div>
              ))}
            </div>
          </>
        )}
        {mission.objectives.length > 0 && (
          <>
            <h4 className="cp-subhead">Company objectives</h4>
            <ul className="cp-checklist">
              {mission.objectives.map((obj, i) => (
                <li key={i}>
                  <CheckCircleOutlined />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      {/* ------------------------------------------------ leadership */}
      <Section
        {...sectionProps("leadership")}
        title="Leadership & management"
        icon={<CrownOutlined />}
        empty={sortedLeaders.length === 0}
        emptyMessage="Leadership team members have not been added yet."
      >
        <div className="cp-grid cp-grid-3">
          {sortedLeaders.map((l) => (
            <article className="cp-card cp-leader" key={l.id}>
              <div className="cp-avatar">
                {hasText(l.photo) ? <img src={imageUrl(l.photo)} alt={l.name} /> : <span>{initials(l.name)}</span>}
              </div>
              <h5>{l.name}</h5>
              <p className="cp-role">{l.designation}</p>
              {categoryLabel[l.category] && <Tag>{categoryLabel[l.category]}</Tag>}
              <Text>{l.bio}</Text>
            </article>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------- departments */}
      <Section
        {...sectionProps("departments")}
        title="Departments & organization"
        icon={<ApartmentOutlined />}
        empty={departments.length === 0}
        emptyMessage="Departments have not been added yet."
      >
        <div className="cp-grid cp-grid-3">
          {departments.map((d) => (
            <article className="cp-card cp-dept" key={d.id}>
              <h5>{d.name}</h5>
              <div className="cp-dept-meta">
                {hasText(d.head) && (
                  <span>
                    <UserOutlined /> {d.head}
                  </span>
                )}
                {d.employeeCount !== undefined && d.employeeCount !== null && d.employeeCount !== "" && (
                  <span>
                    <IdcardOutlined /> {d.employeeCount} {Number(d.employeeCount) === 1 ? "employee" : "employees"}
                  </span>
                )}
              </div>
              <Text>{d.description}</Text>
            </article>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------- journey */}
      <Section
        {...sectionProps("journey")}
        title="Company journey"
        subtitle={o.yearEstablished ? `Founded in ${o.yearEstablished}` : undefined}
        icon={<RiseOutlined />}
        empty={sortedMilestones.length === 0}
        emptyMessage="Milestones, achievements and awards have not been added yet."
      >
        <ol className="cp-timeline">
          {sortedMilestones.map((m) => {
            const meta = typeMeta[m.type] || typeMeta.milestone;
            return (
              <li className="cp-tl-item" key={m.id}>
                <div className="cp-tl-year">{m.year}</div>
                <div className="cp-tl-card">
                  <Tag color={meta.color}>{meta.label}</Tag>
                  <h5>{m.title}</h5>
                  <Text>{m.description}</Text>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* ----------------------------------------------------- culture */}
      <Section
        {...sectionProps("culture")}
        title="Company culture"
        icon={<HeartOutlined />}
        empty={cultureEmpty}
        emptyMessage="Culture details and photos have not been added yet."
      >
        {cultureTexts.length > 0 && (
          <div className="cp-grid cp-grid-2">
            {cultureTexts.map(([title, text]) => (
              <div className="cp-card" key={title}>
                <h4 className="cp-card-title">{title}</h4>
                <Text>{text}</Text>
              </div>
            ))}
          </div>
        )}
        {culture.photos.length > 0 && (
          <>
            <h4 className="cp-subhead">Life at {o.name || "the company"}</h4>
            <Image.PreviewGroup>
              <div className="cp-gallery">
                {culture.photos.map((p) => (
                  <figure key={p.id}>
                    <Image src={imageUrl(p.image)} alt={p.caption || "Company photo"} preview={{ mask: <EyeOutlined /> }} />
                    {hasText(p.caption) && <figcaption>{p.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </Image.PreviewGroup>
          </>
        )}
      </Section>

      {/* ------------------------------------------- employee info */}
      <Section
        {...sectionProps("employee-info")}
        title="Employee information"
        icon={<IdcardOutlined />}
        empty={infoEmpty}
        emptyMessage="Working hours, guidelines and benefits have not been added yet."
      >
        {[info.workingDays, info.workingHours, info.officeLocation].some(hasText) && (
          <div className="cp-grid cp-grid-3">
            {hasText(info.workingDays) && (
              <div className="cp-card cp-tile">
                <CalendarOutlined />
                <span>Working days</span>
                <strong>{info.workingDays}</strong>
              </div>
            )}
            {hasText(info.workingHours) && (
              <div className="cp-card cp-tile">
                <ClockCircleOutlined />
                <span>Working hours</span>
                <strong>{info.workingHours}</strong>
              </div>
            )}
            {hasText(info.officeLocation) && (
              <div className="cp-card cp-tile">
                <EnvironmentOutlined />
                <span>Office location</span>
                <strong>{info.officeLocation}</strong>
              </div>
            )}
          </div>
        )}
        {(hasText(info.guidelines) || hasText(info.holidays)) && (
          <div className="cp-grid cp-grid-2">
            {hasText(info.guidelines) && (
              <div className="cp-card">
                <h4 className="cp-card-title">General guidelines</h4>
                <Text>{info.guidelines}</Text>
              </div>
            )}
            {hasText(info.holidays) && (
              <div className="cp-card">
                <h4 className="cp-card-title">Company holidays</h4>
                <Text>{info.holidays}</Text>
              </div>
            )}
          </div>
        )}
        {info.benefits.length > 0 && (
          <>
            <h4 className="cp-subhead">
              <GiftOutlined /> Employee benefits
            </h4>
            <ul className="cp-checklist">
              {info.benefits.map((b, i) => (
                <li key={i}>
                  <CheckCircleOutlined />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      {profile.updatedAt && (
        <p className="cp-updated">Last updated {new Date(profile.updatedAt).toLocaleDateString()}</p>
      )}
    </div>
  );
};

export default CompanyProfileView;
