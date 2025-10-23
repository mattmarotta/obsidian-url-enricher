/**
 * Performance - Utilities for performance monitoring and profiling
 *
 * Provides tools for measuring execution time and tracking performance metrics:
 * - Timer for measuring code execution time
 * - Performance metrics tracking
 * - Memory usage monitoring (when available)
 *
 * @module utils/performance
 */

import { createLogger } from "./logger";

const logger = createLogger("Performance");

/**
 * Performance metrics for a specific operation
 */
export interface PerformanceMetrics {
	name: string;
	count: number;
	totalTime: number;
	averageTime: number;
	minTime: number;
	maxTime: number;
}

/**
 * Global performance tracker
 */
class PerformanceTracker {
	private static instance: PerformanceTracker;
	private metrics = new Map<string, {
		count: number;
		totalTime: number;
		minTime: number;
		maxTime: number;
	}>();
	private enabled = false;

	static getInstance(): PerformanceTracker {
		if (!PerformanceTracker.instance) {
			PerformanceTracker.instance = new PerformanceTracker();
		}
		return PerformanceTracker.instance;
	}

	enable(): void {
		this.enabled = true;
	}

	disable(): void {
		this.enabled = false;
	}

	isEnabled(): boolean {
		return this.enabled;
	}

	record(name: string, duration: number): void {
		if (!this.enabled) return;

		const existing = this.metrics.get(name);
		if (existing) {
			existing.count++;
			existing.totalTime += duration;
			existing.minTime = Math.min(existing.minTime, duration);
			existing.maxTime = Math.max(existing.maxTime, duration);
		} else {
			this.metrics.set(name, {
				count: 1,
				totalTime: duration,
				minTime: duration,
				maxTime: duration
			});
		}
	}

	getMetrics(name: string): PerformanceMetrics | undefined {
		const metrics = this.metrics.get(name);
		if (!metrics) return undefined;

		return {
			name,
			count: metrics.count,
			totalTime: metrics.totalTime,
			averageTime: metrics.totalTime / metrics.count,
			minTime: metrics.minTime,
			maxTime: metrics.maxTime
		};
	}

	getAllMetrics(): PerformanceMetrics[] {
		const results: PerformanceMetrics[] = [];
		for (const [name, metrics] of this.metrics.entries()) {
			results.push({
				name,
				count: metrics.count,
				totalTime: metrics.totalTime,
				averageTime: metrics.totalTime / metrics.count,
				minTime: metrics.minTime,
				maxTime: metrics.maxTime
			});
		}
		return results.sort((a, b) => b.totalTime - a.totalTime);
	}

	reset(): void {
		this.metrics.clear();
	}
}

/**
 * Timer for measuring code execution time
 */
export class Timer {
	private startTime: number;
	private name: string;

	constructor(name: string, autoStart = true) {
		this.name = name;
		this.startTime = autoStart ? performance.now() : 0;
	}

	/**
	 * Start the timer
	 */
	start(): void {
		this.startTime = performance.now();
	}

	/**
	 * Stop the timer and return elapsed time
	 * @returns Elapsed time in milliseconds
	 */
	stop(): number {
		const elapsed = performance.now() - this.startTime;
		return elapsed;
	}

	/**
	 * Stop the timer, log the result, and record metrics
	 * @returns Elapsed time in milliseconds
	 */
	end(): number {
		const elapsed = this.stop();
		logger.debug(`${this.name} took ${elapsed.toFixed(2)}ms`);
		PerformanceTracker.getInstance().record(this.name, elapsed);
		return elapsed;
	}
}

/**
 * Measure and log the execution time of a function
 * @param name - Name for the measurement
 * @param fn - Function to measure
 * @returns Result of the function
 */
export async function measure<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
	const timer = new Timer(name);
	try {
		const result = await fn();
		timer.end();
		return result;
	} catch (error) {
		timer.end();
		throw error;
	}
}

/**
 * Enable performance tracking
 */
export function enablePerformanceTracking(): void {
	PerformanceTracker.getInstance().enable();
	logger.info("Performance tracking enabled");
}

/**
 * Disable performance tracking
 */
export function disablePerformanceTracking(): void {
	PerformanceTracker.getInstance().disable();
	logger.info("Performance tracking disabled");
}

/**
 * Get performance metrics for a specific operation
 */
export function getPerformanceMetrics(name: string): PerformanceMetrics | undefined {
	return PerformanceTracker.getInstance().getMetrics(name);
}

/**
 * Get all performance metrics
 */
export function getAllPerformanceMetrics(): PerformanceMetrics[] {
	return PerformanceTracker.getInstance().getAllMetrics();
}

/**
 * Reset all performance metrics
 */
export function resetPerformanceMetrics(): void {
	PerformanceTracker.getInstance().reset();
	logger.info("Performance metrics reset");
}

/**
 * Check if performance tracking is enabled
 */
export function isPerformanceTrackingEnabled(): boolean {
	return PerformanceTracker.getInstance().isEnabled();
}
