import React, { ChangeEvent, DragEvent, useRef } from "react";
import {
  createAction,
  createDataRenderer,
  deepMerge,
  FormRenderer,
} from "@react-typed-forms/schemas";
import { Control, RenderOptional } from "@react-typed-forms/core";
import clsx from "clsx";

export interface FormUpload {
  id: string;
  filename: string;
  length: number;
}

export interface FileUploadRendererOptions {
  uploadFile?: (f: File) => Promise<FormUpload | null>;
  deleteFile?: (f: FormUpload) => Promise<any>;
  downloadFile?: (f: FormUpload) => Promise<any>;
  classes?: {
    uploadClass?: string;
    fileClass?: string;
    downloadClass?: string;
  };
}

const defaultOptions = {
  classes: {
    uploadClass:
      "border border-black border-dashed w-full mb-2 p-2 text-center",
    fileClass: "flex space-x-4 items-center my-2",
    downloadClass: "cursor-pointer text-blue-500 underline",
  },
} satisfies FileUploadRendererOptions;

export function createFileUploadRenderer(options?: FileUploadRendererOptions) {
  return createDataRenderer(
    (p, renderers) => (
      <FormUploader
        readonly={p.readonly}
        options={options ?? {}}
        actionRenderer={renderers.renderAction}
        control={p.control.as()}
      />
    ),
    { schemaType: "File" },
  );
}

function FormUploader({
  control,
  readonly,
  options,
  actionRenderer,
}: {
  control: Control<FormUpload | null>;
  readonly?: boolean;
  options: FileUploadRendererOptions;
  actionRenderer: FormRenderer["renderAction"];
}) {
  const { downloadFile, uploadFile, deleteFile, classes } = deepMerge<
    FileUploadRendererOptions & typeof defaultOptions
  >(
    options as FileUploadRendererOptions & typeof defaultOptions,
    defaultOptions,
  );
  return (
    <RenderOptional
      control={control}
      notDefined={
        <FileUpload
          uploadFile={doUpload}
          title="Select a file..."
          readonly={readonly}
        />
      }
      children={(c) => (
        <div
          className={classes.fileClass}
          ref={(e) => {
            control.element = e;
          }}
        >
          <div
            onClick={() => downloadFile?.(c.value)}
            className={clsx(downloadFile && classes.downloadClass)}
          >
            {c.value.filename}
          </div>
          {!readonly && (
            <div>
              {actionRenderer(
                createAction("Delete", () => doDeleteFile(c.value)),
              )}
            </div>
          )}
        </div>
      )}
    />
  );

  async function doUpload(f: File) {
    if (uploadFile) {
      control.value = await uploadFile(f);
    } else {
      throw "Must supply an uploadFile()";
    }
  }

  async function doDeleteFile(f: FormUpload) {
    if (deleteFile) {
      await deleteFile(f);
      control.value = null;
    } else {
      throw "Must supply an deleteFile()";
    }
  }
}

export function FileUpload({
  multiple,
  uploadFile,
  title,
  readonly,
  className,
}: {
  uploadFile: (f: File) => void;
  title: string;
  readonly?: boolean;
  multiple?: boolean;
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        onChange={uploadFiles}
        multiple={multiple}
        style={{ display: "none" }}
      />
      <div
        className={className}
        onClick={clickFile}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {title}
      </div>
    </>
  );

  function clickFile() {
    if (!readonly) fileRef.current?.click();
  }

  function uploadFiles(e: ChangeEvent<HTMLInputElement>) {
    uploadFileList(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    uploadFileList(e.dataTransfer?.files);
  }

  function uploadFileList(files?: FileList | null) {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      uploadFile(f);
    }
  }
}
