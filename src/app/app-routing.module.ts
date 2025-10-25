import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { OptionalAuthGuard } from './guards/optional-auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full'
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'provider-detail/:id',
    loadComponent: () => import('./pages/provider-detail/provider-detail.page').then(m => m.ProviderDetailPage),
    canActivate: [OptionalAuthGuard]
  },
  {
    path: 'create-service',
    loadComponent: () => import('./pages/create-service/create-service.page').then(m => m.CreateServicePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'edit-service/:id',
    loadComponent: () => import('./pages/edit-service/edit-service.page').then(m => m.EditServicePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'my-promotions',
    loadComponent: () => import('./pages/my-promotions/my-promotions.page').then(m => m.MyPromotionsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'edit-promotion',
    loadComponent: () => import('./pages/edit-promotion/edit-promotion.page').then(m => m.EditPromotionPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'promotions-nearby',
    loadComponent: () => import('./pages/promotions-nearby/promotions-nearby.page').then(m => m.PromotionsNearbyPage)
  },
  {
    path: 'debug-push',
    loadComponent: () => import('./pages/debug-push/debug-push.page').then(m => m.DebugPushPage)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'profile',
    loadChildren: () => import('./pages/profile/profile.module').then(m => m.ProfilePageModule)
  }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
