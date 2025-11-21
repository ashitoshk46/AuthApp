import helmet from 'helmet';

const applySecurityHeaders = (app) => {
  app.use(helmet({
    // Disable CSP since it's not needed for API-only
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false, // Avoid issues with some API clients
  }));

  // Additional fine-tuned headers
  app.use(helmet.hidePoweredBy()); // Remove X-Powered-By header
  app.use(helmet.frameguard({ action: 'deny' })); // Prevent clickjacking
  app.use(helmet.xssFilter()); // Basic XSS protection
  app.use(helmet.noSniff()); // Prevent MIME sniffing
  app.use(helmet.hsts({
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  })); // Enforce HTTPS
};

export default applySecurityHeaders;