const axios = require('axios');
require('dotenv').config();

async function identifyPlant(imageBase64) {
  const url = 'https://plant.id/api/v3/identification';
  const apiKey = process.env.PLANT_ID_API_KEY;

  const payload = {
    "images": imageBase64,
    "symptoms": true,
    "classification_level": "all",
    "health": "all"
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey
      }
    });
    const result = response.data;
    const isPlantData = result.result?.is_plant;
    
    if (isPlantData) {
        console.log(`[Plant Detection] Probability: ${isPlantData.probability}`);
        if (isPlantData.probability < 0.7) {
            throw new Error(`The image does not appear to be a plant (Confidence: ${(isPlantData.probability * 100).toFixed(1)}%). Please upload a clear photo of a plant.`);
        }
    } else {
        console.log('[Plant Detection] is_plant data missing from response');
    }

    const suggestions = result.result.classification.suggestions;
    const plantName = suggestions.length ? suggestions[0].name : 'Unknown';
    const diseases = result.result.disease?.suggestions || [];
    const symptoms = result.result.symptom.suggestions
    let disArr = [];
    let sympArr = [];
    diseases.forEach((item) => {
        if(item.probability >=0.6){
            disArr.push(item.name)
        }
    });
    symptoms.forEach((item) => {
        sympArr.push(item.name)
    });
    let finalres = {
        "Plant Name": plantName,
        "Diseases": disArr,
        "Sympotoms": sympArr,
    }
    return finalres
  } catch (error) {
    console.error('Error identifying plant:', error.response ? error.response.data : error.message);
    
    if (error.response && error.response.status === 429) {
        return new Error("Plant identification service quota exceeded. Please try again later or upgrade your plan.");
    }
    
    return error;
  }
}

module.exports = { identifyPlant };
