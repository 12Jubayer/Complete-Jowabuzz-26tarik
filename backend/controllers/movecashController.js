import {
  buildMoveCashDownloadUrl,
  getMoveCashApkInfo,
  validateMoveCashToken,
} from '../services/movecashLinkService.js';

export async function getMoveCashDownloadPage(req, res) {
  try {
    const token = String(req.params.token || '').trim();
    const link = await validateMoveCashToken(token);

    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or Expired Download Link',
      });
    }

    const apk = await getMoveCashApkInfo();

    return res.json({
      success: true,
      appName: 'JBCash',
      token,
      downloadUrl: buildMoveCashDownloadUrl(token, req),
      agentLoginUrl: '/agent-app?from=movecash',
      agentDashboardUrl: '/agent/dashboard',
      expiresAt: link.expiresAt,
      apk,
      install: {
        pwaManifestUrl: '/movecash-manifest.webmanifest',
        serviceWorkerUrl: '/movecash-sw.js',
        scope: '/',
        startUrl: '/agent-app',
      },
    });
  } catch (error) {
    console.error('MoveCash download page error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load download page' });
  }
}
