import React, { useState } from "react";
import { Button, message, Upload } from "antd";
import { DeleteOutlined, LoadingOutlined, PictureOutlined, UploadOutlined } from "@ant-design/icons";
import { getErrorMessage } from "../../shared/api";
import { IMAGE_TYPES, MAX_IMAGE_MB, imageUrl, uploadCompanyImage } from "./companyApi";

/**
 * Form.Item-compatible image field (value = stored file name, onChange(fileName)).
 * Validates type and size in the browser, uploads straight to the company upload
 * endpoint, and keeps only the returned file name in the form.
 * `shape` only changes the preview box: "logo" | "cover" | "avatar" | "photo".
 */
const ImageUploadField = ({ value, onChange, shape = "photo", hint }) => {
  const [uploading, setUploading] = useState(false);
  const src = imageUrl(value);

  const beforeUpload = async (file) => {
    if (!IMAGE_TYPES.includes(file.type)) {
      message.error("Please choose a JPG, PNG or WEBP image.");
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > MAX_IMAGE_MB) {
      message.error(`The image must be smaller than ${MAX_IMAGE_MB} MB.`);
      return Upload.LIST_IGNORE;
    }
    setUploading(true);
    try {
      const filename = await uploadCompanyImage(file);
      onChange?.(filename);
      message.success("Image uploaded. It goes live when you save your changes.");
    } catch (err) {
      const missing = err?.response?.status === 404;
      message.error(
        missing
          ? "The company image upload endpoint is not available on the server yet."
          : getErrorMessage(err, "Unable to upload the image.")
      );
    } finally {
      setUploading(false);
    }
    return Upload.LIST_IGNORE; // we manage the file ourselves
  };

  return (
    <div className="cp-upload">
      <div className={`cp-upload-box is-${shape}`}>
        {uploading ? (
          <LoadingOutlined />
        ) : src ? (
          <img src={src} alt="" />
        ) : (
          <PictureOutlined />
        )}
      </div>
      <div className="cp-upload-side">
        <div className="cp-upload-actions">
          <Upload accept={IMAGE_TYPES.join(",")} showUploadList={false} beforeUpload={beforeUpload} disabled={uploading}>
            <Button icon={<UploadOutlined />} loading={uploading}>
              {src ? "Replace image" : "Upload image"}
            </Button>
          </Upload>
          {src && !uploading && (
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onChange?.("")}>
              Remove
            </Button>
          )}
        </div>
        <span className="cp-upload-hint">{hint || `JPG, PNG or WEBP, up to ${MAX_IMAGE_MB} MB`}</span>
      </div>
    </div>
  );
};

export default ImageUploadField;
