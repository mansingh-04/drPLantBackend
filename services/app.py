from flask import Flask, request, jsonify
import torch
from PIL import Image
from io import BytesIO
import base64
from transformers import AutoProcessor, LlavaForConditionalGeneration

app = Flask(__name__)

# Load model and processor
model_id = "YuchengShi/LLaVA-v1.5-7B-Plant-Leaf-Diseases-Detection"
device = "cuda" if torch.cuda.is_available() else "cpu"

model = LlavaForConditionalGeneration.from_pretrained(
    model_id, torch_dtype=torch.float16, low_cpu_mem_usage=True
).to(device)
processor = AutoProcessor.from_pretrained(model_id)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    if not data or 'image' not in data:
        return jsonify({'error': 'Image required'}), 400

    # Decode base64 image
    image_bytes = base64.b64decode(data['image'])
    image = Image.open(BytesIO(image_bytes)).convert("RGB")

    species = data.get('species', None)
    prompt = data.get('prompt', "What disease does this leaf have and what should I do?")
    if species:
        prompt = f"This is a {species} leaf. {prompt}"

    # Prepare model input
    conversation = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image"},
            ],
        },
    ]
    prompt_text = processor.apply_chat_template(conversation, add_generation_prompt=True)
    inputs = processor(images=image, text=prompt_text, return_tensors="pt").to(device, torch.float16)

    # Model inference
    output = model.generate(**inputs, max_new_tokens=200, do_sample=False)
    answer = processor.decode(output[0][2:], skip_special_tokens=True)

    return jsonify({
        'result': answer.strip()
    })

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
