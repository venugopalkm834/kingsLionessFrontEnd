import { Routes } from '@angular/router';
import { userGuard, adminGuard } from './core/core';
const a = () => import('./features/admin/pages');
const b = () => import('./features/admin/pages2');
export const routes: Routes = [
  { path: 'admin/login', loadComponent: () => import('./features/user/auth').then((m) => m.AuthPage), data: { admin: true } },
  { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./features/admin/shell').then((m) => m.AdminShell), children: [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    { path: 'dashboard', loadComponent: () => a().then((m) => m.DashboardPage) },
    { path: 'bookings', loadComponent: () => a().then((m) => m.AdminBookingsPage) },
    { path: 'users', loadComponent: () => a().then((m) => m.AdminUsersPage) },
    { path: 'services', loadComponent: () => a().then((m) => m.AdminServicesPage) },
    { path: 'wallets', loadComponent: () => a().then((m) => m.AdminWalletsPage) },
    { path: 'settings', loadComponent: () => b().then((m) => m.AdminSettingsPage) },
    { path: 'returns', loadComponent: () => b().then((m) => m.AdminReturnsPage) },
    { path: 'reports', loadComponent: () => b().then((m) => m.AdminReportsPage) },
    { path: ':kind', loadComponent: () => b().then((m) => m.AdminListPage) },
  ] },
  { path: '', loadComponent: () => import('./features/user/shell').then((m) => m.UserShell), children: [
    { path: '', pathMatch: 'full', loadComponent: () => import('./features/user/home').then((m) => m.HomePage) },
    { path: 'login', loadComponent: () => import('./features/user/auth').then((m) => m.AuthPage) },
    { path: 'register', loadComponent: () => import('./features/user/auth').then((m) => m.AuthPage), data: { register: true } },
    { path: 'bookings', canActivate: [userGuard], loadComponent: () => import('./features/user/bookings').then((m) => m.BookingsPage) },
    { path: 'wallet', canActivate: [userGuard], loadComponent: () => import('./features/user/wallet').then((m) => m.WalletPage) },
    { path: 'history', canActivate: [userGuard], loadComponent: () => import('./features/user/history').then((m) => m.HistoryPage) },
    { path: 'banks', canActivate: [userGuard], loadComponent: () => import('./features/user/account').then((m) => m.BanksPage) },
    { path: 'referrals', canActivate: [userGuard], loadComponent: () => import('./features/user/account').then((m) => m.ReferralsPage) },
    { path: 'profile', canActivate: [userGuard], loadComponent: () => import('./features/user/account').then((m) => m.ProfilePage) },
    { path: 'notifications', canActivate: [userGuard], loadComponent: () => import('./features/user/account').then((m) => m.NotificationsPage) },
  ] },
  { path: '**', redirectTo: '' },
];
