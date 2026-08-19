/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // GSC platform light: ThemeColors.light + themeConfig.light
        // (@chili-publish/grafx-shared-components ThemeColors.ts)
        brand: {
          // themeConfig.brandBackgroundColor ← ThemeColors.light.PRIMARY
          primary: '#010058',
          // themeConfig.primaryButtonHoverColor ← ThemeColors.light.PRIMARY_HOVER
          'primary-hover': '#343379',
        },
        surface: {
          // themeConfig.canvasBackgroundColor ← ThemeColors.light.GRAY_100
          page: '#f5f5f5',
          // themeConfig.panelBackgroundColor ← ThemeColors.light.GRAY_50
          panel: '#ffffff',
          // themeConfig.panelBackgroundColor ← ThemeColors.light.GRAY_50
          card: '#ffffff',
          // themeConfig.dropdownMenuBackgroundColor ← ThemeColors.light.GRAY_75
          header: '#fafafa',
          // ThemeColors.light.GRAY_900 (code panel fill; inverse of light text)
          code: '#2c2c2c',
          // themeConfig.highlightedElementsColor ← ThemeColors.light.GRAY_200
          highlighted: '#eaeaea',
          // ThemeColors.light.TAG (platform Tag background)
          tag: '#cbdbfc',
        },
        text: {
          // themeConfig.primaryTextColor ← ThemeColors.light.GRAY_900
          primary: '#2c2c2c',
          // themeConfig.secondaryTextColor ← ThemeColors.light.GRAY_700
          secondary: '#6e6e6e',
          // ThemeColors.light.GRAY_600 (between secondary and placeholder)
          muted: '#8e8e8e',
          // themeConfig.primaryButtonTextColor ← ThemeColors.light.WHITE
          inverse: '#ffffff',
          // themeConfig.placeholderTextColor ← ThemeColors.light.GRAY_600
          placeholder: '#8e8e8e',
          // themeConfig.errorColor ← ThemeColors.light.ERROR
          error: '#d31510',
          // themeConfig.successColor ← ThemeColors.light.SUCCESS
          success: '#34bb84',
          // themeConfig.warningColor ← ThemeColors.light.WARNING
          warning: '#fec62f',
          // ThemeColors.light.GRAY_100 (text on surface.code)
          code: '#f5f5f5',
        },
        border: {
          // ThemeColors.light.GRAY_300
          DEFAULT: '#e1e1e1',
          // ThemeColors.light.GRAY_200
          subtle: '#eaeaea',
          // themeConfig.errorColor ← ThemeColors.light.ERROR
          error: '#d31510',
          // themeConfig.inputFocusBorderColor ← ThemeColors.light.GRAY_900
          focus: '#2c2c2c',
        },
        input: {
          // themeConfig.inputBackgroundColor ← ThemeColors.light.GRAY_100
          bg: '#f5f5f5',
          // themeConfig.inputBorderColor ← ThemeColors.light.TRANSPARENT
          border: 'transparent',
          // themeConfig.inputFocusBorderColor ← ThemeColors.light.GRAY_900
          focus: '#2c2c2c',
        },
        status: {
          // themeConfig.successColor ← ThemeColors.light.SUCCESS
          success: '#34bb84',
          // themeConfig.errorColor / destructiveColor ← ThemeColors.light.ERROR
          error: '#d31510',
          // themeConfig.warningColor ← ThemeColors.light.WARNING
          warning: '#fec62f',
          // themeConfig.infoColor ← ThemeColors.light.BLUE
          info: '#387ef2',
          // themeConfig.secondaryTextColor ← ThemeColors.light.GRAY_700
          neutral: '#6e6e6e',
        },
      },
      spacing: {
        none: '0',
        xxs: '0.125rem',
        xs: '0.25rem',
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        '2xl': '2rem',
        '3xl': '2.5rem',
        '4xl': '3rem',
      },
      fontSize: {
        header: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        regular: ['0.875rem', { lineHeight: '1.25rem' }],
        label: ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        pill: '9999px',
      },
      fontFamily: {
        sans: ['"Open Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
