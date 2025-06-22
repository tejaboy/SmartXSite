import { prebuiltAppConfig } from "./libs/webllm/webllm.js";
import { defaultSummaryPrompt, defaultMCQPrompt } from "./consts.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Tab switching logic
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            // Remove active classes
            tabButtons.forEach((b) => b.classList.remove("active"));
            tabContents.forEach((c) => c.classList.remove("active"));

            // Activate clicked tab
            btn.classList.add("active");
            const tabId = btn.getAttribute("data-tab");
            document.getElementById(tabId).classList.add("active");
        });
    });

    // === Model Tab logic ===

    if (!localStorage.getItem("model")) {
        localStorage.setItem("model", "Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC");
    }

    const modelSelect = document.getElementById("modelSelect");
    const geminiKeyInput = document.getElementById("geminiKeyInput");
    const saveButton = document.getElementById("saveModel");
    const confirmationText = document.getElementById("confirmation");

    // Show Gemini input only if key exists or model is gemini
    if (localStorage.getItem("gemini_key") === null) {
        geminiKeyInput.style.display = "none";
    } else {
        geminiKeyInput.value = localStorage.getItem("gemini_key");
    }

    try {
        const models = prebuiltAppConfig.model_list.map((m) => m.model_id);
        models.unshift("gemini-2.0-flash");
        models.unshift("gemini-2.0-flash-lite");

        modelSelect.innerHTML = "";
        models.forEach((model) => {
            const option = document.createElement("option");
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });

        const savedModel = localStorage.getItem("model");
        if (savedModel && models.includes(savedModel)) {
            modelSelect.value = savedModel;
            confirmationText.textContent = `Current Model: ${savedModel}`;
        }
    } catch (error) {
        console.error("Error loading models:", error);
        confirmationText.textContent = "Failed to load models.";
    }

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

    saveButton.addEventListener("click", () => {
        const selectedModel = modelSelect.value;

        if (selectedModel.includes("gemini")) {
            const gemini_key = geminiKeyInput.value.trim();
            if (gemini_key === "") {
                confirmationText.textContent = "Gemini key cannot be empty.";
                return;
            }
            localStorage.setItem("gemini_key", gemini_key);
        } else {
            localStorage.removeItem("gemini_key");
        }

        localStorage.setItem("model", selectedModel);
        confirmationText.textContent = `Saved Model: ${selectedModel}`;
    });

    // === Prompt Engineering Tab logic ===
    const summarizationPromptInput = document.getElementById("summarizationPrompt");
    const mcqPromptInput = document.getElementById("mcqPrompt");
    const useOriginalRadio = document.getElementById("useOriginal");
    const useSummarizedRadio = document.getElementById("useSummarized");
    const savePromptsBtn = document.getElementById("savePrompts");
    const promptConfirmation = document.getElementById("promptConfirmation");

    // Load saved prompts from localStorage
    summarizationPromptInput.value = localStorage.getItem("summarization_prompt") || defaultSummaryPrompt;
    mcqPromptInput.value = localStorage.getItem("mcq_prompt") || defaultMCQPrompt;

    const useFull = localStorage.getItem("mcq_use_full") || "false";
    if (useFull === "true") {
        useOriginalRadio.checked = true;
    } else {
        useSummarizedRadio.checked = true;
    }

    savePromptsBtn.addEventListener("click", () => {
        const sumPrompt = summarizationPromptInput.value.trim();
        const mcqPrompt = mcqPromptInput.value.trim();
        const mcqUseFull = useOriginalRadio.checked;

        localStorage.setItem("summarization_prompt", sumPrompt);
        localStorage.setItem("mcq_prompt", mcqPrompt);
        localStorage.setItem("mcq_use_full", mcqUseFull);

        promptConfirmation.textContent = "Setting saved successfully!";
        setTimeout(() => {
            promptConfirmation.textContent = "";
        }, 3000);
    });
});
