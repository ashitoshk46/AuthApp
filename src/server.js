
import configure from "./server/configure.js";
import generateApp from "./server/generateApp.js";
import addAppRoutes from "./server/addAppRoutes.js";
import runPreChecks from "./server/runPreChecks.js";

const startServer = async () => {

  await configure();

  if (process.env.LOADER != 'vercel')
    await runPreChecks();

  const app = generateApp();
  addAppRoutes(app);

  console.log();
  console.log("<<===============================>>");
  console.log();

  const port = process.env.PORT || 3000;
  if (process.env.LOADER != 'vercel')
    app?.listen(port, () => console.log(`Starting server in ${process.env.NODE_ENV} mode on port ${port}`));

  process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    process.exit(0);
  });

  return app;
}

const app = await startServer();

export default app;