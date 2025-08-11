const OpenAI = require("openai");
const dotenv = require("dotenv");
dotenv.config();
const openai = new OpenAI(
    {
        apiKey: process.env.OPENAI_API_KEY,
    }
);

const MODERATION_PROMPT = `You are a content moderation AI. Analyze the given text and determine if it's safe or NSFW based on these categories:

- sexual content
- harassment/threatening behavior  
- hate speech
- violence/graphic content
- self-harm content
- gore content
- illicit activities

Respond with only "SAFE" or "NSFW" based on your analysis.`;


async function isSafePrompt(inputText) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: MODERATION_PROMPT
                },
                {
                    role: "user",
                    content: inputText
                }
            ],
            max_tokens: 10,
            temperature: 0
        });

        const result = response.choices[0].message.content.trim().toUpperCase();
        return result === "SAFE";

    }
    catch (error) {
        console.error('GPT Moderation Error:', error.message);
        return false; // Return false on error (unsafe)
    }
}

module.exports = { isSafePrompt };