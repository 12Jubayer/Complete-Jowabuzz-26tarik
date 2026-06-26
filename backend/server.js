import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { connectDatabase } from './config/db.js';
import { ensureDefaultAdmin } from './controllers/adminAuthController.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import adminAffiliateRoutes from './routes/adminAffiliateRoutes.js';
import adminAffiliateSettlementPeriodRoutes from './routes/adminAffiliateSettlementPeriodRoutes.js';
import adminDashboardRoutes from './routes/adminDashboardRoutes.js';
import adminTransactionsRoutes from './routes/adminTransactionsRoutes.js';
import adminBonusRoutes from './routes/adminBonusRoutes.js';
import adminDepositRoutes from './routes/adminDepositRoutes.js';
import adminWithdrawRoutes from './routes/adminWithdrawRoutes.js';
import adminAffiliateReleaseRoutes from './routes/adminAffiliateReleaseRoutes.js';
import adminPlayerRoutes from './routes/adminPlayerRoutes.js';
import adminAgentRoutes from './routes/adminAgentRoutes.js';
import adminEWalletRoutes from './routes/adminEWalletRoutes.js';
import adminAffiliateUserRoutes from './routes/adminAffiliateUserRoutes.js';
import adminManageRoutes from './routes/adminManageRoutes.js';
import adminSiteConfigRoutes from './routes/adminSiteConfigRoutes.js';
import adminUploadRoutes from './routes/adminUploadRoutes.js';
import adminPromotionRoutes from './routes/adminPromotionRoutes.js';
import adminReportRoutes from './routes/adminReportRoutes.js';
import adminGameImageRoutes from './routes/adminGameImageRoutes.js';
import adminGameRoutes from './routes/adminGameRoutes.js';
import adminProfileRoutes from './routes/adminProfileRoutes.js';
import adminVipLevelRoutes from './routes/adminVipLevelRoutes.js';
import publicSiteConfigRoutes from './routes/publicSiteConfigRoutes.js';
import publicVipLevelRoutes from './routes/publicVipLevelRoutes.js';
import publicWinnerBoardRoutes from './routes/publicWinnerBoardRoutes.js';
import publicSiteRoutes from './routes/publicSiteRoutes.js';
import publicFavouriteSliderRoutes from './routes/publicFavouriteSliderRoutes.js';
import publicGameProviderRoutes from './routes/publicGameProviderRoutes.js';
import publicSiteGamesRoutes from './routes/publicSiteGamesRoutes.js';
import publicPromotionRoutes from './routes/publicPromotionRoutes.js';
import { migrateAdminPlayerSchema } from './services/adminPlayerService.js';
import { migrateAdminAgentSchema } from './services/adminAgentService.js';
import { migrateAdminEWalletSchema } from './services/adminEWalletService.js';
import { migrateAdminAffiliateUserSchema } from './services/adminAffiliateUserService.js';
import { migrateAdminManageSchema } from './services/adminManageService.js';
import { migrateSiteSettingsSchema } from './services/siteSettingsService.js';
import { migrateAppDownloadSchema } from './services/appDownloadService.js';
import adminAppDownloadRoutes from './routes/adminAppDownloadRoutes.js';
import { migratePaymentMethodsSchema } from './services/paymentMethodsService.js';
import { migrateHomepageSlidersSchema } from './services/homepageSlidersService.js';
import { migratePromotionsSchema } from './services/promotionsService.js';
import affiliateAuthRoutes from './routes/affiliateAuthRoutes.js';
import affiliateRoutes from './routes/affiliateRoutes.js';
import agentAuthRoutes from './routes/agentAuthRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import { migrateGameWalletSchema } from './services/gameWalletService.js';
import { migrateGameCatalogSchema } from './services/gameCatalogService.js';
import { migrateUserProfileSchema } from './services/userWalletService.js';
import { migrateVipLevelsSchema } from './services/vipLevelService.js';
import { migrateWinnerBoardSchema } from './services/winnerBoardService.js';
import { ensureDemoAgent } from './seed/seedAgent.js';
import { ensureDemoPlayer } from './seed/seedDemoPlayer.js';
import { ensureDemoAffiliateApproved } from './seed/seedAffiliateDemo.js';
import { migrateAgentSchema } from './seed/migrateAgentSchema.js';
import { migrateAgentTransactionsSchema } from './seed/migrateAgentTransactions.js';
import { migrateAgentOtpsSchema } from './seed/migrateAgentOtps.js';
import { migratePlayerAgentWithdrawSchema } from './seed/migratePlayerAgentWithdraw.js';
import adminAgentApplicationRoutes from './routes/adminAgentApplicationRoutes.js';
import agentApplicationRoutes from './routes/agentApplicationRoutes.js';
import { migrateAgentApplicationsSchema } from './services/agentApplicationService.js';
import adminNotificationRoutes from './routes/adminNotificationRoutes.js';
import publicNotificationRoutes from './routes/publicNotificationRoutes.js';
import adminLiveChatRoutes from './routes/adminLiveChatRoutes.js';
import adminWeeklyCashbackRoutes from './routes/adminWeeklyCashbackRoutes.js';
import adminPopupBannerRoutes from './routes/adminPopupBannerRoutes.js';
import adminFavouriteSliderRoutes from './routes/adminFavouriteSliderRoutes.js';
import adminBonusTurnoverRoutes from './routes/adminBonusTurnoverRoutes.js';
import adminBonusProgressRoutes from './routes/adminBonusProgressRoutes.js';
import adminDepositBonusRoutes from './routes/adminDepositBonusRoutes.js';
import adminAgentCommissionRoutes from './routes/adminAgentCommissionRoutes.js';
import adminGeneralSettingsRoutes from './routes/adminGeneralSettingsRoutes.js';
import adminCommissionSettingsRoutes from './routes/adminCommissionSettingsRoutes.js';
import adminGamingApiSettingsRoutes from './routes/adminGamingApiSettingsRoutes.js';
import adminSmsSettingsRoutes from './routes/adminSmsSettingsRoutes.js';
import gamingWebhookRoutes from './routes/gamingWebhookRoutes.js';
import oracleGamingRoutes from './routes/oracleGamingRoutes.js';
import softapiRoutes from './routes/softapiRoutes.js';
import hmkRoutes from './routes/hmkRoutes.js';
import { migrateHmkSchema, isOracleDisabled } from './services/hmkApiService.js';
import publicLiveChatRoutes from './routes/publicLiveChatRoutes.js';
import { migrateNotificationsSchema } from './services/notificationService.js';
import { migrateLiveChatSchema } from './services/liveChatService.js';
import { migrateChatFaqSchema } from './services/chatFaqService.js';
import { migrateMoveCashSchema } from './services/movecashLinkService.js';
import movecashPublicRoutes from './routes/movecashRoutes.js';
import adminMoveCashRoutes from './routes/adminMoveCashRoutes.js';
import { chatFaqPublicRoutes, chatFaqAdminRoutes } from './routes/chatFaqRoutes.js';
import { migrateAffiliateSchema } from './services/affiliateService.js';
import { migrateAffiliateBalanceSchema } from './services/affiliateBalanceService.js';
import { migrateAffiliateSettlementUserSchema } from './services/affiliateSettlementUserService.js';
import { migrateSettlementPeriodSchema } from './services/affiliateSettlementPeriodService.js';
import { migrateCommissionPeriodSchema } from './services/affiliateCommissionPeriodService.js';
import { startAffiliateSettlementCron } from './jobs/affiliateSettlementCron.js';
import { startWeeklyCashbackCron } from './jobs/weeklyCashbackCron.js';
import { migrateWeeklyCashbackSchema } from './services/weeklyCashbackService.js';
import { migratePopupBannersSchema } from './services/popupBannerService.js';
import { migrateFavouriteSlidersSchema } from './services/favouriteSlidersService.js';
import { migrateBonusTurnoverSchema } from './services/bonusTurnoverService.js';
import { migrateBonusUserProgressSchema } from './services/bonusUserProgressService.js';
import { migrateDepositBonusSchema } from './services/depositBonusService.js';
import { migrateAgentCommissionSchema } from './services/agentCommissionService.js';
import { migrateAgentCommissionSettlementSchema } from './services/agentCommissionSettlementService.js';
import { startAgentCommissionSettlementScheduler } from './jobs/agentSettlementCron.js';
import { migrateGeneralSettingsSchema } from './services/generalSettingsService.js';
import { migrateCommissionSettingsSchema } from './services/commissionSettingsService.js';
import { migrateGamingApiSettingsSchema } from './services/gamingApiSettingsService.js';
import { migrateGamingGatewaySchema } from './services/gamingGatewayService.js';
import { migrateSoftApiSchema } from './services/softapiService.js';
import { migrateWithdrawChannelSchema } from './services/withdrawChannelService.js';
import { migrateSmsApiSettingsSchema } from './services/smsApiSettingsService.js';
import { initLiveChatSocket } from './socket/liveChatSocket.js';
import { captureOracleCallbackRawBody } from './utils/oracleCallbackRequestDebug.js';
import { captureWinypayCallbackRawBody } from './utils/winypayCallbackRawBody.js';
import winypayRoutes from './routes/winypayRoutes.js';
import { migrateWinypaySchema } from './services/winypayService.js';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = http.createServer(app);
const PORT = Number(process.env.PORT || 3001);

