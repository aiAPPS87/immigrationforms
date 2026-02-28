// FormPath — Immigration Form Guidance Portal
// Single-file React application | Vite + Tailwind
import { useState, useReducer, useEffect, useCallback, useRef } from 'react'

// ─────────────────────────────────────────────
// FORM DATA — question flows for I-90, N-400, I-131
// ─────────────────────────────────────────────
const FORMS_DB = [
  {
    formId: 'I-90',
    title: 'Replace Permanent Resident Card',
    shortTitle: 'Green Card Replacement',
    category: 'Family',
    description: 'Use this form to renew or replace your Permanent Resident Card (Green Card) if it was lost, stolen, damaged, or is expiring.',
    estimatedTime: '20–30 min',
    difficulty: 'Easy',
    filingFee: '$455',
    icon: '🪪',
    sections: [
      {
        id: 'personal_info',
        title: 'Personal Information',
        questions: [
          { id: 'family_name',    label: 'What is your family name (last name)?',   hint: 'Enter exactly as it appears on your current Green Card.',  type: 'text',     required: true,  pdfFieldMapping: 'Part1_FamilyName' },
          { id: 'given_name',     label: 'What is your given name (first name)?',   hint: 'Enter your first name as it appears on your current card.', type: 'text',     required: true,  pdfFieldMapping: 'Part1_GivenName' },
          { id: 'middle_name',    label: 'What is your middle name? (if any)',       hint: 'Leave blank if you have no middle name.',                  type: 'text',     required: false, pdfFieldMapping: 'Part1_MiddleName' },
          { id: 'other_names',    label: 'Have you used any other names?',           hint: 'Include maiden names, aliases, or name changes.',          type: 'yes_no',   required: true,  pdfFieldMapping: 'Part1_OtherNames' },
          { id: 'other_names_list', label: 'List your other names (family name, given name)', hint: 'Separate multiple names with a comma.',           type: 'textarea', required: true,  pdfFieldMapping: 'Part1_OtherNamesList', condition: { field: 'other_names', value: 'yes' } },
          { id: 'dob',            label: 'What is your date of birth?',              hint: 'Enter your exact date of birth.',                          type: 'date',     required: true,  pdfFieldMapping: 'Part1_DateOfBirth' },
          { id: 'sex',            label: 'What is your sex?',                        hint: 'Select as it appears on your official documents.',         type: 'select',   required: true,  pdfFieldMapping: 'Part1_Sex',          options: ['Male', 'Female'] },
          { id: 'country_birth',  label: 'What country were you born in?',           hint: 'Use the country name as it is today.',                     type: 'text',     required: true,  pdfFieldMapping: 'Part1_CountryBirth' },
          { id: 'country_citizen',label: 'What country are you a citizen of?',       hint: 'If you have dual citizenship, list both countries.',       type: 'text',     required: true,  pdfFieldMapping: 'Part1_CountryCitizenship' },
        ],
      },
      {
        id: 'uscis_numbers',
        title: 'USCIS & Government Numbers',
        questions: [
          { id: 'alien_number',   label: 'What is your Alien Registration Number (A-Number)?', hint: 'Your A-Number is 8–9 digits, starting with "A". Find it on your Green Card.',  type: 'text', required: true,  pdfFieldMapping: 'Part1_AlienNumber' },
          { id: 'uscis_account',  label: 'What is your USCIS Online Account Number?',          hint: 'This is a 12-digit number from your USCIS online account. Leave blank if none.', type: 'text', required: false, pdfFieldMapping: 'Part1_USCISAccountNumber' },
          { id: 'ssn',            label: 'What is your Social Security Number?',               hint: 'Format: XXX-XX-XXXX. Leave blank if you have not been issued one.',               type: 'text', required: false, pdfFieldMapping: 'Part1_SSN' },
        ],
      },
      {
        id: 'address',
        title: 'Your Address',
        questions: [
          { id: 'street_address', label: 'What is your current street address?',      hint: 'Include apartment/unit number if applicable.',                type: 'text',    required: true,  pdfFieldMapping: 'Part2_StreetAddress' },
          { id: 'city',           label: 'What city do you live in?',                 hint: '',                                                           type: 'text',    required: true,  pdfFieldMapping: 'Part2_City' },
          { id: 'state',          label: 'What state do you live in?',                hint: 'Use the two-letter state abbreviation (e.g., CA, TX, NY).', type: 'text',    required: true,  pdfFieldMapping: 'Part2_State' },
          { id: 'zip',            label: 'What is your ZIP code?',                    hint: '',                                                           type: 'text',    required: true,  pdfFieldMapping: 'Part2_ZIPCode' },
          { id: 'lived_5_years',  label: 'Have you lived at this address for 5 or more years?', hint: 'If not, we will ask for your previous address.',  type: 'yes_no',  required: true,  pdfFieldMapping: 'Part2_Lived5Years' },
          { id: 'prev_address',   label: 'What was your previous street address?',    hint: 'The address where you lived before your current one.',        type: 'text',    required: false, pdfFieldMapping: 'Part2_PrevStreet',   condition: { field: 'lived_5_years', value: 'no' } },
          { id: 'prev_city',      label: 'Previous address — what city?',             hint: '',                                                           type: 'text',    required: false, pdfFieldMapping: 'Part2_PrevCity',     condition: { field: 'lived_5_years', value: 'no' } },
          { id: 'prev_state',     label: 'Previous address — what state?',            hint: '',                                                           type: 'text',    required: false, pdfFieldMapping: 'Part2_PrevState',    condition: { field: 'lived_5_years', value: 'no' } },
        ],
      },
      {
        id: 'card_info',
        title: 'Your Current Card',
        questions: [
          { id: 'pr_date',        label: 'When did you first become a permanent resident?', hint: 'This date is on the front of your current Green Card.',                      type: 'date',   required: true,  pdfFieldMapping: 'Part3_PRDate' },
          { id: 'replace_reason', label: 'Why are you applying for a new Green Card?',      hint: 'Choose the reason that best applies to your situation.',                    type: 'select', required: true,  pdfFieldMapping: 'Part3_Reason',
            options: ['My card was lost', 'My card was stolen', 'My card was damaged or mutilated', 'My card was never received', 'My card is expiring within 6 months', 'My card has already expired', 'My name or other information changed', 'I was issued a card with incorrect data'] },
          { id: 'card_expiry',    label: 'What is the expiration date on your current card?', hint: 'Look at the EXPIRES field on the front of your card. Enter N/A if none.',  type: 'text',   required: false, pdfFieldMapping: 'Part3_CardExpiry' },
        ],
      },
      {
        id: 'physical',
        title: 'Physical Description',
        questions: [
          { id: 'height_ft',  label: 'How tall are you? (feet)',    hint: '',                                        type: 'text',   required: true, pdfFieldMapping: 'Part4_HeightFeet' },
          { id: 'height_in',  label: 'How tall are you? (inches)',  hint: '',                                        type: 'text',   required: true, pdfFieldMapping: 'Part4_HeightInches' },
          { id: 'weight',     label: 'How much do you weigh? (lbs)', hint: 'Enter your weight in pounds.',           type: 'text',   required: true, pdfFieldMapping: 'Part4_Weight' },
          { id: 'eye_color',  label: 'What color are your eyes?',   hint: '',                                        type: 'select', required: true, pdfFieldMapping: 'Part4_EyeColor', options: ['Black', 'Blue', 'Brown', 'Gray', 'Green', 'Hazel', 'Maroon', 'Pink', 'Unknown/Other'] },
          { id: 'hair_color', label: 'What color is your hair?',    hint: '',                                        type: 'select', required: true, pdfFieldMapping: 'Part4_HairColor', options: ['Bald (no hair)', 'Black', 'Blond', 'Brown', 'Gray', 'Red', 'Sandy', 'White', 'Unknown/Other'] },
        ],
      },
      {
        id: 'contact',
        title: 'Contact Information',
        questions: [
          { id: 'daytime_phone', label: 'What is your daytime phone number?',  hint: 'Include area code. Example: (555) 123-4567.',                          type: 'text',  required: true,  pdfFieldMapping: 'Part5_DaytimePhone' },
          { id: 'mobile_phone',  label: 'What is your mobile phone number?',   hint: 'Leave blank if same as daytime phone.',                                 type: 'text',  required: false, pdfFieldMapping: 'Part5_MobilePhone' },
          { id: 'email',         label: 'What is your email address?',         hint: 'USCIS may use this to send you case updates.',                           type: 'text',  required: false, pdfFieldMapping: 'Part5_Email' },
        ],
      },
    ],
  },

  {
    formId: 'N-400',
    title: 'Application for Naturalization',
    shortTitle: 'Citizenship Application',
    category: 'Citizenship',
    description: 'Apply for U.S. citizenship if you have been a permanent resident for at least 5 years (or 3 years if married to a U.S. citizen).',
    estimatedTime: '45–60 min',
    difficulty: 'Intermediate',
    filingFee: '$725',
    icon: '🇺🇸',
    sections: [
      {
        id: 'personal_info',
        title: 'Personal Information',
        questions: [
          { id: 'family_name',     label: 'What is your family name (last name)?',   hint: 'Enter exactly as it appears on your Green Card.', type: 'text',   required: true,  pdfFieldMapping: 'Part1_FamilyName' },
          { id: 'given_name',      label: 'What is your given name (first name)?',   hint: '',                                                type: 'text',   required: true,  pdfFieldMapping: 'Part1_GivenName' },
          { id: 'middle_name',     label: 'What is your middle name? (if any)',       hint: 'Leave blank if none.',                            type: 'text',   required: false, pdfFieldMapping: 'Part1_MiddleName' },
          { id: 'name_change',     label: 'Would you like to legally change your name when you become a citizen?', hint: 'You can request a legal name change as part of the naturalization process.', type: 'yes_no', required: true, pdfFieldMapping: 'Part1_NameChange' },
          { id: 'new_name',        label: 'What name would you like to use?',         hint: 'Enter your desired new legal name.',              type: 'text',   required: true,  pdfFieldMapping: 'Part1_NewName', condition: { field: 'name_change', value: 'yes' } },
          { id: 'other_names',     label: 'Have you used any other names since birth?', hint: 'Include married names, nicknames used on official docs, and aliases.', type: 'yes_no', required: true, pdfFieldMapping: 'Part1_OtherNames' },
          { id: 'other_names_list',label: 'List all other names you have used',       hint: 'Include approximate dates used.',                 type: 'textarea', required: true, pdfFieldMapping: 'Part1_OtherNamesList', condition: { field: 'other_names', value: 'yes' } },
          { id: 'dob',             label: 'What is your date of birth?',              hint: '',                                                type: 'date',   required: true,  pdfFieldMapping: 'Part2_DOB' },
          { id: 'country_birth',   label: 'What country were you born in?',           hint: 'Use the current name of the country.',            type: 'text',   required: true,  pdfFieldMapping: 'Part2_CountryBirth' },
          { id: 'country_citizen', label: 'What country are you currently a citizen of?', hint: 'If dual citizen, list both countries.',      type: 'text',   required: true,  pdfFieldMapping: 'Part2_CountryCitizen' },
          { id: 'alien_number',    label: 'What is your Alien Registration Number (A-Number)?', hint: 'Found on the front of your Green Card, starts with "A".', type: 'text', required: true, pdfFieldMapping: 'Part2_AlienNumber' },
          { id: 'ssn',             label: 'What is your Social Security Number?',     hint: 'Format: XXX-XX-XXXX.',                            type: 'text',   required: false, pdfFieldMapping: 'Part2_SSN' },
        ],
      },
      {
        id: 'address',
        title: 'Your Address',
        questions: [
          { id: 'street_address',  label: 'What is your current street address?',     hint: 'Include apartment number if applicable.',                           type: 'text', required: true, pdfFieldMapping: 'Part2_Street' },
          { id: 'city',            label: 'What city do you currently live in?',      hint: '',                                                                  type: 'text', required: true, pdfFieldMapping: 'Part2_City' },
          { id: 'state',           label: 'What state?',                              hint: 'Two-letter abbreviation (e.g., CA).',                               type: 'text', required: true, pdfFieldMapping: 'Part2_State' },
          { id: 'zip',             label: 'What is your ZIP code?',                   hint: '',                                                                  type: 'text', required: true, pdfFieldMapping: 'Part2_ZIP' },
          { id: 'phone',           label: 'What is your phone number?',               hint: 'USCIS will call this number to schedule your interview.',            type: 'text', required: true, pdfFieldMapping: 'Part2_Phone' },
          { id: 'email',           label: 'What is your email address?',              hint: '',                                                                  type: 'text', required: false, pdfFieldMapping: 'Part2_Email' },
        ],
      },
      {
        id: 'residency',
        title: 'Permanent Residence',
        questions: [
          { id: 'pr_date',         label: 'When did you become a Permanent Resident?', hint: 'This is the date on the front of your Green Card.',                type: 'date',   required: true,  pdfFieldMapping: 'Part3_PRDate' },
          { id: 'pr_basis',        label: 'How did you obtain Permanent Residence?',   hint: 'Choose the option that best describes how you got your Green Card.', type: 'select', required: true, pdfFieldMapping: 'Part3_PRBasis',
            options: ['Marriage to U.S. citizen', 'Marriage to permanent resident', 'Employer sponsorship', 'Family preference (sibling, adult child, etc.)', 'Diversity Visa Lottery', 'Refugee or Asylee status', 'Special Immigrant category', 'Other'] },
          { id: 'outside_trips',   label: 'Have you been outside the United States for 6 or more months during any single trip in the past 5 years?', hint: 'Long absences can affect your eligibility for naturalization.', type: 'yes_no', required: true, pdfFieldMapping: 'Part3_OutsideTrips' },
          { id: 'trips_detail',    label: 'Describe your trips outside the U.S.',      hint: 'List the dates, destinations, and duration of each trip over 6 months.', type: 'textarea', required: true, pdfFieldMapping: 'Part3_TripsDetail', condition: { field: 'outside_trips', value: 'yes' } },
          { id: 'claim_nonresident',label: 'Have you ever claimed to be a non-U.S. resident for tax purposes?', hint: 'This includes filing as a "non-resident alien" on your taxes.', type: 'yes_no', required: true, pdfFieldMapping: 'Part3_TaxClaim' },
        ],
      },
      {
        id: 'marital_status',
        title: 'Marital History',
        questions: [
          { id: 'marital_status',  label: 'What is your current marital status?', hint: '', type: 'select', required: true, pdfFieldMapping: 'Part4_MaritalStatus',
            options: ['Single (never married)', 'Married', 'Divorced', 'Widowed', 'Separated'] },
          { id: 'spouse_name',     label: "What is your spouse's full name?",      hint: 'Enter their full legal name.',            type: 'text',   required: true,  pdfFieldMapping: 'Part4_SpouseName',   condition: { field: 'marital_status', value: 'Married' } },
          { id: 'spouse_dob',      label: "What is your spouse's date of birth?",  hint: '',                                        type: 'date',   required: true,  pdfFieldMapping: 'Part4_SpouseDOB',    condition: { field: 'marital_status', value: 'Married' } },
          { id: 'spouse_citizen',  label: 'Is your spouse a U.S. citizen?',        hint: 'If yes, you may qualify for the 3-year residency requirement.', type: 'yes_no', required: true, pdfFieldMapping: 'Part4_SpouseCitizen', condition: { field: 'marital_status', value: 'Married' } },
          { id: 'prev_marriages',  label: 'Have you been married before?',         hint: 'Include all previous marriages.',         type: 'yes_no', required: true,  pdfFieldMapping: 'Part4_PrevMarriages' },
          { id: 'prev_marriage_detail', label: 'Tell us about your previous marriage(s)', hint: 'For each, include the name of the person, dates of marriage and termination, and how it ended.', type: 'textarea', required: true, pdfFieldMapping: 'Part4_PrevMarriageDetail', condition: { field: 'prev_marriages', value: 'yes' } },
          { id: 'has_children',    label: 'Do you have any children?',             hint: 'Include all children, regardless of whether they live with you.', type: 'yes_no', required: true, pdfFieldMapping: 'Part4_HasChildren' },
          { id: 'num_children',    label: 'How many children do you have?',        hint: '',                                        type: 'text',   required: true,  pdfFieldMapping: 'Part4_NumChildren', condition: { field: 'has_children', value: 'yes' } },
        ],
      },
      {
        id: 'employment',
        title: 'Employment & School',
        questions: [
          { id: 'employment_status', label: 'What is your current employment status?', hint: '', type: 'select', required: true, pdfFieldMapping: 'Part6_EmpStatus',
            options: ['Employed full-time', 'Employed part-time', 'Self-employed', 'Unemployed', 'Retired', 'Student', 'Homemaker'] },
          { id: 'employer_name',   label: 'Who do you currently work for?',         hint: 'Enter the full name of your employer or company.', type: 'text', required: true, pdfFieldMapping: 'Part6_Employer', condition: { field: 'employment_status', value: 'Employed full-time' } },
          { id: 'occupation',      label: 'What is your occupation or job title?',  hint: '',                                                  type: 'text', required: true, pdfFieldMapping: 'Part6_Occupation' },
        ],
      },
      {
        id: 'good_moral_character',
        title: 'Background & Character',
        questions: [
          { id: 'ever_arrested',   label: 'Have you ever been arrested, cited, or detained by any law enforcement officer?', hint: 'Include all incidents, even if charges were dropped or expunged.', type: 'yes_no', required: true, pdfFieldMapping: 'Part12_Arrested' },
          { id: 'arrest_detail',   label: 'Describe the arrest(s) or incident(s)',  hint: 'Include dates, locations, charges, and outcomes.',  type: 'textarea', required: true, pdfFieldMapping: 'Part12_ArrestDetail', condition: { field: 'ever_arrested', value: 'yes' } },
          { id: 'ever_convicted',  label: 'Have you ever been convicted of a crime?', hint: 'Include any conviction, even if you completed your sentence or received a pardon.', type: 'yes_no', required: true, pdfFieldMapping: 'Part12_Convicted' },
          { id: 'conviction_detail', label: 'Describe the conviction(s)',            hint: 'Include dates, crimes, sentences, and whether you completed any probation.', type: 'textarea', required: true, pdfFieldMapping: 'Part12_ConvictionDetail', condition: { field: 'ever_convicted', value: 'yes' } },
          { id: 'failed_taxes',    label: 'Have you ever failed to file a federal, state, or local tax return?', hint: 'If you were not required to file, answer No.', type: 'yes_no', required: true, pdfFieldMapping: 'Part12_Taxes' },
          { id: 'communist',       label: 'Have you ever been a member of, or in any way associated with, the Communist Party?', hint: 'Answer honestly — USCIS verifies this through records checks.', type: 'yes_no', required: true, pdfFieldMapping: 'Part12_Communist' },
          { id: 'removal_proceedings', label: 'Are you currently in removal (deportation) proceedings?', hint: 'If yes, you may not be eligible to naturalize until proceedings are resolved.', type: 'yes_no', required: true, pdfFieldMapping: 'Part12_Removal' },
          { id: 'support_constitution', label: 'Do you support and believe in the U.S. Constitution?', hint: 'This is required for citizenship.', type: 'yes_no', required: true, pdfFieldMapping: 'Part13_Constitution' },
          { id: 'bear_arms',       label: 'Are you willing to bear arms on behalf of the United States when required by law?', hint: 'Most applicants answer Yes. You may request an exemption based on religious beliefs.', type: 'yes_no', required: true, pdfFieldMapping: 'Part13_BearArms' },
        ],
      },
      {
        id: 'english_civics',
        title: 'English & Civics',
        questions: [
          { id: 'reads_english',  label: 'Can you read English?',              hint: 'You will need to demonstrate this at your naturalization interview.',    type: 'yes_no', required: true, pdfFieldMapping: 'Part14_ReadsEnglish' },
          { id: 'writes_english', label: 'Can you write English?',             hint: '',                                                                       type: 'yes_no', required: true, pdfFieldMapping: 'Part14_WritesEnglish' },
          { id: 'speaks_english', label: 'Can you speak English?',             hint: '',                                                                       type: 'yes_no', required: true, pdfFieldMapping: 'Part14_SpeaksEnglish' },
          { id: 'civics_exemption', label: 'Do you have a disability that prevents you from taking the civics test?', hint: 'You may be eligible for an exemption if you have a medically documented disability.', type: 'yes_no', required: true, pdfFieldMapping: 'Part14_CivicsExemption' },
        ],
      },
    ],
  },

  {
    formId: 'I-131',
    title: 'Application for Travel Document',
    shortTitle: 'Travel Document',
    category: 'Travel',
    description: 'Apply for a Reentry Permit, Refugee Travel Document, or Advance Parole Document to travel outside the United States.',
    estimatedTime: '20–25 min',
    difficulty: 'Easy',
    filingFee: '$575',
    icon: '✈️',
    sections: [
      {
        id: 'personal_info',
        title: 'Personal Information',
        questions: [
          { id: 'family_name',     label: 'What is your family name (last name)?',   hint: 'Enter exactly as it appears on your immigration documents.', type: 'text',   required: true,  pdfFieldMapping: 'Part1_FamilyName' },
          { id: 'given_name',      label: 'What is your given name (first name)?',   hint: '',                                                          type: 'text',   required: true,  pdfFieldMapping: 'Part1_GivenName' },
          { id: 'middle_name',     label: 'What is your middle name? (if any)',       hint: 'Leave blank if none.',                                      type: 'text',   required: false, pdfFieldMapping: 'Part1_MiddleName' },
          { id: 'other_names',     label: 'Have you used any other names?',           hint: 'Include maiden names and aliases.',                         type: 'yes_no', required: true,  pdfFieldMapping: 'Part1_OtherNames' },
          { id: 'dob',             label: 'What is your date of birth?',              hint: '',                                                          type: 'date',   required: true,  pdfFieldMapping: 'Part1_DOB' },
          { id: 'sex',             label: 'What is your sex?',                        hint: '',                                                          type: 'select', required: true,  pdfFieldMapping: 'Part1_Sex', options: ['Male', 'Female'] },
          { id: 'country_birth',   label: 'What country were you born in?',           hint: 'Use the current country name.',                             type: 'text',   required: true,  pdfFieldMapping: 'Part1_CountryBirth' },
          { id: 'country_citizen', label: 'What country are you a citizen of?',       hint: '',                                                          type: 'text',   required: true,  pdfFieldMapping: 'Part1_CountryCitizen' },
          { id: 'alien_number',    label: 'What is your Alien Registration Number (A-Number)?', hint: 'Starts with "A" — 8 or 9 digits.',              type: 'text',   required: true,  pdfFieldMapping: 'Part1_AlienNumber' },
          { id: 'ssn',             label: 'What is your Social Security Number? (if any)', hint: 'Leave blank if not issued.',                          type: 'text',   required: false, pdfFieldMapping: 'Part1_SSN' },
        ],
      },
      {
        id: 'address',
        title: 'Your Address',
        questions: [
          { id: 'street_address',  label: 'What is your current street address?',    hint: '',                                             type: 'text', required: true, pdfFieldMapping: 'Part2_Street' },
          { id: 'city',            label: 'What city do you live in?',               hint: '',                                             type: 'text', required: true, pdfFieldMapping: 'Part2_City' },
          { id: 'state',           label: 'What state?',                             hint: 'Two-letter abbreviation.',                     type: 'text', required: true, pdfFieldMapping: 'Part2_State' },
          { id: 'zip',             label: 'What is your ZIP code?',                  hint: '',                                             type: 'text', required: true, pdfFieldMapping: 'Part2_ZIP' },
          { id: 'phone',           label: 'What is your daytime phone number?',      hint: '',                                             type: 'text', required: true, pdfFieldMapping: 'Part2_Phone' },
          { id: 'email',           label: 'What is your email address?',             hint: '',                                             type: 'text', required: false, pdfFieldMapping: 'Part2_Email' },
        ],
      },
      {
        id: 'travel_document',
        title: 'Travel Document Type',
        questions: [
          { id: 'doc_type',        label: 'What type of travel document are you applying for?', hint: 'Choose based on your immigration status and travel purpose.', type: 'select', required: true, pdfFieldMapping: 'Part3_DocType',
            options: [
              'Reentry Permit (I am a permanent resident)',
              'Refugee Travel Document (I have refugee or asylum status)',
              'Advance Parole (I have a pending application or TPS)',
            ] },
          { id: 'in_us',           label: 'Are you currently in the United States?', hint: 'If you are outside the U.S., additional steps may be required.', type: 'yes_no', required: true, pdfFieldMapping: 'Part3_InUS' },
          { id: 'travel_purpose',  label: 'Why do you need to travel outside the United States?', hint: 'Be specific — USCIS reviews this when evaluating your application.', type: 'textarea', required: true, pdfFieldMapping: 'Part3_TravelPurpose' },
          { id: 'travel_countries', label: 'Which countries do you plan to visit?',  hint: 'List all countries you intend to travel to.',       type: 'text',     required: true, pdfFieldMapping: 'Part3_Countries' },
          { id: 'depart_date',     label: 'When do you plan to depart the U.S.?',   hint: 'Approximate date is fine.',                          type: 'date',     required: false, pdfFieldMapping: 'Part3_DepartDate' },
          { id: 'return_date',     label: 'When do you plan to return?',             hint: 'Approximate date is fine.',                          type: 'date',     required: false, pdfFieldMapping: 'Part3_ReturnDate' },
          { id: 'trip_duration',   label: 'How long do you plan to be outside the U.S.?', hint: 'For example: 3 weeks, 2 months.',               type: 'text',     required: true, pdfFieldMapping: 'Part3_Duration' },
        ],
      },
      {
        id: 'status_info',
        title: 'Your Immigration Status',
        questions: [
          { id: 'status_type',     label: 'What is your current immigration status?', hint: 'Choose the option that best describes your current status.',   type: 'select', required: true, pdfFieldMapping: 'Part4_Status',
            options: ['Lawful Permanent Resident (Green Card holder)', 'Conditional Permanent Resident', 'Asylee', 'Refugee', 'Pending I-485 (Adjustment of Status)', 'TPS (Temporary Protected Status) holder', 'Other'] },
          { id: 'refugee_one_year', label: 'Have you been physically present in the U.S. for at least 1 year since being granted refugee/asylum status?', hint: 'Required for Refugee Travel Document.', type: 'yes_no', required: true, pdfFieldMapping: 'Part4_RefugeeYear',
            condition: { field: 'doc_type', value: 'Refugee Travel Document (I have refugee or asylum status)' } },
          { id: 'last_entry_date', label: 'When did you last enter the United States?', hint: 'Check your passport for the entry stamp.',                  type: 'date',   required: true,  pdfFieldMapping: 'Part4_LastEntry' },
          { id: 'i94_number',      label: 'What is your I-94 Arrival/Departure Record Number?', hint: 'Find your I-94 number at i94.cbp.dhs.gov.',        type: 'text',   required: false, pdfFieldMapping: 'Part4_I94' },
          { id: 'prior_travel_doc', label: 'Have you previously been issued a travel document?', hint: 'Include advance paroles, refugee travel docs, and reentry permits.', type: 'yes_no', required: true, pdfFieldMapping: 'Part4_PriorDoc' },
          { id: 'prior_doc_detail', label: 'Describe your previous travel document(s)',          hint: 'Include type, issuing office, date issued, and expiration.',           type: 'textarea', required: true, pdfFieldMapping: 'Part4_PriorDocDetail', condition: { field: 'prior_travel_doc', value: 'yes' } },
        ],
      },
    ],
  },
]

