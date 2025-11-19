
import { Suspense } from 'react';

export default function ReadingTaskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use suspense to handle loading states within the page component itself
  return <Suspense>{children}</Suspense>;
}

    