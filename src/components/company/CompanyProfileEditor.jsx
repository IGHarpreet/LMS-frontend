import React, { useState } from "react";
import {
  Alert, AutoComplete, Button, Form, Input, InputNumber, message, Modal, Popconfirm, Select, Space, Switch, Tabs, Tag,
} from "antd";
import {
  ApartmentOutlined, AimOutlined, BankOutlined, CloseOutlined, CrownOutlined, DeleteOutlined, EyeOutlined,
  HeartOutlined, IdcardOutlined, PlusOutlined, RiseOutlined, SaveOutlined, UserOutlined,
} from "@ant-design/icons";
import { getErrorMessage } from "../../shared/api";
import {
  COMPANY_SIZES, COMPANY_TYPES, LEADER_CATEGORIES, MILESTONE_TYPES,
  deleteCompanyProfile, hasText, imageUrl, normalizeProfile, safeWebUrl, saveCompanyProfile,
} from "./companyApi";
import ImageUploadField from "./ImageUploadField";
import ListSection from "./ListSection";
import CompanyProfileView from "./CompanyProfileView";

const THIS_YEAR = new Date().getFullYear();
const trim = (v) => (typeof v === "string" ? v.trim() : v);
const trimAll = (obj) => Object.fromEntries(Object.entries(obj || {}).map(([k, v]) => [k, Array.isArray(v) ? v : trim(v)]));
const cleanStrings = (list) => (list || []).map(trim).filter(hasText);
const TAB_OF_FIELD = { overview: "overview", mission: "mission", culture: "culture", employeeInfo: "employee-info" };
const requiredText = (label) => [{ required: true, whitespace: true, message: `${label} is required` }];

/** Editable list of plain strings (objectives, benefits) inside the main Form. */
const StringList = ({ name, addLabel, placeholder }) => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <div className="cp-strlist">
        {fields.map((field) => (
          <div className="cp-strlist-row" key={field.key}>
            <Form.Item name={field.name} noStyle rules={[{ max: 300, message: "Keep it under 300 characters" }]}>
              <Input placeholder={placeholder} maxLength={300} />
            </Form.Item>
            <Popconfirm title="Delete this item?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove(field.name)}>
              <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete item" />
            </Popconfirm>
          </div>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={() => add("")} block>
          {addLabel}
        </Button>
      </div>
    )}
  </Form.List>
);

const Summary = ({ thumb, title, sub, extra }) => (
  <div className="cp-sum">
    {thumb !== undefined && (
      <span className="cp-sum-thumb">{thumb ? <img src={imageUrl(thumb)} alt="" /> : <UserOutlined />}</span>
    )}
    <div className="cp-sum-text">
      <strong>{title}</strong>
      {sub && <span>{sub}</span>}
      {extra}
    </div>
  </div>
);

/**
 * Admin-only editor. Renders nothing sensitive on its own: the parent only mounts it for
 * admins, and every write is also checked by the server.
 * Edits stay in local draft state until "Save changes" sends the whole profile (PUT).
 */