// ─────────────────────────────────────────────
// HELPER QUIZ — "What form do I need?"
// ─────────────────────────────────────────────
const QUIZ_QUESTIONS = [
  { id: 'q1', label: 'What best describes your situation?',
    options: [
      { label: 'I have a Green Card and need to renew or replace it', forms: ['I-90'] },
      { label: 'I want to apply for U.S. citizenship', forms: ['N-400'] },
      { label: 'I need to travel outside the U.S. and need a travel document', forms: ['I-131'] },
      { label: 'I have a pending Green Card application and want to travel', forms: ['I-131'] },
    ]
  },
]

// ─────────────────────────────────────────────
// STATE MACHINE
// ─────────────────────────────────────────────
const SCREENS = { HOME: 'HOME', CATALOG: 'CATALOG', QUIZ: 'QUIZ', WIZARD: 'WIZARD', REVIEW: 'REVIEW', COMPLETE: 'COMPLETE' }

const initialState = {
  screen: SCREENS.HOME,
  selectedForm: null,
  answers: {},
  currentSectionIdx: 0,
  currentQuestionIdx: 0,
  direction: 'forward', // for animation
  lang: 'en',
}

function appReducer(state, action) {
  switch (action.type) {
    case 'GO_HOME':           return { ...initialState }
    case 'GO_CATALOG':        return { ...state, screen: SCREENS.CATALOG }
    case 'GO_QUIZ':           return { ...state, screen: SCREENS.QUIZ }
    case 'SELECT_FORM':       return { ...state, screen: SCREENS.WIZARD, selectedForm: action.form, answers: loadFromStorage(action.form.formId) || {}, currentSectionIdx: 0, currentQuestionIdx: 0, direction: 'forward' }
    case 'SET_ANSWER':        return { ...state, answers: { ...state.answers, [action.id]: action.value } }
    case 'NEXT_QUESTION':     return nextQuestion(state)
    case 'PREV_QUESTION':     return prevQuestion(state)
    case 'GO_REVIEW':         return { ...state, screen: SCREENS.REVIEW }
    case 'GO_COMPLETE':       return { ...state, screen: SCREENS.COMPLETE }
    case 'JUMP_TO':           return { ...state, screen: SCREENS.WIZARD, currentSectionIdx: action.sectionIdx, currentQuestionIdx: action.questionIdx }
    case 'SET_LANG':          return { ...state, lang: action.lang }
    default:                  return state
  }
}

