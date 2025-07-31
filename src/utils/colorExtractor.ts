// Utility for extracting dominant colors from images
export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export class ColorExtractor {
  // Extract colors from an image URL
  static async extractColorsFromImage(imageUrl: string): Promise<ColorPalette | null> {
    try {
      // For now, return predefined color schemes based on era names
      // In the future, this could use a color extraction library or API
      return this.getEraColorScheme(imageUrl);
    } catch (error) {
      console.warn('Could not extract colors from image:', error);
      return null;
    }
  }

  // Get predefined color schemes based on era characteristics
  static getEraColorScheme(imageUrl: string): ColorPalette {
    const url = imageUrl.toLowerCase();
    
    // College Dropout - Brown/Tan bear theme
    if (url.includes('college') || url.includes('dropout')) {
      return {
        primary: '#D97706', // Amber-600
        secondary: '#F59E0B', // Amber-500
        accent: '#92400E', // Amber-700
        background: '#FEF3C7', // Amber-100
        text: '#451A03' // Amber-900
      };
    }
    
    // Late Registration - Orchestra/Classical theme
    if (url.includes('late') || url.includes('registration')) {
      return {
        primary: '#DC2626', // Red-600
        secondary: '#EF4444', // Red-500
        accent: '#991B1B', // Red-700
        background: '#FEE2E2', // Red-100
        text: '#7F1D1D' // Red-900
      };
    }
    
    // Graduation - Space/Neon theme
    if (url.includes('graduation') || url.includes('grad')) {
      return {
        primary: '#7C3AED', // Violet-600
        secondary: '#8B5CF6', // Violet-500
        accent: '#5B21B6', // Violet-700
        background: '#EDE9FE', // Violet-100
        text: '#2D1B69' // Violet-900
      };
    }
    
    // 808s & Heartbreak - Cold/Blue theme
    if (url.includes('808') || url.includes('heartbreak')) {
      return {
        primary: '#2563EB', // Blue-600
        secondary: '#3B82F6', // Blue-500
        accent: '#1D4ED8', // Blue-700
        background: '#DBEAFE', // Blue-100
        text: '#1E3A8A' // Blue-900
      };
    }
    
    // MBDTF - Rich/Royal theme
    if (url.includes('beautiful') || url.includes('fantasy') || url.includes('mbdtf')) {
      return {
        primary: '#BE123C', // Rose-700
        secondary: '#E11D48', // Rose-600
        accent: '#881337', // Rose-800
        background: '#FFE4E6', // Rose-100
        text: '#4C0519' // Rose-950
      };
    }
    
    // Yeezus - Minimalist/Red theme
    if (url.includes('yeezus')) {
      return {
        primary: '#DC2626', // Red-600
        secondary: '#EF4444', // Red-500
        accent: '#B91C1C', // Red-600
        background: '#FEF2F2', // Red-50
        text: '#7F1D1D' // Red-900
      };
    }
    
    // TLOP - Orange/Pablo theme
    if (url.includes('pablo') || url.includes('tlop')) {
      return {
        primary: '#EA580C', // Orange-600
        secondary: '#F97316', // Orange-500
        accent: '#C2410C', // Orange-700
        background: '#FED7AA', // Orange-200
        text: '#7C2D12' // Orange-900
      };
    }
    
    // Ye - Natural/Earth theme
    if (url.includes('ye') && !url.includes('yeezus')) {
      return {
        primary: '#059669', // Emerald-600
        secondary: '#10B981', // Emerald-500
        accent: '#047857', // Emerald-700
        background: '#D1FAE5', // Emerald-100
        text: '#022C22' // Emerald-900
      };
    }
    
    // Jesus Is King - Gospel/Gold theme
    if (url.includes('jesus') || url.includes('jik')) {
      return {
        primary: '#FBBF24', // Amber-400
        secondary: '#F59E0B', // Amber-500
        accent: '#D97706', // Amber-600
        background: '#FEF3C7', // Amber-100
        text: '#92400E' // Amber-700
      };
    }
    
    // Donda - Dark/Monochrome theme
    if (url.includes('donda')) {
      return {
        primary: '#374151', // Gray-700
        secondary: '#4B5563', // Gray-600
        accent: '#1F2937', // Gray-800
        background: '#F9FAFB', // Gray-50
        text: '#111827' // Gray-900
      };
    }
    
    // Default theme
    return {
      primary: '#7C3AED', // Violet-600
      secondary: '#8B5CF6', // Violet-500
      accent: '#5B21B6', // Violet-700
      background: '#EDE9FE', // Violet-100
      text: '#2D1B69' // Violet-900
    };
  }

  // Convert color palette to CSS custom properties
  static colorPaletteToCSSVars(palette: ColorPalette, prefix: string = 'era'): Record<string, string> {
    return {
      [`--${prefix}-primary`]: palette.primary,
      [`--${prefix}-secondary`]: palette.secondary,
      [`--${prefix}-accent`]: palette.accent,
      [`--${prefix}-background`]: palette.background,
      [`--${prefix}-text`]: palette.text,
    };
  }

  // Generate Tailwind classes from color palette
  static colorPaletteToTailwind(palette: ColorPalette): Record<string, string> {
    return {
      bg: `bg-[${palette.background}] dark:bg-[${palette.accent}]/20`,
      border: `border-[${palette.primary}]/30 dark:border-[${palette.primary}]/50`,
      text: `text-[${palette.text}] dark:text-[${palette.background}]`,
      accent: `text-[${palette.primary}] dark:text-[${palette.secondary}]`,
      button: `bg-[${palette.primary}] hover:bg-[${palette.accent}] text-white`,
    };
  }
}
