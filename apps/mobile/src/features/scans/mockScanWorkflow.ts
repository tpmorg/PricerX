import {
  mockOcrProvider,
  mockPricingProvider,
  mockRecognitionProvider,
} from "@pricernu/shared";
import { runScanWorkflow, type ScanWorkflowInput, type ScanWorkflowResult } from "./scanWorkflow";

export function runMockMobileScan(input: ScanWorkflowInput): Promise<ScanWorkflowResult> {
  return runScanWorkflow(input, {
    ocr: mockOcrProvider,
    recognition: mockRecognitionProvider,
    pricing: mockPricingProvider,
  });
}
