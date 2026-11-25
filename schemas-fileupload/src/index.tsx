import React, { ChangeEvent, DragEvent, ReactNode, useRef } from "react";
import {
  ArrayRendererProps,
  createAction,
  createArrayActions,
  createDataRenderer,
  DataRendererProps,
  deepMerge,
  FormRenderer,
  getLengthRestrictions,
} from "@react-typed-forms/schemas";
import {
  addElement,
  Control,
  removeElement,
  RenderElements,
  RenderOptional,
  useControl,
} from "@react-typed-forms/core";
import clsx from "clsx";

export interface FormUpload {
  id: string;
  filename: string;
  length: number;
}

export interface PendingUpload {
  id: string;
  file: File;
  loaded: number;
  total: number;
  error?: string | null;
}

export interface FileUploadClasses {
  uploadClass?: string;
  fileClass?: string;
  downloadClass?: string;
  errorClass?: string;
  pendingClass?: string;
  pendingContentClass?: string;
  pendingNameClass?: string;
  progressClass?: string;
  progressBarClass?: string;
  fileSizeClass?: string;
  renderProgress?: (
    progress: number,
    total: number,
    classes: FileUploadClasses,
  ) => ReactNode;
}

export interface FileUploadRendererOptions {
  uploadFile?: (
    f: File,
    onProgress: (loaded: number, total: number) => void,
    signal: AbortSignal,
  ) => Promise<FormUpload | null>;
  deleteFile?: (f: FormUpload) => Promise<any>;
  downloadFile?: (f: FormUpload) => Promise<any>;
  translateError?: (e: unknown) => string | undefined | null;
  classes?: FileUploadClasses;
  /** Show the size of uploaded and pending files next to their names. */
  showFileSize?: boolean;
  /** Custom formatting for file sizes. Defaults to {@link formatFileSize}. */
  formatFileSize?: (bytes: number) => string;
}

const defaultOptions = {
  classes: {
    uploadClass:
      "border border-black border-dashed w-full my-2 p-2 text-center",
    fileClass: "flex space-x-4 items-center my-2",
    downloadClass: "cursor-pointer text-blue-500 underline",
    errorClass: "text-sm text-red-500",
    pendingClass: "flex space-x-4 items-center my-2",
    progressClass: "flex-1 h-2 bg-gray-200 rounded overflow-hidden",
    progressBarClass: "h-full bg-blue-500 transition-all",
    fileSizeClass: "text-sm text-gray-500",
  },
} satisfies FileUploadRendererOptions;

type MergedOptions = FileUploadRendererOptions & typeof defaultOptions;

function mergeOptions(options: FileUploadRendererOptions): MergedOptions {
  return deepMerge<MergedOptions>(options as MergedOptions, defaultOptions);
}

function defaultTranslateError(e: unknown): string {
  return e?.toString() ?? "Failed upload";
}

const fileSizeUnits = ["B", "KB", "MB", "GB", "TB"];

export function formatFileSize(bytes: number): string {
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < fileSizeUnits.length - 1) {
    size /= 1024;
    unit++;
  }
  const rounded = unit === 0 ? size.toString() : size.toFixed(1);
  return `${rounded} ${fileSizeUnits[unit]}`;
}

function getSizeFormatter(
  opts: FileUploadRendererOptions,
): ((bytes: number) => string) | undefined {
  return opts.showFileSize
    ? (opts.formatFileSize ?? formatFileSize)
    : undefined;
}

