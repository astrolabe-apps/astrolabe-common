"use client";

import {
  buildSchema,
  createFormTree,
  createSchemaDataNode,
  createSchemaLookup,
  GroupRenderType,
  lengthValidator,
  makeScalarField,
  stringField,
  WizardRenderOptions,
} from "@astroapps/forms-core";
import { useControl } from "@react-typed-forms/core";
import {
  createFormRenderer,
  dataControl,
  groupedControl,
  RenderForm,
} from "@react-typed-forms/schemas";
import {
  createDefaultRenderers,
  defaultTailwindTheme,
} from "@react-typed-forms/schemas-html";
import {
  createFileUploadRenderer,
  FormUpload,
} from "@astroapps/schemas-fileupload";

// ---------------------------------------------------------------------------
// Form data
// ---------------------------------------------------------------------------
interface UploadWizardForm {
  fullName: string;
  email: string;
  resume: FormUpload | null;
  coverLetter: FormUpload | null;
  attachments: FormUpload[];
  notes: string;
}

const fileField = (displayName: string) =>
  makeScalarField({ type: "File" as const, displayName });

const fileCollectionField = (displayName: string) =>
  makeScalarField({ type: "File" as const, collection: true, displayName });

const UploadWizardSchema = buildSchema<UploadWizardForm, "File">({
  fullName: stringField("Full Name"),
  email: stringField("Email"),
  resume: fileField("Resume"),
  coverLetter: fileField("Cover Letter"),
  attachments: fileCollectionField("Additional Attachments"),
  notes: stringField("Notes"),
});

const schemaLookup = createSchemaLookup({ UploadWizardSchema });
const schemaTree = schemaLookup.getSchemaTree("UploadWizardSchema");

// ---------------------------------------------------------------------------
// Mock file operations — simulate network latency & return fake FormUpload
// ---------------------------------------------------------------------------
const uploadLog: { action: string; file: string; time: string }[] = [];

function logEntry(action: string, file: string) {
  uploadLog.unshift({
    action,
    file,
    time: new Date().toLocaleTimeString(),
  });
}

const UPLOAD_FAILURE_RATE = 0.5;

async function mockUpload(f: File): Promise<FormUpload | null> {
  await new Promise((r) => setTimeout(r, 600));
  if (Math.random() < UPLOAD_FAILURE_RATE) {
    logEntry("FAILED", f.name);
    throw new Error("Failed for unknown reason");
  }
  logEntry("upload", f.name);
  return {
    id: crypto.randomUUID(),
    filename: f.name,
    length: f.size,
  };
}

async function mockDelete(f: FormUpload) {
  await new Promise((r) => setTimeout(r, 300));
  logEntry("delete", f.filename);
}

async function mockDownload(f: FormUpload) {
  logEntry("download", f.filename);
  alert(
    `Download requested:\n\n${f.filename} (${f.length} bytes)\nid: ${f.id}`,
  );
}

// ---------------------------------------------------------------------------
// Renderer — register the file upload renderer
// ---------------------------------------------------------------------------
const formRenderer = createFormRenderer(
  [
    createFileUploadRenderer({
      uploadFile: mockUpload,
      deleteFile: mockDelete,
      downloadFile: mockDownload,
    }),
  ],
  createDefaultRenderers(defaultTailwindTheme),
);

// ---------------------------------------------------------------------------
// Wizard form tree — each child of the Wizard group becomes its own page
// ---------------------------------------------------------------------------
const wizardForm = groupedControl(
  [
    groupedControl(
      [dataControl("fullName"), dataControl("email")],
      "Applicant Details",
    ),
    groupedControl(
      [
        dataControl("resume"),
        dataControl("coverLetter"),
        dataControl("attachments", null, {
          required: true,
          validators: [lengthValidator(undefined, 2)],
        }),
      ],
      "Upload Documents",
    ),
    groupedControl([dataControl("notes")], "Additional Notes"),
  ],
  "Upload Wizard",
  {
    groupOptions: {
      type: GroupRenderType.Wizard,
      showSteps: true,
    } as WizardRenderOptions,
  },
);

const formTree = createFormTree([wizardForm]);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function FormUploadWizardPage() {
  const data = useControl<UploadWizardForm>({
    fullName: "",
    email: "",
    resume: null,
    coverLetter: null,
    attachments: [],
    notes: "",
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Form Upload Wizard Test</h1>
      <p className="text-gray-600">
        Multi-step wizard demonstrating the file upload control from{" "}
        <code>@astroapps/schemas-fileupload</code>. Uploads are mocked — files
        are not sent anywhere. Each drop/select returns a generated{" "}
        <code>FormUpload</code> record.
      </p>

      <div className="border rounded p-4">
        <RenderForm
          data={createSchemaDataNode(schemaTree.rootNode, data)}
          form={formTree.rootNode}
          renderer={formRenderer}
        />
      </div>

      <details className="mt-4" open>
        <summary className="cursor-pointer font-medium">Form data</summary>
        <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto">
          {JSON.stringify(data.value, null, 2)}
        </pre>
      </details>

      <details className="mt-4">
        <summary className="cursor-pointer font-medium">
          Upload activity log
        </summary>
        <pre className="mt-2 p-4 bg-gray-100 rounded text-sm overflow-auto max-h-64">
          {uploadLog.length === 0
            ? "(no activity yet)"
            : uploadLog
                .map((e) => `${e.time}  ${e.action.padEnd(8)}  ${e.file}`)
                .join("\n")}
        </pre>
      </details>
    </div>
  );
}
