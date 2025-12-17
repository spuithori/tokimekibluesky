import { PUBLIC_SCHEDULE_API_URL, PUBLIC_SCHEDULE_SERVICE_DID } from '$env/static/public';
import type { Agent } from '@atproto/api';

const SCHEDULE_API_URL = PUBLIC_SCHEDULE_API_URL;
const SCHEDULE_SERVICE_DID = PUBLIC_SCHEDULE_SERVICE_DID;

export interface ScheduledPost {
  id: string;
  did: string;
  post_data: PostData;
  scheduled_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface PostData {
  text: string;
  facets?: unknown[];
  embed?: unknown;
  langs?: string[];
  labels?: unknown;
  reply?: {
    root: { uri: string; cid: string };
    parent: { uri: string; cid: string };
  };
  images?: ScheduledImage[];
  imagePostId?: string;
  external?: ScheduledExternal;
}

export interface ScheduledExternal {
  uri: string;
  title: string;
  description: string;
  thumbStoragePath?: string;
  thumbMimeType?: string;
}

export interface ScheduledImage {
  storagePath: string;
  alt: string;
  mimeType: string;
  width: number;
  height: number;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getServiceAuthToken(agent: Agent): Promise<string> {
  const response = await agent.com.atproto.server.getServiceAuth({
    aud: SCHEDULE_SERVICE_DID,
  });
  return response.data.token;
}

export async function checkScheduleAuth(agent: Agent): Promise<boolean> {
  try {
    const token = await getServiceAuthToken(agent);
    const response = await fetch(`${SCHEDULE_API_URL}/oauth/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const result: ApiResponse<{ authenticated: boolean }> = await response.json();
    return result.success && result.data?.authenticated === true;
  } catch {
    return false;
  }
}

export async function startScheduleAuth(handle: string): Promise<string | null> {
  try {
    const response = await fetch(`${SCHEDULE_API_URL}/oauth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle }),
    });
    const result: ApiResponse<{ url: string }> = await response.json();
    if (result.success && result.data?.url) {
      return result.data.url;
    }
    return null;
  } catch {
    return null;
  }
}

export async function revokeScheduleAuth(agent: Agent): Promise<boolean> {
  try {
    const token = await getServiceAuthToken(agent);
    const response = await fetch(`${SCHEDULE_API_URL}/oauth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const result: ApiResponse = await response.json();
    return result.success;
  } catch {
    return false;
  }
}

export async function getScheduledPosts(agent: Agent): Promise<ScheduledPost[]> {
  try {
    const token = await getServiceAuthToken(agent);
    const response = await fetch(`${SCHEDULE_API_URL}/posts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const result: ApiResponse<ScheduledPost[]> = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
    return [];
  } catch {
    return [];
  }
}

export async function createScheduledPost(
  agent: Agent,
  postData: PostData,
  scheduledAt: Date
): Promise<ScheduledPost | null> {
  try {
    const token = await getServiceAuthToken(agent);
    const response = await fetch(`${SCHEDULE_API_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        post_data: postData,
        scheduled_at: scheduledAt.toISOString(),
      }),
    });
    const result: ApiResponse<ScheduledPost> = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteScheduledPost(agent: Agent, id: string): Promise<boolean> {
  try {
    const token = await getServiceAuthToken(agent);
    const response = await fetch(`${SCHEDULE_API_URL}/posts/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const result: ApiResponse = await response.json();
    return result.success;
  } catch {
    return false;
  }
}

export interface UploadImageParams {
  file: File;
  postId: string;
  index: number;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadScheduleImage(
  agent: Agent,
  params: UploadImageParams
): Promise<string | null> {
  try {
    const token = await getServiceAuthToken(agent);
    const base64Data = await fileToBase64(params.file);

    const response = await fetch(`${SCHEDULE_API_URL}/images/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        imageData: base64Data,
        mimeType: params.file.type,
        postId: params.postId,
        index: params.index,
      }),
    });
    const result: ApiResponse<{ storagePath: string }> = await response.json();
    if (result.success && result.data?.storagePath) {
      return result.data.storagePath;
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteScheduleImage(agent: Agent, storagePath: string): Promise<boolean> {
  try {
    const token = await getServiceAuthToken(agent);
    const response = await fetch(`${SCHEDULE_API_URL}/images/${encodeURIComponent(storagePath)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const result: ApiResponse = await response.json();
    return result.success;
  } catch {
    return false;
  }
}
