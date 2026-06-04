const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  claimId: {
    type: String,
    required: true,
    unique: true,
  },
  memberId: {
    type: String,
    required: true,
  },
  memberName: {
    type: String,
    required: true,
  },
  memberJoinDate: {
    type: Date,
    default: () => new Date('2024-01-01'),
  },
  treatmentDate: {
    type: Date,
    required: true,
  },
  claimAmount: {
    type: Number,
    required: true,
  },
  hospital: {
    type: String,
    default: '',
  },
  cashlessRequest: {
    type: Boolean,
    default: false,
  },
  previousClaimsSameDay: {
    type: Number,
    default: 0,
  },
  documents: {
    prescription: {
      doctorName: String,
      doctorReg: String,
      diagnosis: String,
      medicinesPrescribed: [String],
      procedures: [String],
      treatment: String,
      testsPrescribed: [String],
    },
    bill: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    diagnosticReport: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    uploadedFiles: [{
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
    }],
  },
  // Decision fields
  decision: {
    type: String,
    enum: ['APPROVED', 'REJECTED', 'PARTIAL', 'MANUAL_REVIEW', 'PENDING'],
    default: 'PENDING',
  },
  approvedAmount: {
    type: Number,
    default: 0,
  },
  rejectionReasons: [{
    type: String,
  }],
  rejectedItems: [{
    type: String,
  }],
  confidenceScore: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    default: '',
  },
  nextSteps: {
    type: String,
    default: '',
  },
  flags: [{
    type: String,
  }],
  deductions: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  networkDiscount: {
    type: Number,
    default: 0,
  },
  cashlessApproved: {
    type: Boolean,
    default: false,
  },
  extractedData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  llmAnalysis: {
    type: String,
    default: '',
  },
  confidenceReasoning: {
    type: String,
    default: '',
  },
  fraudAnalysis: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Claim', claimSchema);
