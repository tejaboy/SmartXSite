# SmartXSite – Your AI-Powered Study Buddy! 🧠📚

**Making university life easier with AI!**  
SmartXSite is a Chrome extension designed to empower SIT Content Portal with Generative AI.

## 🌟 What It Does

SmartXSite leverages AI to help you digest lecture content efficiently and securely—right from your browser.

- 📖 **AI-Powered Summaries**  
  Summarizes PDF lecture notes directly in your browser. Say goodbye to information overload!

- 📝 **Auto-Generated MCQs**  
  Automatically generates multiple-choice questions from your PDF content to test your understanding.

- 🔄 **Flexible AI Options**
  Choose between:
  * On-Device AI (via [WebLLM](https://github.com/mlc-ai/web-llm)) for fast, private, offline processing.
  * Gemini API for cloud-based intelligence and improved model quality (note: if you're on the Gemini Free plan, your data may be used to improve Google's models—see [Gemini Terms](https://ai.google.dev/gemini-api/terms)).

- 🔒 **Privacy-First by Design**  
  Prefer full privacy? Use the on-device option—your files never leave your computer. The choice is yours.

## 📦 Files and Structure

```bash
SmartXSite/
├── libs/                  # Contains third-party libraries like marked.min.js and webllm.js
├── LICENSE                # SmartXSite project license
├── background.js          # Background script for managing extension events - namely popup `summary.html`
├── content.js             # Content script for injecting functionality (buttons etc) into pages on xSite
├── index.html             # Default extension popup with user configrations
├── index.js               # JS logic for index.html
├── manifest.json          # Chrome extension manifest (MV3)
├── quiz.css               # Stylesheet for quiz popup
├── quiz.html              # Quiz popup HTML structure
├── quiz.js                # Quiz popup JavaScript
├── README.md              # This file duh!
├── summary.css            # Styling for summary.html
├── summary.html           # Interface for displaying summary
├── summary.js             # Logic to interact with WebLLM and render outputs
```

## 🧑‍💻 Developer Setup
1. Clone this repository:

```bash
git clone https://github.com/yourusername/smartxsite.git
```

2. Load the extension in Chrome:
* Go to chrome://extensions/
* Enable "Developer Mode"
* Click "Load Unpacked"
* Select the cloned SmartXSite/ folder

3. Open a PDF and click the extension to see it in action.

## 🔗 Chrome Web Store
📥 Install the latest version from the [Chrome Web Store](https://chromewebstore.google.com/detail/smartxsite/bncgadpdfckkjmlmppinnjimdgiecipc).

## 📜 Licenses
This project uses third-party libraries, each with its own license:

`libs/marked/marked.min.js` – MIT License [[Repo](https://github.com/mlc-ai/web-llm)]

`libs/webllm/webllm.js` – Apache License 2.0 [[Repo](https://github.com/markedjs/marked)]

Please refer to their respective repositories for more details.