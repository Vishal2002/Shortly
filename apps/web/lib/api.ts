
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      //@ts-ignore
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async register(email: string, password: string, name?: string) {
    return this.request<{ accessToken: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ accessToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Jobs endpoints
  async createJob(youtubeUrl: string, options?: any) {
    return this.request<any>('/jobs', {
      method: 'POST',
      body: JSON.stringify({ youtubeUrl, options }),
    });
  }

  async getJobs() {
    return this.request<any[]>('/jobs', {
      method: 'GET',
    });
  }

  async getJob(id: string) {
    return this.request<any>(`/jobs/${id}`, {
      method: 'GET',
    });
  }

  // Health check
  async health() {
    return this.request<{ status: string }>('/health');
  }
}

export const api = new ApiClient();