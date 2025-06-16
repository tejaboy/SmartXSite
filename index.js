import { prebuiltAppConfig } from "./libs/webllm.js";

document.addEventListener("DOMContentLoaded", async () => {
    if (!localStorage.getItem("model")) {
        localStorage.setItem("model", "Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC");
    }
    
    const modelSelect = document.getElementById("modelSelect");
    const saveButton = document.getElementById("saveModel");
    const confirmationText = document.getElementById("confirmation");

    try {
        // Extract model IDs from prebuiltAppConfig
        const models = prebuiltAppConfig.model_list.map(m => m.model_id);

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

    // Save model selection
    saveButton.addEventListener("click", () => {
        const selectedModel = modelSelect.value;
        localStorage.setItem("model", selectedModel);
        confirmationText.textContent = `Saved Model: ${selectedModel}`;
    });
});