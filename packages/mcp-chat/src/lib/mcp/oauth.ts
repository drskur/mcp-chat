import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { getServerConfig } from "@/lib/config";
import type { OAuthServerData } from "@/lib/config";

export class FileSystemOAuthClientProvider implements OAuthClientProvider {
  private readonly configManager = getServerConfig();

  constructor(
    private readonly _serverName: string,
    private readonly _redirectUrl: string,
    private readonly _clientMetadata: OAuthClientMetadata,
    private readonly _onRedirect: (url: URL) => void | Promise<void>,
  ) {}

  get redirectUrl(): string | URL {
    return this._redirectUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return this._clientMetadata;
  }

  private getServerData(): OAuthServerData {
    return this.configManager.getOAuthServerData(this._serverName);
  }

  private setServerData(data: OAuthServerData): void {
    this.configManager.setOAuthServerData(this._serverName, data);
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
    // authUrl을 저장
    const serverData = this.getServerData();
    serverData.authUrl = authorizationUrl.toString();
    this.setServerData(serverData);
    
    await this._onRedirect(authorizationUrl);
  }

  async getAuthUrl(): Promise<string | undefined> {
    const serverData = this.getServerData();
    return serverData.authUrl;
  }

  async clearAuthUrl(): Promise<void> {
    const serverData = this.getServerData();
    delete serverData.authUrl;
    this.setServerData(serverData);
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
