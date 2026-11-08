(() => {
  'use strict';
  const fields = [
    ['facebook', 'Facebook Page URL', 'url'],
    ['facebookName', 'Facebook Profile Name', 'text'],
    ['tiktok', 'TikTok Profile URL', 'url'],
    ['tiktokName', 'TikTok Profile Name', 'text'],
    ['youtube', 'YouTube Channel URL', 'url'],
    ['youtubeName', 'YouTube Profile Name', 'text'],
    ['linkedin', 'LinkedIn Page URL', 'url'],
    ['linkedinName', 'LinkedIn Profile Name', 'text'],
    ['whatsapp', 'WhatsApp Number or wa.me Link', 'text'],
    ['phone', 'Call Us Number', 'tel'],
    ['email', 'Contact Email', 'email'],
    ['gmail', 'Gmail Button Address', 'email'],
    ['malaysiaOffice', 'Malaysia Office Address', 'text'],
    ['bangladeshOffice', 'Bangladesh Office Address', 'text']
  ];

  function read(form) {
    const values = new FormData(form);
    return Object.fromEntries(fields.map(([key, label, type]) => {
      let value = String(values.get(key) ?? '').trim();
      if (value && type === 'url' && (!/^https:\/\//i.test(value) || !URL.canParse(value))) {
        throw Error(label + ' must start with https://');
      }
      if (value && (key === 'phone' || key === 'whatsapp')) {
        if (key === 'whatsapp') value = value.replace(/^https:\/\/wa\.me\/(\d+)\/?(?:\?.*)?$/i, '+$1');
        if (!/^\+?[\d ().-]+$/.test(value) || !/^[1-9]\d{7,14}$/.test(value.replace(/\D/g, ''))) {
          throw Error(label + ' needs an international number including the country code.');
        }
        value = '+' + value.replace(/\D/g, '');
      }
      return [key, value];
    }));
  }

  window.ANContactEditor = { fields, read };
})();
