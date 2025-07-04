import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import Conf from "conf";

interface OAuthServerData {
  tokens?: OAuthTokens;
  codeVerifier?: string;
  clientInformation?: OAuthClientInformationFull;
}

export class FileSystemOAuthClientProvider implements OAuthClientProvider {
  private readonly store: Conf;

  constructor(
    private readonly _serverName: string,
    private readonly _redirectUrl: string,
    private readonly _clientMetadata: OAuthClientMetadata,
    private readonly _onRedirect: (url: URL) => void | Promise<void>,
  ) {
    this.store = new Conf({
      projectName: "mcp-chat",
      configName: "oauth-tokens",
    });
  }

  get redirectUrl(): string | URL {
    return this._redirectUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return this._clientMetadata;
  }

  private getServerData(): OAuthServerData {
    return this.store.get(this._serverName, {}) as OAuthServerData;
  }

  private setServerData(data: OAuthServerData): void {
    this.store.set(this._serverName, data);
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const serverData = this.getServerData();
    return serverData.tokens;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const serverData = this.getServerData();
    serverData.tokens = tokens;
    this.setServerData(serverData);
  }

  saveClientInformation(clientInformation: OAuthClientInformationFull): void | Promise<void> {
    const serverData = this.getServerData();
    serverData.clientInformation = clientInformation;
    this.setServerData(serverData);
  }

  clientInformation():
    | OAuthClientInformationFull
    | undefined
    | Promise<OAuthClientInformationFull | undefined> {
    const serverData = this.getServerData();
    return serverData.clientInformation;
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    await this._onRedirect(authorizationUrl);
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    const serverData = this.getServerData();
    serverData.codeVerifier = codeVerifier;
    this.setServerData(serverData);
  }

  async codeVerifier(): Promise<string> {
    const serverData = this.getServerData();
    return serverData.codeVerifier ?? "";
  }

  validateResourceURL(
    serverUrl: string | URL,
    resource?: string,
  ): Promise<URL | undefined> {
    const serverUrlObj: URL =
      typeof serverUrl === "string" ? new URL(serverUrl) : serverUrl;

    if (!resource) {
      return Promise.resolve(serverUrlObj);
    }

    try {
      const resourceUrlObj = new URL(resource);

      if (
        resourceUrlObj.hostname === serverUrlObj.hostname ||
        resourceUrlObj.hostname.endsWith(`.${serverUrlObj.host}`)
      ) {
        return Promise.resolve(resourceUrlObj);
      }
    } catch {
      return Promise.resolve(serverUrlObj);
    }

    return Promise.resolve(serverUrlObj);
  }
}
