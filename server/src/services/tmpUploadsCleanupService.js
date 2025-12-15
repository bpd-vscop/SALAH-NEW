const fs = require('fs');
const path = require('path');
const { uploadsRoot } = require('./mediaStorageService');

const DEFAULT_MAX_AGE_HOURS = Number(process.env.TMP_UPLOAD_CLEANUP_MAX_AGE_HOURS || 12);
const DEFAULT_SCHEDULE_HOURS = [0, 12]; // midnight + noon (local server time)

const TMP_DIRECTORIES = [
  path.resolve(uploadsRoot, '_tmp'),
  path.resolve(uploadsRoot, 'products', '_tmp'),
];

const formatCount = (value) => Number(value || 0).toLocaleString();

const normalizeScheduleHours = (hours) => {
  const normalized = Array.from(
    new Set(
      (Array.isArray(hours) ? hours : [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .map((value) => Math.max(0, Math.min(23, Math.trunc(value))))
    )
  ).sort((a, b) => a - b);
  return normalized.length ? normalized : DEFAULT_SCHEDULE_HOURS;
};

const getNextScheduledTime = (now, scheduleHours) => {
  const candidates = scheduleHours.map((hour) => {
    const date = new Date(now);
    date.setHours(hour, 0, 0, 0);
    if (date.getTime() <= now.getTime()) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  });

  candidates.sort((a, b) => a.getTime() - b.getTime());
  return candidates[0];
};

const safeStat = async (absolutePath) => {
  try {
    return await fs.promises.stat(absolutePath);
  } catch (_err) {
    return null;
  }
};

const cleanupDirectory = async (absoluteDir, cutoffMs, stats, { removeEmptyDirectories = false, isRoot = false } = {}) => {
  let entries;
  try {
    entries = await fs.promises.readdir(absoluteDir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const entryPath = path.join(absoluteDir, entry.name);

    if (entry.isDirectory()) {
      await cleanupDirectory(entryPath, cutoffMs, stats, { removeEmptyDirectories, isRoot: false });
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const fileStat = await safeStat(entryPath);
    if (!fileStat) {
      continue;
    }
    stats.scannedFiles += 1;

    if (fileStat.mtimeMs >= cutoffMs) {
      continue;
    }

    try {
      await fs.promises.unlink(entryPath);
      stats.deletedFiles += 1;
      stats.deletedBytes += fileStat.size || 0;
    } catch (_err) {
      // ignore files that disappear or are locked
    }
  }

  if (!removeEmptyDirectories || isRoot) {
    return;
  }

  try {
    await fs.promises.rmdir(absoluteDir);
    stats.deletedDirs += 1;
  } catch (_err) {
    // ignore non-empty or missing dirs
  }
};

const cleanupTmpUploads = async ({ maxAgeHours = DEFAULT_MAX_AGE_HOURS } = {}) => {
  const ageHours = Number.isFinite(Number(maxAgeHours)) ? Number(maxAgeHours) : DEFAULT_MAX_AGE_HOURS;
  const cutoffMs = Date.now() - Math.max(1, ageHours) * 60 * 60 * 1000;

  const stats = {
    scannedFiles: 0,
    deletedFiles: 0,
    deletedDirs: 0,
    deletedBytes: 0,
  };

  for (const dir of TMP_DIRECTORIES) {
    await cleanupDirectory(dir, cutoffMs, stats, { removeEmptyDirectories: false, isRoot: true });
  }

  if (stats.deletedFiles > 0) {
    console.log(
      `[Cleanup] Temp uploads: deleted ${formatCount(stats.deletedFiles)} files (${formatCount(
        Math.round(stats.deletedBytes / 1024)
      )} KB).`
    );
  }

  return stats;
};

/**
 * Schedules periodic cleanup for temp uploads. Default schedule: local midnight + noon.
 */
const startTmpUploadsCleanupService = ({
  maxAgeHours = DEFAULT_MAX_AGE_HOURS,
  scheduleHours = DEFAULT_SCHEDULE_HOURS,
} = {}) => {
  const enabled = String(process.env.TMP_UPLOAD_CLEANUP_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('[Cleanup] Temp uploads cleanup disabled (TMP_UPLOAD_CLEANUP_ENABLED=false).');
    return;
  }

  const hours = normalizeScheduleHours(scheduleHours);

  const scheduleNext = () => {
    const now = new Date();
    const nextRun = getNextScheduledTime(now, hours);
    const delayMs = Math.max(0, nextRun.getTime() - now.getTime());

    const timer = setTimeout(async () => {
      try {
        await cleanupTmpUploads({ maxAgeHours });
      } catch (error) {
        console.error('[Cleanup] Temp uploads cleanup error:', error);
      } finally {
        scheduleNext();
      }
    }, delayMs);

    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    console.log(`[Cleanup] Temp uploads cleanup scheduled for ${nextRun.toLocaleString()}.`);
  };

  scheduleNext();
};

module.exports = {
  cleanupTmpUploads,
  startTmpUploadsCleanupService,
  DEFAULT_MAX_AGE_HOURS,
  DEFAULT_SCHEDULE_HOURS,
};
