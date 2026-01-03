export interface WordPressSite {
  id: string;
  name: string;
  url: string;
  rest_url: string;
  mcp_endpoint: string;
  abilities_url: string;
  username: string;
  app_password: string;
  auth: string;
  project_dir: string;
  created_at: number;
  last_used_at: number;
}

export interface DeepLinkPayload {
  url: string;
  site: string;
  token: string;
  name: string;
}
