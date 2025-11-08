/**
 * Logger - Centralized logging with configurable log levels
 *
 * Provides structured logging with different severity levels:
 * - ERROR: Critical errors that need immediate attention
 * - WARN: Warnings that might indicate problems
 * - INFO: General informational messages
 * - DEBUG: Detailed debugging information
 *
 * @module utils/logger
 */

import { LOG_PREFIX } from "../constants";

export enum LogLevel {
	ERROR = 0,
	WARN = 1,
	INFO = 2,
	DEBUG = 3
}

/**
 * Global logger configuration
 */
class LoggerConfig {
	private static instance: LoggerConfig;
	private currentLevel: LogLevel = LogLevel.WARN;

	static getInstance(): LoggerConfig {
		if (!LoggerConfig.instance) {
			LoggerConfig.instance = new LoggerConfig();
		}
		return LoggerConfig.instance;
	}

	setLevel(level: LogLevel): void {
		this.currentLevel = level;
	}

	getLevel(): LogLevel {
		return this.currentLevel;
	}

	shouldLog(level: LogLevel): boolean {
		return level <= this.currentLevel;
	}
}

/**
 * Logger utility for structured logging
 */
export class Logger {
	constructor(private context: string) {}

	/**
	 * Log an error message
	 */
	error(message: string, ...args: unknown[]): void {
		// No-op: console logging removed per Obsidian plugin requirements
	}

	/**
	 * Log a warning message
	 */
	warn(message: string, ...args: unknown[]): void {
		// No-op: console logging removed per Obsidian plugin requirements
	}

	/**
	 * Log an info message
	 */
	info(message: string, ...args: unknown[]): void {
		// No-op: console logging removed per Obsidian plugin requirements
	}

	/**
	 * Log a debug message
	 */
	debug(message: string, ...args: unknown[]): void {
		// No-op: console logging removed per Obsidian plugin requirements
	}

	/**
	 * Set the global log level
	 */
	static setGlobalLevel(level: LogLevel): void {
		LoggerConfig.getInstance().setLevel(level);
	}

	/**
	 * Get the current global log level
	 */
	static getGlobalLevel(): LogLevel {
		return LoggerConfig.getInstance().getLevel();
	}
}

/**
 * Create a logger for a specific context
 */
export function createLogger(context: string): Logger {
	return new Logger(context);
}
