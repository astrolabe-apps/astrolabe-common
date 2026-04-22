import React, { ChangeEvent, DragEvent, ReactNode, useRef } from "react";
import {
  ArrayRendererProps,
  createArrayActions,
  createAction,
  createDataRenderer,
  DataRendererProps,
  deepMerge,
  FormRenderer,
  getLengthRestrictions,
} from "@react-typed-forms/schemas";
import {
  addElement,
  Control,
  RenderOptional,
  useControl,
} from "@react-typed-forms/core";
import clsx from "clsx";

export interface FormUpload {
  id: string;
  filename: string;
  length: number;
}

export interface FileUploadClasses {
  uploadClass?: string;
  fileClass?: string;
  downloadClass?: string;
  errorClass?: string;
}

export interface FileUploadRendererOptions {
  uploadFile?: (f: File) => Promise<FormUpload | null>;
  deleteFile?: (f: FormUpload) => Promise<any>;
  downloadFile?: (f: FormUpload) => Promise<any>;
  translateError?: (e: unknown) => string | undefined | null;
  classes?: FileUploadClasses;
}

const defaultOptions = {
  classes: {
    uploadClass:
      "border border-black border-dashed w-full mb-2 p-2 text-center",
    fileClass: "flex space-x-4 items-center my-2",
    downloadClass: "cursor-pointer text-blue-500 underline",
    errorClass: "text-sm text-red-500",
  },
} satisfies FileUploadRendererOptions;

type MergedOptions = FileUploadRendererOptions & typeof defaultOptions;

function mergeOptions(options: FileUploadRendererOptions): MergedOptions {
  return deepMerge<MergedOptions>(options as MergedOptions, defaultOptions);
}

function defaultTranslateError(e: unknown): string {
  return e?.toString() ?? "Failed upload";
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

export function DownloadLink({
  file,
  downloadFile,
  downloadClass,
}: {
  file: Control<FormUpload>;
  downloadFile?: (f: FormUpload) => Promise<any>;
  downloadClass?: string;
}) {
  return (
    <div
      onClick={() => downloadFile?.(file.value)}
      className={clsx(downloadFile && downloadClass)}
    >
      {file.value.filename}
    </div>
  );
}

export function UploadedFileRow({
  file,
  downloadFile,
  classes,
  divRef,
  deleteFile,
  actionRenderer,
}: {
  file: Control<FormUpload>;
  downloadFile?: (f: FormUpload) => Promise<any>;
  classes: FileUploadClasses;
  divRef?: (el: HTMLDivElement | null) => void;
  actionRenderer: FormRenderer["renderAction"];
  deleteFile?: (f: FormUpload) => Promise<any>;
}) {
  return (
    <div className={classes.fileClass} ref={divRef}>
      <DownloadLink
        file={file}
        downloadFile={downloadFile}
        downloadClass={classes.downloadClass}
      />
      {deleteFile && (
        <div>
          {actionRenderer(createAction("Delete", () => deleteFile(file.value)))}
        </div>
      )}
    </div>
  );
}

export function UploadDropZone({
  uploadFile,
  readonly,
  classes,
  error,
  title = "Select a file...",
}: {
  uploadFile: (f: File) => void;
  readonly?: boolean;
  classes: FileUploadClasses;
  error?: string | null;
  title?: string;
}) {
  return (
    <div>
      <FileUpload
        uploadFile={uploadFile}
        title={title}
        readonly={readonly}
        className={classes.uploadClass}
      />
      {error && <span className={classes.errorClass}>{error}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export function createFileUploadRenderer(options?: FileUploadRendererOptions) {
  const opts = options ?? {};
  return createDataRenderer(
    (p, renderers) =>
      !p.dataNode.schema.field.collection ? (
        <FormUploader
          readonly={p.readonly}
          options={opts}
          actionRenderer={renderers.renderAction}
          control={p.control.as()}
        />
      ) : (
        <FormUploadArray dataProps={p} renderer={renderers} options={opts} />
      ),
    { schemaType: "File", collection: null },
  );
}

function FormUploadArray({
  dataProps,
  renderer,
  options,
}: {
  dataProps: DataRendererProps;
  renderer: FormRenderer;
  options: FileUploadRendererOptions;
}) {
  const { control, field, readonly, required, formNode, definition } =
    dataProps;
  const {
    uploadFile,
    deleteFile,
    downloadFile,
    classes,
    translateError = defaultTranslateError,
  } = mergeOptions(options);
  const arrayControl = control.as<FormUpload[]>();
  const length = formNode.getChildCount();
  const lengthRestrictions = getLengthRestrictions(definition);
  const uploadError = useControl<string | null>();
  const { max } = lengthRestrictions;
  const disabled = formNode.disabled;
  const canAdd = !readonly && !disabled && (max == null || length < max);

  const baseActions = createArrayActions(
    arrayControl,
    () => formNode.getChildCount(),
    field,
    { readonly, disabled, noAdd: true },
  );

  const arrayProps: ArrayRendererProps = {
    ...baseActions,
    ...lengthRestrictions,
    required: false,
    disabled,
    removeAction: baseActions.removeAction
      ? (i: number) => {
          const base = baseActions.removeAction!(i);
          return {
            ...base,
            onClick: async () => {
              const elem = arrayControl.elements?.[i];
              if (elem?.value && deleteFile) {
                await deleteFile(elem.value);
              }
              base.onClick();
            },
          };
        }
      : undefined,
    renderElement: (i, wrap) =>
      wrap(
        i,
        <UploadedFileRow
          file={arrayControl.elements[i]}
          downloadFile={downloadFile}
          classes={classes}
          actionRenderer={renderer.renderAction}
        />,
      ),
  };

  return (
    <div
      ref={(e) => {
        arrayControl.element = e;
      }}
    >
      {renderer.renderArray(arrayProps)}
      {canAdd && (
        <UploadDropZone
          uploadFile={doUpload}
          readonly={readonly}
          title={"Add a file..."}
          classes={classes}
          error={uploadError.value}
        />
      )}
    </div>
  );

  async function doUpload(f: File) {
    if (!uploadFile) throw "Must supply an uploadFile()";
    let err: string | null | undefined = null;
    try {
      const result = await uploadFile(f);
      if (result) addElement(arrayControl, result);
    } catch (e) {
      err = translateError(e);
    }
    arrayControl.touched = true;
    uploadError.value = err;
  }
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
  const {
    downloadFile,
    uploadFile,
    deleteFile,
    classes,
    translateError = defaultTranslateError,
  } = mergeOptions(options);
  return (
    <RenderOptional
      control={control}
      notDefined={
        <UploadDropZone
          uploadFile={doUpload}
          readonly={readonly}
          classes={classes}
        />
      }
      children={(c) => (
        <UploadedFileRow
          file={c}
          downloadFile={downloadFile}
          classes={classes}
          divRef={(e) => {
            control.element = e;
          }}
          actionRenderer={actionRenderer}
          deleteFile={!readonly ? doDeleteFile : undefined}
        />
      )}
    />
  );

  async function doUpload(f: File) {
    if (!uploadFile) throw "Must supply an uploadFile()";
    let err: string | null | undefined = null;
    try {
      control.value = await uploadFile(f);
    } catch (e) {
      err = translateError(e);
    }
    control.touched = true;
    control.setError("upload", err);
  }

  async function doDeleteFile(f: FormUpload) {
    if (!deleteFile) throw "Must supply an deleteFile()";
    await deleteFile(f);
    control.value = null;
  }
}

// ---------------------------------------------------------------------------
// Primitive file drop / picker
// ---------------------------------------------------------------------------

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
