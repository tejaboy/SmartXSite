import { prebuiltAppConfig } from "./libs/webllm/webllm.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!localStorage.getItem("model")) {
        localStorage.setItem("model", "Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC");
    }

    // Declare UI elements references
    const modelSelect = document.getElementById("modelSelect");
    const geminiKeyInput = document.getElementById("geminiKeyInput");
    const saveButton = document.getElementById("saveModel");
    const confirmationText = document.getElementById("confirmation");

    // Populate Gemini key input if it exists
    if (localStorage.getItem("gemini_key") === null) {
        geminiKeyInput.style.display = "none";
    }
    else {
        geminiKeyInput.value = localStorage.getItem("gemini_key");
    }

    try {
        // Extract model IDs from prebuiltAppConfig
        const models = prebuiltAppConfig.model_list.map(m => m.model_id);
        models.unshift("gemini-2.0-flash");
        models.unshift("gemini-2.0-flash-lite");

        // Populate dropdown
        modelSelect.innerHTML = "";
        models.forEach((model) => {
            const option = document.createElement("option");
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });

        // Load saved model from localStorage
        const savedModel = localStorage.getItem("model");
        if (savedModel && models.includes(savedModel)) {
            modelSelect.value = savedModel;
            confirmationText.textContent = `Current Model: ${savedModel}`;
        }

    } catch (error) {
        console.error("Error loading models:", error);
        confirmationText.textContent = "Failed to load models.";
    }

    // On model selection change, show geminiKeyInput if Gemini model is selected
    modelSelect.addEventListener("change", () => {
        const selectedModel = modelSelect.value;
        if (selectedModel.includes("gemini")) {
            geminiKeyInput.style.display = "inline";
            geminiKeyInput.value = localStorage.getItem("gemini_key") || "";
        } else {
            geminiKeyInput.style.display = "none";
            geminiKeyInput.value = "";
        }
    });

    // Save model selection
    saveButton.addEventListener("click", () => {
        const selectedModel = modelSelect.value;
        
        if (selectedModel.includes("gemini")) {
            const gemini_key = geminiKeyInput.value.trim();
            if (gemini_key === "") {
                confirmationText.textContent = "Gemini key cannot be empty.";
                return;
            }

            localStorage.setItem("gemini_key", gemini_key);
        }
        else {
            localStorage.removeItem("gemini_key");
        }

        localStorage.setItem("model", selectedModel);
        confirmationText.textContent = `Saved Model: ${selectedModel}`;
    });
});