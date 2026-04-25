import request from 'supertest';
import { createApp } from '../src/app';
import * as openaiService from '../src/services/openai';
import { AnalyzeResult } from '../src/types';

jest.mock('../src/services/openai');

const mockAnalyzeText = openaiService.analyzeText as jest.MockedFunction<
  typeof openaiService.analyzeText
>;

const mockResult: AnalyzeResult = {
  summary: 'This is a test summary of the provided text.',
  action_items: ['Review the document', 'Schedule a follow-up meeting', 'Update the stakeholders'],
};

const app = createApp();

describe('POST /api/analyze', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with summary and action_items for valid input', async () => {
    mockAnalyzeText.mockResolvedValueOnce(mockResult);

    const response = await request(app)
      .post('/api/analyze')
      .send({ text: 'This is some sample text to analyze.' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 200, ...mockResult });
    expect(mockAnalyzeText).toHaveBeenCalledTimes(1);
    expect(mockAnalyzeText).toHaveBeenCalledWith('This is some sample text to analyze.');
  });

  it('returns 400 when text field is missing', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .send({})
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(mockAnalyzeText).not.toHaveBeenCalled();
  });

  it('returns 400 when text is an empty string', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .send({ text: '   ' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(mockAnalyzeText).not.toHaveBeenCalled();
  });

  it('returns 400 when text is not a string', async () => {
    const response = await request(app)
      .post('/api/analyze')
      .send({ text: 12345 })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(mockAnalyzeText).not.toHaveBeenCalled();
  });

  it('returns 500 when the OpenAI service throws an error', async () => {
    mockAnalyzeText.mockRejectedValueOnce(new Error('OpenAI API error'));

    const response = await request(app)
      .post('/api/analyze')
      .send({ text: 'Valid text that triggers a service error.' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
