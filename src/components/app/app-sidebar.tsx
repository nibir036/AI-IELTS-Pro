
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
  LogOut,
} from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirebase } from '@/firebase';
import { Button } from '../ui/button';

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
  const { user, auth } = useFirebase();
  const { setOpenMobile } = useSidebar();

  const handleSignOut = async () => {
    if (auth) {
      await auth.signOut();
    }
  };

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
            <Link href={link.href} onClick={() => setOpenMobile(false)}>
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
      <SidebarFooter className="p-2 flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-md p-2 hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:size-8">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoURL || ''} />
            <AvatarFallback>{user?.displayName?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium">{user?.displayName || 'User'}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0">
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden ml-2">Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