app.use((req, res, next) => {
  const logLine = `[${new Date().toISOString()}] ${req.method} ${req.url} Host: ${req.headers.host} IP: ${req.headers['x-forwarded-for'] || req.ip}\n`;
  console.log(`[REQUEST_LOG] ${req.method} ${req.url} Host: ${req.headers.host}`);
  try {
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    fs.appendFileSync(path.join(logsDir, 'all-requests.log'), logLine, 'utf8');
  } catch (err) {
    console.error('Failed to write to global request log:', err.message);
  }
  next();
});

function capturePaymentCallbackRawBody(req, res, buf) {
  captureOracleCallbackRawBody(req, res, buf);
  captureWinypayCallbackRawBody(req, res, buf);
}

app.use(cors());
app.use(express.json({ verify: capturePaymentCallbackRawBody }));
app.use(express.urlencoded({ extended: true, verify: capturePaymentCallbackRawBody }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'jowabuzz-api' });
});

app.use('/api', publicSiteConfigRoutes);
app.use('/api', publicSiteRoutes);
app.use('/api', publicSiteGamesRoutes);
app.use('/api', publicPromotionRoutes);
app.use('/api', publicNotificationRoutes);
app.use('/api', publicLiveChatRoutes);
app.use('/api/chat', chatFaqPublicRoutes);
app.use('/api/movecash', movecashPublicRoutes);
app.use('/api', publicVipLevelRoutes);
app.use('/api', publicWinnerBoardRoutes);
app.use('/api/public', publicFavouriteSliderRoutes);
app.use('/api/public', publicGameProviderRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminDashboardRoutes);
app.use('/api/admin', adminTransactionsRoutes);
app.use('/api/admin', adminBonusRoutes);
app.use('/api/admin', adminDepositRoutes);
app.use('/api/admin', adminWithdrawRoutes);
app.use('/api/admin', adminAffiliateReleaseRoutes);
app.use('/api/admin', adminAffiliateRoutes);
app.use('/api/admin', adminAffiliateSettlementPeriodRoutes);
app.use('/api/admin', adminPlayerRoutes);
app.use('/api/admin', adminAgentRoutes);
app.use('/api/admin', adminEWalletRoutes);
app.use('/api/admin', adminAffiliateUserRoutes);
app.use('/api/admin', adminManageRoutes);
app.use('/api/admin', adminSiteConfigRoutes);
app.use('/api/admin/site-config', adminAppDownloadRoutes);
app.use('/api/admin', adminUploadRoutes);
app.use('/api/admin', adminPromotionRoutes);
app.use('/api/admin', adminReportRoutes);
app.use('/api/admin', adminGameRoutes);
app.use('/api/admin', adminGameImageRoutes);
app.use('/api/admin', adminProfileRoutes);
app.use('/api/admin', adminVipLevelRoutes);
app.use('/api/admin', adminNotificationRoutes);
app.use('/api/admin', adminLiveChatRoutes);
app.use('/api/admin', chatFaqAdminRoutes);
app.use('/api/admin/movecash', adminMoveCashRoutes);
app.use('/api/admin', adminWeeklyCashbackRoutes);
app.use('/api/admin', adminPopupBannerRoutes);
app.use('/api/admin', adminFavouriteSliderRoutes);
app.use('/api/admin', adminBonusTurnoverRoutes);
app.use('/api/admin', adminBonusProgressRoutes);
app.use('/api/admin', adminAgentCommissionRoutes);
app.use('/api/admin', adminDepositBonusRoutes);
app.use('/api/admin', adminGeneralSettingsRoutes);
app.use('/api/admin', adminCommissionSettingsRoutes);
app.use('/api/admin', adminGamingApiSettingsRoutes);
app.use('/api/admin', adminSmsSettingsRoutes);
app.use('/api', gamingWebhookRoutes);
if (isOracleDisabled()) {
  const oracleDisabledPaths = [
    '/oracle/callback',
    '/oracle/refund',
    '/oracle/callback/info',
    '/oracle/debug-session',
    '/wallet/callback',
    '/gaming/callback',
    '/seamless/callback',
    '/getbalance',
    '/balance',
  ];
  for (const routePath of oracleDisabledPaths) {
    app.all(`/api${routePath}`, (_req, res) => {
      res.status(410).json({ error: 'Oracle gaming API is disabled. HMK seamless is active.' });
    });
  }
} else {
  app.use('/api', oracleGamingRoutes);
}
app.use('/api', softapiRoutes);
app.use('/api', hmkRoutes);
app.use('/api', winypayRoutes);
app.use('/api', agentApplicationRoutes);
app.use('/api/admin', adminAgentApplicationRoutes);
app.use('/api/agent', agentAuthRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/affiliate', affiliateAuthRoutes);
app.use('/api/affiliate', affiliateRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({
    error: `API route not found: ${req.method} ${req.originalUrl}. Restart the server after updates.`,
  });
});