function getVisibleQuestions(form, sectionIdx, answers) {
  return form.sections[sectionIdx].questions.filter(q => {
    if (!q.condition) return true
    return answers[q.condition.field] === q.condition.value
  })
}

function nextQuestion(state) {
  const form = state.selectedForm
  const visibleQs = getVisibleQuestions(form, state.currentSectionIdx, state.answers)
  if (state.currentQuestionIdx < visibleQs.length - 1) {
    return { ...state, currentQuestionIdx: state.currentQuestionIdx + 1, direction: 'forward' }
  }
  if (state.currentSectionIdx < form.sections.length - 1) {
    return { ...state, currentSectionIdx: state.currentSectionIdx + 1, currentQuestionIdx: 0, direction: 'forward' }
  }
  return { ...state, screen: SCREENS.REVIEW }
}

function prevQuestion(state) {
  if (state.currentQuestionIdx > 0) {
    return { ...state, currentQuestionIdx: state.currentQuestionIdx - 1, direction: 'back' }
  }
  if (state.currentSectionIdx > 0) {
    const prevSectionIdx = state.currentSectionIdx - 1
    const prevVisibleQs = getVisibleQuestions(state.selectedForm, prevSectionIdx, state.answers)
    return { ...state, currentSectionIdx: prevSectionIdx, currentQuestionIdx: prevVisibleQs.length - 1, direction: 'back' }
  }
  return { ...state, screen: SCREENS.CATALOG }
}

