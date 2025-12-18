/**
 * Document import service - orchestrates the full import pipeline
 * @module services/document-import
 */

import { randomUUID } from 'node:crypto';
import { createStorageError, createValidationError } from '../core/errors.js';
import type { StorageError, ValidationError } from '../core/errors.js';
import { err, ok } from '../core/result.js';
import type { Result } from '../core/result.js';
import type { ImportConfig, ImportResult, ModelTestResult, StructuredMarkdown } from '../domain/types/import.js';
import { DEFAULT_IMPORT_MODEL } from '../domain/types/import.js';
import type { Itinerary } from '../domain/types/itinerary.js';
import type { ItineraryService } from './itinerary.service.js';
import { CostTrackerService } from './cost-tracker.service.js';
import { LLMService } from './llm.service.js';
import { MarkdownConverterService } from './markdown-converter.service.js';
import { PDFExtractorService } from './pdf-extractor.service.js';
import { SegmentContinuityService } from './segment-continuity.service.js';
import type { LocationGap } from './segment-continuity.service.js';

/**
 * Import preview result (before LLM processing)
 */
export interface ImportPreview {
  /** Source file path */
  sourceFile: string;
  /** Raw text extracted from PDF */
  rawText: string;
  /** Structured markdown */
  structuredMarkdown: StructuredMarkdown;
  /** PDF metadata */
  metadata: {
    pages: number;
    title?: string;
    author?: string;
  };
}

/**
 * Geographic continuity validation result
 */
export interface ContinuityValidationResult {
  /** True if geographic continuity is valid (no gaps) */
  valid: boolean;
  /** Detected location gaps */
  gaps: LocationGap[];
  /** Number of segments validated */
  segmentCount: number;
  /** Human-readable summary */
  summary: string;
}

/**
 * Service for importing documents into itineraries
 */
export class DocumentImportService {
  private pdfExtractor: PDFExtractorService;
  private markdownConverter: MarkdownConverterService;
  private llmService: LLMService;
  private costTracker: CostTrackerService;
  private continuityService: SegmentContinuityService;
  private itineraryService?: ItineraryService;

  /**
   * Creates a new document import service
   * @param config - Import configuration
   * @param itineraryService - Optional itinerary service for saving results
   */
  constructor(
    private config: ImportConfig,
    itineraryService?: ItineraryService
  ) {
    this.pdfExtractor = new PDFExtractorService();
    this.markdownConverter = new MarkdownConverterService();
    this.llmService = new LLMService(config);
    this.costTracker = new CostTrackerService(
      config.costLogPath ?? './data/imports/cost-log.json',
      config.costTrackingEnabled ?? true
    );
    this.continuityService = new SegmentContinuityService();
    this.itineraryService = itineraryService;
  }

  /**
   * Initialize the import service
   */
  async initialize(): Promise<Result<void, StorageError>> {
    return this.costTracker.initialize();
  }

  /**
   * Import a PDF file and create an itinerary
   * @param filePath - Path to the PDF file
   * @param options - Import options
   * @returns Result with import result
   */
  async import(
    filePath: string,
    options: {
      model?: string;
      saveToStorage?: boolean;
    } = {}
  ): Promise<Result<ImportResult, StorageError | ValidationError>> {
    const { model, saveToStorage = false } = options;

    // Step 1: Extract text from PDF
    const extractResult = await this.pdfExtractor.extract(filePath);
    if (!extractResult.success) {
      return extractResult;
    }

    const { text, pages, metadata } = extractResult.value;

    if (!text.trim()) {
      return err(
        createValidationError('INVALID_DATA', 'PDF contains no extractable text', 'content', {
          hint: 'This may be a scanned PDF. Consider using OCR first.',
        })
      );
    }

    // Step 2: Convert to structured markdown
    const structuredMarkdown = this.markdownConverter.convert(text);

    // Step 3: Parse with LLM
    const llmResult = await this.llmService.parseItinerary(structuredMarkdown.markdown, model);

    if (!llmResult.success) {
      // Log failed attempt
      if (this.config.costTrackingEnabled) {
        await this.costTracker.logUsage(
          {
            model: model ?? DEFAULT_IMPORT_MODEL,
            inputTokens: 0,
            outputTokens: 0,
            costUSD: 0,
            timestamp: new Date(),
          },
          filePath,
          false
        );
      }
      return llmResult;
    }

    const { itinerary, usage } = llmResult.value;

    // Log successful usage
    if (this.config.costTrackingEnabled) {
      await this.costTracker.logUsage(usage, filePath, true);
    }

    // Step 4: Save to storage if requested
    // Save the full parsed itinerary (with segments) directly
    if (saveToStorage && this.itineraryService) {
      const saveResult = await this.itineraryService.saveImported(itinerary);

      if (!saveResult.success) {
        return saveResult;
      }
    }

    return ok({
      id: randomUUID(),
      sourceFile: filePath,
      extractedMarkdown: structuredMarkdown.markdown,
      parsedItinerary: itinerary,
      usage,
      timestamp: new Date(),
    });
  }

