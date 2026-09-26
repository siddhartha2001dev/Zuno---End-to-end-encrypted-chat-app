import { getStoredToken } from "../utils/token";

const BASE_URL = "http://localhost:4000/api";

export { getStoredToken };

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(
        new CustomEvent("auth:unauthorized", {
          detail: { message: data.error || "Session expired. Please sign in again." },
        })
      );
    }
    throw new Error(data.error || "An error occurred");
  }
  return data;
}

export const api = {
  auth: {
    register: async (input: { name: string; chatId: string; email: string; password: string }) => {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return handleResponse<{
        user: any;
        message: string;
        requiresVerification: boolean;
        emailSent?: boolean;
      }>(res);
    },
    login: async (input: { email: string; password: string }) => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return handleResponse<{ user: any; token: string; accessToken?: string }>(res);
    },
    verifyEmail: async (token: string) => {
      const res = await fetch(`${BASE_URL}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      return handleResponse<{ user: any; token: string; accessToken?: string; message: string }>(res);
    },
    resendVerification: async (email: string) => {
      const res = await fetch(`${BASE_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      return handleResponse<{
        message: string;
        emailSent?: boolean;
      }>(res);
    },
    getMe: async () => {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<{ user: any }>(res);
    },
  },

  users: {
    search: async (q?: string) => {
      const url = q ? `${BASE_URL}/users/search?q=${encodeURIComponent(q)}` : `${BASE_URL}/users/search`;
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      return handleResponse<{ users: any[] }>(res);
    },
    checkChatId: async (chatId: string) => {
      const res = await fetch(`${BASE_URL}/users/check-chat-id?chatId=${encodeURIComponent(chatId)}`, {
        headers: { "Content-Type": "application/json" },
      });
      return handleResponse<{ available: boolean; message: string }>(res);
    },
    updateName: async (name: string) => {
      const res = await fetch(`${BASE_URL}/users/name`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      });
      return handleResponse<{ success: boolean; user: any; message: string }>(res);
    },
    updatePublicKey: async (publicKey: string) => {
      const res = await fetch(`${BASE_URL}/users/public-key`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ publicKey }),
      });
      return handleResponse<{ success: boolean; id: string; publicKey: string }>(res);
    },
    getPublicKey: async (userId: string) => {
      const res = await fetch(`${BASE_URL}/users/${userId}/public-key`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<{ userId: string; publicKey: string | null }>(res);
    },
    uploadAvatar: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      const token = getStoredToken();
      const res = await fetch(`${BASE_URL}/users/avatar`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      return handleResponse<{ success: boolean; avatar: string; user: any }>(res);
    },
    removeAvatar: async () => {
      const res = await fetch(`${BASE_URL}/users/avatar`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      return handleResponse<{ success: boolean; avatar: null; user: any }>(res);
    },
    setAvatarPreset: async (avatar: string) => {
      const res = await fetch(`${BASE_URL}/users/avatar`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ avatar }),
      });
      return handleResponse<{ success: boolean; avatar: string; user: any }>(res);
    },
    deactivateAccount: async () => {
      const res = await fetch(`${BASE_URL}/users/deactivate`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      return handleResponse<{ success: boolean; message: string }>(res);
    },
  },

  upload: {
    media: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const token = getStoredToken();
      const res = await fetch(`${BASE_URL}/upload/media`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      return handleResponse<{
        success: boolean;
        mediaUrl: string;
        fileName: string;
        fileSize: number;
        format: string;
        resourceType: string;
        messageType: "image" | "file";
      }>(res);
    },
  },

  conversations: {
    list: async () => {
      const res = await fetch(`${BASE_URL}/conversations`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<{ conversations: any[] }>(res);
    },
    createDirect: async (participantId: string) => {
      const res = await fetch(`${BASE_URL}/conversations/direct`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ participantId }),
      });
      return handleResponse<{ conversation: any }>(res);
    },
    createGroup: async (name: string, memberIds: string[]) => {
      const res = await fetch(`${BASE_URL}/conversations/group`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, memberIds }),
      });
      return handleResponse<{ conversation: any }>(res);
    },
    getById: async (id: string) => {
      const res = await fetch(`${BASE_URL}/conversations/${id}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<{ conversation: any }>(res);
    },
    delete: async (id: string) => {
      const res = await fetch(`${BASE_URL}/conversations/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      return handleResponse<{ success: boolean; message: string; action: "deleted" | "left" }>(res);
    },
    deleteAll: async () => {
      const res = await fetch(`${BASE_URL}/conversations/all`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      return handleResponse<{ success: boolean; message: string; deletedCount: number }>(res);
    },
  },

  messages: {
    getHistory: async (conversationId: string, limit = 50, cursor?: string) => {
      const params = new URLSearchParams();
      if (limit) params.set("limit", limit.toString());
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`${BASE_URL}/conversations/${conversationId}/messages?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      return handleResponse<{ messages: any[] }>(res);
    },
    markRead: async (conversationId: string) => {
      const res = await fetch(`${BASE_URL}/conversations/${conversationId}/read`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      return handleResponse<{ success: boolean; readMessageIds: string[] }>(res);
    },
  },
};
