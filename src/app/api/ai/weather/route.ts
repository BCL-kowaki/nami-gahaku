// POST /api/ai/weather - OpenWeatherMap天気取得API
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/utils';

interface WeatherData {
  city: string;
  weather: string;
  description: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  icon: string;
}

export async function POST(request: NextRequest) {
  try {
    const { lat, lon } = await request.json();

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return errorResponse('位置情報が必要だぜ！', 'MISSING_LOCATION', 400);
    }

    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    if (!apiKey) {
      return errorResponse('天気APIキーが設定されていません', 'NO_API_KEY', 500);
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&lang=ja&units=metric`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error('OpenWeatherMap APIエラー:', res.status, await res.text());
      return errorResponse('天気情報を取得できませんでした', 'WEATHER_API_ERROR', 502);
    }

    const data = await res.json();

    const weather: WeatherData = {
      city: data.name || '不明',
      weather: data.weather?.[0]?.main || '',
      description: data.weather?.[0]?.description || '',
      temp: Math.round(data.main?.temp ?? 0),
      feelsLike: Math.round(data.main?.feels_like ?? 0),
      humidity: data.main?.humidity ?? 0,
      windSpeed: data.wind?.speed ?? 0,
      icon: data.weather?.[0]?.icon || '',
    };

    return successResponse(weather);
  } catch (err) {
    console.error('天気取得エラー:', err);
    return serverErrorResponse();
  }
}
