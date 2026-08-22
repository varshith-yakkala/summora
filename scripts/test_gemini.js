const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value.trim();
    }
  }
}

async function testKey() {
  const apiKey = process.env.AI_API_KEY;
  console.log('Testing API Key prefix:', apiKey ? apiKey.substring(0, 10) + '...' : 'NONE');

  const modelsToTest = ['gemini-3.6-flash', 'gemini-2.5-flash'];

  for (const m of modelsToTest) {
    try {
      console.log(`Testing model: ${m}...`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent('Say hello in JSON format {"message": "hello"}');
      console.log(`SUCCESS for model ${m}:`, await result.response.text());
      break;
    } catch (err) {
      console.error(`FAILED for model ${m}:`, err.message);
    }
  }
}

testKey();