const CompanyProfileEditor = ({ profile, initialTab = "overview", onSaved, onCancel, onDeleted }) => {
  const base = normalizeProfile(profile);
  const isNew = !profile;
  const [form] = Form.useForm();
  const [tab, setTab] = useState(initialTab);
  const [published, setPublished] = useState(isNew ? false : base.published);
  const [lists, setLists] = useState({
    values: base.values,
    leadership: base.leadership,
    departments: base.departments,
    milestones: base.milestones,
    photos: base.culture.photos,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState(null);

  const setList = (key) => (next) => {
    setLists((l) => ({ ...l, [key]: next }));
    setDirty(true);
  };

  /** Everything the admin has typed, in the exact shape the API stores. */
  const assemble = () => {
    const v = form.getFieldsValue(true);
    const draft = normalizeProfile({
      published,
      overview: trimAll(v.overview),
      mission: { ...trimAll(v.mission), objectives: cleanStrings(v.mission?.objectives) },
      values: lists.values,
      leadership: lists.leadership,
      departments: lists.departments,
      milestones: lists.milestones,
      culture: { ...trimAll(v.culture), photos: lists.photos },
      employeeInfo: { ...trimAll(v.employeeInfo), benefits: cleanStrings(v.employeeInfo?.benefits) },
    });
    return draft;
  };

  const handleSave = async () => {
    try {
      await form.validateFields();
    } catch (err) {
      const first = err?.errorFields?.[0]?.name?.[0];
      if (TAB_OF_FIELD[first]) setTab(TAB_OF_FIELD[first]);
      message.error("Please fix the highlighted fields before saving.");
      return;
    }
    const { updatedAt, ...payload } = assemble(); // updatedAt is set by the server
    setSaving(true);
    try {
      const saved = await saveCompanyProfile(payload);
      setDirty(false);
      message.success(saved.published ? "Company profile saved and visible to employees." : "Saved as a draft. Employees cannot see it until you publish.");
      onSaved(saved);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 || status === 405) {
        message.error("The company profile API is not available on the server yet. Deploy the backend changes and try again.");
      } else if (status === 403) {
        message.error("Only administrators can change the company profile.");
      } else {
        message.error(getErrorMessage(err, "Unable to save the company profile."));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!dirty) return onCancel();
    Modal.confirm({
      title: "Discard your changes?",
      content: "Edits you have not saved will be lost.",
      okText: "Discard changes",
      okButtonProps: { danger: true },
      cancelText: "Keep editing",
      onOk: onCancel,
    });
    return undefined;
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCompanyProfile();
      message.success("Company profile deleted.");
      onDeleted();
    } catch (err) {
      message.error(getErrorMessage(err, "Unable to delete the company profile."));
    } finally {
      setDeleting(false);
    }
  };

  const initialValues = {
    overview: base.overview,
    mission: base.mission,
    culture: { workEnvironment: base.culture.workEnvironment, culture: base.culture.culture, engagement: base.culture.engagement, teamActivities: base.culture.teamActivities },
    employeeInfo: base.employeeInfo,
  };

  const tabLabel = (icon, text) => (
    <span>
      {icon} {text}
    </span>
  );

  const items = [
    {
      key: "overview",
      label: tabLabel(<BankOutlined />, "Overview"),
      forceRender: true,
      children: (
        <div className="cp-card cp-edit-card">
          <div className="cp-form-grid">
            <Form.Item name={["overview", "name"]} label="Company name" rules={[...requiredText("Company name"), { max: 120 }]}>
              <Input maxLength={120} placeholder="Registered or trading name" />
            </Form.Item>
            <Form.Item name={["overview", "tagline"]} label="Tagline" rules={[{ max: 160 }]}>
              <Input maxLength={160} placeholder="A short line under the name" />
            </Form.Item>
          </div>
          <Form.Item name={["overview", "about"]} label="About the company" rules={[{ max: 3000 }]}>
            <Input.TextArea rows={5} maxLength={3000} showCount placeholder="What the company does and who it serves" />
          </Form.Item>
          <div className="cp-form-grid">
            <Form.Item name={["overview", "industry"]} label="Industry" rules={[{ max: 80 }]}>
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item name={["overview", "companyType"]} label="Company type">
              <AutoComplete allowClear options={COMPANY_TYPES.map((t) => ({ value: t }))} placeholder="Choose or type" maxLength={60} />
            </Form.Item>
            <Form.Item name={["overview", "yearEstablished"]} label="Year established">
              <InputNumber min={1800} max={THIS_YEAR} precision={0} style={{ width: "100%" }} placeholder={String(THIS_YEAR)} />
            </Form.Item>
            <Form.Item name={["overview", "companySize"]} label="Company size">
              <Select allowClear placeholder="Number of employees" options={COMPANY_SIZES.map((s) => ({ value: s, label: `${s} employees` }))} />
            </Form.Item>
            <Form.Item name={["overview", "headquarters"]} label="Headquarters / location" rules={[{ max: 160 }]}>
              <Input maxLength={160} />
            </Form.Item>
            <Form.Item
              name={["overview", "website"]}
              label="Website"
              rules={[{ validator: (_, v) => (!hasText(v) || safeWebUrl(v) ? Promise.resolve() : Promise.reject(new Error("Enter a valid website, e.g. https://example.com"))) }]}
            >
              <Input placeholder="https://example.com" maxLength={200} />
            </Form.Item>
            <Form.Item name={["overview", "email"]} label="Official email" rules={[{ type: "email", message: "Enter a valid email address" }]}>
              <Input maxLength={120} />
            </Form.Item>
            <Form.Item name={["overview", "phone"]} label="Contact number" rules={[{ pattern: /^[0-9+()\-.\s]{6,20}$/, message: "Use digits, spaces, + ( ) - only (6–20 characters)" }]}>
              <Input maxLength={20} />
            </Form.Item>
          </div>
          <div className="cp-form-grid">
            <Form.Item name={["overview", "logo"]} label="Company logo">
              <ImageUploadField shape="logo" hint="Square image works best. JPG, PNG or WEBP, up to 5 MB" />
            </Form.Item>
            <Form.Item name={["overview", "cover"]} label="Cover banner">
              <ImageUploadField shape="cover" hint="Wide image, about 1600 × 400. JPG, PNG or WEBP, up to 5 MB" />
            </Form.Item>
          </div>
        </div>
      ),
    },
    {
      key: "mission",
      label: tabLabel(<AimOutlined />, "Mission & values"),
      forceRender: true,
      children: (
        <>
          <div className="cp-card cp-edit-card">
            <div className="cp-form-grid">
              <Form.Item name={["mission", "mission"]} label="Mission" rules={[{ max: 1500 }]}>
                <Input.TextArea rows={4} maxLength={1500} showCount />
              </Form.Item>
              <Form.Item name={["mission", "vision"]} label="Vision" rules={[{ max: 1500 }]}>
                <Input.TextArea rows={4} maxLength={1500} showCount />
              </Form.Item>
            </div>
            <Form.Item label="Company objectives">
              <StringList name={["mission", "objectives"]} addLabel="Add objective" placeholder="An objective the company is working toward" />
            </Form.Item>
          </div>
          <div className="cp-card cp-edit-card">
            <h4 className="cp-card-title">Core values</h4>
            <ListSection
              items={lists.values}
              onChange={setList("values")}
              itemLabel="value"
              emptyText="No core values added yet"
              reorderable
              renderSummary={(v) => <Summary title={v.title} sub={v.description} />}
              renderFields={() => (
                <>
                  <Form.Item name="title" label="Value" rules={[...requiredText("Value"), { max: 80 }]}>
                    <Input maxLength={80} placeholder="e.g. Integrity" />
                  </Form.Item>
                  <Form.Item name="description" label="Description" rules={[{ max: 400 }]}>
                    <Input.TextArea rows={3} maxLength={400} showCount />
                  </Form.Item>
                </>
              )}
            />
          </div>
        </>
      ),
    },
    {
      key: "leadership",
      label: tabLabel(<CrownOutlined />, "Leadership"),
      forceRender: true,
      children: (
        <div className="cp-card cp-edit-card">
          <ListSection
            items={lists.leadership}
            onChange={setList("leadership")}
            itemLabel="team member"
            emptyText="No founders, directors or managers added yet"
            reorderable
            initialValues={{ category: "management" }}
            renderSummary={(l) => (
              <Summary
                thumb={l.photo || ""}
                title={l.name}
                sub={l.designation}
                extra={<Tag style={{ width: "fit-content" }}>{LEADER_CATEGORIES.find((c) => c.value === l.category)?.label || "Management"}</Tag>}
              />
            )}
            renderFields={() => (
              <>
                <Form.Item name="name" label="Full name" rules={[...requiredText("Name"), { max: 100 }]}>
                  <Input maxLength={100} />
                </Form.Item>
                <Form.Item name="designation" label="Designation" rules={[...requiredText("Designation"), { max: 100 }]}>
                  <Input maxLength={100} placeholder="e.g. Chief Executive Officer" />
                </Form.Item>
                <Form.Item name="category" label="Group" rules={[{ required: true, message: "Choose a group" }]}>
                  <Select options={LEADER_CATEGORIES} />
                </Form.Item>
                <Form.Item name="photo" label="Photograph">
                  <ImageUploadField shape="avatar" />
                </Form.Item>
                <Form.Item name="bio" label="Short biography" rules={[{ max: 800 }]}>
                  <Input.TextArea rows={4} maxLength={800} showCount />
                </Form.Item>
              </>
            )}
          />
        </div>
      ),
    },
    {
      key: "departments",
      label: tabLabel(<ApartmentOutlined />, "Departments"),
      forceRender: true,
      children: (
        <div className="cp-card cp-edit-card">
          <ListSection
            items={lists.departments}
            onChange={setList("departments")}
            itemLabel="department"
            emptyText="No departments added yet"
            reorderable
            renderSummary={(d) => (
              <Summary
                title={d.name}
                sub={[d.head && `Head: ${d.head}`, d.employeeCount !== undefined && d.employeeCount !== null && d.employeeCount !== "" && `${d.employeeCount} employees`].filter(Boolean).join(" · ") || undefined}
              />
            )}
            renderFields={() => (
              <>
                <Form.Item name="name" label="Department name" rules={[...requiredText("Department name"), { max: 100 }]}>
                  <Input maxLength={100} />
                </Form.Item>
                <Form.Item name="head" label="Department head" rules={[{ max: 100 }]}>
                  <Input maxLength={100} />
                </Form.Item>
                <Form.Item name="employeeCount" label="Number of employees (optional)">
                  <InputNumber min={0} max={1000000} precision={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="description" label="Description" rules={[{ max: 600 }]}>
                  <Input.TextArea rows={3} maxLength={600} showCount />
                </Form.Item>
              </>
            )}
          />
        </div>
      ),
    },
    {
      key: "journey",
      label: tabLabel(<RiseOutlined />, "Journey"),
      forceRender: true,
      children: (
        <div className="cp-card cp-edit-card">
          <p className="cp-edit-help">
            Entries appear on the timeline in year order. The founding year comes from the Overview tab.
          </p>
          <ListSection
            items={lists.milestones}
            onChange={setList("milestones")}
            itemLabel="milestone"
            emptyText="No milestones, awards or events added yet"
            initialValues={{ type: "milestone" }}
            renderSummary={(m) => (
              <Summary
                title={`${m.year} · ${m.title}`}
                sub={MILESTONE_TYPES.find((t) => t.value === m.type)?.label}
              />
            )}
            renderFields={() => (
              <>
                <Form.Item name="year" label="Year" rules={[{ required: true, message: "Year is required" }]}>
                  <InputNumber min={1800} max={THIS_YEAR} precision={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="type" label="Type" rules={[{ required: true, message: "Choose a type" }]}>
                  <Select options={MILESTONE_TYPES} />
                </Form.Item>
                <Form.Item name="title" label="Title" rules={[...requiredText("Title"), { max: 120 }]}>
                  <Input maxLength={120} />
                </Form.Item>
                <Form.Item name="description" label="Description" rules={[{ max: 600 }]}>
                  <Input.TextArea rows={3} maxLength={600} showCount />
                </Form.Item>
              </>
            )}
          />
        </div>
      ),
    },
    {
      key: "culture",
      label: tabLabel(<HeartOutlined />, "Culture"),
      forceRender: true,
      children: (
        <>
          <div className="cp-card cp-edit-card">
            <div className="cp-form-grid">
              <Form.Item name={["culture", "workEnvironment"]} label="Work environment" rules={[{ max: 1500 }]}>
                <Input.TextArea rows={4} maxLength={1500} showCount />
              </Form.Item>
              <Form.Item name={["culture", "culture"]} label="Company culture" rules={[{ max: 1500 }]}>
                <Input.TextArea rows={4} maxLength={1500} showCount />
              </Form.Item>
              <Form.Item name={["culture", "engagement"]} label="Employee engagement" rules={[{ max: 1500 }]}>
                <Input.TextArea rows={4} maxLength={1500} showCount />
              </Form.Item>
              <Form.Item name={["culture", "teamActivities"]} label="Team activities" rules={[{ max: 1500 }]}>
                <Input.TextArea rows={4} maxLength={1500} showCount />
              </Form.Item>
            </div>
          </div>
          <div className="cp-card cp-edit-card">
            <h4 className="cp-card-title">Company photos</h4>
            <ListSection
              items={lists.photos}
              onChange={setList("photos")}
              itemLabel="photo"
              emptyText="No photos added yet"
              maxItems={24}
              renderSummary={(p) => <Summary thumb={p.image} title={p.caption || "Untitled photo"} />}
              renderFields={() => (
                <>
                  <Form.Item name="image" label="Photo" rules={[{ required: true, message: "Upload a photo" }]}>
                    <ImageUploadField shape="photo" />
                  </Form.Item>
                  <Form.Item name="caption" label="Caption" rules={[{ max: 160 }]}>
                    <Input maxLength={160} />
                  </Form.Item>
                </>
              )}
            />
          </div>
        </>
      ),
    },
    {
      key: "employee-info",
      label: tabLabel(<IdcardOutlined />, "Employee info"),
      forceRender: true,
      children: (
        <div className="cp-card cp-edit-card">
          <div className="cp-form-grid">
            <Form.Item name={["employeeInfo", "workingDays"]} label="Working days" rules={[{ max: 120 }]}>
              <Input maxLength={120} placeholder="e.g. Monday to Friday" />
            </Form.Item>
            <Form.Item name={["employeeInfo", "workingHours"]} label="Working hours" rules={[{ max: 120 }]}>
              <Input maxLength={120} placeholder="e.g. 9:30 AM – 6:30 PM" />
            </Form.Item>
            <Form.Item name={["employeeInfo", "officeLocation"]} label="Office location" rules={[{ max: 240 }]}>
              <Input maxLength={240} />
            </Form.Item>
          </div>
          <Form.Item name={["employeeInfo", "guidelines"]} label="General employee guidelines" rules={[{ max: 3000 }]}>
            <Input.TextArea rows={5} maxLength={3000} showCount />
          </Form.Item>
          <Form.Item name={["employeeInfo", "holidays"]} label="Company holidays information" rules={[{ max: 2000 }]}>
            <Input.TextArea rows={4} maxLength={2000} showCount />
          </Form.Item>
          <Form.Item label="Employee benefits">
            <StringList name={["employeeInfo", "benefits"]} addLabel="Add benefit" placeholder="e.g. Health insurance" />
          </Form.Item>
        </div>
      ),
    },
  ];

  const startPreview = () => setPreview(assemble());

  return (
    <div className="cp-editor">
      <div className="cp-actionbar">
        <div className="cp-actionbar-left">
          <strong>{isNew ? "Set up company profile" : "Edit company profile"}</strong>
          <label className="cp-publish">
            <Switch
              checked={published}
              onChange={(v) => {
                setPublished(v);
                setDirty(true);
              }}
              aria-label="Visible to employees"
            />
            <span>{published ? "Visible to employees" : "Draft (hidden from employees)"}</span>
          </label>
        </div>
        <Space wrap>
          <Button icon={<CloseOutlined />} onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          {preview ? (
            <Button onClick={() => setPreview(null)}>Back to editing</Button>
          ) : (
            <Button icon={<EyeOutlined />} onClick={startPreview} disabled={saving}>
              Preview
            </Button>
          )}
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            Save changes
          </Button>
        </Space>
      </div>

      {preview && (
        <>
          <Alert
            className="cp-preview-note"
            type="info"
            showIcon
            message="Preview of your unsaved changes"
            description="This is how employees will see the profile. Nothing is saved until you choose Save changes."
          />
          <CompanyProfileView profile={preview} canEdit={false} />
        </>
      )}

      {/* kept mounted while previewing so no typed value is lost */}
      <div style={{ display: preview ? "none" : "block" }}>
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={initialValues}
          scrollToFirstError
          onValuesChange={() => setDirty(true)}
        >
          <Tabs activeKey={tab} onChange={setTab} items={items} className="cp-edit-tabs" />
        </Form>

        {!isNew && (
          <div className="cp-card cp-danger">
            <div>
              <h4 className="cp-card-title">Delete company profile</h4>
              <p>Removes all company information for everyone. This cannot be undone.</p>
            </div>
            <Popconfirm
              title="Delete the entire company profile? This cannot be undone."
              okText="Delete profile"
              okButtonProps={{ danger: true }}
              onConfirm={handleDelete}
            >
              <Button danger icon={<DeleteOutlined />} loading={deleting}>
                Delete profile
              </Button>
            </Popconfirm>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyProfileEditor;
