import { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute';

import ProtectedAffiliateRoute from './components/affiliate/ProtectedAffiliateRoute';

import AffiliateLayout from './components/affiliate/AffiliateLayout';

import AgentLayout from './components/agent/AgentLayout';

import ProtectedAgentRoute from './components/agent/ProtectedAgentRoute';

import AdminLayout from './components/admin/AdminLayout';

import { flattenAdminRoutes } from './data/adminSidebarMenu';

import { AdminAuthProvider } from './context/AdminAuthContext';

import { AffiliateAuthProvider } from './context/AffiliateAuthContext';

import { AgentAuthProvider } from './context/AgentAuthContext';

import { AuthProvider } from './context/AuthContext';

import { NotificationProvider } from './context/NotificationContext';

import { SiteBrandingProvider } from './context/SiteBrandingContext';
import RouteLoadingFallback from './components/RouteLoadingFallback';
import AppFallbackRoute from './components/AppFallbackRoute';
import DomainSeparationGuard from './components/DomainSeparationGuard';
import HomeRouteEntry from './components/HomeRouteEntry';
import AppLaunchSplash from './components/AppLaunchSplash';
import { WinnerBoardProvider } from './context/WinnerBoardContext';

import AuthPage from './pages/AuthPage';
import AccountPage from './pages/profile/AccountPage';
import ProtectedUserRoute from './components/profile/ProtectedUserRoute';

import {
  AboutUsPage,
  AdminAffiliateBannersPage,
  AdminAffiliateCommissionPage,
  AdminAffiliateReferralStatsPage,
  AdminAffiliateSettlementSettingsPage,
  AdminAffiliateUsersPage,
  AdminAffiliatesPage,
  AdminAffiliatesReleaseListPage,
  AdminAgentApplicationsPage,
  AdminAgentCommissionPage,
  AdminAgentSettlementSettingsPage,
  AdminAgentsPage,
  AdminAppDownloadPage,
  AdminBonusPage,
  AdminDashboard,
  AdminDepositBalanceBonusPage,
  AdminDepositPage,
  AdminEWalletPage,
  AdminFavouriteSliderPage,
  AdminGameImagesPage,
  AdminGamesPage,
  AdminGeneralSettingPage,
  AdminLiveChatPage,
  AdminLoginPage,
  AdminManagePage,
  AdminMoveCashPage,
  AdminMyReportPage,
  AdminNotificationsPage,
  AdminPendingSettlementPage,
  AdminPlaceholderPage,
  AdminPlayersPage,
  AdminPopupBannerPage,
  AdminProfilePage,
  AdminSiteLogoIconPage,
  AdminSiteNoticePage,
  AdminSitePaymentMethodPage,
  AdminSitePromotionsPage,
  AdminSiteSliderPage,
  AdminSiteSocialLinksPage,
  AdminTransactionsPage,
  AdminVipLevelPage,
  AdminWeeklyCashbackPage,
  AdminWithdrawalsPage,
  AffiliateCommissionPage,
  AffiliateDashboardPage,
  AffiliateLogin,
  AffiliateMarketingPage,
  AffiliatePage,
  AffiliateProfilePage,
  AffiliateReferralsPage,
  AffiliateSettlementsPage,
  AffiliateSignup,
  AffiliateWithdrawPage,
  AgentAppEntry,
  AgentDashboard,
  AgentLogin,
  AgentMarketingLandingPage,
  AgentSettlementsPage,
  AgentTransactions,
  DownloadPage,
  FaqPage,
  HotGamesPage,
  MoveCashDownloadPage,
  PrivacyPolicyPage,
  ProfileBankDetailsPage,
  ProfileBettingRecordPage,
  ProfileBonusPage,
  ProfileChangePasswordPage,
  ProfileComingSoonPage,
  ProfileDepositPage,
  ProfileInboxPage,
  ProfilePersonalInfoPage,
  ProfileRecommendationPage,
  ProfileReferralBonusPage,
  ProfileTransactionsPage,
  ProfileTransferRecordPage,
  ProfileTurnoverPage,
  PromotionPage,
  ResponsibleGamingPage,
  SecurityPage,
  VipPage,
  WithdrawPage,
} from './routes/deferredPages';



const adminRoutes = flattenAdminRoutes().filter(
  (item) => !['dashboard', 'hot-game', 'provider-setting', 'all-game-setting'].includes(item.id),
);



const adminPageMap = {

  'affiliate-users': AdminAffiliateUsersPage,

  'affiliate-commission-settings': AdminAffiliateCommissionPage,

  'affiliate-settlement-settings': AdminAffiliateSettlementSettingsPage,

  'affiliate-referral-statistics': AdminAffiliateReferralStatsPage,

  'affiliate-banners': AdminAffiliateBannersPage,

  transaction: AdminTransactionsPage,

  bonus: AdminBonusPage,

  deposit: AdminDepositPage,

  withdrawals: AdminWithdrawalsPage,

  'affiliates-release-list': AdminAffiliatesReleaseListPage,

  players: AdminPlayersPage,

  agents: AdminAgentsPage,

  'agent-applications': AdminAgentApplicationsPage,

  'e-wallet': AdminEWalletPage,

  affiliates: AdminAffiliatesPage,

  'admin-manage': AdminManagePage,

  notice: AdminSiteNoticePage,

  'payment-method': AdminSitePaymentMethodPage,

  slider: AdminSiteSliderPage,

  'social-links': AdminSiteSocialLinksPage,

  'logo-icon': AdminSiteLogoIconPage,

  'app-download': AdminAppDownloadPage,

  'site-promotions': AdminSitePromotionsPage,

  promotions: AdminSitePromotionsPage,

  'my-report': AdminMyReportPage,

  'pending-settlement': AdminPendingSettlementPage,

  'hot-game': AdminGamesPage,

  'provider-setting': AdminGamesPage,

  'all-game-setting': AdminGamesPage,

  profile: AdminProfilePage,

  'vip-level': AdminVipLevelPage,

  'game-images': AdminGameImagesPage,

  notifications: AdminNotificationsPage,

  'live-chat': AdminLiveChatPage,

  'weekly-cashback': AdminWeeklyCashbackPage,

  'popup-banner': AdminPopupBannerPage,

  'favourite-slider': AdminFavouriteSliderPage,

  'deposit-balance-bonus': AdminDepositBalanceBonusPage,

  'agent-commission': AdminAgentCommissionPage,
  'agent-commission-settlement-settings': AdminAgentSettlementSettingsPage,
  'agent-commission-settings': AdminAgentSettlementSettingsPage,

  'general-setting': AdminGeneralSettingPage,

};



export default function App() {

  return (

    <AuthProvider>

      <NotificationProvider>

      <SiteBrandingProvider>

      <WinnerBoardProvider>

      <AdminAuthProvider>

        <AgentAuthProvider>

          <AffiliateAuthProvider>

            <BrowserRouter>
              <DomainSeparationGuard />
              <AppLaunchSplash>
              <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>

                <Route path="/" element={<HomeRouteEntry />} />

                <Route path="/auth" element={<AuthPage />} />

                <Route path="/profile" element={<AccountPage />} />
                <Route path="/account" element={<Navigate to="/profile" replace />} />
                <Route path="/profile/deposit" element={<ProfileDepositPage />} />
                <Route path="/deposit" element={<Navigate to="/profile/deposit" replace />} />

                <Route element={<ProtectedUserRoute />}>
                  <Route path="/withdraw" element={<WithdrawPage />} />
                  <Route path="/profile/withdraw" element={<Navigate to="/withdraw" replace />} />
                  <Route path="/profile/betting-record" element={<ProfileBettingRecordPage />} />
                  <Route path="/profile/turnover" element={<ProfileTurnoverPage />} />
                  <Route path="/profile/transfer-record" element={<ProfileTransferRecordPage />} />
                  <Route path="/profile/bonus" element={<ProfileBonusPage />} />
                  <Route path="/profile/transactions" element={<ProfileTransactionsPage />} />
                  <Route path="/profile/personal-info" element={<ProfilePersonalInfoPage />} />
                  <Route path="/profile/change-password" element={<ProfileChangePasswordPage />} />
                  <Route path="/profile/bank-details" element={<ProfileBankDetailsPage />} />
                  <Route path="/profile/inbox" element={<ProfileInboxPage />} />
                  <Route path="/profile/recommendation" element={<ProfileRecommendationPage />} />
                  <Route path="/profile/referral-bonus" element={<ProfileReferralBonusPage />} />
                  <Route path="/profile/events/voucher" element={<ProfileComingSoonPage title="Claim voucher" />} />
                  <Route path="/profile/events/awards" element={<ProfileComingSoonPage title="Awards" />} />
                </Route>

                <Route path="/promotions" element={<PromotionPage />} />

                <Route path="/vip" element={<VipPage />} />

                <Route path="/download" element={<DownloadPage />} />

                <Route path="/hot-games" element={<HotGamesPage />} />

                <Route path="/responsible-gaming" element={<ResponsibleGamingPage />} />

                <Route path="/about-us" element={<AboutUsPage />} />

                <Route path="/security" element={<SecurityPage />} />

                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

                <Route path="/faq" element={<FaqPage />} />

                <Route path="/aff" element={<Navigate to="/affiliate" replace />} />

                <Route path="/affiliate" element={<AffiliatePage />} />



                <Route path="/affiliate/login" element={<AffiliateLogin />} />
                <Route path="/affiliate/signup" element={<AffiliateSignup />} />



                <Route element={<ProtectedAffiliateRoute />}>

                  <Route path="/affiliate" element={<AffiliateLayout />}>

                    <Route path="dashboard" element={<AffiliateDashboardPage />} />

                    <Route path="referrals" element={<AffiliateReferralsPage />} />

                    <Route path="commission" element={<AffiliateCommissionPage />} />

                    <Route path="settlements" element={<Navigate to="/affiliate/withdraw" replace />} />

                    <Route path="withdraw" element={<AffiliateWithdrawPage />} />

                    <Route path="marketing" element={<AffiliateMarketingPage />} />

                    <Route path="profile" element={<AffiliateProfilePage />} />

                  </Route>

                </Route>



                <Route path="/agent-app" element={<AgentAppEntry />} />
                <Route path="/jbcash-agent" element={<Navigate to="/agent-app" replace />} />
                <Route path="/home" element={<Navigate to="/" replace />} />

                <Route path="/movecash/download/:token" element={<MoveCashDownloadPage />} />

                <Route path="/agent">
                  <Route index element={<AgentMarketingLandingPage />} />
                  <Route path="login" element={<AgentLogin />} />
                  <Route element={<ProtectedAgentRoute />}>
                    <Route element={<AgentLayout />}>
                      <Route path="dashboard" element={<AgentDashboard />} />
                      <Route path="transactions" element={<AgentTransactions />} />
                      <Route path="settlements" element={<AgentSettlementsPage />} />
                    </Route>
                  </Route>
                </Route>



                <Route path="/admin">
                  <Route path="login" element={<AdminLoginPage />} />

                  <Route element={<ProtectedAdminRoute />}>
                    <Route element={<AdminLayout />}>
                      <Route index element={<Navigate to="/admin/dashboard" replace />} />

                    <Route path="dashboard" element={<AdminDashboard />} />

                    <Route path="transaction" element={<Navigate to="/admin/transactions" replace />} />

                    <Route path="player" element={<Navigate to="/admin/players" replace />} />

                    <Route path="agent" element={<Navigate to="/admin/agents" replace />} />

                    <Route path="affiliate" element={<Navigate to="/admin/affiliate-users" replace />} />

                    <Route path="affiliates" element={<AdminAffiliatesPage />} />

                    <Route path="notice" element={<Navigate to="/admin/site-configuration/notice" replace />} />

                    <Route path="payment-method" element={<Navigate to="/admin/site-configuration/payment-method" replace />} />

                    <Route path="slider" element={<Navigate to="/admin/site-configuration/slider" replace />} />

                    <Route path="social-links" element={<Navigate to="/admin/site-configuration/social-links" replace />} />

                    <Route path="logo-icon" element={<Navigate to="/admin/site-configuration/logo-icon" replace />} />

                    <Route path="site-promotions" element={<Navigate to="/admin/promotions" replace />} />

                    <Route path="site-configuration/promotions" element={<Navigate to="/admin/promotions" replace />} />

                    <Route path="games" element={<AdminGamesPage />} />
                    <Route path="hot-game" element={<Navigate to="/admin/games?tab=hot" replace />} />
                    <Route path="provider-setting" element={<Navigate to="/admin/games?tab=provider" replace />} />
                    <Route path="all-game-setting" element={<Navigate to="/admin/games?tab=all" replace />} />

                    <Route path="site-setting" element={<Navigate to="/admin/general-setting?tab=site" replace />} />
                    <Route path="commission-setting" element={<Navigate to="/admin/general-setting?tab=commission" replace />} />
                    <Route path="chat-setting" element={<Navigate to="/admin/general-setting?tab=chat" replace />} />
                    <Route path="deposit-and-withdraw" element={<Navigate to="/admin/general-setting?tab=deposit-withdraw" replace />} />
                    <Route path="payments-gateway" element={<Navigate to="/admin/general-setting?tab=paymentGateway" replace />} />

                                        <Route path="bonus-turnover" element={<Navigate to="/admin/dashboard" replace />} />

                    <Route
                      path="affiliate-settlement"
                      element={<Navigate to="/admin/pending-settlement" replace />}
                    />
                    <Route
                      path="affiliate-withdraw-requests"
                      element={<Navigate to="/admin/pending-settlement" replace />}
                    />

                    <Route path="agent-commission/settings" element={<AdminAgentSettlementSettingsPage />} />
                    <Route
                      path="agent-commission-settlement-settings"
                      element={<Navigate to="/admin/agent-commission/settings" replace />}
                    />

                    {adminRoutes.map((item) => {

                      const PageComponent = adminPageMap[item.id] || AdminPlaceholderPage;

                      return (

                        <Route

                          key={item.id}

                          path={item.path.replace('/admin/', '')}

                          element={<PageComponent />}

                        />

                      );

                    })}

                    </Route>
                  </Route>
                </Route>

                <Route path="*" element={<AppFallbackRoute />} />

              </Routes>
              </Suspense>
              </AppLaunchSplash>

            </BrowserRouter>

          </AffiliateAuthProvider>

        </AgentAuthProvider>

      </AdminAuthProvider>

      </WinnerBoardProvider>

      </SiteBrandingProvider>

      </NotificationProvider>

    </AuthProvider>

  );

}

