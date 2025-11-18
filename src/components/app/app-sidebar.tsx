'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PenSquare,
  Speech,
  BookOpen,
  Headphones,
  FileText,
  GraduationCap,
  BookMarked,
} from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/grammar', label: 'Grammar', icon: PenSquare },
  { href: '/vocabulary', label: 'Vocabulary', icon: BookMarked },
  { href: '/writing', label: 'Writing', icon: FileText },
  { href: '/speaking', label: 'Speaking', icon: Speech },
  { href: '/reading', label: 'Reading', icon: BookOpen },
  { href: '/listening', label: 'Listening', icon: Headphones },
  { href: '/mock-tests', label: 'Mock Tests', icon: GraduationCap },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="h-16 justify-center">
        <Link href="/dashboard" className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-8 w-8 text-primary"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8v-2h3V7l4 4-4 4z" />
          </svg>
          <span className="text-xl font-semibold group-data-[collapsible=icon]:hidden">
            AI IELTS Pro
          </span>
        </Link>
      </SidebarHeader>
      <SidebarMenu className="flex-1 p-2">
        {links.map((link) => (
          <SidebarMenuItem key={link.href}>
            <Link href={link.href} legacyBehavior passHref>
              <SidebarMenuButton
                isActive={pathname.startsWith(link.href)}
                tooltip={{ children: link.label }}
              >
                <link.icon />
                <span>{link.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <SidebarFooter className="p-2">
        <div className="flex items-center gap-3 rounded-md p-2 hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:size-8">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://picsum.photos/seed/avatar/40/40" />
            <AvatarFallback>S</AvatarFallback>
          </Avatar>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium">Sample User</p>
            <p className="text-xs text-muted-foreground">student@example.com</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
