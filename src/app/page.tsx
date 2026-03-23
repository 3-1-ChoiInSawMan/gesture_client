import Link from 'next/link';

export default function Home(){
  return(
    <div className="min-w-screen min-h-screen flex flex-col justify-center items-center">
      <h1><Link href="/auth/login">로그인</Link></h1>
      <h1><Link href="/auth/signup">회원가입</Link></h1>
    </div>
  );
}