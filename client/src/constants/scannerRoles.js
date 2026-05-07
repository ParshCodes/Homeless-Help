export const SCANNER_ROLE_DETAILS = {
  medical: {
    key: 'medical',
    authRole: 'Medical',
    title: 'Hospital & Clinic Teams',
    description: 'Full medical profile access for licensed providers verifying care plans on-site.',
    accent: 'from-rose-500 via-pink-500 to-amber-400',
    badgeClass: 'border border-cyan-400/40 bg-cyan-500/10 text-cyan-200',
    scanType: 'Medical Response',
    ledgerClass: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100',
    permissions: {
      showMedical: true,
      showEmergencyContacts: true,
      showEligibility: true,
      allowEmergency: true,
      allowDocuments: true,
    },
  },
  police: {
    key: 'police',
    authRole: 'Police/Safety',
    title: 'Police & Safety Teams',
    description: 'Rapid identity and emergency contact lookups for sworn officers and first responders.',
    accent: 'from-indigo-500 via-blue-500 to-sky-400',
    badgeClass: 'border border-amber-400/40 bg-amber-500/10 text-amber-100',
    scanType: 'Safety Check',
    ledgerClass: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
    permissions: {
      showMedical: false,
      showEmergencyContacts: true,
      showEligibility: false,
      allowEmergency: true,
      allowDocuments: false,
    },
  },
  foodBank: {
    key: 'foodBank',
    authRole: 'Food Bank',
    title: 'Shelter & Food Bank Teams',
    description: 'Photo verification and basic bio details for meal and shelter distribution partners.',
    accent: 'from-emerald-500 via-teal-500 to-cyan-400',
    badgeClass: 'border border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
    scanType: 'Resource Pickup',
    ledgerClass: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
    permissions: {
      showMedical: false,
      showEmergencyContacts: false,
      showEligibility: false,
      allowEmergency: false,
      allowDocuments: false,
    },
  },
};

export const SCANNER_ROLE_ORDER = ['medical', 'police', 'foodBank'];

export const SCANNER_ROLE_OPTIONS = SCANNER_ROLE_ORDER.map((key) => SCANNER_ROLE_DETAILS[key]);

export const normalizeScannerRoleKey = (role) => {
  if (!role) {
    return 'medical';
  }

  const normalized = role.toString().toLowerCase();

  if (normalized.includes('food')) {
    return 'foodBank';
  }

  if (normalized.includes('police') || normalized.includes('safety') || normalized.includes('sheriff')) {
    return 'police';
  }

  return 'medical';
};

export const resolveScannerRoleDetails = (role) => {
  const key = normalizeScannerRoleKey(role);
  return SCANNER_ROLE_DETAILS[key] || SCANNER_ROLE_DETAILS.medical;
};
