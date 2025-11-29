const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error("Gemini API Key not found in environment variables (GEMINI_API_KEY or GOOGLE_API_KEY)");
}

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  maxOutputTokens: 2048,
  apiKey: apiKey,
});

async function getPlantCareTips(plantName, diseaseInfo, careLogs) {
  try {
    const template = `
      You are an expert botanist and plant pathologist.
      
      I have a plant named "{plantName}".
      It has been identified to potentially have the following issues: {diseaseInfo}.
      
      Here are the care logs provided by the owner:
      {careLogs}
      
      Based on this information, please provide a concise but comprehensive set of care tips to help this plant recover and thrive. 
      Focus on actionable advice. 
      If the logs suggest improper care (e.g., overwatering), kindly point that out and suggest a correction.
      If the disease info is serious, suggest immediate treatment steps.
      
      IMPORTANT: Return the response in valid JSON format with the following structure:
      {{
        "water": "Advice on watering...",
        "sunlight": "Advice on light exposure...",
        "soil": "Advice on soil and fertilizer...",
        "general": "General care advice...",
        "warnings": "Specific warnings based on disease or bad practices..."
      }}
      Do not include markdown formatting like \`\`\`json. Just return the raw JSON.
    `;

    const prompt = PromptTemplate.fromTemplate(template);
    const outputParser = new StringOutputParser();
    const chain = prompt.pipe(model).pipe(outputParser);

    const response = await chain.invoke({
      plantName: plantName,
      diseaseInfo: diseaseInfo || "No specific diseases detected, but general care is needed.",
      careLogs: careLogs || "No specific care logs provided.",
    });

    // Clean up response if it contains markdown code blocks
    let cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Validate JSON
    try {
        JSON.parse(cleanResponse);
    } catch (e) {
        console.error("Failed to parse Gemini response as JSON:", cleanResponse);
        // Fallback to a simple structure if parsing fails
        return JSON.stringify({
            general: cleanResponse,
            warnings: "Could not parse specific categories."
        });
    }

    return cleanResponse;
  } catch (error) {
    console.error("Error generating care tips:", error);
    throw new Error("Failed to generate care tips");
  }
}

module.exports = { getPlantCareTips };
