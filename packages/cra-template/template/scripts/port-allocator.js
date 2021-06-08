const getPort = require('get-port');
const {appendFileSync, truncateSync, existsSync} = require('fs');
const {config} = require('dotenv');
const {EOL} = require('os');
const environment = config();

const preferedWebAppPort = 3000;
const portRangeFallback = [3000, 3999];

const ensureEnvironmentFile = () => {
  if (!existsSync('.env')) {
    throw new Error(
      '.env file not found in the project root. Refer to the README to for more information for more information.'
    );
  }
};

const updateEnvFile = (applicationPort, serverPort) => {
  const env = {
    ...environment.parsed,
    PORT: applicationPort,
    REACT_APP_SERVER_PORT: serverPort,
  };

  truncateSync('.env');
  for (const [key, value] of Object.entries(env)) {
    appendFileSync('.env', `${key}=${value}${EOL}`);
  }
};

const allocatePorts = async () => {
  const applicationPort = await getNextAvailablePorts(
    process.env.PORT || preferedWebAppPort
  );
  const serverPort = await getNextAvailablePorts(
    process.env.REACT_APP_SERVER_PORT
  );
  updateEnvFile(applicationPort, serverPort);
};

const getNextAvailablePorts = async (preferedPort) => {
  if (typeof preferedPort !== 'number') {
    preferedPort = isNaN(parseInt(preferedPort))
      ? null
      : parseInt(preferedPort);
  }

  if (await isPortAvailable(preferedPort)) {
    return preferedPort;
  }
  return await getPort({port: getPort.makeRange(...portRangeFallback)});
};

const isPortAvailable = async (port) => {
  const availablePort = await getPort({port});
  return availablePort === port;
};

const main = () => {
  ensureEnvironmentFile();
  allocatePorts();
};

main();