/**
 * PDF text extraction service
 * @module services/pdf-extractor
 */

import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createStorageError } from '../core/errors.js';
import type { StorageError } from '../core/errors.js';
import { err, ok } from '../core/result.js';
import type { Result } from '../core/result.js';
import type { PDFExtractionResult } from '../domain/types/import.js';

// Use createRequire for CommonJS pdf-parse module
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * Raw PDF parse result from pdf-parse library
 */
interface PDFParseResult {
  numpages: number;
  numrender: number;
  info: {
    Title?: string;
    Author?: string;
    Creator?: string;
    CreationDate?: string;
    ModDate?: string;
  };
  metadata?: Record<string, unknown>;
  text: string;
  version: string;
}

/**
 * Service for extracting text from PDF files
 */
export class PDFExtractorService {
  /**
   * Extract text from a PDF file
   * @param filePath - Path to the PDF file
   * @returns Result with extracted text and metadata
   */
  async extract(filePath: string): Promise<Result<PDFExtractionResult, StorageError>> {
    try {
      // Read PDF file
      const dataBuffer = await readFile(filePath);

      // Parse PDF
      const data: PDFParseResult = await pdfParse(dataBuffer, {
        // Use custom page render to track page boundaries
        pagerender: this.renderPage.bind(this),
      });

      // Parse dates from PDF metadata
      const creationDate = this.parseDate(data.info.CreationDate);
      const modificationDate = this.parseDate(data.info.ModDate);

      return ok({
        text: data.text.trim(),
        pages: data.numpages,
        metadata: {
          title: data.info.Title || undefined,
          author: data.info.Author || undefined,
          creator: data.info.Creator || undefined,
          creationDate,
          modificationDate,
        },
      });
    } catch (error) {
      // Check for specific error types
      if (error instanceof Error) {
        if ('code' in error && error.code === 'ENOENT') {
          return err(createStorageError('NOT_FOUND', `PDF file not found: ${filePath}`));
        }

        // Check for PDF parsing errors
        if (error.message.includes('Invalid PDF')) {
          return err(
            createStorageError('VALIDATION_ERROR', 'Invalid PDF file format', {
              path: filePath,
              error: error.message,
            })
          );
        }
      }

      return err(
        createStorageError('READ_ERROR', `Failed to extract text from PDF: ${filePath}`, {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Custom page renderer for pdf-parse
   * Returns text content of a single page
   */
  private async renderPage(pageData: {
    getTextContent: () => Promise<{
      items: Array<{ str?: string; hasEOL?: boolean }>;
    }>;
  }): Promise<string> {
    const textContent = await pageData.getTextContent();

    return textContent.items
      .map((item) => {
        const text = item.str || '';
        const suffix = item.hasEOL ? '\n' : '';
        return text + suffix;
      })
      .join('');
  }

  /**
   * Parse PDF date format (D:YYYYMMDDHHmmss)
   */
  private parseDate(dateString?: string): Date | undefined {
    if (!dateString) return undefined;

    // PDF date format: D:YYYYMMDDHHmmssOHH'mm' or D:YYYYMMDDHHmmss
    const match = dateString.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);

    if (!match) return undefined;

    const [, year, month, day, hour, minute, second] = match;
    const date = new Date(
      parseInt(year || '2000', 10),
      parseInt(month || '1', 10) - 1,
      parseInt(day || '1', 10),
      parseInt(hour || '0', 10),
      parseInt(minute || '0', 10),
      parseInt(second || '0', 10)
    );

    return isNaN(date.getTime()) ? undefined : date;
  }

  /**
   * Extract text with page boundaries
   * @param filePath - Path to the PDF file
   * @returns Result with text and page-by-page breakdown
   */
  async extractWithPages(filePath: string): Promise<Result<PDFExtractionResult, StorageError>> {
    try {
      const dataBuffer = await readFile(filePath);
      const pageTexts: string[] = [];

      // Parse PDF with page tracking
      const data: PDFParseResult = await pdfParse(dataBuffer, {
        pagerender: async (pageData: {
          getTextContent: () => Promise<{
            items: Array<{ str?: string; hasEOL?: boolean }>;
          }>;
        }) => {
          const text = await this.renderPage(pageData);
          pageTexts.push(text);
          return text;
        },
      });

      return ok({
        text: data.text.trim(),
        pages: data.numpages,
        pageTexts,
        metadata: {
          title: data.info.Title || undefined,
          author: data.info.Author || undefined,
          creator: data.info.Creator || undefined,
          creationDate: this.parseDate(data.info.CreationDate),
          modificationDate: this.parseDate(data.info.ModDate),
        },
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return err(createStorageError('NOT_FOUND', `PDF file not found: ${filePath}`));
      }

      return err(
        createStorageError('READ_ERROR', `Failed to extract text from PDF: ${filePath}`, {
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  /**
   * Check if a file is a PDF
   * @param filePath - Path to the file
   * @returns True if the file appears to be a PDF
   */
  async isPDF(filePath: string): Promise<boolean> {
    try {
      const buffer = await readFile(filePath, { flag: 'r' });
      // Check for PDF magic bytes (%PDF-)
      return buffer.slice(0, 5).toString() === '%PDF-';
    } catch {
      return false;
    }
  }
}
