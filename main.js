// Import any external libraries as needed
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import Base64 from "base64-js";
import MarkdownIt from "markdown-it";
import { maybeShowApiKeyBanner } from "./gemini-api-banner";
import "./style.css";

let API_KEY = "AIzaSyBwdrFSqVUl9gKN_x82iReGx0ioyXdVigg"; // Add your Gemini API key here
let form = document.querySelector("form");
let output = document.querySelector(".output");
let dropZone = document.getElementById("drop-zone");
let fileInput = document.querySelector('input[type="file"][name="image-upload"]');

// Create a modal container dynamically
const createModal = (content) => {
    const modal = document.createElement("div");
    modal.id = "result-modal"; // Assign an ID for styling
    modal.innerHTML = `
    <div class="modal-content">
      <span class="close-btn">&times;</span>
      <div class="modal-body">
        <div class="scrollable-content">
          <p class="result-text">${content}</p>
        </div>
        <button id="copy-btn" class="button">Copy</button>
      </div>
    </div>
    `;
    document.body.appendChild(modal);

    // Close modal logic
    const closeButton = modal.querySelector(".close-btn");
    closeButton.addEventListener("click", () => modal.remove());

    // Allow closing modal by clicking outside the content
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Add copy-to-clipboard functionality
    const copyButton = modal.querySelector("#copy-btn");
    copyButton.addEventListener("click", () => {
        const textToCopy = modal.querySelector(".result-text").textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            alert("Copied to clipboard!"); // Feedback to the user
        });
    });

    return modal;
};

// Predefined backend prompt
let backendPrompt =
    "write a Detailed image description as like image prompt for generate image in image generation ai. Mention specific elements, Setting, Objects, Mood, Colors, Background Elements, View Position, Subject, Lighting, Image Style, Mood/Atmosphere, Texture/Material, Action/Movement, Weather/Environment, Perspective, Artistic Effects, Character Features, Time Period, Culture/Region, Season, Symbolism, Interaction, Emphasis/Focus, Sound/Feeling Association, Patterns/Shapes, Edges/Framing, Decor/Ornamentation, Contrast, Scale/Proportion, Narrative Elements, Light Interaction, Energy/Vibes, Natural Phenomena, Technological Details, Biological/Organic Forms, Skin Detail, Fantasy/Mythical Elements, Facial Expressions, Clothing/Fashion Style, Accessories/Props, Hair/Beard Style, Body Language/Posture, Air Quality/Haze, Temperature, Light Source Color, Sound Visual Cues, Historical Events/References, Social Dynamics, Cultural Symbols, Mythological Influence, Micro-Details, Climatic Effects, Urban vs. Rural Setting, Flora/Fauna Specificity, Era/Movement Influence, Brushstroke Style, Color Gradients/Blending, Glowing Effects, Festive Accessories, Magical Aura, Animal Features, Snow Interaction, Bokeh Lighting. example (This captivating digital illustration showcases an incredibly adorable, fluffy white reindeer. Its antlers are adorned with a sparkling, golden glow, creating a magical effect. The reindeer is wearing a vibrant red scarf, adding to its festive charm. The setting is a snowy winter wonderland, with a softly blurred background of bokeh lights suggesting a warm and cozy ambiance. The reindeer's expression is sweet and innocent, contributing to the overall feeling of joy and wonder. The image is rendered in a highly realistic style with an emphasis on soft textures and warm lighting. The perspective is a slightly low angle, making the reindeer seem even more endearing and life-like. The overall mood is one of pure holiday cheer and festive magic. The image is filled with light, texture and warmth, creating a whimsical atmosphere that's perfect for the Christmas season, must be show only detailed prompt without line space, no other text or point need to show ";

function handleDragOver(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    dropZone.classList.add("dragging");
}

function handleDragLeave(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    dropZone.classList.remove("dragging");
}

function handleDrop(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    dropZone.classList.remove("dragging");

    if (ev.dataTransfer.files.length > 0) {
        fileInput.files = ev.dataTransfer.files;
        displayImagePreview(fileInput.files[0]); // Display preview
    }
}

function displayImagePreview(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        // Clear previous image
        const existingPreview = document.querySelector(".img-preview");
        if (existingPreview) {
            existingPreview.remove();
        }
        // Create and append the new image
        const img = document.createElement("img");
        img.src = e.target.result;
        img.classList.add("img-preview"); // Add a class for styling
        img.style.maxWidth = "100%"; // Example styling
        img.style.maxHeight = "90px"; // Example styling
        dropZone.appendChild(img);
    };
    reader.readAsDataURL(file);
}

async function submitForm() {
    output.textContent = "Generating...";

    try {
        let file = fileInput.files[0];
        if (!file) {
            output.textContent = "Please select an image.";
            return;
        }

        let reader = new FileReader();
        reader.readAsArrayBuffer(file);
        let imageBase64 = await new Promise((resolve, reject) => {
            reader.onload = () =>
                resolve(Base64.fromByteArray(new Uint8Array(reader.result)));
            reader.onerror = (error) => reject(error);
        });

        const contents = [
            {
                role: "user",
                parts: [
                    { inline_data: { mime_type: file.type, data: imageBase64 } },
                    { text: backendPrompt }, // Use the backend-defined or hardcoded prompt here
                ],
            },
        ];

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
            ],
        });

        const result = await model.generateContentStream({ contents });
        let md = new MarkdownIt();
        let buffer = [];
        for await (let response of result.stream) {
            buffer.push(response.text());
        }

        // Pass generated result to modal for display
        createModal(buffer.join(''));
    } catch (e) {
        output.innerHTML += "<hr>" + e.message;
    }
}

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", handleDragOver);
dropZone.addEventListener("dragleave", handleDragLeave);
dropZone.addEventListener("drop", handleDrop);
fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
        displayImagePreview(fileInput.files[0]); // Display preview
    }
});

form.onsubmit = async (ev) => {
    ev.preventDefault();
    submitForm();
};

maybeShowApiKeyBanner(API_KEY);
