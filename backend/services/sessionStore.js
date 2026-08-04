/**
 * sessionStore.js
 *
 * Tiered session store for YouTube import sessions.
 *
 * Priority:
 *   1. MongoDB (production — survives restarts, horizontal scaling)
 *   2. In-memory Map (fallback for local dev / MongoDB unavailable)
 *
 * All public methods are async and have the same interface regardless of backing store.
 */

const crypto = require('crypto');

let ImportSession;
try {
  ImportSession = require('../models/ImportSession');
} catch (e) {
  ImportSession = null;
}

// ─── In-memory fallback ───────────────────────────────────────────────────────
const _memStore = new Map(); // importId → session object
const MEM_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function _memPrune() {
  const now = Date.now();
  for (const [id, s] of _memStore) {
    if (s._expiresAt < now) _memStore.delete(id);
  }
}
// Prune stale memory entries every 10 minutes
setInterval(_memPrune, 10 * 60 * 1000).unref();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Checks if MongoDB is available and the ImportSession model is loaded.
 */
function _mongoAvailable() {
  if (!ImportSession) return false;
  const mongoose = require('mongoose');
  return mongoose.connection.readyState === 1; // 1 = connected
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random 32-char hex importId.
 */
function generateImportId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create a new import session.
 * @param {object} data  { importId, firebaseUid, accessToken, refreshToken, expiresAt }
 */
async function createSession(data) {
  if (_mongoAvailable()) {
    try {
      await ImportSession.findOneAndUpdate(
        { importId: data.importId },
        {
          ...data,
          status: 'pending',
          progress: { processed: 0, total: 0, matchedCount: 0, unmatchedCount: 0 },
          result: null,
          errorMessage: null,
          createdAt: new Date(),
        },
        { upsert: true, new: true }
      );
      return;
    } catch (e) {
      console.warn('[SessionStore] MongoDB write failed, falling back to memory:', e.message);
    }
  }
  // Fallback: in-memory
  _memStore.set(data.importId, {
    ...data,
    status: 'pending',
    progress: { processed: 0, total: 0, matchedCount: 0, unmatchedCount: 0 },
    result: null,
    errorMessage: null,
    _expiresAt: Date.now() + MEM_TTL_MS,
  });
}

/**
 * Retrieve a session by importId.
 * @returns {object|null}
 */
async function getSession(importId) {
  if (_mongoAvailable()) {
    try {
      const doc = await ImportSession.findOne({ importId }).lean();
      return doc || null;
    } catch (e) {
      console.warn('[SessionStore] MongoDB read failed, falling back to memory:', e.message);
    }
  }
  return _memStore.get(importId) || null;
}

/**
 * Update session status and/or progress.
 * @param {string} importId
 * @param {object} fields   e.g. { status: 'running', progress: { processed: 10, total: 100 } }
 */
async function updateSession(importId, fields) {
  if (_mongoAvailable()) {
    try {
      const update = {};
      for (const [k, v] of Object.entries(fields)) {
        if (k === 'progress' && typeof v === 'object') {
          for (const [pk, pv] of Object.entries(v)) {
            update[`progress.${pk}`] = pv;
          }
        } else {
          update[k] = v;
        }
      }
      await ImportSession.findOneAndUpdate({ importId }, { $set: update });
      return;
    } catch (e) {
      console.warn('[SessionStore] MongoDB update failed, falling back to memory:', e.message);
    }
  }
  const existing = _memStore.get(importId);
  if (existing) {
    const updated = { ...existing, ...fields };
    if (fields.progress) updated.progress = { ...existing.progress, ...fields.progress };
    _memStore.set(importId, updated);
  }
}

/**
 * Store the final ImportResult in the session.
 */
async function setResult(importId, result) {
  await updateSession(importId, { status: 'done', result });
}

/**
 * Mark session as errored.
 */
async function setError(importId, errorMessage) {
  await updateSession(importId, { status: 'error', errorMessage });
}

/**
 * Delete a session (called on explicit cleanup).
 */
async function deleteSession(importId) {
  if (_mongoAvailable()) {
    try {
      await ImportSession.deleteOne({ importId });
      return;
    } catch (e) {
      console.warn('[SessionStore] MongoDB delete failed:', e.message);
    }
  }
  _memStore.delete(importId);
}

module.exports = {
  generateImportId,
  createSession,
  getSession,
  updateSession,
  setResult,
  setError,
  deleteSession,
};
