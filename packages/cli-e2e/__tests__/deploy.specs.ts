import {join} from 'path';
import PlatformClient from '@coveo/platform-client';
import {getPlatformClient} from '../utils/platform';
import {getTestOrg} from '../utils/testOrgSetup';
import {ProcessManager} from '../utils/processManager';
import {getConfig, getUIProjectPath} from '../utils/cli';
import {copySync, readJsonSync, writeJsonSync} from 'fs-extra';
import {Terminal} from '../utils/terminal/terminal';

describe('ui:deploy', () => {
  let platformClient: PlatformClient;
  let testOrgId = '';
  let pageName = '';
  const deployProject = 'deploy-project';
  const {accessToken} = getConfig();
  const deployProjectPath = join(getUIProjectPath(), deployProject);
  let processManager: ProcessManager;
  const defaultTimeout = 5 * 60e3;
  let stdout: string;
  const stdoutListener = (chunk: string) => {
    stdout += chunk;
  };

  const addPageNameToConfig = (prepend: string) => {
    const configPath = join(deployProjectPath, 'coveo.deploy.json');
    const config = readJsonSync(configPath);
    pageName = `${prepend}-hosted-page-${process.env.TEST_RUN_ID}`;
    writeJsonSync(configPath, {...config, name: pageName});
  };

  const deploy = async (id?: string) => {
    const args: string[] = [
      process.env.CLI_EXEC_PATH!,
      'ui:deploy',
      `-o=${testOrgId}`,
    ];
    if (id) {
      args.push(`-p=${id}`);
    }
    const terminal = new Terminal(
      'node',
      args,
      {cwd: deployProjectPath},
      processManager,
      'ui-deploy'
    );
    terminal.orchestrator.process.stdout.on('data', stdoutListener);
    await terminal
      .when('exit')
      .on('process')
      .do((proc) => {
        proc.stdout.off('data', stdoutListener);
      })
      .once();
  };

  beforeAll(async () => {
    testOrgId = await getTestOrg();
    copySync(deployProject, deployProjectPath);
    platformClient = getPlatformClient(testOrgId, accessToken);
    processManager = new ProcessManager();
  }, defaultTimeout);

  beforeEach(() => {
    stdout = '';
  });

  afterAll(async () => {
    await processManager.killAllProcesses();
  });

  describe('happy paths', () => {
    it(
      'creates a new hosted page',
      async () => {
        addPageNameToConfig('create');
        await deploy();

        const regex = /Hosted Page creation successful with id "(.+)"/g;
        expect(stdout).toMatch(regex);
        const matches = regex.exec(stdout)!;
        const hostedPageId = matches[1];

        const hostedPage = await platformClient.hostedPages.get(hostedPageId);
        expect(hostedPage).toBeTruthy();
      },
      defaultTimeout
    );

    it(
      'updates an existing hosted page when the pageId flag is set',
      async () => {
        addPageNameToConfig('update');
        const {id} = await platformClient.hostedPages.create({
          html: 'somehtml',
          name: `new-hosted-page-${process.env.TEST_RUN_ID}`,
        });

        await deploy(id);

        const regex = /Hosted Page update successful with id "(.+)"/g;
        expect(stdout).toMatch(regex);
        const matches = regex.exec(stdout)!;
        const hostedPageId = matches[1];

        const hostedPage = await platformClient.hostedPages.get(hostedPageId);
        expect(hostedPage.name).toEqual(pageName);
      },
      defaultTimeout
    );
  });
});