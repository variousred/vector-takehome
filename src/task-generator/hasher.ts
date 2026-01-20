/**
 * Deterministic offset calculation using SHA-256 hashing.
 *
 * This module implements the core algorithm from ADR-001:
 * offset_seconds = SHA256(patient_id) % interval_seconds
 *
 * Key properties:
 * 1. Deterministic: Same patient_id always produces same offset
 * 2. Uniform distribution: SHA-256 provides excellent distribution
 * 3. No coordination: Each worker can compute independently
 * 4. Stable on add/remove: Adding patients doesn't affect existing offsets
 */

import { createHash } from 'crypto';
import { DEFAULT_BIN_COUNT } from './constants';

/**
 * Compute a deterministic offset for a patient ID.
 *
 * Uses SHA-256 hash of the patient ID, then takes modulo of the bin count
 * to produce an offset in the range [0, binCount).
 *
 * @param patientId - Unique identifier for the patient
 * @param binCount - Number of bins to distribute across (default: 300 for 5-min interval)
 * @returns Offset in seconds (0 to binCount-1)
 *
 * @example
 * ```typescript
 * const offset = computeOffset('patient-123', 300);
 * // offset is deterministic: always same value for 'patient-123'
 * // offset is in range [0, 299]
 * ```
 */
export function computeOffset(patientId: string, binCount: number = DEFAULT_BIN_COUNT): number {
  if (!patientId || patientId.trim().length === 0) {
    throw new Error('Patient ID is required and cannot be empty');
  }

  if (binCount <= 0) {
    throw new Error('Bin count must be a positive integer');
  }

  // Create SHA-256 hash of the patient ID
  const hash = createHash('sha256').update(patientId).digest('hex');

  // Take first 8 hex characters (32 bits) for the numeric value
  // This gives us a number in range [0, 4294967295]
  const numericValue = parseInt(hash.substring(0, 8), 16);

  // Modulo to get offset in range [0, binCount)
  return numericValue % binCount;
}

/**
 * Compute the fire time for a task given a cycle start time and patient ID.
 *
 * @param patientId - Unique identifier for the patient
 * @param cycleStart - Start time of the current cycle
 * @param binCount - Number of bins (default: 300)
 * @returns Date when the task should fire
 *
 * @example
 * ```typescript
 * const cycleStart = new Date('2026-01-20T10:00:00Z');
 * const fireAt = computeFireTime('patient-123', cycleStart);
 * // fireAt is cycleStart + deterministic offset
 * ```
 */
export function computeFireTime(
  patientId: string,
  cycleStart: Date,
  binCount: number = DEFAULT_BIN_COUNT
): Date {
  const offsetSeconds = computeOffset(patientId, binCount);
  const fireAt = new Date(cycleStart.getTime() + offsetSeconds * 1000);
  return fireAt;
}

/**
 * Analyze the distribution of offsets for a set of patient IDs.
 * Useful for testing and monitoring hash distribution quality.
 *
 * @param patientIds - Array of patient IDs to analyze
 * @param binCount - Number of bins (default: 300)
 * @returns Distribution statistics
 */
export function analyzeDistribution(
  patientIds: string[],
  binCount: number = DEFAULT_BIN_COUNT
): {
  binCounts: Map<number, number>;
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  variance: number;
} {
  // Count patients per bin
  const binCounts = new Map<number, number>();
  for (let i = 0; i < binCount; i++) {
    binCounts.set(i, 0);
  }

  for (const patientId of patientIds) {
    const offset = computeOffset(patientId, binCount);
    binCounts.set(offset, (binCounts.get(offset) || 0) + 1);
  }

  // Calculate statistics
  const counts = Array.from(binCounts.values());
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;

  // Calculate standard deviation
  const squaredDiffs = counts.map((count) => Math.pow(count - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / counts.length;
  const stdDev = Math.sqrt(variance);

  return {
    binCounts,
    min,
    max,
    mean,
    stdDev,
    variance,
  };
}

/**
 * Check if a distribution is within acceptable variance.
 *
 * @param patientIds - Array of patient IDs
 * @param binCount - Number of bins
 * @param maxVariance - Maximum acceptable variance (default: 0.15 = 15%)
 * @returns Whether distribution is acceptable
 */
export function isDistributionAcceptable(
  patientIds: string[],
  binCount: number = DEFAULT_BIN_COUNT,
  maxVariance: number = 0.15
): boolean {
  const { mean, stdDev } = analyzeDistribution(patientIds, binCount);

  // Coefficient of variation (CV) = stdDev / mean
  // For uniform distribution, CV should be low
  const cv = mean > 0 ? stdDev / mean : 0;

  return cv <= maxVariance;
}
