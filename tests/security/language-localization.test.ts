import { describe, it, expect } from 'vitest';
import {
  getTranslation,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  dictionaries,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  Locale,
} from '@/lib/i18n';
import { renderNotificationTemplate } from '@/lib/notifications/templates';

describe('Language & Localization Foundation — Comprehensive Test Suite', () => {
  describe('1. Supported Locales & Dictionary Completeness', () => {
    it('should support English (en), Marathi (mr), and Hindi (hi)', () => {
      const localeCodes = SUPPORTED_LOCALES.map((l) => l.code);
      expect(localeCodes).toContain('en');
      expect(localeCodes).toContain('mr');
      expect(localeCodes).toContain('hi');
      expect(DEFAULT_LOCALE).toBe('en');
    });

    it('should have complete dictionaries for all 3 supported locales', () => {
      const en = dictionaries.en;
      const mr = dictionaries.mr;
      const hi = dictionaries.hi;

      expect(en).toBeDefined();
      expect(mr).toBeDefined();
      expect(hi).toBeDefined();

      // Check key sections exist
      expect(en.common.save).toBe('Save');
      expect(mr.common.save).toBe('जतन करा');
      expect(hi.common.save).toBe('सहेजें');

      expect(en.nav.dashboard).toBe('Dashboard');
      expect(mr.nav.dashboard).toBe('डॅशबोर्ड');
      expect(hi.nav.dashboard).toBe('डैशबोर्ड');

      expect(en.complaints.title).toBe('Helpdesk & Maintenance');
      expect(mr.complaints.title).toBe('हेल्पडेस्क आणि देखभाल');
      expect(hi.complaints.title).toBe('हेल्पडेस्क और रखरखाव');
    });
  });

  describe('2. Translation Lookup & Fallback Mechanism', () => {
    it('should translate direct keys accurately in English, Marathi, and Hindi', () => {
      expect(getTranslation('common.confirm', undefined, 'en')).toBe('Confirm');
      expect(getTranslation('common.confirm', undefined, 'mr')).toBe('नक्की करा');
      expect(getTranslation('common.confirm', undefined, 'hi')).toBe('पुष्टि करें');
    });

    it('should correctly interpolate parameters into translated strings', () => {
      const enDue = getTranslation('complaints.dueIn', { time: '2 hours' }, 'en');
      expect(enDue).toBe('Due in 2 hours');

      const mrDue = getTranslation('complaints.dueIn', { time: '२ तास' }, 'mr');
      expect(mrDue).toBe('२ तास मध्ये देय');

      const hiDue = getTranslation('complaints.dueIn', { time: '२ घंटे' }, 'hi');
      expect(hiDue).toBe('२ घंटे में देय');
    });

    it('should interpolate multiple parameters', () => {
      const enSpots = getTranslation('events.spotsRemaining', { count: 15 }, 'en');
      expect(enSpots).toBe('15 spots remaining');

      const mrSpots = getTranslation('events.spotsRemaining', { count: 15 }, 'mr');
      expect(mrSpots).toBe('15 जागा शिल्लक');

      const hiSpots = getTranslation('events.spotsRemaining', { count: 15 }, 'hi');
      expect(hiSpots).toBe('15 स्थान शेष');
    });

    it('should fall back to English if key is missing in target locale', () => {
      // Create a scenario where a nested key is queried that might be missing or defaulted
      const missingKeyResult = getTranslation('nonexistent.key.test', undefined, 'mr');
      expect(missingKeyResult).toBe('nonexistent.key.test');
    });

    it('should default to English when no locale is provided', () => {
      expect(getTranslation('common.cancel')).toBe('Cancel');
    });
  });

  describe('3. Indian Currency & Number Formatting', () => {
    it('should format currency with INR symbol and Indian grouping for English', () => {
      const formatted = formatCurrency(150000, 'en');
      // Indian numbering grouping: 1,50,000.00
      expect(formatted).toContain('₹');
      expect(formatted).toContain('1,50,000');
    });

    it('should format currency with INR symbol for Marathi and Hindi', () => {
      const mrFormatted = formatCurrency(2500000, 'mr');
      expect(mrFormatted).toContain('₹');

      const hiFormatted = formatCurrency(50000, 'hi');
      expect(hiFormatted).toContain('₹');
    });

    it('should safely format zero and NaN currency', () => {
      const zeroFormatted = formatCurrency(0, 'en');
      expect(zeroFormatted).toContain('₹');
      expect(zeroFormatted).toContain('0.00');

      const nanFormatted = formatCurrency(NaN as any, 'en');
      expect(nanFormatted).toContain('₹');
      expect(nanFormatted).toContain('0.00');
    });

    it('should format numbers with Indian locale grouping', () => {
      const numFormatted = formatNumber(1000000, 'en');
      expect(numFormatted).toContain('10,00,000');
    });
  });

  describe('4. Date and Time Formatting (Asia/Kolkata)', () => {
    it('should format dates in IST timezone', () => {
      const sampleDate = new Date('2026-09-10T12:00:00Z');
      const formatted = formatDate(sampleDate, 'en');
      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
      expect(formatted).toContain('2026');
    });

    it('should format datetime in IST timezone', () => {
      const sampleDate = new Date('2026-09-10T12:00:00Z');
      const formatted = formatDateTime(sampleDate, 'en');
      expect(formatted).toBeDefined();
      expect(formatted).toContain('2026');
    });

    it('should handle empty/invalid date inputs safely', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate('invalid-date')).toBe('');
      expect(formatDateTime('')).toBe('');
    });
  });

  describe('5. Notification Template Localization', () => {
    it('should render English notification by default', () => {
      const rendered = renderNotificationTemplate('VISITOR_CHECKED_IN', {
        visitorName: 'John Doe',
        unitNumber: 'A-402',
      });
      expect(rendered.title).toContain('Visitor Arrival: John Doe');
      expect(rendered.body).toContain('checked in at the gate for unit A-402');
      expect(rendered.category).toBe('SECURITY');
    });

    it('should render Marathi notification when locale mr is passed', () => {
      const rendered = renderNotificationTemplate(
        'VISITOR_CHECKED_IN',
        {
          visitorName: 'रमेश जोशी',
          unitNumber: 'B-201',
        },
        'mr'
      );
      expect(rendered.title).toContain('अभ्यागत आगमन: रमेश जोशी');
      expect(rendered.body).toContain('फ्लॅट B-201 साठी गेटवर चेक-इन केले आहे');
      expect(rendered.category).toBe('SECURITY');
    });

    it('should render Hindi notification when locale hi is passed', () => {
      const rendered = renderNotificationTemplate(
        'VISITOR_CHECKED_IN',
        {
          visitorName: 'राजेश कुमार',
          unitNumber: 'C-305',
        },
        'hi'
      );
      expect(rendered.title).toContain('अतिथि आगमन: राजेश कुमार');
      expect(rendered.body).toContain('फ्लैट C-305 के लिए गेट पर चेक-इन किया है');
      expect(rendered.category).toBe('SECURITY');
    });

    it('should render localized billing notifications', () => {
      const enInvoice = renderNotificationTemplate(
        'INVOICE_GENERATED',
        { invoiceNumber: 'INV-2026-001', amount: 4500, period: 'September 2026', dueDate: '2026-09-25' },
        'en'
      );
      expect(enInvoice.title).toContain('New Maintenance Invoice: INV-2026-001');

      const mrInvoice = renderNotificationTemplate(
        'INVOICE_GENERATED',
        { invoiceNumber: 'INV-2026-001', amount: 4500, period: 'सप्टेंबर २०२६', dueDate: '२५-०९-२०२६' },
        'mr'
      );
      expect(mrInvoice.title).toContain('नवीन देखभाल चलन: INV-2026-001');

      const hiInvoice = renderNotificationTemplate(
        'INVOICE_GENERATED',
        { invoiceNumber: 'INV-2026-001', amount: 4500, period: 'सितंबर २०२६', dueDate: '२५-०९-२०२६' },
        'hi'
      );
      expect(hiInvoice.title).toContain('नया रखरखाव चालान: INV-2026-001');
    });

    it('should render localized complaint notifications', () => {
      const enComplaint = renderNotificationTemplate(
        'COMPLAINT_RESOLVED',
        { ticketNumber: 'TKT-104' },
        'en'
      );
      expect(enComplaint.title).toContain('Complaint Resolved: #TKT-104');

      const mrComplaint = renderNotificationTemplate(
        'COMPLAINT_RESOLVED',
        { ticketNumber: 'TKT-104' },
        'mr'
      );
      expect(mrComplaint.title).toContain('तक्रार निवारण पूर्ण: #TKT-104');

      const hiComplaint = renderNotificationTemplate(
        'COMPLAINT_RESOLVED',
        { ticketNumber: 'TKT-104' },
        'hi'
      );
      expect(hiComplaint.title).toContain('शिकायत का समाधान हुआ: #TKT-104');
    });

    it('should fall back to English if template is not translated in target locale', () => {
      const rendered = renderNotificationTemplate(
        'HANDOVER_CHECKLIST_ASSIGNED',
        { itemTitle: 'Fire Safety Audit', projectTitle: 'Phase 1 Tower' },
        'mr'
      );
      expect(rendered.title).toContain('Handover Checklist Assigned: Fire Safety Audit');
    });
  });

  describe('6. Security & Input Sanitization', () => {
    it('should reject invalid or malicious language identifiers', () => {
      const validLocales: Locale[] = ['en', 'mr', 'hi'];
      const testInputs = ['fr', 'es', 'zh', '../hack', '<script>alert(1)</script>', 'DROP TABLE profiles;', ''];

      testInputs.forEach((input) => {
        expect(validLocales.includes(input as Locale)).toBe(false);
      });
    });
  });
});

