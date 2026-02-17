
export const COLORS = {
  primary: '#FDFBF7', // Warm Beige
  accent: '#EBD8C3', // Soft Pastel Brown
  success: '#D1EAD3', // Soft Pastel Green
  error: '#FADBD8', // Soft Pastel Red
  processing: '#D6EAF8', // Soft Pastel Blue
};

export const OCR_SYSTEM_PROMPT = `
You are an expert OCR and document analysis specialist. 
Your goal is to extract text from the provided image or PDF with 100% accuracy.
Focus on:
1. Maintaining the original layout as much as possible.
2. If there are tables, represent them using Markdown table format.
3. If there are mathematical formulas, use LaTeX or very clear notation.
4. For study materials/exam papers, capture every detail including question numbers and choices.
5. If "High Accuracy Mode" is requested, pay extra attention to context and correct obvious optical recognition errors without changing the meaning.
`;

export const SUMMARY_PROMPT = `
Summarize the following text extracted from a study document. 
Provide a concise summary, key points, and essential formulas/definitions found in the content.
Use bullet points for clarity.
`;

export const CORRECTION_PROMPT = `
Review the following OCR-extracted text. 
Fix any typos, grammatical errors, or obvious OCR mistakes. 
Ensure the text flows naturally and matches the context of an academic or professional document.
Do not change the technical meaning or mathematical formulas.
`;
