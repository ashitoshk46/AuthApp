import generateApp from "./server/generateApp.js";
import appRoutes from "./server/addRoute.js";
import configure from "./server/configure.js";
import runPreChecks from "./server/runPreChecks.js";

const startServer = async () => {
  await configure();
  await runPreChecks();
  const app = generateApp();
  appRoutes(app);
  console.log();
  console.log("<<===============================>>");
  console.log();
  const port = process.env.PORT || 3000;
  app?.listen(port, () => console.log(`Starting server in ${process.env.NODE_ENV} mode on port ${port}`));
}

startServer();