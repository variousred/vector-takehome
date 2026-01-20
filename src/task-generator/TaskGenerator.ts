/**
 * TaskGenerator - Core component for staggered task scheduling.
 *
 * Generates scraping tasks with deterministic, evenly-distributed offsets
 * to prevent thundering herd problems while maintaining consistent intervals.
 *
 * Key guarantees:
 * 1. Same patient always gets same offset (deterministic)
 * 2. Tasks spread evenly across the interval (no bursts)
 * 3. Consecutive cycles maintain exact interval (no gaps)
 * 4. New patients auto-distribute without affecting existing
 */

import { randomUUID } from 'crypto';
import {
  Patient,
  PatientInput,
  ScrapeTask,
  TaskGeneratorConfig,
  TaskGenerationResult,
} from './types';
import { SCRAPE_INTERVAL_SECONDS, DEFAULT_BIN_COUNT } from './constants';
import { computeOffset, computeFireTime, analyzeDistribution } from './hasher';

/**
 * TaskGenerator class for creating staggered scraping tasks.
 *
 * @example
 * ```typescript
 * const generator = new TaskGenerator({ intervalSeconds: 300 });
 *
 * const patients = [
 *   { id: 'patient-1', endpointUrl: 'https://vendor.com/p1' },
 *   { id: 'patient-2', endpointUrl: 'https://vendor.com/p2' },
 * ];
 *
 * const result = generator.generateTasksForPatients(patients, new Date());
 * console.log(result.tasks); // Tasks with staggered fireAt times
 * ```
 */
export class TaskGenerator {
  private readonly intervalSeconds: number;
  private readonly binCount: number;

  /**
   * Create a new TaskGenerator.
   *
   * @param config - Configuration options
   */
  constructor(config: TaskGeneratorConfig = {}) {
    this.intervalSeconds = config.intervalSeconds ?? SCRAPE_INTERVAL_SECONDS;
    this.binCount = config.binCount ?? DEFAULT_BIN_COUNT;

    // Validate configuration
    if (this.intervalSeconds <= 0) {
      throw new Error('Interval seconds must be positive');
    }
    if (this.binCount <= 0) {
      throw new Error('Bin count must be positive');
    }
    if (this.binCount > this.intervalSeconds) {
      throw new Error('Bin count cannot exceed interval seconds');
    }
  }

  /**
   * Generate a single task for a patient.
   *
   * @param patient - Patient or patient input data
   * @param cycleStart - Start time of the current cycle
   * @returns Generated scrape task
   */
  generateTaskForPatient(patient: PatientInput, cycleStart: Date): ScrapeTask {
    if (!patient.id) {
      throw new Error('Patient ID is required');
    }

    const offsetSeconds = computeOffset(patient.id, this.binCount);
    const fireAt = computeFireTime(patient.id, cycleStart, this.binCount);

    return {
      id: randomUUID(),
      patientId: patient.id,
      fireAt,
      offsetSeconds,
      status: 'pending',
      consecutiveFailures: 0,
      createdAt: new Date(),
    };
  }

  /**
   * Generate tasks for a batch of patients.
   *
   * This is the primary method for task generation. It processes all patients
   * and returns tasks with staggered execution times.
   *
   * @param patients - Array of patients or patient inputs
   * @param cycleStart - Start time of the current cycle
   * @returns Result containing tasks and generation statistics
   *
   * @example
   * ```typescript
   * const cycleStart = new Date('2026-01-20T10:00:00Z');
   * const result = generator.generateTasksForPatients(patients, cycleStart);
   *
   * // Tasks are distributed across 300 bins (0-299 seconds from cycleStart)
   * // At 300K patients: ~1000 patients per bin = 1000 QPS steady state
   * ```
   */
  generateTasksForPatients(
    patients: PatientInput[],
    cycleStart: Date
  ): TaskGenerationResult {
    const startTime = Date.now();

    // Generate all tasks
    const tasks: ScrapeTask[] = [];
    const binDistribution = new Map<number, number>();

    // Initialize bin counts
    for (let i = 0; i < this.binCount; i++) {
      binDistribution.set(i, 0);
    }

    for (const patient of patients) {
      try {
        const task = this.generateTaskForPatient(patient, cycleStart);
        tasks.push(task);

        // Track distribution
        const currentCount = binDistribution.get(task.offsetSeconds) || 0;
        binDistribution.set(task.offsetSeconds, currentCount + 1);
      } catch (error) {
        // Log error but continue processing other patients
        // In production, this would emit a metric and possibly dead-letter the patient
        console.error(`Failed to generate task for patient ${patient.id}:`, error);
      }
    }

    const generationTimeMs = Date.now() - startTime;

    return {
      tasks,
      stats: {
        totalPatients: patients.length,
        tasksGenerated: tasks.length,
        binDistribution,
        generationTimeMs,
      },
    };
  }

  /**
   * Generate tasks for the next cycle based on current time.
   *
   * Calculates the next cycle start time (aligned to interval boundary)
   * and generates tasks accordingly.
   *
   * @param patients - Array of patients
   * @returns Result with tasks scheduled for next cycle
   */
  generateTasksForNextCycle(patients: PatientInput[]): TaskGenerationResult {
    const now = Date.now();
    const intervalMs = this.intervalSeconds * 1000;

    // Align to next interval boundary
    const nextCycleStart = new Date(Math.ceil(now / intervalMs) * intervalMs);

    return this.generateTasksForPatients(patients, nextCycleStart);
  }

  /**
   * Get the offset that would be assigned to a patient.
   * Useful for debugging and monitoring.
   *
   * @param patientId - Patient ID
   * @returns Offset in seconds (0 to binCount-1)
   */
  getPatientOffset(patientId: string): number {
    return computeOffset(patientId, this.binCount);
  }

  /**
   * Analyze distribution quality for a set of patients.
   *
   * @param patients - Array of patients
   * @returns Distribution statistics
   */
  analyzeDistribution(patients: PatientInput[]): ReturnType<typeof analyzeDistribution> {
    const patientIds = patients.map((p) => p.id);
    return analyzeDistribution(patientIds, this.binCount);
  }

  /**
   * Get configuration values.
   */
  getConfig(): Required<TaskGeneratorConfig> {
    return {
      intervalSeconds: this.intervalSeconds,
      binCount: this.binCount,
    };
  }
}
