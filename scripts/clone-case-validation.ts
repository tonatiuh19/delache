/**
 * One-shot: clone a case (data + document/evidence blob refs) for platform validation.
 *
 * Usage:
 *   SOURCE_CASE_NUMBER=DEL-2026-0001 npx tsx scripts/clone-case-validation.ts
 *
 * Documents/evidence keep the same storage_key (shared blob). No file re-upload.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";

const SOURCE_CASE_NUMBER = (
  process.env.SOURCE_CASE_NUMBER || "DEL-2026-0001"
).trim();

const CLONE_TITLE =
  "[INTERNAL TEST / QA VALIDATION] Platform clone — NOT a live matter (source DEL-2026-0001)";

const CLONE_DESCRIPTION_PREFIX =
  "INTERNAL PLATFORM VALIDATION COPY. Do not treat as a production expediente. Source case: ";

/** mysql2 returns JSON columns as objects; re-insert as valid JSON text. */
function asJsonParam(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "false" ? undefined : { minVersion: "TLSv1.2" },
  });

  try {
    await conn.beginTransaction();

    const [caseRows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT * FROM cases WHERE case_number = ? AND deleted_at IS NULL LIMIT 1`,
      [SOURCE_CASE_NUMBER],
    );
    if (caseRows.length === 0) {
      throw new Error(`Source case not found: ${SOURCE_CASE_NUMBER}`);
    }
    const src = caseRows[0];
    const sourceId = Number(src.id);

    const [seqRows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'case_number_next_seq' LIMIT 1 FOR UPDATE`,
    );
    const nextSeq = Math.max(2, Number(seqRows[0]?.setting_value || 2));
    const year = new Date().getFullYear();
    const newCaseNumber = `DEL-${year}-${String(nextSeq).padStart(4, "0")}`;
    const newCaseUuid = randomUUID();

    const [caseInsert] = await conn.query<mysql.ResultSetHeader>(
      `INSERT INTO cases (
        public_uuid, case_number, external_reference, title, description,
        law_firm_id, court_name, court_file_number, plaintiff_name, defendant_name,
        priority, status, assigned_expert_id, assigned_coordinator_id,
        property_address, property_city, property_state, property_postal_code, property_country,
        property_lat, property_lng, involves_fatality,
        gps_validated_at, street_view_validated_at, power_line_verified_at,
        intake_received_at, court_acceptance_at, inspection_deadline_at,
        completed_at, cancelled_at, cancel_reason, created_by
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )`,
      [
        newCaseUuid,
        newCaseNumber,
        src.external_reference
          ? `TEST-CLONE:${src.external_reference}`
          : `TEST-CLONE:${SOURCE_CASE_NUMBER}`,
        CLONE_TITLE,
        `${CLONE_DESCRIPTION_PREFIX}${SOURCE_CASE_NUMBER} (id ${sourceId}).\n\n${src.description || ""}`.trim(),
        src.law_firm_id,
        src.court_name,
        src.court_file_number,
        src.plaintiff_name,
        src.defendant_name,
        src.priority,
        src.status,
        src.assigned_expert_id,
        src.assigned_coordinator_id,
        src.property_address,
        src.property_city,
        src.property_state,
        src.property_postal_code,
        src.property_country,
        src.property_lat,
        src.property_lng,
        src.involves_fatality,
        src.gps_validated_at,
        src.street_view_validated_at,
        src.power_line_verified_at,
        src.intake_received_at,
        src.court_acceptance_at,
        src.inspection_deadline_at,
        src.completed_at,
        src.cancelled_at,
        src.cancel_reason,
        src.created_by,
      ],
    );
    const newCaseId = Number(caseInsert.insertId);

    await conn.query(
      `UPDATE system_settings SET setting_value = ? WHERE setting_key = 'case_number_next_seq'`,
      [String(nextSeq + 1)],
    );

    // Assignments
    const [assignments] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT * FROM case_assignments WHERE case_id = ?`,
      [sourceId],
    );
    for (const a of assignments) {
      await conn.query(
        `INSERT INTO case_assignments (
          case_id, user_id, assignment_role, is_primary, assigned_by, assigned_at, unassigned_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newCaseId,
          a.user_id,
          a.assignment_role,
          a.is_primary,
          a.assigned_by,
          a.assigned_at,
          a.unassigned_at,
          a.notes,
        ],
      );
    }

    // Notes (+ banner note)
    const [notes] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT * FROM case_notes WHERE case_id = ? AND deleted_at IS NULL`,
      [sourceId],
    );
    for (const n of notes) {
      await conn.query(
        `INSERT INTO case_notes (case_id, author_id, visibility, body) VALUES (?, ?, ?, ?)`,
        [newCaseId, n.author_id, n.visibility, n.body],
      );
    }
    await conn.query(
      `INSERT INTO case_notes (case_id, author_id, visibility, body) VALUES (?, ?, 'internal', ?)`,
      [
        newCaseId,
        src.created_by,
        `[SYSTEM] This expediente is an INTERNAL TEST / QA VALIDATION clone of ${SOURCE_CASE_NUMBER}. Blob files are shared references (not duplicated). Safe to ignore for production work.`,
      ],
    );

    // Documents + versions (shared storage_key)
    const docIdMap = new Map<number, number>();
    const [docs] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT * FROM documents WHERE case_id = ? AND deleted_at IS NULL`,
      [sourceId],
    );
    for (const d of docs) {
      const [docIns] = await conn.query<mysql.ResultSetHeader>(
        `INSERT INTO documents (
          public_uuid, case_id, category, title, description, current_version, status,
          is_required, uploaded_by, uploaded_by_law_firm_user_id, approved_by, approved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          newCaseId,
          d.category,
          d.title,
          d.description,
          d.current_version,
          d.status,
          d.is_required,
          d.uploaded_by,
          d.uploaded_by_law_firm_user_id,
          d.approved_by,
          d.approved_at,
        ],
      );
      const newDocId = Number(docIns.insertId);
      docIdMap.set(Number(d.id), newDocId);

      const [versions] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT * FROM document_versions WHERE document_id = ? ORDER BY version_number ASC`,
        [d.id],
      );
      for (const v of versions) {
        await conn.query(
          `INSERT INTO document_versions (
            document_id, version_number, storage_key, file_name, mime_type, file_size_bytes,
            checksum_sha256, uploaded_by, change_summary, ocr_text, ocr_status, ocr_processed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newDocId,
            v.version_number,
            v.storage_key,
            v.file_name,
            v.mime_type,
            v.file_size_bytes,
            v.checksum_sha256,
            v.uploaded_by,
            v.change_summary,
            v.ocr_text,
            v.ocr_status,
            v.ocr_processed_at,
          ],
        );
      }
    }

    // Evidence (shared storage_key)
    const [evidence] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT * FROM evidence_items WHERE case_id = ? AND deleted_at IS NULL`,
      [sourceId],
    );
    for (const e of evidence) {
      await conn.query(
        `INSERT INTO evidence_items (
          public_uuid, case_id, inspection_id, evidence_type, category, title, caption,
          storage_key, mime_type, file_size_bytes, captured_at, lat, lng, metadata_json, captured_by
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          newCaseId,
          e.evidence_type,
          e.category,
          e.title,
          e.caption,
          e.storage_key,
          e.mime_type,
          e.file_size_bytes,
          e.captured_at,
          e.lat,
          e.lng,
          asJsonParam(e.metadata_json),
          e.captured_by,
        ],
      );
    }

    // Questionnaire
    const questionnaireIdMap = new Map<number, number>();
    const [questionnaires] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT * FROM questionnaires WHERE case_id = ?`,
      [sourceId],
    );
    for (const q of questionnaires) {
      const [qIns] = await conn.query<mysql.ResultSetHeader>(
        `INSERT INTO questionnaires (
          public_uuid, case_id, status, content_json, chronology_json, technical_observations,
          prepared_by, submitted_at, reviewed_by, reviewed_at, review_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          newCaseId,
          q.status,
          asJsonParam(q.content_json),
          asJsonParam(q.chronology_json),
          q.technical_observations,
          q.prepared_by,
          q.submitted_at,
          q.reviewed_by,
          q.reviewed_at,
          q.review_notes,
        ],
      );
      questionnaireIdMap.set(Number(q.id), Number(qIns.insertId));
    }

    // Technical reports
    const reportIdMap = new Map<number, number>();
    const [reports] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT * FROM technical_reports WHERE case_id = ?`,
      [sourceId],
    );
    for (const r of reports) {
      const mappedDocId =
        r.document_id != null
          ? (docIdMap.get(Number(r.document_id)) ?? null)
          : null;
      const [rIns] = await conn.query<mysql.ResultSetHeader>(
        `INSERT INTO technical_reports (
          public_uuid, case_id, status, version_number, investigation_summary, conclusions,
          photo_catalog_json, document_id, authored_by, submitted_at, approved_at, delivered_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          newCaseId,
          r.status,
          r.version_number,
          r.investigation_summary,
          r.conclusions,
          asJsonParam(r.photo_catalog_json),
          mappedDocId,
          r.authored_by,
          r.submitted_at,
          r.approved_at,
          r.delivered_at,
        ],
      );
      reportIdMap.set(Number(r.id), Number(rIns.insertId));
    }

    // Review requests (remap entity ids)
    const [reviews] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT * FROM review_requests WHERE case_id = ?`,
      [sourceId],
    );
    for (const rr of reviews) {
      let entityId = Number(rr.entity_id);
      if (rr.entity_type === "technical_report") {
        const mapped = reportIdMap.get(entityId);
        if (mapped == null) continue;
        entityId = mapped;
      } else if (rr.entity_type === "questionnaire") {
        const mapped = questionnaireIdMap.get(entityId);
        if (mapped == null) continue;
        entityId = mapped;
      } else if (rr.entity_type === "document") {
        const mapped = docIdMap.get(entityId);
        if (mapped == null) continue;
        entityId = mapped;
      } else {
        // inspections not cloned in this pass
        continue;
      }
      await conn.query(
        `INSERT INTO review_requests (
          case_id, entity_type, entity_id, review_stage, status,
          requested_by, assigned_to, due_at, completed_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newCaseId,
          rr.entity_type,
          entityId,
          rr.review_stage,
          rr.status,
          rr.requested_by,
          rr.assigned_to,
          rr.due_at,
          rr.completed_at,
          rr.notes,
        ],
      );
    }

    // Status history
    const [history] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT * FROM case_status_history WHERE case_id = ? ORDER BY id ASC`,
      [sourceId],
    );
    for (const h of history) {
      await conn.query(
        `INSERT INTO case_status_history (
          case_id, from_status, to_status, changed_by, reason, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          newCaseId,
          h.from_status,
          h.to_status,
          h.changed_by,
          h.reason
            ? `[CLONE] ${h.reason}`
            : `[CLONE] Copied from ${SOURCE_CASE_NUMBER}`,
          asJsonParam(h.metadata_json),
        ],
      );
    }
    await conn.query(
      `INSERT INTO case_status_history (
        case_id, from_status, to_status, changed_by, reason, metadata_json
      ) VALUES (?, NULL, ?, ?, ?, NULL)`,
      [
        newCaseId,
        src.status,
        src.created_by,
        `[SYSTEM] Created as INTERNAL TEST / QA VALIDATION clone of ${SOURCE_CASE_NUMBER}`,
      ],
    );

    await conn.commit();

    console.log(
      JSON.stringify(
        {
          ok: true,
          source: { id: sourceId, case_number: SOURCE_CASE_NUMBER },
          clone: {
            id: newCaseId,
            case_number: newCaseNumber,
            public_uuid: newCaseUuid,
            title: CLONE_TITLE,
          },
          copied: {
            documents: docs.length,
            evidence: evidence.length,
            questionnaires: questionnaires.length,
            technical_reports: reports.length,
            review_requests: reviews.length,
            assignments: assignments.length,
            notes: notes.length + 1,
          },
        },
        null,
        2,
      ),
    );
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
