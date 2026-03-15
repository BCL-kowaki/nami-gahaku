// API共通レスポンスヘルパー（改善案8）
import { NextResponse } from 'next/server';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types';

// 成功レスポンス
export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true as const, data }, { status });
}

// エラーレスポンス
export function errorResponse(
  error: string,
  code: string,
  status = 400,
  details?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ error, code, details }, { status });
}

// 認証エラー
export function unauthorizedResponse(): NextResponse<ApiErrorResponse> {
  return errorResponse('認証が必要です', 'UNAUTHORIZED', 401);
}

// サーバーエラー
export function serverErrorResponse(details?: string): NextResponse<ApiErrorResponse> {
  return errorResponse('サーバーエラーが発生しました', 'INTERNAL_ERROR', 500, details);
}
