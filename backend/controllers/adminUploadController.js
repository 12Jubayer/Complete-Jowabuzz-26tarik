export async function uploadSliderImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const imageUrl = `/uploads/sliders/${req.file.filename}`;

    return res.json({
      success: true,
      imageUrl,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    console.error('Upload slider image error:', error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
}

export async function uploadLogo(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Logo file is required' });
    }

    const logoUrl = `/uploads/branding/${req.file.filename}`;

    return res.json({
      success: true,
      logoUrl,
      message: 'Logo uploaded successfully',
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    return res.status(500).json({ error: 'Failed to upload logo' });
  }
}

export async function uploadFavicon(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Favicon file is required' });
    }

    const faviconUrl = `/uploads/branding/${req.file.filename}`;

    return res.json({
      success: true,
      faviconUrl,
      message: 'Favicon uploaded successfully',
    });
  } catch (error) {
    console.error('Upload favicon error:', error);
    return res.status(500).json({ error: 'Failed to upload favicon' });
  }
}

export async function uploadPromotionImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const imageUrl = `/uploads/promotions/${req.file.filename}`;

    return res.json({
      success: true,
      imageUrl,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    console.error('Upload promotion image error:', error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
}

export async function uploadGameImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const imageUrl = `/uploads/games/${req.file.filename}`;

    return res.json({
      success: true,
      imageUrl,
      message: 'Game image uploaded successfully',
    });
  } catch (error) {
    console.error('Upload game image error:', error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
}

export default uploadSliderImage;
