// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',  // Accessible via LAN (or specify your IP address)
    port: 3000,       // Change to your desired port
  },
});
