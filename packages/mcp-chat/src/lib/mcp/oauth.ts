import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { OAuthServerData } from "@/lib/config";
import { getServerConfig } from "@/lib/config";

const DOMAIN_NAME = process.env.DOMAIN_NAME ?? "http://localhost:3000";
export const OAUTH_REDIRECT_URL = `${DOMAIN_NAME}/oauth/callback`;

// OAuth Client 메타데이터 상수
export const OAUTH_CLIENT_METADATA: OAuthClientMetadata = {
  client_uri: DOMAIN_NAME,
  redirect_uris: [OAUTH_REDIRECT_URL],
  response_types: ["code"],
  grant_types: ["authorization_code", "refresh_token"],
  scope: "profile email",
} as const;

// OAuth provider 팩토리 함수
export function createOAuthProvider(
  serverName: string,
  onRedirect?: (url: URL) => void | Promise<void>,
): FileSystemOAuthClientProvider {
  return new FileSystemOAuthClientProvider(
    serverName,
    OAUTH_REDIRECT_URL,
    {
      client_name: serverName,
      ...OAUTH_CLIENT_METADATA,
    },
    onRedirect ?? (() => {}),
  );
}

export class FileSystemOAuthClientProvider implements OAuthClientProvider {

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
    return getServerConfig().getOAuthServerData(this._serverName);
  }

  private setServerData(data: OAuthServerData): void {
    getServerConfig().setOAuthServerData(this._serverName, data);
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

  saveClientInformation(
    clientInformation: OAuthClientInformationFull,
  ): void | Promise<void> {
    const serverData = this.getServerData();
    serverData.clientInformation = clientInformation;
    console.log("save clientInformation", clientInformation);
    this.setServerData(serverData);
  }

  clientInformation():
    | OAuthClientInformationFull
    | undefined
    | Promise<OAuthClientInformationFull | undefined> {
    const serverData = this.getServerData();
    console.log("load clientInformation", serverData.clientInformation);
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

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    const serverData = this.getServerData();
    serverData.codeVerifier = codeVerifier;
    console.log("save codeVerifier", codeVerifier);
    this.setServerData(serverData);
  }

  async codeVerifier(): Promise<string> {
    const serverData = this.getServerData();
    console.log("load codeVerifier", serverData.codeVerifier);
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
