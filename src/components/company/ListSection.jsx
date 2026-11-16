import React, { useState } from "react";
import { Button, Empty, Form, Modal, Popconfirm, Tooltip } from "antd";
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { uid } from "./companyApi";

/**
 * Editable list of records (values, leaders, departments, milestones, photos).
 * Works on the parent's draft only – nothing is sent to the server until the
 * admin presses "Save changes" in the editor.
 *
 *  items            current array
 *  onChange(next)   called with the new array
 *  itemLabel        singular noun used in titles ("leader", "department", ...)
 *  renderSummary    (item) => node shown in the list
 *  renderFields     () => Form.Item nodes shown in the modal
 *  initialValues    defaults for a new item
 *  reorderable      show move up / down buttons
 */
const ListSection = ({
  items,
  onChange,
  itemLabel,
  renderSummary,
  renderFields,
  initialValues = {},
  reorderable = false,
  emptyText,
  maxItems = 50,
  modalWidth = 560,
}) => {
  const [modal, setModal] = useState({ open: false, index: null, key: 0 });
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const openAdd = () => setModal((m) => ({ open: true, index: null, key: m.key + 1 }));
  const openEdit = (index) => setModal((m) => ({ open: true, index, key: m.key + 1 }));
  const close = () => setModal((m) => ({ ...m, open: false }));

  const submit = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      const clean = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
      );
      if (modal.index == null) onChange([...items, { id: uid(), ...clean }]);
      else onChange(items.map((it, i) => (i === modal.index ? { ...it, ...clean } : it)));
      close();
    } catch (e) {
      /* validation messages are shown on the fields */
    } finally {
      setSaving(false);
    }
  };

  const move = (from, to) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const editing = modal.index != null ? items[modal.index] : null;

  return (
    <div className="cp-list">
      {items.length === 0 ? (
        <div className="cp-list-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText || `No ${itemLabel}s added yet`} />
        </div>
      ) : (
        items.map((item, index) => (
          <div className="cp-list-item" key={item.id || index}>
            <div className="cp-list-item-main">{renderSummary(item)}</div>
            <div className="cp-list-item-actions">
              {reorderable && (
                <>
                  <Tooltip title="Move up">
                    <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => move(index, index - 1)} />
                  </Tooltip>
                  <Tooltip title="Move down">
                    <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={index === items.length - 1} onClick={() => move(index, index + 1)} />
                  </Tooltip>
                </>
              )}
              <Tooltip title="Edit">
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(index)} aria-label={`Edit ${itemLabel}`} />
              </Tooltip>
              <Popconfirm
                title={`Delete this ${itemLabel}? It is removed when you save.`}
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => onChange(items.filter((_, i) => i !== index))}
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={`Delete ${itemLabel}`} />
              </Popconfirm>
            </div>
          </div>
        ))
      )}

      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        onClick={openAdd}
        disabled={items.length >= maxItems}
      >
        Add {itemLabel}
      </Button>

      <Modal
        open={modal.open}
        title={modal.index == null ? `Add ${itemLabel}` : `Edit ${itemLabel}`}
        okText={modal.index == null ? "Add" : "Update"}
        onOk={submit}
        onCancel={close}
        confirmLoading={saving}
        destroyOnClose
        maskClosable={false}
        width={modalWidth}
      >
        <Form
          key={modal.key}
          form={form}
          layout="vertical"
          requiredMark="optional"
          initialValues={editing || initialValues}
        >
          {renderFields()}
        </Form>
      </Modal>
    </div>
  );
};

export default ListSection;
