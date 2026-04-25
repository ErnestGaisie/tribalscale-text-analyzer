export interface AnalyzeRequest {
  text: string;
}

export interface AnalyzeResponse {
  summary: string;
  action_items: [string, string, string];
}

export interface ErrorResponse {
  error: string;
}