function loadFromStorage(formId) {
  try { return JSON.parse(localStorage.getItem(`formpath_${formId}`) || 'null') } catch { return null }
}
function saveToStorage(formId, answers) {
  try { localStorage.setItem(`formpath_${formId}`, JSON.stringify(answers)) } catch {}
}
function clearStorage(formId) {
  try { localStorage.removeItem(`formpath_${formId}`) } catch {}
}

// ─────────────────────────────────────────────
// TRANSLATIONS (English + Spanish)
// ─────────────────────────────────────────────
const T = {
  en: {
    appName: 'FormPath',
    tagline: 'Your guided immigration form assistant',
    findMyForm: 'Find My Form',
    continueWhere: 'Continue Where I Left Off',
    back: 'Back',
    next: 'Next',
    saveAndContinue: 'Save & Continue Later',
    reviewAnswers: 'Review My Answers',
    downloadPDF: 'Download PDF',
    startOver: 'Start a New Form',
    required: 'Required',
    optional: 'Optional',
    yes: 'Yes',
    no: 'No',
    step: 'Step',
    of: 'of',
    complete: 'complete',
    reviewTitle: 'Review Your Answers',
    reviewSubtitle: 'Check everything looks right before we generate your form.',
    edit: 'Edit',
    formComplete: 'Your form is ready!',
    completeSub: "We've prepared your completed form. Download it below.",
    nextSteps: 'Next Steps',
    whatFormNeed: 'What form do I need?',
    searchForms: 'Search forms…',
    allCategories: 'All',
    difficulty: 'Difficulty',
    time: 'Est. time',
    fee: 'Filing fee',
    startForm: 'Start this form',
    formReadiness: 'Form readiness',
    emptyRequired: 'Some required fields are still empty.',
    skipQuestion: 'Skip for now',
    tooltip: 'Why are we asking this?',
    langToggle: 'Español',
  },
  es: {
    appName: 'FormPath',
    tagline: 'Su asistente guiado de formularios de inmigración',
    findMyForm: 'Encontrar mi formulario',
    continueWhere: 'Continuar donde lo dejé',
    back: 'Atrás',
    next: 'Siguiente',
    saveAndContinue: 'Guardar y continuar después',
    reviewAnswers: 'Revisar mis respuestas',
    downloadPDF: 'Descargar PDF',
    startOver: 'Comenzar un nuevo formulario',
    required: 'Requerido',
    optional: 'Opcional',
    yes: 'Sí',
    no: 'No',
    step: 'Paso',
    of: 'de',
    complete: 'completo',
    reviewTitle: 'Revisa tus respuestas',
    reviewSubtitle: 'Verifica que todo esté correcto antes de generar tu formulario.',
    edit: 'Editar',
    formComplete: '¡Tu formulario está listo!',
    completeSub: 'Hemos preparado tu formulario completo. Descárgalo a continuación.',
    nextSteps: 'Próximos pasos',
    whatFormNeed: '¿Qué formulario necesito?',
    searchForms: 'Buscar formularios…',
    allCategories: 'Todos',
    difficulty: 'Dificultad',
    time: 'Tiempo est.',
    fee: 'Tarifa de presentación',
    startForm: 'Comenzar este formulario',
    formReadiness: 'Preparación del formulario',
    emptyRequired: 'Algunos campos obligatorios aún están vacíos.',
    skipQuestion: 'Omitir por ahora',
    tooltip: '¿Por qué preguntamos esto?',
    langToggle: 'English',
  },
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
const CATEGORIES = ['All', 'Family', 'Employment', 'Citizenship', 'Travel', 'Asylum']
const CATEGORY_ICONS = { All: '📋', Family: '👨‍👩‍👧', Employment: '💼', Citizenship: '🏛️', Travel: '✈️', Asylum: '🛡️' }
const DIFFICULTY_COLOR = { Easy: 'text-green-700 bg-green-50 border-green-200', Intermediate: 'text-amber-700 bg-amber-50 border-amber-200', Hard: 'text-red-700 bg-red-50 border-red-200' }

function computeReadiness(form, answers) {
  if (!form) return 0
  const allQs = form.sections.flatMap(s =>
    s.questions.filter(q => {
      if (!q.condition) return q.required
      return q.required && answers[q.condition.field] === q.condition.value
    })
  )
  if (allQs.length === 0) return 100
  const filled = allQs.filter(q => answers[q.id] && String(answers[q.id]).trim() !== '').length
  return Math.round((filled / allQs.length) * 100)
}

function totalSteps(form, answers) {
  return form.sections.reduce((acc, s, idx) => acc + getVisibleQuestions(form, idx, answers).length, 0)
}

function currentStepNumber(form, sectionIdx, questionIdx, answers) {
  let n = 0
  for (let i = 0; i < sectionIdx; i++) n += getVisibleQuestions(form, i, answers).length
  return n + questionIdx + 1
}

// ─────────────────────────────────────────────
// ICON COMPONENTS
// ─────────────────────────────────────────────
const Icon = {
  ChevronRight: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
  ChevronLeft:  () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
  Check:        () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>,
  Download:     () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Info:         () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Search:       () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Globe:        () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Home:         () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  Edit:         () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  Star:         () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Alert:        () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

// Tooltip
function Tooltip({ text }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex items-center ml-2">
      <button onClick={() => setOpen(v => !v)} aria-label="More info" className="text-navy-400 hover:text-amber-500 transition-colors">
        <Icon.Info />
      </button>
      {open && (
        <span className="absolute left-6 -top-1 z-50 w-64 bg-navy-900 text-white text-sm p-3 rounded-xl shadow-xl" role="tooltip">
          {text}
          <button onClick={() => setOpen(false)} className="block mt-2 text-amber-300 hover:text-amber-200 text-xs">Close</button>
        </span>
      )}
    </span>
  )
}

// Progress Bar
function ProgressBar({ current, total, label }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0
  return (
    <div className="w-full" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={total} aria-label={label}>
      <div className="flex justify-between text-xs text-stone-500 mb-1.5">
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-2.5 bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #1e3a5f 0%, #f59e0b 100%)' }}
        />
      </div>
    </div>
  )
}

// Breadcrumb
function Breadcrumb({ items, t }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-stone-500 flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-stone-300">/</span>}
          {item.onClick ? (
            <button onClick={item.onClick} className="hover:text-navy-700 transition-colors">{item.label}</button>
          ) : (
            <span className={i === items.length - 1 ? 'text-navy-800 font-semibold' : ''}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

// ─────────────────────────────────────────────
// QUESTION RENDERER
// ─────────────────────────────────────────────
function QuestionRenderer({ question, value, onChange, t, error }) {
  const inputRef = useRef(null)
  useEffect(() => { if (inputRef.current) inputRef.current.focus() }, [question.id])

  const baseInput = 'input-field'

  if (question.type === 'yes_no') {
    return (
      <div className="flex gap-4 mt-2" role="group" aria-label={question.label}>
        {['yes', 'no'].map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex-1 py-4 rounded-2xl border-2 font-bold text-lg transition-all duration-150 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:outline-none
              ${value === opt
                ? 'bg-navy-800 border-navy-800 text-white shadow-lg'
                : 'bg-white border-stone-200 text-navy-800 hover:border-navy-400 hover:bg-navy-50'
              }`}
            aria-pressed={value === opt}
          >
            {opt === 'yes' ? t.yes : t.no}
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'select') {
    return (
      <select
        ref={inputRef}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={`${baseInput} ${error ? 'border-red-400 focus:border-red-500' : ''}`}
        aria-required={question.required}
        aria-invalid={!!error}
        aria-describedby={error ? `${question.id}-error` : undefined}
      >
        <option value="">— Select one —</option>
        {question.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    )
  }

  if (question.type === 'textarea') {
    return (
      <textarea
        ref={inputRef}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={4}
        className={`${baseInput} resize-none ${error ? 'border-red-400' : ''}`}
        placeholder="Type your answer here…"
        aria-required={question.required}
        aria-invalid={!!error}
        aria-describedby={error ? `${question.id}-error` : undefined}
      />
    )
  }

  if (question.type === 'date') {
    return (
      <input
        ref={inputRef}
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={`${baseInput} ${error ? 'border-red-400' : ''}`}
        aria-required={question.required}
        aria-invalid={!!error}
        aria-describedby={error ? `${question.id}-error` : undefined}
        max={new Date().toISOString().split('T')[0]}
      />
    )
  }

  // Default: text
  return (
    <input
      ref={inputRef}
      type="text"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={`${baseInput} ${error ? 'border-red-400' : ''}`}
      placeholder="Type your answer here…"
      aria-required={question.required}
      aria-invalid={!!error}
      aria-describedby={error ? `${question.id}-error` : undefined}
    />
  )
}

// ─────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────
function HomeScreen({ dispatch, t }) {
  const savedForms = FORMS_DB.filter(f => loadFromStorage(f.formId))
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0e2746 0%, #163a69 60%, #1e4d8c 100%)' }}>
      {/* Hero */}
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="mb-6 flex items-center gap-3">
          <span className="text-5xl">🧭</span>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            FormPath
          </h1>
        </div>
        <p className="text-lg md:text-xl text-navy-200 mb-2 max-w-xl">{t.tagline}</p>
        <p className="text-stone-400 mb-10 max-w-lg text-sm md:text-base">
          Stop struggling with confusing government forms. We ask you simple questions and handle the rest.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => dispatch({ type: 'GO_CATALOG' })} className="btn-amber text-lg px-8 py-4">
            {t.findMyForm} <Icon.ChevronRight />
          </button>
          {savedForms.length > 0 && (
            <button onClick={() => dispatch({ type: 'GO_CATALOG' })} className="btn-secondary text-lg px-8 py-4 bg-white/10 border-white/30 text-white hover:bg-white/20">
              {t.continueWhere}
            </button>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="bg-stone-50 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-navy-900 text-center mb-12" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            How FormPath works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '🔍', title: 'Find your form', desc: 'Browse our catalog or take a short quiz to identify the right form for your situation.' },
              { icon: '✏️', title: 'Answer simple questions', desc: 'We walk you through each question in plain English — one at a time, with helpful guidance.' },
              { icon: '📄', title: 'Download your form', desc: 'Review your answers and download a completed, ready-to-submit immigration form.' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100 text-center hover:shadow-md transition-shadow">
                <span className="text-5xl mb-4 block">{f.icon}</span>
                <h3 className="text-xl font-bold text-navy-900 mb-2">{f.title}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category preview */}
      <div className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-navy-900 text-center mb-10" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            Available form categories
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {CATEGORIES.filter(c => c !== 'All').map(cat => (
              <button key={cat}
                onClick={() => dispatch({ type: 'GO_CATALOG' })}
                className="flex items-center gap-2 px-5 py-3 rounded-full border-2 border-navy-100 bg-navy-50 hover:bg-navy-100 transition-colors text-navy-800 font-semibold">
                <span>{CATEGORY_ICONS[cat]}</span> {cat}
              </button>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => dispatch({ type: 'GO_CATALOG' })} className="btn-primary px-10 py-4 text-lg">
              Browse all forms <Icon.ChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-navy-950 text-navy-400 text-center py-8 text-sm px-6">
        <p>FormPath is a guidance tool and does not provide legal advice.</p>
        <p className="mt-1">Always verify your completed forms with official USCIS resources at <span className="text-amber-400">uscis.gov</span></p>
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────
// FORM CATALOG
// ─────────────────────────────────────────────
function FormCatalog({ dispatch, t }) {
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('All')
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizResult, setQuizResult] = useState(null)

  const filtered = FORMS_DB.filter(f => {
    const matchCat = category === 'All' || f.category === category
    const q = search.toLowerCase()
    const matchSearch = !q || f.formId.toLowerCase().includes(q) || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  if (showQuiz) {
    return <FormQuiz t={t} onSelect={form => { setShowQuiz(false); dispatch({ type: 'SELECT_FORM', form }) }} onBack={() => setShowQuiz(false)} />
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-navy-900 py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => dispatch({ type: 'GO_HOME' })} className="flex items-center gap-2 text-navy-300 hover:text-white mb-6 transition-colors text-sm">
            <Icon.Home /> <Icon.ChevronLeft /> Home
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            Immigration Form Catalog
          </h1>
          <p className="text-navy-300 mb-6">Select a form to get started, or take our short quiz to find the right one.</p>

          {/* Search */}
          <div className="relative max-w-xl">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"><Icon.Search /></span>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.searchForms}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border-2 border-transparent focus:border-amber-400 focus:outline-none text-navy-900"
              aria-label="Search immigration forms"
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* "What form do I need?" quiz promo */}
        <button onClick={() => setShowQuiz(true)}
          className="w-full flex items-center gap-4 bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 mb-8 hover:bg-amber-100 transition-colors text-left">
          <span className="text-3xl">🤔</span>
          <div>
            <p className="font-bold text-amber-900 text-lg">{t.whatFormNeed}</p>
            <p className="text-amber-700 text-sm">Answer 1 question and we'll recommend the right form for you.</p>
          </div>
          <span className="ml-auto text-amber-600"><Icon.ChevronRight /></span>
        </button>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors
                ${category === cat
                  ? 'bg-navy-800 text-white'
                  : 'bg-white text-navy-700 border border-stone-200 hover:border-navy-300 hover:bg-navy-50'
                }`}
              aria-pressed={category === cat}
            >
              {CATEGORY_ICONS[cat]} {cat}
            </button>
          ))}
        </div>

        {/* Form cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-lg font-semibold">No forms found for "{search}"</p>
            <p className="text-sm mt-1">Try a different search term or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(form => {
              const saved = loadFromStorage(form.formId)
              const readiness = saved ? computeReadiness(form, saved) : 0
              return (
                <div key={form.formId} className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-4xl">{form.icon}</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${DIFFICULTY_COLOR[form.difficulty]}`}>
                        {t.difficulty}: {form.difficulty}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">{form.formId}</p>
                    <h3 className="text-lg font-bold text-navy-900 mb-2 leading-snug" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>{form.title}</h3>
                    <p className="text-stone-600 text-sm leading-relaxed mb-4">{form.description}</p>
                    <div className="flex gap-4 text-xs text-stone-500 border-t border-stone-100 pt-4">
                      <span>⏱ {form.estimatedTime}</span>
                      <span>💵 {form.filingFee}</span>
                      <span className="text-amber-600 font-semibold">{form.category}</span>
                    </div>
                    {saved && (
                      <div className="mt-3 pt-3 border-t border-stone-100">
                        <p className="text-xs text-stone-500 mb-1">Saved progress — {readiness}% {t.complete}</p>
                        <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${readiness}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="px-6 pb-6">
                    <button
                      onClick={() => dispatch({ type: 'SELECT_FORM', form })}
                      className="btn-primary w-full"
                    >
                      {saved ? 'Continue form' : t.startForm} <Icon.ChevronRight />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// HELPER QUIZ
// ─────────────────────────────────────────────
function FormQuiz({ t, onSelect, onBack }) {
  const q = QUIZ_QUESTIONS[0]
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 py-12">
      <div className="wizard-card text-center">
        <p className="text-5xl mb-4">🤔</p>
        <h2 className="text-2xl font-bold text-navy-900 mb-2" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
          {t.whatFormNeed}
        </h2>
        <p className="text-stone-600 mb-8 text-sm">Select the option that best describes your situation:</p>
        <div className="flex flex-col gap-3 text-left">
          {q.options.map((opt, i) => {
            const form = FORMS_DB.find(f => f.formId === opt.forms[0])
            return (
              <button key={i}
                onClick={() => form && onSelect(form)}
                className="flex items-center justify-between gap-4 p-4 rounded-xl border-2 border-stone-200 bg-white hover:border-navy-400 hover:bg-navy-50 transition-colors text-left">
                <div>
                  <p className="font-semibold text-navy-900">{opt.label}</p>
                  {form && <p className="text-xs text-amber-600 font-bold mt-0.5">{form.formId} — {form.shortTitle}</p>}
                </div>
                <Icon.ChevronRight />
              </button>
            )
          })}
        </div>
        <button onClick={onBack} className="mt-6 text-sm text-stone-500 hover:text-navy-700 transition-colors">
          ← Back to catalog
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// WIZARD ENGINE
// ─────────────────────────────────────────────
function WizardEngine({ state, dispatch, t }) {
  const { selectedForm: form, answers, currentSectionIdx, currentQuestionIdx, direction } = state
  const [error, setError] = useState(null)
  const [animKey, setAnimKey] = useState(0)

  const visibleQs   = getVisibleQuestions(form, currentSectionIdx, answers)
  const question    = visibleQs[currentQuestionIdx]
  const section     = form.sections[currentSectionIdx]
  const stepNum     = currentStepNumber(form, currentSectionIdx, currentQuestionIdx, answers)
  const totalStepsN = totalSteps(form, answers)
  const isLastQ     = currentSectionIdx === form.sections.length - 1 && currentQuestionIdx === visibleQs.length - 1

  // auto-save to localStorage on every answer change
  useEffect(() => { saveToStorage(form.formId, answers) }, [answers])

  // re-animate on question change
  useEffect(() => { setAnimKey(k => k + 1); setError(null) }, [question?.id, currentSectionIdx, currentQuestionIdx])

  const handleNext = () => {
    if (question.required && (!answers[question.id] || String(answers[question.id]).trim() === '')) {
      setError('This field is required. Please provide an answer before continuing.')
      return
    }
    setError(null)
    dispatch({ type: 'NEXT_QUESTION' })
  }

  const handleBack = () => {
    setError(null)
    dispatch({ type: 'PREV_QUESTION' })
  }

  if (!question) return null

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top bar */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <Breadcrumb
              t={t}
              items={[
                { label: 'Home', onClick: () => dispatch({ type: 'GO_HOME' }) },
                { label: 'Forms', onClick: () => dispatch({ type: 'GO_CATALOG' }) },
                { label: form.formId },
                { label: section.title },
              ]}
            />
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <span>{t.step} {stepNum} {t.of} {totalStepsN}</span>
            </div>
          </div>
          <ProgressBar current={stepNum} total={totalStepsN} label={`${form.formId}: ${form.shortTitle}`} />
        </div>
      </div>

      {/* Question card */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div
          key={animKey}
          className={`wizard-card ${direction === 'back' ? 'step-back' : 'step-enter'}`}
        >
          {/* Section badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              {section.title}
            </span>
          </div>

          {/* Question */}
          <div className="mb-6">
            <label className="label" htmlFor={question.id}>
              {question.label}
              {question.required
                ? <span className="text-red-500 ml-1" aria-label="required">*</span>
                : <span className="text-stone-400 text-sm font-normal ml-2">({t.optional})</span>
              }
              {question.hint && <Tooltip text={question.hint} />}
            </label>
            {question.hint && <p className="hint">{question.hint}</p>}

            <QuestionRenderer
              question={question}
              value={answers[question.id]}
              onChange={val => dispatch({ type: 'SET_ANSWER', id: question.id, value: val })}
              t={t}
              error={error}
            />

            {error && (
              <div id={`${question.id}-error`} role="alert" className="flex items-center gap-2 mt-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <Icon.Alert /> {error}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <button onClick={handleBack} className="btn-secondary">
              <Icon.ChevronLeft /> {t.back}
            </button>
            <div className="flex gap-3">
              {!question.required && (
                <button onClick={() => dispatch({ type: 'NEXT_QUESTION' })} className="text-sm text-stone-400 hover:text-navy-700 transition-colors">
                  {t.skipQuestion}
                </button>
              )}
              <button
                onClick={isLastQ ? () => dispatch({ type: 'GO_REVIEW' }) : handleNext}
                className="btn-primary"
              >
                {isLastQ ? t.reviewAnswers : t.next} <Icon.ChevronRight />
              </button>
            </div>
          </div>
        </div>

        {/* Save notice */}
        <p className="text-center text-xs text-stone-400 mt-6">
          💾 Your progress is automatically saved to this browser.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// REVIEW SCREEN
// ─────────────────────────────────────────────
function ReviewScreen({ state, dispatch, t }) {
  const { selectedForm: form, answers } = state
  const readiness = computeReadiness(form, answers)
  const [editingId, setEditingId] = useState(null)

  const allQs = form.sections.flatMap(s => s.questions)

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-navy-900 py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <Breadcrumb t={t} items={[
            { label: 'Home', onClick: () => dispatch({ type: 'GO_HOME' }) },
            { label: form.formId, onClick: () => dispatch({ type: 'GO_CATALOG' }) },
            { label: 'Review' },
          ]} />
          <h1 className="text-3xl font-bold text-white mt-4 mb-2" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            {t.reviewTitle}
          </h1>
          <p className="text-navy-300 text-sm">{t.reviewSubtitle}</p>

          {/* Readiness indicator */}
          <div className="mt-6 bg-navy-800/60 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold">{t.formReadiness}</span>
              <span className={`text-2xl font-bold ${readiness === 100 ? 'text-green-400' : readiness >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                {readiness}%
              </span>
            </div>
            <div className="h-3 bg-navy-900 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${readiness}%`, background: readiness === 100 ? '#22c55e' : readiness >= 80 ? '#f59e0b' : '#ef4444' }}
              />
            </div>
            {readiness < 100 && (
              <p className="text-amber-300 text-xs mt-2 flex items-center gap-1">
                <Icon.Alert /> {t.emptyRequired}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {form.sections.map(section => {
          const visibleQs = section.questions.filter(q => {
            if (!q.condition) return true
            return answers[q.condition.field] === q.condition.value
          })
          if (visibleQs.length === 0) return null
          return (
            <div key={section.id} className="bg-white rounded-2xl shadow-sm border border-stone-100 mb-6 overflow-hidden">
              <div className="bg-navy-50 border-b border-stone-200 px-6 py-4">
                <h2 className="text-lg font-bold text-navy-900">{section.title}</h2>
              </div>
              <div className="divide-y divide-stone-100">
                {visibleQs.map(q => {
                  const val = answers[q.id]
                  const isEmpty = !val || String(val).trim() === ''
                  const isEditing = editingId === q.id
                  return (
                    <div key={q.id} className={`px-6 py-4 ${isEmpty && q.required ? 'bg-red-50' : ''}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-0.5">{q.label}</p>
                          {isEditing ? (
                            <div className="mt-2">
                              <QuestionRenderer
                                question={q}
                                value={answers[q.id]}
                                onChange={val => dispatch({ type: 'SET_ANSWER', id: q.id, value: val })}
                                t={t}
                                error={null}
                              />
                              <button
                                onClick={() => setEditingId(null)}
                                className="mt-2 text-sm text-navy-700 font-semibold hover:underline"
                              >
                                Done editing
                              </button>
                            </div>
                          ) : (
                            <p className={`text-sm mt-1 ${isEmpty ? 'text-red-400 italic' : 'text-navy-900'}`}>
                              {isEmpty
                                ? (q.required ? '⚠ Required — please fill in' : 'Not answered')
                                : (val === 'yes' ? '✓ Yes' : val === 'no' ? '✗ No' : String(val))
                              }
                            </p>
                          )}
                        </div>
                        {!isEditing && (
                          <button
                            onClick={() => setEditingId(q.id)}
                            className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-900 bg-navy-50 hover:bg-navy-100 border border-navy-200 rounded-lg px-3 py-1.5 transition-colors mt-1"
                            aria-label={`Edit ${q.label}`}
                          >
                            <Icon.Edit /> {t.edit}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button onClick={() => dispatch({ type: 'JUMP_TO', sectionIdx: 0, questionIdx: 0 })} className="btn-secondary">
            <Icon.ChevronLeft /> Back to form
          </button>
          <button onClick={() => dispatch({ type: 'GO_COMPLETE' })} className="btn-amber flex-1 py-4 text-lg">
            {t.downloadPDF} <Icon.Download />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPLETE / DOWNLOAD SCREEN
// ─────────────────────────────────────────────
function DownloadScreen({ state, dispatch, t }) {
  const { selectedForm: form, answers } = state
  const [downloaded, setDownloaded] = useState(false)

  const handleDownload = () => {
    // Build a field map (mock PDF generation)
    const fieldMap = {}
    form.sections.forEach(section => {
      section.questions.forEach(q => {
        if (answers[q.id] !== undefined) {
          fieldMap[q.pdfFieldMapping] = answers[q.id]
        }
      })
    })
    console.log(`[FormPath] Mock PDF field map for ${form.formId}:`, fieldMap)

    // Create a text blob simulating a completed form
    const lines = [`FORM ${form.formId} — ${form.title.toUpperCase()}`, '='.repeat(60), '']
    form.sections.forEach(section => {
      lines.push(`\n--- ${section.title.toUpperCase()} ---`)
      section.questions.forEach(q => {
        const val = answers[q.id]
        if (val) lines.push(`${q.label}\n  → ${val === 'yes' ? 'Yes' : val === 'no' ? 'No' : val}`)
      })
    })
    lines.push('\n' + '='.repeat(60))
    lines.push('Generated by FormPath — formpath.vercel.app')
    lines.push('IMPORTANT: This is a guided summary. File the official USCIS form.')

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.formId}_FormPath_Summary.txt`
    a.click()
    URL.revokeObjectURL(url)
    setDownloaded(true)
    clearStorage(form.formId)
  }

  const nextStepsMap = {
    'I-90': [
      { icon: '📋', text: 'Mail your completed I-90, fee payment, and supporting documents to USCIS.' },
      { icon: '💳', text: `Pay the ${form.filingFee} filing fee by check or money order payable to "U.S. Department of Homeland Security".` },
      { icon: '📸', text: 'Include 2 identical passport-style photos if required.' },
      { icon: '📬', text: 'USCIS will mail a biometrics appointment notice within a few weeks.' },
      { icon: '🔗', text: 'Track your case at uscis.gov/my-case-status.' },
    ],
    'N-400': [
      { icon: '📋', text: 'Submit your N-400, supporting documents, and filing fee to the correct USCIS Lockbox facility.' },
      { icon: '💵', text: `Pay the ${form.filingFee} filing fee (income-based fee waivers may be available).` },
      { icon: '📸', text: 'Include 2 passport-style photos.' },
      { icon: '📬', text: 'After filing, USCIS will schedule a biometrics appointment, then an interview.' },
      { icon: '📚', text: 'Prepare for your civics and English test at your interview using uscis.gov/citizenship.' },
    ],
    'I-131': [
      { icon: '📋', text: 'File your I-131 with USCIS before you travel — do NOT leave the U.S. before it is approved (for Advance Parole).' },
      { icon: '💵', text: `Pay the ${form.filingFee} filing fee.` },
      { icon: '📸', text: 'Include 2 passport-style photos.' },
      { icon: '⏳', text: 'Processing takes approximately 3–5 months. Apply well in advance of your planned travel.' },
      { icon: '🔗', text: 'Track your case at uscis.gov/my-case-status.' },
    ],
  }

  const steps = nextStepsMap[form.formId] || []

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Success header */}
      <div className="text-center py-16 px-6" style={{ background: 'linear-gradient(135deg, #0e2746 0%, #163a69 100%)' }}>
        <div className="text-7xl mb-6 animate-bounce">🎉</div>
        <h1 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
          {t.formComplete}
        </h1>
        <p className="text-navy-300 text-lg mb-8 max-w-lg mx-auto">{t.completeSub}</p>
        <button
          onClick={handleDownload}
          className="btn-amber text-xl px-10 py-5 shadow-2xl shadow-amber-500/30"
        >
          <Icon.Download /> {t.downloadPDF}
        </button>
        {downloaded && (
          <p className="mt-4 text-green-400 text-sm flex items-center justify-center gap-2">
            <Icon.Check /> Downloaded! Check your downloads folder.
          </p>
        )}
        <p className="mt-4 text-navy-400 text-xs max-w-sm mx-auto">
          This generates a plain-text summary. For the actual USCIS form, visit uscis.gov and complete the official PDF.
        </p>
      </div>

      {/* Next steps */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-navy-900 mb-6" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
          {t.nextSteps}
        </h2>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-4 bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
              <span className="text-2xl shrink-0">{step.icon}</span>
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <p className="text-stone-700 text-sm leading-relaxed">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Official resource link */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="text-amber-800 font-semibold mb-2">📎 Official USCIS Resources</p>
          <p className="text-amber-700 text-sm">Download the official blank {form.formId} form and instructions at:</p>
          <p className="text-amber-600 font-bold mt-1 text-sm">uscis.gov/forms/{form.formId.toLowerCase()}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mt-10">
          <button onClick={() => dispatch({ type: 'GO_CATALOG' })} className="btn-secondary flex-1">
            {t.startOver}
          </button>
          <button onClick={() => dispatch({ type: 'GO_HOME' })} className="btn-primary flex-1">
            <Icon.Home /> Return Home
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// LANGUAGE SWITCHER
// ─────────────────────────────────────────────
function LanguageSwitcher({ lang, dispatch }) {
  return (
    <button
      onClick={() => dispatch({ type: 'SET_LANG', lang: lang === 'en' ? 'es' : 'en' })}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-navy-900 text-white rounded-full shadow-xl hover:bg-navy-700 transition-colors text-sm font-semibold"
      aria-label="Toggle language"
    >
      <Icon.Globe />
      {lang === 'en' ? 'Español' : 'English'}
    </button>
  )
}

// ─────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const t = T[state.lang]

  return (
    <div className="font-sans text-navy-900 min-h-screen">
      <LanguageSwitcher lang={state.lang} dispatch={dispatch} />

      {state.screen === SCREENS.HOME     && <HomeScreen   dispatch={dispatch} t={t} />}
      {state.screen === SCREENS.CATALOG  && <FormCatalog  dispatch={dispatch} t={t} />}
      {state.screen === SCREENS.WIZARD   && <WizardEngine  state={state}   dispatch={dispatch} t={t} />}
      {state.screen === SCREENS.REVIEW   && <ReviewScreen  state={state}   dispatch={dispatch} t={t} />}
      {state.screen === SCREENS.COMPLETE && <DownloadScreen state={state}  dispatch={dispatch} t={t} />}
    </div>
  )
}
