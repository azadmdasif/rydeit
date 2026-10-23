import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

const distDir = path.join(__dirname, 'dist');

// Serve static assets with appropriate caching
app.use(express.static(distDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (filePath.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Clean public routes mapped directly to their pre-rendered static HTML files
const publicRoutes = [
  { route: '/bikes', file: 'bikes/index.html' },
  { route: '/scooters', file: 'scooters/index.html' },
  { route: '/motorcycles', file: 'motorcycles/index.html' },
  { route: '/pickup-kolkata', file: 'pickup-kolkata/index.html' },
  { route: '/outstation-bike-rentals', file: 'outstation-bike-rentals/index.html' },
  { route: '/delivery-bike-rentals', file: 'delivery-bike-rentals/index.html' },
  { route: '/rates', file: 'rates/index.html' },
  { route: '/faqs', file: 'faqs/index.html' },
  { route: '/about', file: 'about/index.html' },
  { route: '/contact', file: 'contact/index.html' },
  { route: '/book', file: 'book/index.html' }
];

publicRoutes.forEach(({ route, file }) => {
  const targetPath = path.join(distDir, file);
  app.get(route, (req, res) => {
    res.sendFile(targetPath, (err) => {
      if (err) res.sendFile(path.join(distDir, 'index.html'));
    });
  });
  app.get(`${route}/`, (req, res) => {
    res.sendFile(targetPath, (err) => {
      if (err) res.sendFile(path.join(distDir, 'index.html'));
    });
  });
});

// Root Route
app.get('/', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

// SPA Fallback for dynamic / admin routes (/login, /my-bookings, /admin/*)
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Rydeit production server running on port ${port}`);
});
