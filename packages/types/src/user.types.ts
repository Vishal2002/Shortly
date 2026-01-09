export type UserPlan = 'free' | 'pro' | 'enterprise';

export interface UserData {
  id: string;
  email: string;
  name?: string;
  plan: UserPlan;
  videosProcessed: number;
  videosLimit: number;
  createdAt: Date;
}