  /**
   * Preview import without LLM processing
   * @param filePath - Path to the PDF file
   * @returns Result with preview
   */
  async preview(filePath: string): Promise<Result<ImportPreview, StorageError | ValidationError>> {
    // Extract text from PDF
    const extractResult = await this.pdfExtractor.extract(filePath);
    if (!extractResult.success) {
      return extractResult;
    }

    const { text, pages, metadata } = extractResult.value;

    if (!text.trim()) {
      return err(
        createValidationError('INVALID_DATA', 'PDF contains no extractable text', 'content')
      );
    }

    // Convert to structured markdown
    const structuredMarkdown = this.markdownConverter.convert(text);

    return ok({
      sourceFile: filePath,
      rawText: text,
      structuredMarkdown,
      metadata: {
        pages,
        title: metadata.title,
        author: metadata.author,
      },
    });
  }

  /**
   * Test multiple models on the same PDF
   * @param filePath - Path to the PDF file
   * @param models - Models to test (default: all known models)
   * @returns Results for each model
   */
  async testModels(
    filePath: string,
    models?: string[]
  ): Promise<Result<ModelTestResult[], StorageError | ValidationError>> {
    // Extract and convert once
    const extractResult = await this.pdfExtractor.extract(filePath);
    if (!extractResult.success) {
      return extractResult;
    }

    const { text } = extractResult.value;

    if (!text.trim()) {
      return err(
        createValidationError('INVALID_DATA', 'PDF contains no extractable text', 'content')
      );
    }

    const structuredMarkdown = this.markdownConverter.convert(text);
    const markdown = structuredMarkdown.markdown;

    // Test each model
    const modelsToTest = models ?? this.llmService.getAvailableModels();
    const results: ModelTestResult[] = [];

    for (const model of modelsToTest) {
      const startTime = Date.now();

      try {
        const result = await this.llmService.parseItinerary(markdown, model);
        const durationMs = Date.now() - startTime;

        if (result.success) {
          // Log usage
          await this.costTracker.logUsage(result.value.usage, filePath, true);

          results.push({
            model,
            success: true,
            itinerary: result.value.itinerary,
            usage: result.value.usage,
            durationMs,
          });
        } else {
          results.push({
            model,
            success: false,
            error: result.error.message,
            usage: {
              model,
              inputTokens: 0,
              outputTokens: 0,
              costUSD: 0,
              timestamp: new Date(),
            },
            durationMs,
          });
        }
      } catch (error) {
        results.push({
          model,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          usage: {
            model,
            inputTokens: 0,
            outputTokens: 0,
            costUSD: 0,
            timestamp: new Date(),
          },
          durationMs: Date.now() - startTime,
        });
      }
    }

    return ok(results);
  }

  /**
   * Get cost tracking summary
   */
  async getCostSummary() {
    return this.costTracker.getSummary();
  }

  /**
   * Check if the service is properly configured
   */
  async checkConfiguration(): Promise<Result<boolean, StorageError>> {
    return this.llmService.testConnection();
  }

  /**
   * Get available models for testing
   */
  getAvailableModels(): string[] {
    return this.llmService.getAvailableModels();
  }

  /**
   * Validate geographic continuity of an itinerary
   * @param itinerary - Itinerary to validate
   * @returns Validation result with detected gaps
   */
  validateGeographicContinuity(itinerary: Itinerary): ContinuityValidationResult {
    // Sort segments chronologically
    const sortedSegments = this.continuityService.sortSegments(itinerary.segments);

    // Detect gaps
    const gaps = this.continuityService.detectLocationGaps(sortedSegments);

    // Build summary
    let summary: string;
    if (gaps.length === 0) {
      summary = 'All segments are geographically continuous. No transportation gaps detected.';
    } else {
      const gapDescriptions = gaps.map((gap, index) => {
        return `${index + 1}. ${gap.description} (suggested: ${gap.suggestedType})`;
      });
      summary = `Found ${gaps.length} geographic gap(s):\n${gapDescriptions.join('\n')}`;
    }

    return {
      valid: gaps.length === 0,
      gaps,
      segmentCount: sortedSegments.length,
      summary,
    };
  }

  /**
   * Import with automatic continuity validation
   * @param filePath - Path to the PDF file
   * @param options - Import options
   * @returns Result with import result and continuity validation
   */
  async importWithValidation(
    filePath: string,
    options: {
      model?: string;
      saveToStorage?: boolean;
      validateContinuity?: boolean;
    } = {}
  ): Promise<
    Result<
      ImportResult & { continuityValidation?: ContinuityValidationResult },
      StorageError | ValidationError
    >
  > {
    const { validateContinuity = true } = options;

    // Standard import
    const importResult = await this.import(filePath, options);

    if (!importResult.success) {
      return importResult;
    }

    // Add continuity validation if requested
    if (validateContinuity) {
      const validation = this.validateGeographicContinuity(importResult.value.parsedItinerary);

      return ok({
        ...importResult.value,
        continuityValidation: validation,
      });
    }

    return importResult;
  }
}
