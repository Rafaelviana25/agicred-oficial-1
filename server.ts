import app from './server/app.js';
import cron from 'node-cron';
import { checkAndSendOverdueNotifications, checkExpiredTrials } from './server/app.js';

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Schedule the cron job for 8:00 AM and 8:00 PM (20:00)
  cron.schedule('0 8,20 * * *', checkAndSendOverdueNotifications);

  // Run trial check every hour
  cron.schedule('0 * * * *', checkExpiredTrials);

  // Vite Middleware
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('Failed to start Vite server:', e);
    }
  } else {
    // Serve static files in production
    import('express').then(express => {
      app.use(express.default.static('dist'));
      
      // SPA fallback
      app.get(/.*/, (req, res) => {
        res.sendFile(process.cwd() + '/dist/index.html');
      });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
