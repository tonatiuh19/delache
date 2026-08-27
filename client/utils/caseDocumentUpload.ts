import { upload } from "@vercel/blob/client";
import type {
  CaseDocumentItem,
  CreateCaseDocumentFromBlobRequest,
  DocumentCategory,
} from "@shared/api";
import {
  blobUploadPathPrefix,
  type DirectUploadActor,
} from "@shared/blobDirectUploadRules";
import {
  shouldUseDirectBlobUpload,
  shouldUseJsonDocumentUpload,
} from "@shared/documentDmsRules";
import api, { getSessionToken } from "@/lib/api";
import { fileToBase64 } from "@/utils/documentOcr";

export type DocumentUploadFailure = { name: string; error: string };

export type DocumentUploadBatchResult = {
  documents: CaseDocumentItem[];
  failures: DocumentUploadFailure[];
};

function safeBlobFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data
      ?.error || fallback
  );
}

export async function uploadOneCaseDocument(opts: {
  publicUuid: string;
  file: File;
  category: DocumentCategory;
  actor: DirectUploadActor;
}): Promise<CaseDocumentItem> {
  const { publicUuid, file, category, actor } = opts;
  const title = file.name;
  const contentType = file.type || "application/octet-stream";
  if (shouldUseDirectBlobUpload(file.size)) {
    const token = getSessionToken(actor);
    if (!token) {
      throw new Error("Not signed in");
    }
    const pathname = `${blobUploadPathPrefix(actor, publicUuid)}/${Date.now()}-${safeBlobFileName(file.name)}`;
    const blob = await upload(pathname, file, {
      access: "private",
      handleUploadUrl: "/api/blob/client-upload",
      multipart: true,
      contentType,
      headers: { Authorization: `Bearer ${token}` },
      clientPayload: JSON.stringify({ casePublicUuid: publicUuid, actor }),
    });
    const body: CreateCaseDocumentFromBlobRequest = {
      title,
      category,
      fileName: file.name,
      contentType,
      storageKey: blob.url,
      fileSizeBytes: file.size,
    };
    const path =
      actor === "law_firm"
        ? `/api/client/cases/${publicUuid}/documents/from-blob`
        : `/api/cases/${publicUuid}/documents/from-blob`;
    const { data } = await api.post<{ document: CaseDocumentItem }>(path, body);
    return data.document;
  }

  const data = await fileToBase64(file);
  const path =
    actor === "law_firm"
      ? `/api/client/cases/${publicUuid}/documents`
      : `/api/cases/${publicUuid}/documents`;
  const { data: res } = await api.post<{ document: CaseDocumentItem }>(path, {
    title,
    category,
    fileName: file.name,
    contentType,
    data,
  });
  return res.document;
}

export async function uploadCaseDocumentsBatch(opts: {
  publicUuid: string;
  files: File[];
  category: DocumentCategory;
  actor: DirectUploadActor;
}): Promise<DocumentUploadBatchResult> {
  const { publicUuid, files, category, actor } = opts;
  if (files.length === 0) return { documents: [], failures: [] };

  if (
    actor === "staff" &&
    files.length > 1 &&
    shouldUseJsonDocumentUpload(files)
  ) {
    try {
      const payloads = [];
      for (const file of files) {
        payloads.push({
          title: file.name,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          category,
          data: await fileToBase64(file),
        });
      }
      const { data } = await api.post<{ documents: CaseDocumentItem[] }>(
        `/api/cases/${publicUuid}/documents/bulk`,
        { files: payloads },
      );
      return { documents: data.documents, failures: [] };
    } catch (err: unknown) {
      return {
        documents: [],
        failures: files.map((file) => ({
          name: file.name,
          error: errorMessage(err, "upload_failed"),
        })),
      };
    }
  }

  const documents: CaseDocumentItem[] = [];
  const failures: DocumentUploadFailure[] = [];
  for (const file of files) {
    try {
      documents.push(
        await uploadOneCaseDocument({
          publicUuid,
          file,
          category,
          actor,
        }),
      );
    } catch (err: unknown) {
      failures.push({
        name: file.name,
        error: errorMessage(err, "upload_failed"),
      });
    }
  }
  return { documents, failures };
}