export function FileSize({
  bytes,
  format,
  className,
}: {
  bytes: number | null | undefined;
  format?: (bytes: number) => string;
  className?: string;
}) {
  if (!format || bytes == null) return null;
  return <span className={className}>{format(bytes)}</span>;
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
      {file.value?.filename ?? "file.txt"}
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
  formatSize,
}: {
  file: Control<FormUpload>;
  downloadFile?: (f: FormUpload) => Promise<any>;
  classes: FileUploadClasses;
  divRef?: (el: HTMLDivElement | null) => void;
  actionRenderer: FormRenderer["renderAction"];
  deleteFile?: (f: FormUpload) => Promise<any>;
  formatSize?: (bytes: number) => string;
}) {
  return (
    <div className={classes.fileClass} ref={divRef}>
      <DownloadLink
        file={file}
        downloadFile={downloadFile}
        downloadClass={classes.downloadClass}
      />
      <FileSize
        bytes={file.value?.length}
        format={formatSize}
        className={classes.fileSizeClass}
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

function defaultRenderProgressBar(
  loaded: number,
  total: number,
  classes: FileUploadClasses,
) {
  const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;

  return (
    <div className={classes.progressClass}>
      <div className={classes.progressBarClass} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PendingUploadRow({
  pending,
  classes,
  actionRenderer,
  onCancel,
  formatSize,
}: {
  pending: Control<PendingUpload>;
  classes: FileUploadClasses;
  actionRenderer: FormRenderer["renderAction"];
  onCancel: () => void;
  formatSize?: (bytes: number) => string;
}) {
  const {
    pendingClass,
    pendingContentClass,
    pendingNameClass,
    errorClass,
    fileSizeClass,
    renderProgress = defaultRenderProgressBar,
  } = classes;

  const { file, loaded, total, error } = pending.fields;
  const errV = error.value;
  return (
    <div className={pendingClass}>
      <div className={pendingContentClass}>
        <div className={pendingNameClass}>{file.value.name}</div>
        <FileSize
          bytes={file.value.size}
          format={formatSize}
          className={fileSizeClass}
        />
        {errV ? (
          <span className={errorClass}>{errV}</span>
        ) : (
          renderProgress(loaded.value, total.value, classes)
        )}
      </div>
      {actionRenderer(createAction(errV ? "Dismiss" : "Cancel", onCancel))}
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
  const formatSize = getSizeFormatter(options);
  const arrayControl = control.as<FormUpload[]>();
  const pending = useControl<PendingUpload[]>([]);
  const abortControllers = useRef(new Map<string, AbortController>());
  const length = formNode.getChildCount();
  const lengthRestrictions = getLengthRestrictions(definition);
  const { max } = lengthRestrictions;
  const disabled = formNode.disabled;
  const pendingCount = pending.elements.length;
  const canAdd =
    !readonly && !disabled && (max == null || length + pendingCount < max);

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
          formatSize={formatSize}
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
      <RenderElements control={pending}>
        {(pendingCtrl) => (
          <PendingUploadRow
            pending={pendingCtrl}
            classes={classes}
            actionRenderer={renderer.renderAction}
            onCancel={() => cancelPending(pendingCtrl)}
            formatSize={formatSize}
          />
        )}
      </RenderElements>
      {canAdd && (
        <UploadDropZone
          uploadFile={doUpload}
          readonly={readonly}
          title={"Add a file..."}
          classes={classes}
        />
      )}
    </div>
  );

  function cancelPending(pendingCtrl: Control<PendingUpload>) {
    const id = pendingCtrl.fields.id.value;
    const controller = abortControllers.current.get(id);
    if (controller && !pendingCtrl.fields.error.value) {
      controller.abort();
    } else {
      abortControllers.current.delete(id);
      removeElement(pending, pendingCtrl);
    }
  }

  async function doUpload(f: File) {
    if (!uploadFile) throw "Must supply an uploadFile()";
    const id = crypto.randomUUID();
    const controller = new AbortController();
    abortControllers.current.set(id, controller);
    const pendingCtrl = addElement(pending, {
      id,
      file: f,
      loaded: 0,
      total: f.size,
      error: null,
    });
    try {
      const result = await uploadFile(
        f,
        (loaded, total) => {
          pendingCtrl.fields.loaded.value = loaded;
          pendingCtrl.fields.total.value = total;
        },
        controller.signal,
      );
      abortControllers.current.delete(id);
      removeElement(pending, pendingCtrl);
      if (result) addElement(arrayControl, result);
    } catch (e) {
      abortControllers.current.delete(id);
      if (controller.signal.aborted) {
        removeElement(pending, pendingCtrl);
      } else {
        pendingCtrl.fields.error.value = translateError(e) ?? "Upload failed";
      }
    }
    arrayControl.touched = true;
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
  const formatSize = getSizeFormatter(options);
  const pending = useControl<PendingUpload | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  return (
    <RenderOptional
      control={pending}
      notDefined={
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
              formatSize={formatSize}
            />
          )}
        />
      }
      children={(p) => (
        <PendingUploadRow
          pending={p}
          classes={classes}
          actionRenderer={actionRenderer}
          onCancel={cancelPending}
          formatSize={formatSize}
        />
      )}
    />
  );

  function cancelPending() {
    if (pending.value?.error) {
      pending.value = null;
    } else {
      abortControllerRef.current?.abort();
    }
  }

  async function doUpload(f: File) {
    if (!uploadFile) throw "Must supply an uploadFile()";
    const controller = new AbortController();
    abortControllerRef.current = controller;
    pending.value = {
      id: crypto.randomUUID(),
      file: f,
      loaded: 0,
      total: f.size,
      error: null,
    };
    try {
      const result = await uploadFile(
        f,
        (loaded, total) => {
          if (!pending.value) return;
          pending.fields.loaded.value = loaded;
          pending.fields.total.value = total;
        },
        controller.signal,
      );
      pending.value = null;
      control.value = result;
    } catch (e) {
      if (controller.signal.aborted) {
        pending.value = null;
      } else if (pending.value) {
        pending.fields.error.value = translateError(e) ?? "Upload failed";
      }
    }
    abortControllerRef.current = null;
    control.touched = true;
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
