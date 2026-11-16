import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Alert, Button, Empty, Spin, Tag } from "antd";
import { BankOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import PageHeader from "../PageHeader";
import { getUser } from "../../utils/auth";
import { getErrorMessage } from "../../shared/api";
import { fetchCompanyProfile } from "./companyApi";
import CompanyProfileView, { CompanyProfileSkeleton } from "./CompanyProfileView";
import "./CompanyProfile.css";

// The editor is only ever downloaded and mounted for administrators.
const CompanyProfileEditor = lazy(() => import("./CompanyProfileEditor"));

/**
 * /company
 *   admin     : view + create / edit / delete (editor mounted on demand)
 *   hr        : view only
 *   employee  : view only, and only when the profile is published
 *
 * The role comes from the existing JWT helper (getUser). This only decides what the
 * UI shows – the API independently rejects non-admin writes.
 */
const CompanyProfile = () => {
  const user = getUser();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";

  const [{ loading, error, profile }, setState] = useState({ loading: true, error: null, profile: null });
  const [editing, setEditing] = useState(false);
  const [editTab, setEditTab] = useState("overview");

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchCompanyProfile();
      setState({ loading: false, error: null, profile: data });
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err, "Unable to load the company profile."), profile: null });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEditor = (tab = "overview") => {
    if (!isAdmin) return; // never reachable for HR / employees
    setEditTab(tab);
    setEditing(true);
    window.scrollTo({ top: 0 });
  };

  const closeEditor = () => {
    setEditing(false);
    window.scrollTo({ top: 0 });
  };

  const showEditor = isAdmin && editing;
  const canSeeProfile = !!profile && (isAdmin || profile.published);

  const headerExtra =
    isAdmin && !editing && !loading && !error ? (
      <>
        {profile && (
          <Tag color={profile.published ? "green" : "orange"}>{profile.published ? "Published" : "Draft · hidden from employees"}</Tag>
        )}
        {profile ? (
          <Button type="primary" icon={<EditOutlined />} onClick={() => openEditor()}>
            Edit profile
          </Button>
        ) : (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>
            Set up profile
          </Button>
        )}
      </>
    ) : null;

  let body;
  if (loading) {
    body = <CompanyProfileSkeleton />;
  } else if (error) {
    body = (
      <Alert
        type="error"
        showIcon
        message="Company profile could not be loaded"
        description={error}
        action={
          <Button size="small" icon={<ReloadOutlined />} onClick={load}>
            Try again
          </Button>
        }
      />
    );
  } else if (showEditor) {
    body = (
      <Suspense fallback={<div className="cp-loading"><Spin /></div>}>
        <CompanyProfileEditor
          profile={profile}
          initialTab={editTab}
          onCancel={closeEditor}
          onSaved={(saved) => {
            setState({ loading: false, error: null, profile: saved });
            closeEditor();
          }}
          onDeleted={() => {
            setState({ loading: false, error: null, profile: null });
            closeEditor();
          }}
        />
      </Suspense>
    );
  } else if (!canSeeProfile) {
    body = (
      <div className="cp-card cp-empty cp-empty-page">
        <Empty
          image={<BankOutlined className="cp-empty-icon" />}
          description={
            isAdmin
              ? "No company profile has been set up yet. Add your company details so everyone can learn about the organisation."
              : "The company profile has not been published yet. Please check back later."
          }
        >
          {isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>
              Set up company profile
            </Button>
          )}
        </Empty>
      </div>
    );
  } else {
    body = (
      <>
        {isAdmin && !profile.published && (
          <Alert
            className="cp-draft-note"
            type="warning"
            showIcon
            message="This profile is a draft"
            description="Employees and HR cannot see it yet. Open the editor and switch on “Visible to employees” to publish it."
          />
        )}
        <CompanyProfileView profile={profile} canEdit={isAdmin} onEditSection={openEditor} />
      </>
    );
  }

  return (
    <div className="company-profile">
      <PageHeader
        title="Company profile"
        subtitle="Who we are, what we stand for and how we work."
        showClock={false}
        extra={headerExtra}
      />
      {body}
    </div>
  );
};

export default CompanyProfile;
