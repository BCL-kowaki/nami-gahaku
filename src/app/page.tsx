import { redirect } from 'next/navigation';

// ルートページ → ログインにリダイレクト
export default function Home() {
  redirect('/login');
}
