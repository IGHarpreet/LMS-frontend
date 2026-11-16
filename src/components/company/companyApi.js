import axios from "axios";
import { BASE_URL } from "../../shared/api";

/**
 * Company profile API layer.
 *
 * Backend contract (see BACKEND_COMPANY_PROFILE.md):
 *   GET    /company-profile          any signed-in user  -> { success, profile | null }
 *   PUT    /company-profile          admin only (upsert) -> { success, profile }
 *   DELETE /company-profile          admin only          -> { success }
 *   POST   /company-profile/upload   admin only, multipart field "image"
 *                                                        -> { success, filename }
 *
 * The bearer token is attached by the global axios interceptor (setupAxios).
 * Nothing here is a security boundary: the server must enforce roles itself.
 */
export const COMPANY_API = `${BASE_URL}/company-profile`;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
export const MAX_IMAGE_MB = 5;

export const COMPANY_TYPES = [
  "Private limited",
  "Public limited",
  "Partnership",
  "LLP",
  "Sole proprietorship",
  "Startup",
  "Non-profit",
  "Government",
];
export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
export const LEADER_CATEGORIES = [
  { value: "founder", label: "Founder" },
  { value: "ceo", label: "CEO / Director" },
  { value: "management", label: "Management" },
];
export const MILESTONE_TYPES = [
  { value: "milestone", label: "Milestone" },
  { value: "achievement", label: "Achievement" },
  { value: "award", label: "Award" },
  { value: "event", label: "Event" },
];

/** Short random id for list items (the server may keep or replace it). */
export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const hasText = (v) => typeof v === "string" && v.trim().length > 0;

/** Stored image value -> displayable URL. Accepts a file name or an absolute http(s) URL. */
export const imageUrl = (value) => {
  if (!hasText(value)) return "";
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `${BASE_URL}/images/${encodeURIComponent(v)}`;
};

/**
 * Only http(s) links are ever rendered as <a href>. Anything else (javascript:, data:, ...)
 * returns "" so stored text can never become a script link.
 */
export const safeWebUrl = (value) => {
  if (!hasText(value)) return "";
  const v = value.trim();
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProtocol);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
  } catch (e) {
    return "";
  }
};

const str = (v) => (typeof v === "string" ? v : "");
const arr = (v) => (Array.isArray(v) ? v : []);
const withId = (item) => ({ ...item, id: item?.id || item?._id || uid() });

/** Always returns a complete profile object so the UI never hits undefined. */
export const normalizeProfile = (raw) => {
  const p = raw || {};
  const o = p.overview || {};
  const m = p.mission || {};
  const c = p.culture || {};
  const e = p.employeeInfo || {};
  return {
    published: p.published === true,
    updatedAt: p.updatedAt || null,
    overview: {
      name: str(o.name),
      tagline: str(o.tagline),
      about: str(o.about),
      industry: str(o.industry),
      companyType: str(o.companyType),
      yearEstablished: o.yearEstablished ?? null,
      companySize: str(o.companySize),
      headquarters: str(o.headquarters),
      website: str(o.website),
      email: str(o.email),
      phone: str(o.phone),
      logo: str(o.logo),
      cover: str(o.cover),
    },
    mission: {
      mission: str(m.mission),
      vision: str(m.vision),
      objectives: arr(m.objectives).filter(hasText),
    },
    values: arr(p.values).map(withId),
    leadership: arr(p.leadership).map(withId),
    departments: arr(p.departments).map(withId),
    milestones: arr(p.milestones).map(withId),
    culture: {
      workEnvironment: str(c.workEnvironment),
      culture: str(c.culture),
      engagement: str(c.engagement),
      teamActivities: str(c.teamActivities),
      photos: arr(c.photos).map(withId),
    },
    employeeInfo: {
      workingDays: str(e.workingDays),
      workingHours: str(e.workingHours),
      officeLocation: str(e.officeLocation),
      guidelines: str(e.guidelines),
      holidays: str(e.holidays),
      benefits: arr(e.benefits).filter(hasText),
    },
  };
};

/** True when the server answered but has no such route/record (not deployed yet, or no profile). */
export const isNotFound = (err) => err?.response?.status === 404;

export const fetchCompanyProfile = async () => {
  try {
    const res = await axios.get(COMPANY_API);
    const raw = res.data?.profile ?? null;
    return raw ? normalizeProfile(raw) : null;
  } catch (err) {
    if (isNotFound(err)) return null; // no profile yet
    throw err;
  }
};

export const saveCompanyProfile = async (profile) => {
  const res = await axios.put(COMPANY_API, profile);
  return normalizeProfile(res.data?.profile || profile);
};

export const deleteCompanyProfile = async () => {
  await axios.delete(COMPANY_API);
};

export const uploadCompanyImage = async (file) => {
  const body = new FormData();
  body.append("image", file);
  const res = await axios.post(`${COMPANY_API}/upload`, body);
  const filename = res.data?.filename || res.data?.file?.filename;
  if (!filename) throw new Error("The server did not return an image file name.");
  return filename;
};
