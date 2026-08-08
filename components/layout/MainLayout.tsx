import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:mr-64 min-h-screen">
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
