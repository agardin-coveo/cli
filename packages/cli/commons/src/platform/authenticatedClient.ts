import {setGlobalDispatcher, ProxyAgent, FormData, fetch} from 'undici';
import PlatformClient from '@coveo/platform-client';
import {Config, Configuration} from '../config/config';
import {castEnvironmentToPlatformClient} from './environment';
import globalConfig from '../config/globalConfig';
import 'fetch-undici-polyfill';

export class AuthenticatedClient {
  public cfg: Config;
  public constructor() {
    this.cfg = new Config(globalConfig.get().configDir);
  }

  public async isLoggedIn() {
    const {accessToken} = this.cfg.get();
    return accessToken !== undefined;
  }

  public async isExpired() {
    try {
      const c = await this.getClient();
      await c.initialize();
      return false;
    } catch (e) {
      return true;
    }
  }

  public async getClient(overrideConfig?: Partial<Configuration>) {
    const configFromDisk = this.cfg.get();
    const resolvedConfig = {...configFromDisk, ...overrideConfig};
    const globalRequestSettings: Record<string, unknown> = {};
    const proxyServer =
      process.env['https_proxy'] || process.env['HTTPS_PROXY'];
    if (proxyServer) {
      setGlobalDispatcher(new ProxyAgent(proxyServer));
    }
    // TODO: CDX-1407, remove this https://developer.mozilla.org/en-US/docs/Web/API/FormData#browser_compatibility
    if (!Object.keys(global).includes('FormData')) {
      Object.assign(global, {FormData});
    }
    return new PlatformClient({
      globalRequestSettings,
      environment: castEnvironmentToPlatformClient(resolvedConfig.environment),
      region: resolvedConfig.region,
      organizationId: resolvedConfig.organization,
      accessToken: resolvedConfig.accessToken!,
    });
  }

  public async getAllOrgsUserHasAccessTo() {
    const platformClient = await this.getClient();
    return platformClient.organization.list();
  }

  public async getUserHasAccessToOrg(org: string) {
    const orgs = await this.getAllOrgsUserHasAccessTo();
    return orgs.some((o) => o.id === org);
  }

  public async createImpersonateApiKey(name: string, searchHub?: string) {
    const platformClient = await this.getClient();
    return await platformClient.apiKey.create({
      displayName: `cli-${name}`,
      description: 'Generated by the Coveo CLI',
      ...(searchHub && {
        additionalConfiguration: {
          search: {
            enforcedQueryPipelineConfiguration: {
              searchHub,
            },
          },
        },
      }),
      privileges: [
        {targetDomain: 'IMPERSONATE', targetId: '*', owner: 'SEARCH_API'},
      ],
    });
  }

  public async getUsername() {
    const {anonymous, organization} = this.cfg.get();
    if (anonymous) {
      return `api-key@${organization}`;
    }
    const authenticatedClient = new AuthenticatedClient();
    const platformClient = await authenticatedClient.getClient();
    await platformClient.initialize();

    return (await platformClient.user.get()).providerUsername;
  }
}

export enum AuthenticationStatus {
  LOGGED_IN,
  EXPIRED,
  LOGGED_OUT,
}

export async function getAuthenticationStatus() {
  const authenticatedClient = new AuthenticatedClient();

  if (!(await authenticatedClient.isLoggedIn())) {
    return AuthenticationStatus.LOGGED_OUT;
  }

  if (await authenticatedClient.isExpired()) {
    return AuthenticationStatus.EXPIRED;
  }

  return AuthenticationStatus.LOGGED_IN;
}
