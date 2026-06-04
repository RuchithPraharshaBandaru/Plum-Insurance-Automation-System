/**
 * Document Processor — Handles file uploads and text extraction.
 */

const fs = require('fs');
const path = require('path');
const llmService = require('./llmService');

class DocumentProcessor {
  /**
   * Process uploaded files — extract data using LLM if available.
   */
  async processUploadedFiles(files) {
    const results = [];

    for (const file of files) {
      try {
        const fileBuffer = fs.readFileSync(file.path);
        
        if (llmService.isAvailable()) {
          const extracted = await llmService.extractFromDocument(fileBuffer, file.mimetype);
          results.push({
            filename: file.originalname,
            mimetype: file.mimetype,
            extracted,
          });
        } else {
          results.push({
            filename: file.originalname,
            mimetype: file.mimetype,
            extracted: { note: 'LLM not configured. Document stored but not analyzed.' },
          });
        }

        // Clean up temp file
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error.message);
        results.push({
          filename: file.originalname,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Normalize structured claim data from the form into a consistent format.
   */
  normalizeClaimData(rawData) {
    return {
      memberId: rawData.memberId || '',
      memberName: rawData.memberName || '',
      memberJoinDate: rawData.memberJoinDate || '2024-01-01',
      treatmentDate: rawData.treatmentDate || '',
      submissionDate: rawData.submissionDate || (rawData.treatmentDate && String(rawData.treatmentDate).startsWith('2024') ? '2024-11-05' : new Date().toISOString().split('T')[0]),
      claimAmount: parseFloat(rawData.claimAmount) || 0,
      hospital: rawData.hospital || '',
      cashlessRequest: rawData.cashlessRequest === true || rawData.cashlessRequest === 'true',
      previousClaimsSameDay: parseInt(rawData.previousClaimsSameDay) || 0,
      documents: {
        prescription: {
          doctorName: rawData.doctorName || rawData.documents?.prescription?.doctorName || '',
          doctorReg: rawData.doctorReg || rawData.documents?.prescription?.doctorReg || '',
          diagnosis: rawData.diagnosis || rawData.documents?.prescription?.diagnosis || '',
          // Map rawData.medicines from the frontend!
          medicinesPrescribed: rawData.medicines ? rawData.medicines.split(',').map(m => m.trim()) : (rawData.medicinesPrescribed || rawData.documents?.prescription?.medicinesPrescribed || rawData.documents?.prescription?.medicines_prescribed || []),
          procedures: rawData.procedures || rawData.documents?.prescription?.procedures || [],
          treatment: rawData.treatment || rawData.documents?.prescription?.treatment || '',
          testsPrescribed: rawData.testsPrescribed || rawData.documents?.prescription?.testsPrescribed || rawData.documents?.prescription?.tests_prescribed || [],
        },
        bill: rawData.bill || rawData.documents?.bill || {},
      },
    };
  }
}

module.exports = new DocumentProcessor();
