import {
  getNoticeSetting,
  normalizeNoticeSetting,
  saveNoticeSetting,
  getSocialLinksSetting,
  normalizeSocialLinks,
  saveSocialLinksSetting,
  getBrandingSetting,
  normalizeBranding,
  saveBrandingSetting,
} from '../services/siteSettingsService.js';
import {
  listActivePaymentMethods,
  listAllPaymentMethods,
  savePaymentMethods,
} from '../services/paymentMethodsService.js';
import {
  listActiveHomepageSliders,
  listAllHomepageSliders,
  saveHomepageSliders,
} from '../services/homepageSlidersService.js';

export async function getPublicNoticeConfig(req, res) {
  try {
    const notice = await getNoticeSetting();
    return res.json(notice);
  } catch (error) {
    console.error('Get public notice config error:', error);
    return res.status(500).json({ error: 'Failed to load notice settings' });
  }
}

export async function getAdminNoticeConfig(req, res) {
  try {
    const notice = await getNoticeSetting();
    return res.json(notice);
  } catch (error) {
    console.error('Get admin notice config error:', error);
    return res.status(500).json({ error: 'Failed to load notice settings' });
  }
}

export async function updateAdminNoticeConfig(req, res) {
  try {
    const enabled = req.body.enabled;
    const text = req.body.text;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Enabled must be a boolean value' });
    }

    const notice = await saveNoticeSetting({ enabled, text });

    return res.json({
      success: true,
      message: 'Notice updated successfully',
      ...normalizeNoticeSetting(notice),
    });
  } catch (error) {
    console.error('Update admin notice config error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update notice settings',
    });
  }
}

export async function getPublicPaymentMethods(req, res) {
  try {
    const methods = await listActivePaymentMethods();
    return res.json({ data: methods });
  } catch (error) {
    console.error('Get public payment methods error:', error);
    return res.status(500).json({ error: 'Failed to load payment methods' });
  }
}

export async function getAdminPaymentMethods(req, res) {
  try {
    const methods = await listAllPaymentMethods();
    return res.json({ data: methods });
  } catch (error) {
    console.error('Get admin payment methods error:', error);
    return res.status(500).json({ error: 'Failed to load payment methods' });
  }
}

export async function updateAdminPaymentMethods(req, res) {
  try {
    const methods = await savePaymentMethods(req.body.methods || req.body.data || []);
    return res.json({
      success: true,
      message: 'Payment methods updated successfully',
      data: methods,
    });
  } catch (error) {
    console.error('Update admin payment methods error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update payment methods',
    });
  }
}

export async function getPublicHomepageSliders(req, res) {
  try {
    const sliders = await listActiveHomepageSliders();
    return res.json({ data: sliders });
  } catch (error) {
    console.error('Get public homepage sliders error:', error);
    return res.status(500).json({ error: 'Failed to load sliders' });
  }
}

export async function getAdminHomepageSliders(req, res) {
  try {
    const sliders = await listAllHomepageSliders();
    return res.json({ data: sliders });
  } catch (error) {
    console.error('Get admin homepage sliders error:', error);
    return res.status(500).json({ error: 'Failed to load sliders' });
  }
}

export async function updateAdminHomepageSliders(req, res) {
  try {
    const sliders = await saveHomepageSliders(req.body.sliders || req.body.data || []);
    return res.json({
      success: true,
      message: 'Slider updated successfully',
      data: sliders,
    });
  } catch (error) {
    console.error('Update admin homepage sliders error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update sliders',
    });
  }
}

export async function getPublicSocialLinks(req, res) {
  try {
    const links = await getSocialLinksSetting();
    return res.json(links);
  } catch (error) {
    console.error('Get public social links error:', error);
    return res.status(500).json({ error: 'Failed to load social links' });
  }
}

export async function getAdminSocialLinks(req, res) {
  try {
    const links = await getSocialLinksSetting();
    return res.json(links);
  } catch (error) {
    console.error('Get admin social links error:', error);
    return res.status(500).json({ error: 'Failed to load social links' });
  }
}

export async function updateAdminSocialLinks(req, res) {
  try {
    const links = await saveSocialLinksSetting(req.body);
    return res.json({
      success: true,
      message: 'Social links updated successfully',
      ...normalizeSocialLinks(links),
    });
  } catch (error) {
    console.error('Update admin social links error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update social links',
    });
  }
}

export async function getPublicBranding(req, res) {
  try {
    const branding = await getBrandingSetting();
    return res.json(branding);
  } catch (error) {
    console.error('Get public branding error:', error);
    return res.status(500).json({ error: 'Failed to load branding settings' });
  }
}

export async function getAdminBranding(req, res) {
  try {
    const branding = await getBrandingSetting();
    return res.json(branding);
  } catch (error) {
    console.error('Get admin branding error:', error);
    return res.status(500).json({ error: 'Failed to load branding settings' });
  }
}

export async function updateAdminBranding(req, res) {
  try {
    const branding = await saveBrandingSetting(req.body);
    return res.json({
      success: true,
      message: 'Branding updated successfully',
      ...normalizeBranding(branding),
    });
  } catch (error) {
    console.error('Update admin branding error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to update branding settings',
    });
  }
}

export default getPublicNoticeConfig;