let clientDist = path.join(__dirname, '..', 'frontend', 'dist');
if (!fs.existsSync(path.join(clientDist, 'index.html'))) {
  clientDist = path.join(__dirname, '..', 'frontend');
}
const hasClientBuild = fs.existsSync(path.join(clientDist, 'index.html'));


function resolveJowabuzzApkPath() {
  const candidates = [
    path.join(__dirname, '..', 'frontend', 'dist', 'downloads', 'jowabuzz-app.apk'),
    path.join(__dirname, '..', 'frontend', 'public', 'downloads', 'jowabuzz-app.apk'),
    path.join(__dirname, 'uploads', 'app-download', 'jowabuzz-app.apk'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function serveJowabuzzAppApk(req, res) {
  const apkPath = resolveJowabuzzApkPath();
  if (!apkPath) {
    return res.status(404).json({ success: false, error: 'APK not found' });
  }
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="jowabuzz-app.apk"');
  return res.sendFile(apkPath);
}

app.get('/downloads/jowabuzz-app.apk', serveJowabuzzAppApk);
app.head('/downloads/jowabuzz-app.apk', (req, res) => {
  const apkPath = resolveJowabuzzApkPath();
  if (!apkPath) return res.status(404).end();
  const stats = fs.statSync(apkPath);
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Length', String(stats.size));
  return res.status(200).end();
});

if (hasClientBuild) {
  app.use(express.static(clientDist, {
    maxAge: '365d',
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  }));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api')
      || req.path.startsWith('/uploads')
      || req.path.startsWith('/socket.io')
      || req.path.startsWith('/downloads/')
    ) {
      return next();
    }
    return res.sendFile(path.join(clientDist, 'index.html'), {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  });
}

async function startServer() {
  try {
    await connectDatabase();
    await migrateAgentSchema();
    await migrateAgentTransactionsSchema();
    await migrateAgentOtpsSchema();
    await migratePlayerAgentWithdrawSchema();
    await migrateAgentApplicationsSchema();
    await migrateAffiliateSchema();
    await migrateAffiliateBalanceSchema();
    await migrateAffiliateSettlementUserSchema();
    await migrateSettlementPeriodSchema();
    await migrateCommissionPeriodSchema();
    await migrateUserProfileSchema();
    await migrateVipLevelsSchema();
    await migrateWinnerBoardSchema();
    await migrateAdminPlayerSchema();
    await migrateAdminAgentSchema();
    await migrateAdminEWalletSchema();
    await migrateAdminAffiliateUserSchema();
    await migrateAdminManageSchema();
    await migrateSiteSettingsSchema();
    await migrateAppDownloadSchema();
    await migratePaymentMethodsSchema();
    await migrateHomepageSlidersSchema();
    await migratePromotionsSchema();
    await migrateGameWalletSchema();
    await migrateGameCatalogSchema();
    await migrateNotificationsSchema();
    await migrateLiveChatSchema();
    await migrateChatFaqSchema();
    await migrateMoveCashSchema();
    await migrateWeeklyCashbackSchema();
    await migratePopupBannersSchema();
    await migrateFavouriteSlidersSchema();
    await migrateBonusTurnoverSchema();
    await migrateBonusUserProgressSchema();
    await migrateDepositBonusSchema();
    await migrateGeneralSettingsSchema();
    await migrateAgentCommissionSchema();
    await migrateCommissionSettingsSchema();
    await migrateGamingApiSettingsSchema();
    await migrateGamingGatewaySchema();
    await migrateSoftApiSchema();
    await migrateHmkSchema();
    await migrateWithdrawChannelSchema();
    await migrateWinypaySchema();
    await migrateSmsApiSettingsSchema();
    await migrateAgentCommissionSettlementSchema();
    await ensureDefaultAdmin();
    await ensureDemoAgent();
    await ensureDemoPlayer();
    await ensureDemoAffiliateApproved();

    initLiveChatSocket(httpServer);
    startAgentCommissionSettlementScheduler();

    startAffiliateSettlementCron();
    startWeeklyCashbackCron();

    httpServer.listen(PORT, () => {
      console.log(`Jowabuzz API running on http://localhost:${PORT}`);
      if (hasClientBuild) {
        console.log(`Jowabuzz site live on http://localhost:${PORT}`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
