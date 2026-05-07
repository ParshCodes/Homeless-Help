function escapePdfText(value) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function stableStringify(value) {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object') {
    return Object.values(value)
      .map((entry) => stableStringify(entry))
      .join(', ');
  }

  return String(value);
}

function buildMedicalLines(profile) {
  const lines = [];
  lines.push(`Name: ${profile.name || 'N/A'}`);
  lines.push(`Sex: ${profile.sex || 'N/A'}`);
  lines.push(`Date of Birth: ${profile.dob || 'N/A'}`);
  lines.push(`Consent Expires: ${profile.consent_expires || 'N/A'}`);
  lines.push('');
  lines.push('Medical Summary');
  lines.push(`  Conditions: ${stableStringify(profile.medical_info_encrypted?.conditions || profile.medicalConditions)}`);
  lines.push(`  Allergies: ${stableStringify(profile.medical_info_encrypted?.allergies)}`);
  lines.push(`  Medications: ${stableStringify(profile.medical_info_encrypted?.meds)}`);
  lines.push(`  Vaccinations: ${stableStringify(profile.medical_info_encrypted?.vaccinations)}`);
  lines.push('');
  lines.push('Emergency Contacts');
  if (Array.isArray(profile.emergency_contacts) && profile.emergency_contacts.length > 0) {
    profile.emergency_contacts.forEach((contact, index) => {
      lines.push(`  ${index + 1}. ${contact.name || 'Unknown'} — ${contact.phone || 'No phone'}`);
    });
  } else {
    lines.push('  No emergency contacts recorded.');
  }
  lines.push('');
  lines.push('Service History');
  if (Array.isArray(profile.service_history) && profile.service_history.length > 0) {
    profile.service_history.forEach((item) => {
      lines.push(`  [${item.date || 'Unknown date'}] ${item.note || ''}`.trim());
    });
  } else {
    lines.push('  No service interactions yet.');
  }

  return lines;
}

const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

function measureBytes(value) {
  if (!encoder) {
    return value.length;
  }

  return encoder.encode(value).length;
}

function assemblePdf(lines) {
  const header = '%PDF-1.4\n';
  const textLines = lines.map((line, index) => (index === 0 ? `(${escapePdfText(line)}) Tj` : `T* (${escapePdfText(line)}) Tj`));
  const textStream = ['BT', '/F1 12 Tf', '14 TL', '72 770 Td', ...textLines, 'ET'].join('\n');
  const textLength = measureBytes(textStream);

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n',
    `4 0 obj << /Length ${textLength} >> stream\n${textStream}\nendstream\nendobj\n`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
  ];

  let offset = measureBytes(header);
  const xref = ['0000000000 65535 f \n'];
  objects.forEach((object) => {
    xref.push(`${offset.toString().padStart(10, '0')} 00000 n \n`);
    offset += measureBytes(object);
  });

  const body = objects.join('');
  const xrefOffset = measureBytes(header) + measureBytes(body);
  const trailer = `xref\n0 ${objects.length + 1}\n${xref.join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return header + body + trailer;
}

export function createMedicalHistoryPdf(profile) {
  const lines = buildMedicalLines(profile);
  const pdfContent = assemblePdf(lines);
  return new Blob([pdfContent], { type: 'application/pdf' });
}

export function downloadMedicalHistoryPdf(profile) {
  if (typeof window === 'undefined') return;
  const blob = createMedicalHistoryPdf(profile);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeName = (profile.name || 'medical-history').replace(/[^a-z0-9\-]+/gi, '-');
  anchor.href = url;
  anchor.download = `${safeName.toLowerCase()}-medical-history.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
