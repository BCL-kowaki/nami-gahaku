// 管理者ページ用 API クライアント
// sessionStorage に保存された管理者パスワードを x-admin-password ヘッダに付与

import type { UserProfile, Quiz, Announcement } from '@/types';

function getPass(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem('nami-admin-pass') ?? '';
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('x-admin-password', getPass());
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, { ...options, headers });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || '通信エラー');
  }
  return json.data as T;
}

// ユーザー一覧
export async function apiGetUsers(): Promise<UserProfile[]> {
  const data = await request<{ users: UserProfile[] }>('/api/admin/users');
  return data.users;
}
// ユーザー更新
export async function apiUpdateUser(uid: string, data: Partial<UserProfile>): Promise<void> {
  await request('/api/admin/users', {
    method: 'PATCH',
    body: JSON.stringify({ uid, data }),
  });
}
// ユーザー削除
export async function apiDeleteUser(uid: string): Promise<void> {
  await request(`/api/admin/users?uid=${encodeURIComponent(uid)}`, { method: 'DELETE' });
}
// ユーザーのパスワード変更
export async function apiChangeUserPassword(uid: string, newPassword: string): Promise<void> {
  await request('/api/admin/users', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'changePassword', uid, newPassword }),
  });
}
// ユーザーのログインID変更
export async function apiChangeUserLoginId(uid: string, newLoginId: string): Promise<void> {
  await request('/api/admin/users', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'changeLoginId', uid, newLoginId }),
  });
}

// クイズ一覧
export async function apiGetQuizzes(): Promise<Quiz[]> {
  const data = await request<{ quizzes: Quiz[] }>('/api/admin/quizzes');
  return data.quizzes;
}
// クイズのフル編集（画像差し替え対応）
export interface QuizFullUpdatePayload {
  quizId: string;
  answer?: string;
  category?: Quiz['category'];
  dummyChoices?: [string, string, string];
  creatorUid?: string;
  creatorName?: string;
  isOfficial?: boolean;
  imageBase64?: string;
  originalImageBase64?: string;
}
export async function apiUpdateQuizFull(payload: QuizFullUpdatePayload): Promise<void> {
  await request('/api/admin/quiz/update', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// クイズ更新
export async function apiUpdateQuiz(quizId: string, data: Partial<Quiz>): Promise<void> {
  await request('/api/admin/quizzes', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'update', quizId, data }),
  });
}
// クイズ削除
export async function apiDeleteQuiz(quizId: string): Promise<void> {
  await request(`/api/admin/quizzes?quizId=${encodeURIComponent(quizId)}`, { method: 'DELETE' });
}
// マイグレーション
export async function apiMigrateQuizzes(): Promise<number> {
  const data = await request<{ count: number }>('/api/admin/quizzes', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'migrate' }),
  });
  return data.count;
}

// お知らせ一覧
export async function apiGetAnnouncements(): Promise<Announcement[]> {
  const data = await request<{ announcements: Announcement[] }>('/api/admin/announcements');
  return data.announcements;
}
// お知らせ作成
export async function apiCreateAnnouncement(title: string, message: string): Promise<string> {
  const data = await request<{ id: string }>('/api/admin/announcements', {
    method: 'POST',
    body: JSON.stringify({ title, message }),
  });
  return data.id;
}
// お知らせ更新
export async function apiUpdateAnnouncement(id: string, data: Partial<Announcement>): Promise<void> {
  await request('/api/admin/announcements', {
    method: 'PATCH',
    body: JSON.stringify({ id, data }),
  });
}
// お知らせ削除
export async function apiDeleteAnnouncement(id: string): Promise<void> {
  await request(`/api/admin/announcements?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// 管理者設定
export async function apiGetAdminSettings(): Promise<{ adminId: string; adminPassword: string }> {
  const data = await request<{ settings: { adminId: string; adminPassword: string } }>(
    '/api/admin/settings'
  );
  return data.settings;
}
export async function apiUpdateAdminSettings(adminId: string, adminPassword: string): Promise<void> {
  await request('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({ adminId, adminPassword }),
  });
}
