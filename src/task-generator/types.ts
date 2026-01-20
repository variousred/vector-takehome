/**
 * Core type definitions for the Task Generator.
 * These types model the entities needed for staggered task scheduling.
 */

/**
 * Risk level for patient prioritization.
 * Used for graceful degradation - high-risk patients are prioritized under load.
 */
export type RiskLevel = 'high' | 'medium' | 'low';

/**
 * Status of a scrape task in its lifecycle.
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * Patient entity - represents a patient whose device data we scrape.
 */
export interface Patient {
  /** Unique identifier for the patient */
  id: string;

  /** URL of the device vendor portal to scrape */
  endpointUrl: string;

  /** Risk level for prioritization during degraded operation */
  riskLevel: RiskLevel;

  /** Type of monitoring device (for downstream parsing) */
  deviceType?: string;

  /** Timestamp of last successful scrape */
  lastScrapeAt?: Date;
}

/**
 * ScrapeTask entity - represents a scheduled scraping job.
 */
export interface ScrapeTask {
  /** Unique identifier for the task */
  id: string;

  /** Reference to the patient being scraped */
  patientId: string;

  /** When this task should be executed */
  fireAt: Date;

  /** Offset in seconds from cycle start (0-299 for 5-min interval) */
  offsetSeconds: number;

  /** Current status of the task */
  status: TaskStatus;

  /** 
   * Tracks consecutive failures across cycles.
   * Single miss (1) is acceptable - next cycle will fetch data.
   * Alert if > 1 - indicates systemic issue (vendor down, endpoint changed).
   */
  consecutiveFailures: number;

  /** When the task was created */
  createdAt: Date;

  /** When the task completed (success or final failure) */
  completedAt?: Date;
}

/**
 * Configuration options for the TaskGenerator.
 */
export interface TaskGeneratorConfig {
  /**
   * Interval between scrapes in seconds.
   * Default: 300 (5 minutes)
   */
  intervalSeconds?: number;

  /**
   * Number of bins to distribute tasks across.
   * Should equal intervalSeconds for 1-second granularity.
   * Default: 300
   */
  binCount?: number;
}

/**
 * Result of generating tasks for a batch of patients.
 */
export interface TaskGenerationResult {
  /** Generated tasks */
  tasks: ScrapeTask[];

  /** Statistics about the generation */
  stats: {
    /** Total patients processed */
    totalPatients: number;

    /** Tasks generated (should equal totalPatients) */
    tasksGenerated: number;

    /** Distribution across bins (for monitoring) */
    binDistribution: Map<number, number>;

    /** Generation time in milliseconds */
    generationTimeMs: number;
  };
}

/**
 * Input for generating tasks - can be a full Patient or minimal data.
 */
export interface PatientInput {
  /** Patient ID (required for hashing) */
  id: string;

  /** Optional - will be included in task if provided */
  endpointUrl?: string;

  /** Optional - defaults to 'medium' */
  riskLevel?: RiskLevel;
}
