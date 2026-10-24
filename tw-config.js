// Konfigurasi Tailwind CDN — dimuat SETELAH <script src="https://cdn.tailwindcss.com">
tailwind.config = {
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        ink: { DEFAULT: '#1b1b3a', soft: '#5b5f7a' },
        brand: { 50: '#fffbe6', 100: '#fff6d1', 300: '#ffd84d', 500: '#f5b700', 600: '#d49a00' }
      }
    }
  }
};
