import { toBengaliDigits } from './bengaliUtils';
import { DEVELOPER_LOGO_BASE64 } from './developerLogo';

export interface SoftwarePromoInfo {
  softwareCompany?: string;
  softwarePhone?: string;
  softwareWebsite?: string;
  softwareLogo?: string;
  watermarkText?: string;
  showWatermark?: boolean;
  showFooter?: boolean;
}

export const getSoftwarePromoInfo = (): Required<SoftwarePromoInfo> => {
  const defaults: Required<SoftwarePromoInfo> = {
    softwareCompany: 'Hasanah Tech Solution',
    softwarePhone: '01349345353',
    softwareWebsite: 'www.hasanahtech.vercel.app',
    softwareLogo: DEVELOPER_LOGO_BASE64,
    watermarkText: 'Hasanah Tech Solution • 01349345353',
    showWatermark: true,
    showFooter: true,
  };

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('softwarePromoInfo');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          softwareCompany: parsed.softwareCompany || defaults.softwareCompany,
          softwarePhone: parsed.softwarePhone || defaults.softwarePhone,
          softwareWebsite: parsed.softwareWebsite || defaults.softwareWebsite,
          softwareLogo: parsed.softwareLogo || defaults.softwareLogo,
          watermarkText: parsed.watermarkText || `${parsed.softwareCompany || defaults.softwareCompany} • ${parsed.softwarePhone || defaults.softwarePhone}`,
          showWatermark: parsed.showWatermark !== false,
          showFooter: parsed.showFooter !== false,
        };
      }
    } catch {}
  }
  return defaults;
};

/**
 * Utility function to print a specific DOM element in an isolated hidden iframe.
 * Avoids browser scroll offset, modal translation, and page background interference.
 * Injects developer watermark overlay and marketing footer on all printed documents.
 */
export const printElement = (elementId: string) => {
  if (typeof window === 'undefined') return;

  const elem = document.getElementById(elementId);
  if (!elem) {
    window.print();
    return;
  }

  const promo = getSoftwarePromoInfo();
  const hasLocalFooter = elem.querySelector('[data-has-dev-footer="true"]') !== null || elem.getAttribute('data-has-dev-footer') === 'true';

  // Create isolated hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.name = 'print_iframe_' + Date.now();

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  // Collect existing stylesheets and style tags
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(s => s.outerHTML)
    .join('\n');

  const watermarkHtml = promo.showWatermark ? `
    <div class="print-watermark-overlay" aria-hidden="true">
      <div class="watermark-inner">
        ${Array.from({ length: 6 }).map(() => `
          <div class="watermark-item">
            <img src="${promo.softwareLogo || DEVELOPER_LOGO_BASE64}" class="wm-logo-img" alt="" />
            <span class="wm-title">${promo.softwareCompany}</span>
            <span class="wm-phone">হটলাইন: ${toBengaliDigits(promo.softwarePhone)} / ${promo.softwarePhone}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const footerHtml = (!hasLocalFooter && promo.showFooter) ? `
    <div class="print-global-dev-footer" data-has-dev-footer="true">
      <div class="dev-footer-left">
        <img src="${promo.softwareLogo || DEVELOPER_LOGO_BASE64}" class="dev-footer-logo" alt="Dev Logo" />
        <span class="dev-badge">DEV</span>
        <span>সফটওয়্যার পরিচালনায়: <strong>${promo.softwareCompany}</strong></span>
      </div>
      <div class="dev-footer-center">
        <span>হটলাইন: <strong>${toBengaliDigits(promo.softwarePhone)}</strong></span>
      </div>
      ${promo.softwareWebsite ? `
      <div class="dev-footer-right">
        <span>ওয়েবসাইট: <strong>${promo.softwareWebsite}</strong></span>
      </div>
      ` : ''}
    </div>
  ` : '';

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cash Memo Print</title>
        ${styles}
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            position: relative !important;
          }
          body {
            padding-bottom: 6mm !important;
          }
          #printable-memo-wrapper,
          #gate-pass-printable-wrapper,
          #purchase-memo-wrapper,
          #customer-dues-printable-sheet,
          #stock-sheet-printable-wrapper,
          #balance-sheet-printable-wrapper,
          #income-statement-printable-wrapper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-row-group !important;
          }
          tr, td, th, .keep-together, .memo-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Global Watermark Styles - Repeated Across Every Page */
          .print-watermark-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 999999 !important;
            pointer-events: none !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            overflow: hidden !important;
          }
          .watermark-inner {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-around !important;
            align-items: center !important;
            width: 150vw !important;
            height: 150vh !important;
            transform: rotate(-30deg) !important;
            opacity: 0.055 !important;
            user-select: none !important;
          }
          .watermark-item {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 35px 0 !important;
            text-align: center !important;
          }
          .wm-title {
            font-size: 32px !important;
            font-weight: 900 !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            color: #000000 !important;
            letter-spacing: 4px !important;
            text-transform: uppercase !important;
            white-space: nowrap !important;
            line-height: 1.1 !important;
          }
          .wm-phone {
            font-size: 18px !important;
            font-weight: 800 !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            color: #000000 !important;
            letter-spacing: 2.5px !important;
            white-space: nowrap !important;
            margin-top: 4px !important;
            line-height: 1.1 !important;
          }

          .wm-logo-img {
            width: 46px !important;
            height: 46px !important;
            object-fit: contain !important;
            opacity: 0.18 !important;
            margin-bottom: 6px !important;
            filter: grayscale(40%) !important;
          }

          /* Global Print Marketing Footer */
          .print-global-dev-footer {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 2.5px 8px !important;
            border-top: 1px dashed #94a3b8 !important;
            background: #ffffff !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            font-size: 8px !important;
            color: #334155 !important;
            z-index: 999998 !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          }
          .dev-footer-left {
            display: flex !important;
            align-items: center !important;
          }
          .dev-footer-logo {
            width: 15px !important;
            height: 15px !important;
            object-fit: contain !important;
            border-radius: 3px !important;
            margin-right: 5px !important;
            display: inline-block !important;
            vertical-align: middle !important;
          }
          .print-global-dev-footer .dev-badge {
            background: #0f172a !important;
            color: #ffffff !important;
            font-size: 7.5px !important;
            font-weight: 900 !important;
            padding: 0.5px 3.5px !important;
            border-radius: 3px !important;
            text-transform: uppercase !important;
            margin-right: 4px !important;
            display: inline-block !important;
          }
          .print-global-dev-footer strong {
            color: #0f172a !important;
          }
        </style>
      </head>
      <body>
        ${watermarkHtml}
        ${elem.outerHTML}
        ${footerHtml}
      </body>
    </html>
  `);
  doc.close();

  // Give styles and fonts a moment to initialize in the iframe
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print iframe error:', e);
      window.print();
    } setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {}
    }, 1000);
  }, 300);
};
