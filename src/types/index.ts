export interface AnalyzeRequest {
  text: string;
}

export interface AnalyzeResult {
  summary: string;
  action_items: [string, string, string];
}

export interface AnalyzeResponse extends AnalyzeResult {
  status: number;
}

export interface ErrorResponse {
  status: number;
  error: string;
}
