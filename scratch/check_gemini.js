require('dotenv').config({ path: '.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    // Actually the SDK doesn't expose listModels directly easily in some versions,
    // let's try just testing gemini-1.5-flash-latest
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const result = await model.generateContent('hello');
    console.log('gemini-1.5-flash-latest worked:', result.response.text());
  } catch (e) {
    console.log('gemini-1.5-flash-latest failed:', e.message);
  }

  try {
    const model2 = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result2 = await model2.generateContent('hello');
    console.log('gemini-pro worked:', result2.response.text());
  } catch (e) {
    console.log('gemini-pro failed:', e.message);
  }
}

main();
