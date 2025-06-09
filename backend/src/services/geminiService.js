const axios = require('axios');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';
  }

  async parseReceipt(imageBuffer) {
    try {
      logger.info('Starting receipt parsing with Gemini AI');
      
      if (!this.apiKey) {
        logger.error('Gemini API key not configured');
        throw new Error('Gemini API key not configured');
      }
      
      logger.info(`API key exists: ${this.apiKey ? 'Yes' : 'No'}`);
      logger.info(`Image buffer size: ${imageBuffer.length} bytes`);

      const base64Image = imageBuffer.toString('base64');

      const prompt = `
        You are a receipt parser. Analyze this receipt image and extract structured data.
        Return a JSON object with the following structure:
        {
          "merchant": "store name",
          "date": "YYYY-MM-DD",
          "lineItems": [
            {
              "description": "item description",
              "quantity": number,
              "unitPrice": number,
              "lineTotal": number
            }
          ],
          "subtotal": number,
          "tax": number,
          "total": number
        }

        If any field cannot be determined, use null for strings and 0 for numbers.
        Ensure all numbers are valid numeric values.
        Be as accurate as possible with item descriptions and prices.
      `;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 2048,
        }
      };

      logger.info('Sending request to Gemini API...');
      const response = await axios.post(
        `${this.baseURL}?key=${this.apiKey}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );
      
      logger.info('Received response from Gemini API');

      if (!response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response from Gemini API');
      }

      const responseText = response.data.candidates[0].content.parts[0].text;
      
      // Extract JSON from response (remove any markdown formatting)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsedData.lineItems || !Array.isArray(parsedData.lineItems)) {
        parsedData.lineItems = [];
      }

      // Ensure numeric fields are numbers
      ['subtotal', 'tax', 'total'].forEach(field => {
        if (typeof parsedData[field] !== 'number') {
          parsedData[field] = 0;
        }
      });

      // Validate line items
      parsedData.lineItems = parsedData.lineItems.map(item => ({
        description: item.description || 'Unknown item',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        lineTotal: Number(item.lineTotal) || 0
      }));

      logger.info('Receipt parsed successfully by Gemini');
      return parsedData;

    } catch (error) {
      logger.error('Gemini parsing error:', error.message);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid Gemini API key');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try again.');
      }
      
      throw new Error(`Receipt parsing failed: ${error.message}`);
    }
  }

  async isAvailable() {
    return !!this.apiKey;
  }
}

module.exports = new GeminiService();