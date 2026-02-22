import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const getAI = () => {
  // Use the selected API key if available, otherwise fallback to the environment one
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key is missing. Please select an API key using the 'Connect' button.");
  return new GoogleGenAI({ apiKey });
};

export interface FurnitureConfig {
  type: string;
  style: string;
  materials: string[];
  dimensions: {
    width: number;
    height: number;
    depth: number;
    unit: string;
  };
  budget: number;
  components: string[];
  description: string;
  logoBase64?: string;
}

export interface TechnicalDoc {
  renderUrl: string;
  technicalImages: string[]; // At least 5 images
  plans: {
    view: string;
    description: string;
    dimensions: string;
  }[];
  cutList: {
    part: string;
    material: string;
    dimensions: string;
    quantity: number;
  }[];
  hardware: {
    item: string;
    quantity: number;
    purpose: string;
  }[];
  assemblySteps: string[];
  quotation: {
    item: string;
    cost: number;
  }[];
  totalEstimatedCost: number;
}

export const analyzeLogo = async (base64Image: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        parts: [
          { text: "Analiza este logo. Identifica los colores principales (hex), el estilo visual (minimalista, audaz, corporativo, etc.) y cómo se podría integrar de forma elegante en un mueble personalizado (ej. grabado laser, placa metálica, impresión UV)." },
          { inlineData: { mimeType: "image/png", data: base64Image.split(',')[1] || base64Image } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          colors: { type: Type.ARRAY, items: { type: Type.STRING } },
          style: { type: Type.STRING },
          integrationSuggestion: { type: Type.STRING }
        },
        required: ["colors", "style", "integrationSuggestion"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const generateFurnitureRender = async (config: FurnitureConfig, logoAnalysis?: any) => {
  const ai = getAI();
  
  const prompt = `A super modern, high-end, and mega well-designed piece of furniture. 
    Type: ${config.type}. 
    Style: ${config.style} (with a futuristic and premium touch). 
    Materials: ${config.materials.join(', ')}. 
    Dimensions: ${config.dimensions.width}x${config.dimensions.height}x${config.dimensions.depth} ${config.dimensions.unit}.
    Components: ${config.components.join(', ')}.
    Description: ${config.description}.
    ${logoAnalysis ? `Brand integration: ${logoAnalysis.style} style, colors ${logoAnalysis.colors.join(', ')}. ${logoAnalysis.integrationSuggestion}.` : ''}
    
    The image must be a fotorrealistic 3D perspective render, studio lighting, neutral background, 8k resolution, architectural photography style. It should look like a masterpiece of modern design.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate image");
};

export const generateTechnicalImages = async (approvedImageUrl: string, config: FurnitureConfig): Promise<string[]> => {
  const ai = getAI();
  const views = [
    "Front elevation with technical dimensions",
    "Side elevation with technical dimensions",
    "Top down plan view with technical dimensions",
    "Detailed close-up of a critical assembly joint or material texture",
    "Exploded view showing how components fit together"
  ];

  const imagePromises = views.map(async (view) => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: approvedImageUrl.split(',')[1] || approvedImageUrl,
              mimeType: "image/png",
            },
          },
          { text: `Based on this approved design, generate a technical drawing/image for the ${view}. Keep it professional, white background, technical blueprint style.` },
        ],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return "";
  });

  const results = await Promise.all(imagePromises);
  return results.filter(img => img !== "");
};

export const generateTechnicalDocumentation = async (config: FurnitureConfig, renderUrl: string): Promise<TechnicalDoc> => {
  const ai = getAI();
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Actúa como un Ingeniero de Diseño Industrial Senior. Genera la documentación técnica de fabricación (Blueprints) para el siguiente mueble:
      Tipo: ${config.type}
      Estilo: ${config.style}
      Materiales: ${config.materials.join(', ')}
      Dimensiones: ${config.dimensions.width}x${config.dimensions.height}x${config.dimensions.depth} ${config.dimensions.unit}
      Presupuesto: ${config.budget} USD
      Componentes: ${config.components.join(', ')}
      Descripción: ${config.description}
      
      REQUERIMIENTOS ESTRICTOS:
      1. Los planos (plans) deben describir vistas técnicas reales (Elevación frontal, lateral, planta, detalle de unión).
      2. La lista de cortes (cutList) debe ser precisa para que un carpintero pueda cortar las piezas.
      3. Los herrajes (hardware) deben ser específicos (ej. correderas telescópicas, bisagras de cazoleta, tornillos minifix).
      4. Los pasos de ensamble deben ser lógicos y profesionales.
      5. La cotización debe ser realista según los materiales.
      
      Responde únicamente con el JSON estructurado.`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plans: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                view: { type: Type.STRING },
                description: { type: Type.STRING },
                dimensions: { type: Type.STRING }
              }
            }
          },
          cutList: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                part: { type: Type.STRING },
                material: { type: Type.STRING },
                dimensions: { type: Type.STRING },
                quantity: { type: Type.NUMBER }
              }
            }
          },
          hardware: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                purpose: { type: Type.STRING }
              }
            }
          },
          assemblySteps: { type: Type.ARRAY, items: { type: Type.STRING } },
          quotation: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                cost: { type: Type.NUMBER }
              }
            }
          },
          totalEstimatedCost: { type: Type.NUMBER }
        },
        required: ["plans", "cutList", "hardware", "assemblySteps", "quotation", "totalEstimatedCost"]
      }
    }
  });

  const data = JSON.parse(response.text);
  return { ...data, renderUrl };
};

export const editFurnitureImage = async (originalImageBase64: string, prompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: originalImageBase64.split(',')[1] || originalImageBase64,
            mimeType: "image/png",
          },
        },
        { text: `Edit this furniture design based on this request: ${prompt}. Keep the technical sheet style and professional lighting.` },
      ],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to edit image");
};

export const chatWithDesigner = async (history: { role: string, parts: { text: string }[] }[], message: string, config: FurnitureConfig) => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: "gemini-3.1-pro-preview",
    config: {
      systemInstruction: `Eres un experto en diseño industrial y fabricación de muebles a medida. 
      Conoces los detalles del proyecto actual:
      Tipo: ${config.type}
      Estilo: ${config.style}
      Materiales: ${config.materials.join(', ')}
      Dimensiones: ${config.dimensions.width}x${config.dimensions.height}x${config.dimensions.depth} ${config.dimensions.unit}
      Presupuesto: ${config.budget} USD
      
      Responde de forma técnica, útil y profesional a las dudas del fabricante o cliente.`,
    },
    history: history
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};
