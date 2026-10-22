import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'HomeForce • Ayon Family',description:'আমাদের বাসা, আমাদের দায়িত্ব। ছয়জনের কাজ ও হিসাব একসঙ্গে।',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg'},appleWebApp:{capable:true,title:'HomeForce',statusBarStyle:'black-translucent'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="bn"><body>{children}</body></html>}
