// FormPath — Immigration Form Guidance Portal
// Single-file React application | Vite + Tailwind
import { useState, useReducer, useEffect, useCallback, useRef } from 'react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

// ─────────────────────────────────────────────
// FORM DATA — question flows for I-90, N-400, I-131
// Each question's pdfFieldMapping is kept for display; actual PDF fields
// are in FIELD_DRAW_MAP below.
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
        id: 'uscis_numbers',
        title: 'USCIS & Government Numbers',
        questions: [
          { id: 'alien_number',  label: 'What is your Alien Registration Number (A-Number)?', hint: 'Your A-Number is 8–9 digits. Find it on your Green Card — starts with "A".',   type: 'text', required: true,  pdfFieldMapping: 'P1_Line1_AlienNumber[0]' },
          { id: 'uscis_account', label: 'What is your USCIS Online Account Number? (if any)', hint: 'A 12-digit number from your USCIS online account. Leave blank if none.',       type: 'text', required: false, pdfFieldMapping: 'P1_Line2_AcctIdentifier[0]' },
        ],
      },
      {
        id: 'personal_info',
        title: 'Personal Information',
        questions: [
          { id: 'family_name',    label: 'What is your family name (last name)?',             hint: 'Enter exactly as it appears on your current Green Card.',    type: 'text',   required: true,  pdfFieldMapping: 'P1_Line3a_FamilyName[0]' },
          { id: 'given_name',     label: 'What is your given name (first name)?',             hint: 'Enter your first name as it appears on your current card.',  type: 'text',   required: true,  pdfFieldMapping: 'P1_Line3b_GivenName[0]' },
          { id: 'middle_name',    label: 'What is your middle name? (if any)',                hint: 'Leave blank if you have no middle name.',                    type: 'text',   required: false, pdfFieldMapping: 'P1_Line3c_MiddleName[0]' },
          { id: 'other_names',    label: 'Have you used any other legal names?',              hint: 'Include maiden names, aliases, or name changes.',            type: 'yes_no', required: true,  pdfFieldMapping: 'P1_checkbox4[0]' },
          { id: 'other_family',   label: 'Other name — family name (last name)',              hint: 'Enter the other family name you have used.',                 type: 'text',   required: true,  pdfFieldMapping: 'P1_Line5a_FamilyName[0]', condition: { field: 'other_names', value: 'yes' } },
          { id: 'other_given',    label: 'Other name — given name (first name)',              hint: '',                                                           type: 'text',   required: true,  pdfFieldMapping: 'P1_Line5b_GivenName[0]',  condition: { field: 'other_names', value: 'yes' } },
          { id: 'other_middle',   label: 'Other name — middle name (if any)',                hint: '',                                                           type: 'text',   required: false, pdfFieldMapping: 'P1_Line5c_MiddleName[0]', condition: { field: 'other_names', value: 'yes' } },
          { id: 'dob',            label: 'What is your date of birth?',                      hint: 'Enter in MM/DD/YYYY format.',                                type: 'date',   required: true,  pdfFieldMapping: 'P1_Line9_DateOfBirth[0]' },
          { id: 'city_of_birth',  label: 'What city or town were you born in?',              hint: 'Enter the city/town as it is known today.',                 type: 'text',   required: true,  pdfFieldMapping: 'P1_Line10_CityTownOfBirth[0]' },
          { id: 'country_birth',  label: 'What country were you born in?',                   hint: 'Use the current country name.',                              type: 'text',   required: true,  pdfFieldMapping: 'P1_Line11_CountryofBirth[0]' },
          { id: 'sex',            label: 'What is your sex?',                                hint: 'Select as it appears on your official documents.',           type: 'select', required: true,  pdfFieldMapping: 'P1_Line8_male[0]', options: ['Male', 'Female'] },
          { id: 'mother_name',    label: "What is your mother's first (given) name?",        hint: 'Enter her first name at the time of your birth.',            type: 'text',   required: true,  pdfFieldMapping: 'P1_Line12_MotherGivenName[0]' },
          { id: 'father_name',    label: "What is your father's first (given) name?",        hint: 'Enter his first name at the time of your birth.',            type: 'text',   required: true,  pdfFieldMapping: 'P1_Line13_FatherGivenName[0]' },
          { id: 'class_of_admission', label: 'What was your class of admission?',            hint: 'This is the visa type used to enter the U.S. (e.g., IR1, F2A, DV). Found on your Green Card.',  type: 'text', required: true, pdfFieldMapping: 'P1_Line14_ClassOfAdmission[0]' },
          { id: 'date_of_admission',  label: 'What was your date of admission?',             hint: 'The date you were admitted as a permanent resident. Check your Green Card.',    type: 'date', required: true, pdfFieldMapping: 'P1_Line15_DateOfAdmission[0]' },
          { id: 'ssn',            label: 'What is your Social Security Number? (if any)',     hint: 'Format: XXX-XX-XXXX. Leave blank if not issued.',            type: 'text',   required: false, pdfFieldMapping: 'P1_Line16_SSN[0]' },
        ],
      },
      {
        id: 'address',
        title: 'Mailing Address',
        questions: [
          { id: 'street_address', label: 'What is your current mailing street address?', hint: 'Street number and name. Do not include apt/unit here.',    type: 'text', required: true,  pdfFieldMapping: 'P1_Line6b_StreetNumberName[0]' },
          { id: 'apt_number',     label: 'Apt/Ste/Flr number (if any)',                 hint: 'Leave blank if not applicable.',                          type: 'text', required: false, pdfFieldMapping: 'P1_Line6c_AptSteFlrNumber[0]' },
          { id: 'city',           label: 'City or town',                                hint: '',                                                        type: 'text', required: true,  pdfFieldMapping: 'P1_Line6d_CityOrTown[0]' },
          { id: 'state',          label: 'State',                                       hint: 'Two-letter abbreviation (e.g., CA, TX, NY).',            type: 'text', required: true,  pdfFieldMapping: 'P1_Line6e_State[0]' },
          { id: 'zip',            label: 'ZIP code',                                    hint: '',                                                        type: 'text', required: true,  pdfFieldMapping: 'P1_Line6f_ZipCode[0]' },
          { id: 'phys_same',      label: 'Is your physical address the same as your mailing address?', hint: 'If you live somewhere different from where you receive mail, answer No.', type: 'yes_no', required: true, pdfFieldMapping: '' },
          { id: 'phys_street',    label: 'Physical address — street number and name',   hint: '',                                                        type: 'text', required: true,  pdfFieldMapping: 'P1_Line7a_StreetNumberName[0]', condition: { field: 'phys_same', value: 'no' } },
          { id: 'phys_apt',       label: 'Physical address — apt/ste/flr (if any)',     hint: '',                                                        type: 'text', required: false, pdfFieldMapping: 'P1_Line7b_AptSteFlrNumber[0]', condition: { field: 'phys_same', value: 'no' } },
          { id: 'phys_city',      label: 'Physical address — city or town',             hint: '',                                                        type: 'text', required: true,  pdfFieldMapping: 'P1_Line7c_CityOrTown[0]',      condition: { field: 'phys_same', value: 'no' } },
          { id: 'phys_state',     label: 'Physical address — state',                    hint: 'Two-letter abbreviation.',                               type: 'text', required: true,  pdfFieldMapping: 'P1_Line7d_State[0]',            condition: { field: 'phys_same', value: 'no' } },
          { id: 'phys_zip',       label: 'Physical address — ZIP code',                 hint: '',                                                        type: 'text', required: true,  pdfFieldMapping: 'P1_Line7e_ZipCode[0]',          condition: { field: 'phys_same', value: 'no' } },
        ],
      },
      {
        id: 'card_info',
        title: 'Replacement Reason',
        questions: [
          { id: 'replace_reason', label: 'Why are you applying for a new Green Card?',
            hint: 'Choose the reason that best matches your situation. This determines Part 2 of the form.',
            type: 'select', required: true,  pdfFieldMapping: 'P2_checkbox2[5]',
            options: [
              'My card was lost, stolen, or destroyed',
              'My existing card has been mutilated or damaged',
              'My card was issued with incorrect information (my error)',
              'My name or other biographic information changed',
              'My 10-year card will expire within 6 months or has expired',
              'My 2-year conditional card will expire within 6 months or has expired',
              'I never received my previous card (USCIS error)',
              'I am removing conditions on my permanent residence',
            ] },
        ],
      },
      {
        id: 'processing',
        title: 'Processing Information',
        questions: [
          { id: 'visa_location',  label: 'Where did you apply for your immigrant visa?', hint: 'City and country where the U.S. embassy or consulate was located. Enter "N/A" if you adjusted status inside the U.S.', type: 'text', required: false, pdfFieldMapping: 'P3_Line1_LocationAppliedVisa[0]' },
          { id: 'visa_issued',    label: 'Where was your immigrant visa issued?',         hint: 'Same location in most cases. Enter "N/A" if you adjusted status inside the U.S.',                                    type: 'text', required: false, pdfFieldMapping: 'P3_Line2_LocationIssuedVisa[0]' },
        ],
      },
      {
        id: 'physical',
        title: 'Physical Description',
        questions: [
          { id: 'height_ft',  label: 'Height — feet',                    hint: 'Enter only the feet portion (e.g., 5).',          type: 'text',   required: true, pdfFieldMapping: 'P3_Line8_HeightFeet[0]' },
          { id: 'height_in',  label: 'Height — inches',                  hint: 'Enter only the inches portion (e.g., 9).',         type: 'text',   required: true, pdfFieldMapping: 'P3_Line8_HeightInches[0]' },
          { id: 'weight',     label: 'Weight in pounds',                  hint: 'Enter a whole number (e.g., 150).',               type: 'text',   required: true, pdfFieldMapping: 'P3_Line9_Weight' },
          { id: 'eye_color',  label: 'What color are your eyes?',         hint: 'Select the closest match.',                       type: 'select', required: true, pdfFieldMapping: 'P3_checkbox10',
            options: ['Black', 'Blue', 'Brown', 'Gray', 'Green', 'Hazel', 'Maroon', 'Pink/Multi-Colored', 'Unknown/Other'] },
          { id: 'hair_color', label: 'What color is your hair?',          hint: 'Select the closest match.',                       type: 'select', required: true, pdfFieldMapping: 'P3_checkbox11',
            options: ['Bald (no hair)', 'Black', 'Blond/Yellow', 'Brown', 'Gray/Partially Gray', 'Red/Auburn', 'Sandy', 'White', 'Unknown/Other'] },
          { id: 'ethnicity',  label: 'What is your ethnicity?',           hint: 'Select one.',                                     type: 'select', required: true, pdfFieldMapping: 'P3_checkbox6',
            options: ['Hispanic or Latino', 'Not Hispanic or Latino'] },
          { id: 'race',       label: 'What is your race?',                hint: 'Select the option that best applies to you.',     type: 'select', required: true, pdfFieldMapping: 'P3_checkbox7',
            options: ['White', 'Asian', 'Black or African American', 'American Indian or Alaska Native', 'Native Hawaiian or Other Pacific Islander'] },
        ],
      },
      {
        id: 'contact',
        title: 'Contact Information',
        questions: [
          { id: 'daytime_phone', label: 'Daytime phone number', hint: 'Include area code. Example: (555) 123-4567.',  type: 'text', required: true,  pdfFieldMapping: 'P5_Line3_DaytimePhoneNumber[0]' },
          { id: 'mobile_phone',  label: 'Mobile phone number',  hint: 'Leave blank if none or same as daytime.',      type: 'text', required: false, pdfFieldMapping: 'P5_Line4_MobilePhoneNumber[0]' },
          { id: 'email',         label: 'Email address',        hint: 'USCIS may send case updates to this address.', type: 'text', required: false, pdfFieldMapping: 'P5_Line5_EmailAddress[0]' },
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
          { id: 'family_name',     label: 'Family name (last name)',                                hint: 'Exactly as it appears on your Green Card.',                             type: 'text',   required: true,  pdfFieldMapping: 'P2_Line1_FamilyName[0]' },
          { id: 'given_name',      label: 'Given name (first name)',                                hint: '',                                                                      type: 'text',   required: true,  pdfFieldMapping: 'P2_Line1_GivenName[0]' },
          { id: 'middle_name',     label: 'Middle name (if any)',                                   hint: 'Leave blank if none.',                                                  type: 'text',   required: false, pdfFieldMapping: 'P2_Line1_MiddleName[0]' },
          { id: 'name_change',     label: 'Would you like to legally change your name when you become a citizen?', hint: 'You can request a name change as part of naturalization.', type: 'yes_no', required: true, pdfFieldMapping: 'P2_Line34_NameChange[0]' },
          { id: 'new_family_name', label: 'Desired new family name (last name)',                    hint: 'Enter the new last name you want.',                                      type: 'text',   required: true,  pdfFieldMapping: 'Part2Line3_FamilyName[0]',  condition: { field: 'name_change', value: 'yes' } },
          { id: 'new_given_name',  label: 'Desired new given name (first name)',                    hint: '',                                                                      type: 'text',   required: false, pdfFieldMapping: 'Part2Line4a_GivenName[0]',  condition: { field: 'name_change', value: 'yes' } },
          { id: 'other_names',     label: 'Have you used any other names since birth?',             hint: 'Include married names, nicknames on official docs, and aliases.',       type: 'yes_no', required: true,  pdfFieldMapping: 'Line2_FamilyName1[0]' },
          { id: 'other_family1',   label: 'Other name — family name',                               hint: 'First other legal name you have used.',                                 type: 'text',   required: true,  pdfFieldMapping: 'Line2_FamilyName1[0]', condition: { field: 'other_names', value: 'yes' } },
          { id: 'other_given1',    label: 'Other name — given name',                                hint: '',                                                                      type: 'text',   required: true,  pdfFieldMapping: 'Line3_GivenName1[0]',  condition: { field: 'other_names', value: 'yes' } },
          { id: 'alien_number',    label: 'Alien Registration Number (A-Number)',                   hint: 'Found on your Green Card, starts with "A".',                            type: 'text',   required: true,  pdfFieldMapping: 'Line1_AlienNumber[0]' },
          { id: 'uscis_account',   label: 'USCIS Online Account Number (if any)',                   hint: '12-digit number. Leave blank if none.',                                  type: 'text',   required: false, pdfFieldMapping: 'P2_Line6_USCISELISAcctNumber[0]' },
          { id: 'ssn',             label: 'Social Security Number',                                 hint: 'Format: XXX-XX-XXXX.',                                                  type: 'text',   required: false, pdfFieldMapping: 'Line12b_SSN[0]' },
          { id: 'dob',             label: 'Date of birth',                                          hint: 'MM/DD/YYYY',                                                            type: 'date',   required: true,  pdfFieldMapping: 'P2_Line8_DateOfBirth[0]' },
          { id: 'sex',             label: 'Sex',                                                    hint: '',                                                                      type: 'select', required: true,  pdfFieldMapping: 'P2_Line7_Gender[0]', options: ['Male', 'Female'] },
          { id: 'country_birth',   label: 'Country of birth',                                       hint: 'Use the current name of the country.',                                  type: 'text',   required: true,  pdfFieldMapping: 'P2_Line10_CountryOfBirth[0]' },
          { id: 'country_citizen', label: 'Country of current citizenship or nationality',          hint: 'If dual citizen, list your primary country.',                           type: 'text',   required: true,  pdfFieldMapping: 'P2_Line11_CountryOfNationality[0]' },
          { id: 'pr_date',         label: 'Date you became a Permanent Resident',                   hint: 'Date on the front of your Green Card.',                                 type: 'date',   required: true,  pdfFieldMapping: 'P2_Line9_DateBecamePermanentResident[0]' },
        ],
      },
      {
        id: 'address',
        title: 'Your Address',
        questions: [
          { id: 'street_address',  label: 'Current home street address',       hint: 'Street number and name. No apt number here.',         type: 'text', required: true,  pdfFieldMapping: 'P4_Line1_StreetName[0]' },
          { id: 'apt_number',      label: 'Apt/Ste/Flr number (if any)',       hint: 'Leave blank if not applicable.',                      type: 'text', required: false, pdfFieldMapping: 'P4_Line1_InCareOfName[0]' },
          { id: 'city',            label: 'City or town',                      hint: '',                                                    type: 'text', required: true,  pdfFieldMapping: 'P4_Line1_City[0]' },
          { id: 'state',           label: 'State',                             hint: 'Two-letter abbreviation (e.g., CA).',                type: 'text', required: true,  pdfFieldMapping: 'P4_Line1_State[0]' },
          { id: 'zip',             label: 'ZIP code',                          hint: '',                                                    type: 'text', required: true,  pdfFieldMapping: 'P4_Line1_ZipCode[0]' },
          { id: 'phone',           label: 'Daytime phone number',              hint: 'USCIS will call this to schedule your interview.',    type: 'text', required: true,  pdfFieldMapping: 'P12_Line3_Telephone[0]' },
          { id: 'mobile_phone',    label: 'Mobile phone number (if any)',      hint: '',                                                    type: 'text', required: false, pdfFieldMapping: 'P12_Line3_Mobile[0]' },
          { id: 'email',           label: 'Email address',                     hint: '',                                                    type: 'text', required: false, pdfFieldMapping: 'P12_Line5_Email[0]' },
        ],
      },
      {
        id: 'residency',
        title: 'Permanent Residence & Travel',
        questions: [
          { id: 'outside_trips',   label: 'Have you taken any trips outside the U.S. in the past 5 years?', hint: 'Trips over 6 months can affect your eligibility.', type: 'yes_no', required: true, pdfFieldMapping: '' },
          { id: 'trip1_left',      label: 'Trip 1 — Date you left the U.S.',   hint: 'MM/DD/YYYY', type: 'date', required: false, pdfFieldMapping: 'P8_Line1_DateLeft1[0]',   condition: { field: 'outside_trips', value: 'yes' } },
          { id: 'trip1_returned',  label: 'Trip 1 — Date you returned',        hint: 'MM/DD/YYYY', type: 'date', required: false, pdfFieldMapping: 'P8_Line1_DateReturn1[0]', condition: { field: 'outside_trips', value: 'yes' } },
          { id: 'trip2_left',      label: 'Trip 2 — Date you left (if any)',   hint: '',           type: 'date', required: false, pdfFieldMapping: 'P8_Line1_DateLeft2[0]',   condition: { field: 'outside_trips', value: 'yes' } },
          { id: 'trip2_returned',  label: 'Trip 2 — Date you returned',        hint: '',           type: 'date', required: false, pdfFieldMapping: 'P8_Line1_DateReturn2[0]', condition: { field: 'outside_trips', value: 'yes' } },
          { id: 'trip3_left',      label: 'Trip 3 — Date you left (if any)',   hint: '',           type: 'date', required: false, pdfFieldMapping: 'P8_Line1_DateLeft3[0]',   condition: { field: 'outside_trips', value: 'yes' } },
          { id: 'trip3_returned',  label: 'Trip 3 — Date you returned',        hint: '',           type: 'date', required: false, pdfFieldMapping: 'P8_Line1_DateReturn3[0]', condition: { field: 'outside_trips', value: 'yes' } },
          { id: 'claim_nonresident', label: 'Have you ever claimed to be a non-U.S. resident for tax purposes?', hint: 'Includes filing as a "non-resident alien" on taxes.', type: 'yes_no', required: true, pdfFieldMapping: '' },
        ],
      },
      {
        id: 'marital_status',
        title: 'Marital History',
        questions: [
          { id: 'times_married',   label: 'How many times have you been married in total?',   hint: 'Include current marriage. Enter 0 if never married.',    type: 'text',   required: true,  pdfFieldMapping: 'Part9Line3_TimesMarried[0]' },
          { id: 'marital_status',  label: 'Current marital status',                           hint: '',                                                       type: 'select', required: true,  pdfFieldMapping: 'P10_Line1_MaritalStatus[1]',
            options: ['Single (never married)', 'Married', 'Divorced', 'Widowed', 'Separated'] },
          { id: 'spouse_family',   label: "Spouse's family name (last name)",                 hint: '',                                                       type: 'text',   required: true,  pdfFieldMapping: 'P10_Line4a_FamilyName[0]',  condition: { field: 'marital_status', value: 'Married' } },
          { id: 'spouse_given',    label: "Spouse's given name (first name)",                 hint: '',                                                       type: 'text',   required: true,  pdfFieldMapping: 'P10_Line4a_GivenName[0]',   condition: { field: 'marital_status', value: 'Married' } },
          { id: 'spouse_middle',   label: "Spouse's middle name (if any)",                    hint: '',                                                       type: 'text',   required: false, pdfFieldMapping: 'P10_Line4a_MiddleName[0]',  condition: { field: 'marital_status', value: 'Married' } },
          { id: 'spouse_dob',      label: "Spouse's date of birth",                           hint: 'MM/DD/YYYY',                                             type: 'date',   required: true,  pdfFieldMapping: 'P10_Line4d_DateofBirth[0]', condition: { field: 'marital_status', value: 'Married' } },
          { id: 'spouse_marriage_date', label: 'Date you were married',                       hint: 'MM/DD/YYYY',                                             type: 'date',   required: true,  pdfFieldMapping: 'P10_Line4e_DateEnterMarriage[0]', condition: { field: 'marital_status', value: 'Married' } },
          { id: 'spouse_citizen',  label: 'Is your spouse a U.S. citizen?',                   hint: 'If yes, you may qualify under the 3-year rule.',         type: 'yes_no', required: true,  pdfFieldMapping: 'P10_Line5_Citizen[0]',      condition: { field: 'marital_status', value: 'Married' } },
        ],
      },
      {
        id: 'employment',
        title: 'Employment',
        questions: [
          { id: 'employer_name',   label: 'Current employer name (or most recent)',          hint: 'Full legal name of employer. Enter "Unemployed" if not employed.', type: 'text', required: true, pdfFieldMapping: 'P7_EmployerName1[0]' },
          { id: 'employer_city',   label: 'Employer city',                                   hint: '',                                                                 type: 'text', required: true, pdfFieldMapping: 'P7_City1[0]' },
          { id: 'employer_state',  label: 'Employer state',                                  hint: 'Two-letter abbreviation.',                                         type: 'text', required: true, pdfFieldMapping: 'P7_State1[0]' },
          { id: 'occupation',      label: 'Your occupation or job title',                    hint: '',                                                                 type: 'text', required: true, pdfFieldMapping: 'P7_OccupationFieldStudy1[0]' },
        ],
      },
      {
        id: 'good_moral_character',
        title: 'Background & Character',
        questions: [
          { id: 'ever_arrested',   label: 'Have you ever been arrested, cited, or detained by any law enforcement officer?', hint: 'Include all incidents, even if charges were dropped or expunged.', type: 'yes_no', required: true, pdfFieldMapping: '' },
          { id: 'ever_convicted',  label: 'Have you ever been convicted of a crime?', hint: 'Include any conviction, even if you received a pardon.',                  type: 'yes_no', required: true, pdfFieldMapping: '' },
          { id: 'failed_taxes',    label: 'Have you ever failed to file a required federal, state, or local tax return?',   hint: 'If not required to file, answer No.', type: 'yes_no', required: true, pdfFieldMapping: '' },
          { id: 'communist',       label: 'Have you ever been a member of or associated with the Communist Party?',         hint: 'USCIS verifies this through records.',  type: 'yes_no', required: true, pdfFieldMapping: '' },
          { id: 'removal_proceedings', label: 'Are you currently in removal (deportation) proceedings?', hint: 'If yes, consult an immigration attorney before filing.', type: 'yes_no', required: true, pdfFieldMapping: '' },
          { id: 'support_constitution', label: 'Do you support and believe in the U.S. Constitution and form of government?', hint: 'Required for citizenship.', type: 'yes_no', required: true, pdfFieldMapping: '' },
          { id: 'bear_arms',       label: 'Are you willing to bear arms on behalf of the United States when required by law?', hint: 'You may request an exemption based on religious beliefs.', type: 'yes_no', required: true, pdfFieldMapping: '' },
        ],
      },
      {
        id: 'english_civics',
        title: 'English & Civics',
        questions: [
          { id: 'reads_english',  label: 'Can you read English?',  hint: 'You will demonstrate this at your interview.', type: 'yes_no', required: true, pdfFieldMapping: '' },
          { id: 'writes_english', label: 'Can you write English?', hint: '',                                             type: 'yes_no', required: true, pdfFieldMapping: '' },
          { id: 'speaks_english', label: 'Can you speak English?', hint: '',                                             type: 'yes_no', required: true, pdfFieldMapping: '' },
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
          { id: 'family_name',     label: 'Family name (last name)',                hint: 'Exactly as it appears on your immigration documents.',     type: 'text',   required: true,  pdfFieldMapping: 'Part2_Line1_FamilyName[0]' },
          { id: 'given_name',      label: 'Given name (first name)',                hint: '',                                                         type: 'text',   required: true,  pdfFieldMapping: 'Part2_Line1_GivenName[0]' },
          { id: 'middle_name',     label: 'Middle name (if any)',                   hint: 'Leave blank if none.',                                     type: 'text',   required: false, pdfFieldMapping: 'Part2_Line1_MiddleName[0]' },
          { id: 'other_names',     label: 'Have you used any other names?',         hint: 'Include maiden names and aliases.',                        type: 'yes_no', required: true,  pdfFieldMapping: 'Part2_Line2_FamilyName1[0]' },
          { id: 'other_family1',   label: 'Other name — family name',               hint: '',                                                         type: 'text',   required: true,  pdfFieldMapping: 'Part2_Line2_FamilyName1[0]', condition: { field: 'other_names', value: 'yes' } },
          { id: 'other_given1',    label: 'Other name — given name',                hint: '',                                                         type: 'text',   required: true,  pdfFieldMapping: 'Part2_Line2_GivenName1[0]',  condition: { field: 'other_names', value: 'yes' } },
          { id: 'dob',             label: 'Date of birth',                          hint: 'MM/DD/YYYY',                                               type: 'date',   required: true,  pdfFieldMapping: 'Part2_Line9_DateOfBirth[0]' },
          { id: 'sex',             label: 'Sex',                                    hint: '',                                                         type: 'select', required: true,  pdfFieldMapping: 'Part2_Line8_Gender[1]', options: ['Male', 'Female'] },
          { id: 'country_birth',   label: 'Country of birth',                       hint: 'Use the current country name.',                            type: 'text',   required: true,  pdfFieldMapping: 'Part2_Line6_CountryOfBirth[0]' },
          { id: 'country_citizen', label: 'Country of citizenship or nationality',  hint: '',                                                         type: 'text',   required: true,  pdfFieldMapping: 'Part2_Line7_CountryOfCitizenshiporNationality[0]' },
          { id: 'alien_number',    label: 'Alien Registration Number (A-Number)',   hint: 'Starts with "A" — 8 or 9 digits.',                        type: 'text',   required: true,  pdfFieldMapping: 'Part2_Line5_AlienNumber[0]' },
          { id: 'uscis_account',   label: 'USCIS Online Account Number (if any)',   hint: '12-digit number. Leave blank if none.',                    type: 'text',   required: false, pdfFieldMapping: 'Part2_Line11_USCISOnlineAcctNumber[0]' },
          { id: 'ssn',             label: 'Social Security Number (if any)',         hint: 'Leave blank if not issued.',                               type: 'text',   required: false, pdfFieldMapping: 'Part2_Line10_SSN[0]' },
          { id: 'class_of_admission', label: 'Class of admission (visa type)',      hint: 'e.g., IR1, LPR, RE, AS. Found on your Green Card or I-94.', type: 'text', required: false, pdfFieldMapping: 'Part2_Line12_ClassofAdmission[0]' },
          { id: 'i94_number',      label: 'I-94 Arrival/Departure Record Number',   hint: 'Find it at i94.cbp.dhs.gov.',                             type: 'text',   required: false, pdfFieldMapping: 'Part2_Line13_I94RecordNo[0]' },
        ],
      },
      {
        id: 'address',
        title: 'Your Address',
        questions: [
          { id: 'street_address',  label: 'Current mailing street address',   hint: 'Street number and name. No apt number here.',     type: 'text', required: true,  pdfFieldMapping: 'Part2_Line3_StreetNumberName[0]' },
          { id: 'apt_number',      label: 'Apt/Ste/Flr number (if any)',      hint: 'Leave blank if not applicable.',                  type: 'text', required: false, pdfFieldMapping: 'Part2_Line3_AptSteFlrNumber[0]' },
          { id: 'city',            label: 'City or town',                     hint: '',                                                type: 'text', required: true,  pdfFieldMapping: 'Part2_Line3_CityTown[0]' },
          { id: 'state',           label: 'State',                            hint: 'Two-letter abbreviation.',                       type: 'text', required: true,  pdfFieldMapping: 'Part2_Line3_State[0]' },
          { id: 'zip',             label: 'ZIP code',                         hint: '',                                                type: 'text', required: true,  pdfFieldMapping: 'Part2_Line3_ZipCode[0]' },
          { id: 'phone',           label: 'Daytime phone number',             hint: 'Include area code.',                             type: 'text', required: true,  pdfFieldMapping: 'Part10_Line1_DayPhone[0]' },
          { id: 'mobile_phone',    label: 'Mobile phone number (if any)',     hint: '',                                                type: 'text', required: false, pdfFieldMapping: 'Part10_Line2_MobilePhone[0]' },
          { id: 'email',           label: 'Email address',                    hint: '',                                                type: 'text', required: false, pdfFieldMapping: 'Part10_Line3_Email[0]' },
        ],
      },
      {
        id: 'travel_document',
        title: 'Travel Document Type',
        questions: [
          { id: 'travel_purpose',   label: 'Why do you need to travel outside the U.S.?',    hint: 'Be specific — USCIS evaluates the necessity of your travel.', type: 'textarea', required: true, pdfFieldMapping: 'P7_Line3_ListCountries[0]' },
          { id: 'travel_countries', label: 'Which countries do you plan to visit?',           hint: 'List all countries you intend to travel to.',                type: 'text',     required: true, pdfFieldMapping: 'P7_Line3_ListCountries[0]' },
          { id: 'depart_date',      label: 'Expected date of departure from the U.S.',        hint: 'MM/DD/YYYY — approximate is fine.',                          type: 'date',     required: false, pdfFieldMapping: 'P7_Line1_DateOfDeparture[0]' },
          { id: 'trip_duration',    label: 'How long do you plan to be outside the U.S.?',   hint: 'For example: 3 weeks, 2 months.',                            type: 'text',     required: true, pdfFieldMapping: 'P7_Line5_ExpectedLengthTrip[0]' },
        ],
      },
      {
        id: 'status_info',
        title: 'Your Immigration Status',
        questions: [
          { id: 'last_entry_date', label: 'Date you last entered the United States',            hint: 'MM/DD/YYYY — check your passport entry stamp.',  type: 'date',   required: true,  pdfFieldMapping: 'P1_Line12_DateOfAdmission[0]' },
          { id: 'prior_travel_doc', label: 'Have you previously been issued a travel document?', hint: 'Include advance paroles, refugee travel docs, reentry permits.', type: 'yes_no', required: true, pdfFieldMapping: '' },
          { id: 'prior_doc_number', label: 'Previous travel document number',                    hint: 'Leave blank if none.',                           type: 'text',   required: false, pdfFieldMapping: 'P4_Line6b_ReceiptNumber[0]', condition: { field: 'prior_travel_doc', value: 'yes' } },
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
// FIELD MAP — wizard question IDs → XFA field short names
// Coordinates are fetched live from pdfjs getFieldObjects() at fill time
// ─────────────────────────────────────────────
const FIELD_DRAW_MAP = {
  'I-90': {
    // Part 1 — biographic info
    alien_number:       [{ f: 'P1_Line1_AlienNumber[0]',         t: 'text' }],
    uscis_account:      [{ f: 'P1_Line2_AcctIdentifier[0]',      t: 'text' }],
    family_name:        [{ f: 'P1_Line3a_FamilyName[0]',         t: 'text' }],
    given_name:         [{ f: 'P1_Line3b_GivenName[0]',          t: 'text' }],
    middle_name:        [{ f: 'P1_Line3c_MiddleName[0]',         t: 'text' }],
    other_family:       [{ f: 'P1_Line5a_FamilyName[0]',         t: 'text' }],
    other_given:        [{ f: 'P1_Line5b_GivenName[0]',          t: 'text' }],
    other_middle:       [{ f: 'P1_Line5c_MiddleName[0]',         t: 'text' }],
    // Mailing address
    street_address:     [{ f: 'P1_Line6b_StreetNumberName[0]',   t: 'text' }],
    apt_number:         [{ f: 'P1_Line6c_AptSteFlrNumber[0]',    t: 'text' }],
    city:               [{ f: 'P1_Line6d_CityOrTown[0]',         t: 'text' }],
    state:              [{ f: 'P1_Line6e_State[0]',              t: 'text' }],
    zip:                [{ f: 'P1_Line6f_ZipCode[0]',            t: 'text' }],
    // Physical address (if different)
    phys_street:        [{ f: 'P1_Line7a_StreetNumberName[0]',   t: 'text' }],
    phys_apt:           [{ f: 'P1_Line7b_AptSteFlrNumber[0]',    t: 'text' }],
    phys_city:          [{ f: 'P1_Line7c_CityOrTown[0]',         t: 'text' }],
    phys_state:         [{ f: 'P1_Line7d_State[0]',              t: 'text' }],
    phys_zip:           [{ f: 'P1_Line7e_ZipCode[0]',            t: 'text' }],
    // Part 1 continued (page 2)
    sex: [
      { f: 'P1_Line8_male[0]',   t: 'check', when: 'Male'   },
      { f: 'P1_Line8_female[0]', t: 'check', when: 'Female' },
    ],
    dob:                [{ f: 'P1_Line9_DateOfBirth[0]',         t: 'text' }],
    city_of_birth:      [{ f: 'P1_Line10_CityTownOfBirth[0]',   t: 'text' }],
    country_birth:      [{ f: 'P1_Line11_CountryofBirth[0]',     t: 'text' }],
    mother_name:        [{ f: 'P1_Line12_MotherGivenName[0]',    t: 'text' }],
    father_name:        [{ f: 'P1_Line13_FatherGivenName[0]',    t: 'text' }],
    class_of_admission: [{ f: 'P1_Line14_ClassOfAdmission[0]',   t: 'text' }],
    date_of_admission:  [{ f: 'P1_Line15_DateOfAdmission[0]',    t: 'text' }],
    ssn:                [{ f: 'P1_Line16_SSN[0]',                t: 'text' }],
    // Part 2 — replacement reason (right column page 1, sorted top→bottom)
    replace_reason: [
      { f: 'P2_checkbox2[5]', t: 'check', when: 'My card was lost, stolen, or destroyed' },
      { f: 'P2_checkbox2[6]', t: 'check', when: 'My existing card has been mutilated or damaged' },
      { f: 'P2_checkbox2[7]', t: 'check', when: 'My card was issued with incorrect information (my error)' },
      { f: 'P2_checkbox2[4]', t: 'check', when: 'My name or other biographic information changed' },
      { f: 'P2_checkbox2[0]', t: 'check', when: 'My 10-year card will expire within 6 months or has expired' },
      { f: 'P2_checkbox2[1]', t: 'check', when: 'My 2-year conditional card will expire within 6 months or has expired' },
      { f: 'P2_checkbox2[8]', t: 'check', when: 'I never received my previous card (USCIS error)' },
      { f: 'P2_checkbox3[0]', t: 'check', when: 'I am removing conditions on my permanent residence' },
    ],
    // Part 3 — processing info
    visa_location:  [{ f: 'P3_Line1_LocationAppliedVisa[0]', t: 'text' }],
    visa_issued:    [{ f: 'P3_Line2_LocationIssuedVisa[0]',  t: 'text' }],
    height_ft:      [{ f: 'P3_Line8_HeightFeet[0]',          t: 'text' }],
    height_in:      [{ f: 'P3_Line8_HeightInches[0]',        t: 'text' }],
    // Weight — form has 3 individual digit boxes; write full number into first box
    weight:         [{ f: 'P3_Line9_HeightInches1[0]',       t: 'text' }],
    // Eye color checkboxes (page 2, P3_checkbox10, 9 options, order: top-left→bottom-right)
    // Row1(y≈486): [6]=Black [0]=Blue [5]=Brown  Row2(y≈471): [8]=Gray [1]=Green [2]=Hazel  Row3(y≈456): [4]=Maroon [3]=Pink [7]=Unknown
    eye_color: [
      { f: 'P3_checkbox10[6]', t: 'check', when: 'Black' },
      { f: 'P3_checkbox10[0]', t: 'check', when: 'Blue' },
      { f: 'P3_checkbox10[5]', t: 'check', when: 'Brown' },
      { f: 'P3_checkbox10[8]', t: 'check', when: 'Gray' },
      { f: 'P3_checkbox10[1]', t: 'check', when: 'Green' },
      { f: 'P3_checkbox10[2]', t: 'check', when: 'Hazel' },
      { f: 'P3_checkbox10[4]', t: 'check', when: 'Maroon' },
      { f: 'P3_checkbox10[3]', t: 'check', when: 'Pink/Multi-Colored' },
      { f: 'P3_checkbox10[7]', t: 'check', when: 'Unknown/Other' },
    ],
    // Hair color checkboxes (page 2, P3_checkbox11, 9 options, order: top-left→bottom-right)
    // Row1(y≈420): [0]=Bald [8]=Black [1]=Blond  Row2(y≈405): [7]=Brown [2]=Gray [6]=Red  Row3(y≈390): [3]=Sandy [5]=White [4]=Unknown
    hair_color: [
      { f: 'P3_checkbox11[0]', t: 'check', when: 'Bald (no hair)' },
      { f: 'P3_checkbox11[8]', t: 'check', when: 'Black' },
      { f: 'P3_checkbox11[1]', t: 'check', when: 'Blond/Yellow' },
      { f: 'P3_checkbox11[7]', t: 'check', when: 'Brown' },
      { f: 'P3_checkbox11[2]', t: 'check', when: 'Gray/Partially Gray' },
      { f: 'P3_checkbox11[6]', t: 'check', when: 'Red/Auburn' },
      { f: 'P3_checkbox11[3]', t: 'check', when: 'Sandy' },
      { f: 'P3_checkbox11[5]', t: 'check', when: 'White' },
      { f: 'P3_checkbox11[4]', t: 'check', when: 'Unknown/Other' },
    ],
    // Ethnicity (P3_checkbox6): [1]=Hispanic [0]=Not Hispanic
    ethnicity: [
      { f: 'P3_checkbox6[1]', t: 'check', when: 'Hispanic or Latino' },
      { f: 'P3_checkbox6[0]', t: 'check', when: 'Not Hispanic or Latino' },
    ],
    // Race (named fields)
    race: [
      { f: 'P3_checkbox7_White[0]',    t: 'check', when: 'White' },
      { f: 'P3_checkbox7_Asian[0]',    t: 'check', when: 'Asian' },
      { f: 'P3_checkbox7_Black[0]',    t: 'check', when: 'Black or African American' },
      { f: 'P3_checkbox7_Indian[0]',   t: 'check', when: 'American Indian or Alaska Native' },
      { f: 'P3_checkbox7_Hawaiian[0]', t: 'check', when: 'Native Hawaiian or Other Pacific Islander' },
    ],
    // Contact info (page 4)
    daytime_phone: [{ f: 'P5_Line3_DaytimePhoneNumber[0]', t: 'text' }],
    mobile_phone:  [{ f: 'P5_Line4_MobilePhoneNumber[0]',  t: 'text' }],
    email:         [{ f: 'P5_Line5_EmailAddress[0]',       t: 'text' }],
  },

  'N-400': {
    // Part 2 — name & bio
    family_name:     [{ f: 'P2_Line1_FamilyName[0]',                        t: 'text' }],
    given_name:      [{ f: 'P2_Line1_GivenName[0]',                         t: 'text' }],
    middle_name:     [{ f: 'P2_Line1_MiddleName[0]',                        t: 'text' }],
    new_family_name: [{ f: 'Part2Line3_FamilyName[0]',                      t: 'text' }],
    new_given_name:  [{ f: 'Part2Line4a_GivenName[0]',                      t: 'text' }],
    other_family1:   [{ f: 'Line2_FamilyName1[0]',                          t: 'text' }],
    other_given1:    [{ f: 'Line3_GivenName1[0]',                           t: 'text' }],
    alien_number:    [{ f: 'Line1_AlienNumber[0]',                          t: 'text' }],
    uscis_account:   [{ f: 'P2_Line6_USCISELISAcctNumber[0]',               t: 'text' }],
    ssn:             [{ f: 'Line12b_SSN[0]',                                t: 'text' }],
    dob:             [{ f: 'P2_Line8_DateOfBirth[0]',                       t: 'text' }],
    sex: [
      { f: 'P2_Line7_Gender[0]', t: 'check', when: 'Male'   },
      { f: 'P2_Line7_Gender[1]', t: 'check', when: 'Female' },
    ],
    country_birth:   [{ f: 'P2_Line10_CountryOfBirth[0]',                   t: 'text' }],
    country_citizen: [{ f: 'P2_Line11_CountryOfNationality[0]',             t: 'text' }],
    pr_date:         [{ f: 'P2_Line9_DateBecamePermanentResident[0]',       t: 'text' }],
    // Part 4 — address (page 2)
    street_address:  [{ f: 'P4_Line1_StreetName[0]',                        t: 'text' }],
    city:            [{ f: 'P4_Line1_City[0]',                              t: 'text' }],
    state:           [{ f: 'P4_Line1_State[0]',                             t: 'text' }],
    zip:             [{ f: 'P4_Line1_ZipCode[0]',                           t: 'text' }],
    // Contact (page 10)
    phone:           [{ f: 'P12_Line3_Telephone[0]',                        t: 'text' }],
    mobile_phone:    [{ f: 'P12_Line3_Mobile[0]',                           t: 'text' }],
    email:           [{ f: 'P12_Line5_Email[0]',                            t: 'text' }],
    // Travel trips (page 5)
    trip1_left:      [{ f: 'P8_Line1_DateLeft1[0]',                         t: 'text' }],
    trip1_returned:  [{ f: 'P8_Line1_DateReturn1[0]',                       t: 'text' }],
    trip2_left:      [{ f: 'P8_Line1_DateLeft2[0]',                         t: 'text' }],
    trip2_returned:  [{ f: 'P8_Line1_DateReturn2[0]',                       t: 'text' }],
    trip3_left:      [{ f: 'P8_Line1_DateLeft3[0]',                         t: 'text' }],
    trip3_returned:  [{ f: 'P8_Line1_DateReturn3[0]',                       t: 'text' }],
    // Marital status (page 3)
    times_married:   [{ f: 'Part9Line3_TimesMarried[0]',                    t: 'text' }],
    marital_status: [
      { f: 'P10_Line1_MaritalStatus[1]', t: 'check', when: 'Single (never married)' },
      { f: 'P10_Line1_MaritalStatus[3]', t: 'check', when: 'Married'                },
      { f: 'P10_Line1_MaritalStatus[0]', t: 'check', when: 'Divorced'               },
      { f: 'P10_Line1_MaritalStatus[2]', t: 'check', when: 'Widowed'                },
      { f: 'P10_Line1_MaritalStatus[5]', t: 'check', when: 'Separated'              },
    ],
    spouse_family:        [{ f: 'P10_Line4a_FamilyName[0]',                 t: 'text' }],
    spouse_given:         [{ f: 'P10_Line4a_GivenName[0]',                  t: 'text' }],
    spouse_middle:        [{ f: 'P10_Line4a_MiddleName[0]',                  t: 'text' }],
    spouse_dob:           [{ f: 'P10_Line4d_DateofBirth[0]',                t: 'text' }],
    spouse_marriage_date: [{ f: 'P10_Line4e_DateEnterMarriage[0]',          t: 'text' }],
    // Employment (page 4)
    employer_name:  [{ f: 'P7_EmployerName1[0]',                            t: 'text' }],
    employer_city:  [{ f: 'P7_City1[0]',                                    t: 'text' }],
    employer_state: [{ f: 'P7_State1[0]',                                   t: 'text' }],
    occupation:     [{ f: 'P7_OccupationFieldStudy1[0]',                    t: 'text' }],
  },

  'I-131': {
    // Part 2 — applicant info (pages 3-4)
    family_name:     [{ f: 'Part2_Line1_FamilyName[0]',                               t: 'text' }],
    given_name:      [{ f: 'Part2_Line1_GivenName[0]',                                t: 'text' }],
    middle_name:     [{ f: 'Part2_Line1_MiddleName[0]',                               t: 'text' }],
    other_family1:   [{ f: 'Part2_Line2_FamilyName1[0]',                              t: 'text' }],
    other_given1:    [{ f: 'Part2_Line2_GivenName1[0]',                               t: 'text' }],
    alien_number:    [{ f: 'Part2_Line5_AlienNumber[0]',                              t: 'text' }],
    uscis_account:   [{ f: 'Part2_Line11_USCISOnlineAcctNumber[0]',                   t: 'text' }],
    ssn:             [{ f: 'Part2_Line10_SSN[0]',                                     t: 'text' }],
    dob:             [{ f: 'Part2_Line9_DateOfBirth[0]',                              t: 'text' }],
    sex: [
      { f: 'Part2_Line8_Gender[1]', t: 'check', when: 'Male'   },
      { f: 'Part2_Line8_Gender[0]', t: 'check', when: 'Female' },
    ],
    country_birth:      [{ f: 'Part2_Line6_CountryOfBirth[0]',                        t: 'text' }],
    country_citizen:    [{ f: 'Part2_Line7_CountryOfCitizenshiporNationality[0]',     t: 'text' }],
    class_of_admission: [{ f: 'Part2_Line12_ClassofAdmission[0]',                     t: 'text' }],
    i94_number:         [{ f: 'Part2_Line13_I94RecordNo[0]',                          t: 'text' }],
    // Address (page 4)
    street_address:  [{ f: 'Part2_Line3_StreetNumberName[0]',                         t: 'text' }],
    apt_number:      [{ f: 'Part2_Line3_AptSteFlrNumber[0]',                          t: 'text' }],
    city:            [{ f: 'Part2_Line3_CityTown[0]',                                 t: 'text' }],
    state:           [{ f: 'Part2_Line3_State[0]',                                    t: 'text' }],
    zip:             [{ f: 'Part2_Line3_ZipCode[0]',                                  t: 'text' }],
    // Contact (page 10)
    phone:           [{ f: 'Part10_Line1_DayPhone[0]',                                t: 'text' }],
    mobile_phone:    [{ f: 'Part10_Line2_MobilePhone[0]',                             t: 'text' }],
    email:           [{ f: 'Part10_Line3_Email[0]',                                   t: 'text' }],
    // Travel (page 9)
    travel_countries:[{ f: 'P7_Line3_ListCountries[0]',                               t: 'text' }],
    depart_date:     [{ f: 'P7_Line1_DateOfDeparture[0]',                             t: 'text' }],
    trip_duration:   [{ f: 'P7_Line5_ExpectedLengthTrip[0]',                          t: 'text' }],
    // Status (page 3)
    last_entry_date: [{ f: 'P1_Line12_DateOfAdmission[0]',                            t: 'text' }],
    prior_doc_number:[{ f: 'P4_Line6b_ReceiptNumber[0]',                              t: 'text' }],
  },
}

// ─────────────────────────────────────────────
// XFA FILL — render USCIS PDF pages to canvas, overlay user answers
// Returns Uint8Array of the filled PDF bytes
// ─────────────────────────────────────────────
async function fillUSCISPDF(form, answers) {
  // Fetch official USCIS PDF from same-origin /forms/ (no CORS)
  const resp = await fetch(`/forms/${form.formId}.pdf`)
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${form.formId}.pdf`)
  const pdfBytes = await resp.arrayBuffer()

  // Load with pdfjs to render pages and get field coordinates
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes), verbosity: 0 })
  const pdfDoc = await loadingTask.promise
  const numPages = pdfDoc.numPages

  // Build short-name → [{page, rect}] lookup from getFieldObjects()
  const rawFields = (await pdfDoc.getFieldObjects()) || {}
  const fieldCoords = {}
  for (const [key, val] of Object.entries(rawFields)) {
    const short = key.includes('.') ? key.split('.').pop() : key
    const arr = Array.isArray(val) ? val : [val]
    fieldCoords[short] = arr.map(a => ({ page: a.page, rect: a.rect }))
  }

  // Create output pdf-lib document
  const newDoc = await PDFDocument.create()
  const helv   = await newDoc.embedFont(StandardFonts.Helvetica)

  // Render each PDF page to canvas at 1.5× for quality, embed as JPEG
  const SCALE = 1.5
  for (let pn = 1; pn <= numPages; pn++) {
    const pdfPage = await pdfDoc.getPage(pn)
    const vp     = pdfPage.getViewport({ scale: SCALE })
    const origVp = pdfPage.getViewport({ scale: 1.0 })

    const canvas = document.createElement('canvas')
    canvas.width  = Math.round(vp.width)
    canvas.height = Math.round(vp.height)
    await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
    pdfPage.cleanup()

    // JPEG for compact file size (form background renders well)
    const dataUrl  = canvas.toDataURL('image/jpeg', 0.90)
    const imgBytes = await fetch(dataUrl).then(r => r.arrayBuffer())
    const embImg   = await newDoc.embedJpg(imgBytes)

    const libPage = newDoc.addPage([origVp.width, origVp.height])
    libPage.drawImage(embImg, { x: 0, y: 0, width: origVp.width, height: origVp.height })
  }

  await pdfDoc.destroy()

  // Overlay user answers at exact field coordinates
  const drawMap  = FIELD_DRAW_MAP[form.formId] || {}
  const libPages = newDoc.getPages()

  for (const [qId, actions] of Object.entries(drawMap)) {
    const val = answers[qId]
    if (val == null || String(val).trim() === '') continue

    for (const action of actions) {
      const coords = fieldCoords[action.f]
      if (!coords) continue

      for (const { page: pageIdx, rect } of coords) {
        if (!rect || pageIdx == null || pageIdx >= libPages.length) continue
        const libPage = libPages[pageIdx]
        const [x1, y1, x2, y2] = rect
        const fw = x2 - x1
        const fh = y2 - y1

        if (action.t === 'text') {
          const fs = Math.min(9, fh * 0.70)
          libPage.drawText(String(val), {
            x: x1 + 2,
            y: y1 + Math.max(1, (fh - fs) / 2),
            size: fs,
            font: helv,
            color: rgb(0.04, 0.04, 0.36),
            maxWidth: fw - 4,
          })
        } else if (action.t === 'check' && action.when === String(val)) {
          // Filled square checkmark
          const sz = Math.min(fw, fh) * 0.55
          const cx = (x1 + x2) / 2
          const cy = (y1 + y2) / 2
          libPage.drawRectangle({
            x: cx - sz / 2, y: cy - sz / 2,
            width: sz, height: sz,
            color: rgb(0.04, 0.04, 0.36),
          })
        }
      }
    }
  }

  return newDoc.save()
}

// ─────────────────────────────────────────────
// PDF GENERATION — professional reference document (fallback)
// ─────────────────────────────────────────────
async function generateFormPDF(form, answers) {
  const pdfDoc = await PDFDocument.create()
  const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const PW = 612, PH = 792, M = 50
  const CW = PW - M * 2

  const NAVY  = rgb(14/255,  39/255,  70/255)
  const AMBER = rgb(245/255, 158/255, 11/255)
  const WHITE = rgb(1, 1, 1)
  const DARK  = rgb(0.15, 0.15, 0.15)
  const MID   = rgb(0.45, 0.45, 0.45)
  const LIGHT = rgb(0.92, 0.92, 0.92)
  const AMBER_BG = rgb(1, 0.98, 0.93)

  // ── multiline text helper ──────────────────
  // Returns lines split to fit maxChars per line
  const wrapText = (text, maxChars) => {
    if (!text) return ['']
    const words = String(text).split(' ')
    const lines = []
    let current = ''
    for (const w of words) {
      if ((current + ' ' + w).trim().length > maxChars) {
        if (current) lines.push(current.trim())
        current = w
      } else {
        current = current ? current + ' ' + w : w
      }
    }
    if (current) lines.push(current.trim())
    return lines.length ? lines : ['']
  }

  // ── page management ────────────────────────
  let page = null
  let y = 0
  const allPages = []

  const newPage = (isFirst = false) => {
    page = pdfDoc.addPage([PW, PH])
    allPages.push(page)
    y = PH - M

    if (!isFirst) {
      // Continuation header
      page.drawRectangle({ x: 0, y: PH - 26, width: PW, height: 26, color: NAVY })
      page.drawText('FORMPATH', { x: M, y: PH - 17, size: 8, font: fontBold, color: AMBER })
      page.drawText(`  ${form.formId} — ${form.shortTitle} (continued)`,
        { x: M + 55, y: PH - 17, size: 8, font: fontReg, color: WHITE })
      y = PH - 38
    }
  }

  const ensureSpace = (needed) => {
    if (y - needed < M + 40) newPage()
  }

  // ══════════════════════════════════════════
  // PAGE 1 — Hero header
  // ══════════════════════════════════════════
  newPage(true)

  // Navy header band
  page.drawRectangle({ x: 0, y: PH - 90, width: PW, height: 90, color: NAVY })

  // Top row: brand
  page.drawText('FORMPATH', { x: M, y: PH - 22, size: 11, font: fontBold, color: AMBER })
  page.drawText('Immigration Form Assistant', { x: M + 88, y: PH - 22, size: 9, font: fontReg, color: rgb(0.65, 0.78, 0.95) })

  // Date
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  page.drawText(`Generated: ${dateStr}`,
    { x: PW - M - 130, y: PH - 22, size: 7.5, font: fontReg, color: rgb(0.55, 0.68, 0.85) })

  // Form ID + title
  page.drawText(form.formId,
    { x: M, y: PH - 54, size: 26, font: fontBold, color: WHITE })
  const titleX = M + fontBold.widthOfTextAtSize(form.formId, 26) + 12
  page.drawText(form.title,
    { x: titleX, y: PH - 54, size: 12, font: fontReg, color: rgb(0.8, 0.88, 1), maxWidth: PW - titleX - M })

  // Filing info strip
  page.drawText(`Filing fee: ${form.filingFee}   |   Est. completion: ${form.estimatedTime}   |   Difficulty: ${form.difficulty}`,
    { x: M, y: PH - 76, size: 8, font: fontReg, color: rgb(0.55, 0.68, 0.85) })

  y = PH - 104

  // ── Instruction banner ────────────────────
  const bannerH = 58
  page.drawRectangle({ x: M, y: y - bannerH, width: CW, height: bannerH,
    color: AMBER_BG, borderColor: AMBER, borderWidth: 1.5 })
  page.drawText('HOW TO USE THIS DOCUMENT', { x: M + 10, y: y - 14, size: 8, font: fontBold, color: AMBER })
  page.drawText('These are your answers, ready to transfer into the official USCIS form.',
    { x: M + 10, y: y - 26, size: 8.5, font: fontReg, color: DARK, maxWidth: CW - 20 })
  page.drawText(`Download the official blank form at: uscis.gov/forms/${form.formId.toLowerCase()}`,
    { x: M + 10, y: y - 38, size: 8.5, font: fontReg, color: DARK, maxWidth: CW - 20 })
  page.drawText('IMPORTANT: This FormPath summary is NOT the official USCIS form. File the official form with USCIS.',
    { x: M + 10, y: y - 50, size: 7.5, font: fontBold, color: rgb(0.6, 0.15, 0.1), maxWidth: CW - 20 })

  y -= bannerH + 14

  // ══════════════════════════════════════════
  // SECTIONS + Q&A
  // ══════════════════════════════════════════
  for (const section of form.sections) {
    const visibleQs = section.questions.filter(q => {
      if (!q.condition) return true
      return answers[q.condition.field] === q.condition.value
    })
    if (visibleQs.length === 0) continue

    ensureSpace(40)

    // Section header bar
    page.drawRectangle({ x: M, y: y - 22, width: CW, height: 22, color: NAVY })
    page.drawText(section.title.toUpperCase(),
      { x: M + 10, y: y - 14, size: 9, font: fontBold, color: WHITE })
    y -= 30

    for (const q of visibleQs) {
      const rawVal = answers[q.id]
      const isAnswered = rawVal !== undefined && String(rawVal).trim() !== ''

      // Format value
      let displayVal
      if (!isAnswered) {
        displayVal = q.required ? '(required — not answered)' : '(not answered)'
      } else if (rawVal === 'yes') {
        displayVal = 'Yes'
      } else if (rawVal === 'no') {
        displayVal = 'No'
      } else {
        displayVal = String(rawVal)
      }

      const labelWrapped = wrapText(q.label, 88)
      const valueWrapped = wrapText(displayVal, 75)
      const blockH = labelWrapped.length * 10 + valueWrapped.length * 13 + 20

      ensureSpace(blockH)

      // Question label (small gray)
      labelWrapped.forEach((ln, i) => {
        page.drawText(ln, { x: M + 10, y: y - 10 - i * 10, size: 7.5, font: fontReg, color: MID })
      })
      y -= labelWrapped.length * 10 + 4

      // Answer value (larger, bold if answered)
      if (!isAnswered) {
        page.drawText(displayVal,
          { x: M + 10, y: y - 11, size: 9.5, font: fontReg, color: rgb(0.65, 0.65, 0.65), maxWidth: CW - 20 })
      } else {
        valueWrapped.forEach((ln, i) => {
          page.drawText(ln, { x: M + 10, y: y - 11 - i * 13, size: 10.5, font: fontBold, color: DARK })
        })
      }
      y -= valueWrapped.length * 13 + 4

      // Hairline divider
      page.drawLine({
        start: { x: M + 10, y: y - 4 }, end: { x: M + CW - 10, y: y - 4 },
        thickness: 0.4, color: LIGHT,
      })
      y -= 12
    }

    y -= 8
  }

  // ══════════════════════════════════════════
  // FOOTER on all pages
  // ══════════════════════════════════════════
  const totalPages = allPages.length
  allPages.forEach((p, i) => {
    p.drawLine({
      start: { x: M, y: M + 26 }, end: { x: PW - M, y: M + 26 },
      thickness: 0.5, color: LIGHT,
    })
    p.drawText('Generated by FormPath — formpath.vercel.app',
      { x: M, y: M + 14, size: 7.5, font: fontReg, color: MID })
    p.drawText('This is a reference document only. Always file the official USCIS form.',
      { x: M, y: M + 5, size: 7, font: fontReg, color: rgb(0.65, 0.65, 0.65) })
    p.drawText(`Page ${i + 1} of ${totalPages}`,
      { x: PW - M - 46, y: M + 14, size: 7.5, font: fontReg, color: MID })
  })

  return pdfDoc.save()
}

// ─────────────────────────────────────────────
// COMPLETE / DOWNLOAD SCREEN
// ─────────────────────────────────────────────
function DownloadScreen({ state, dispatch, t }) {
  const { selectedForm: form, answers } = state
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleDownload = async () => {
    setStatus('loading')
    try {
      let pdfBytes
      let filename
      try {
        // Primary: render official USCIS form and overlay answers
        pdfBytes = await fillUSCISPDF(form, answers)
        filename = `${form.formId}_FormPath_Filled.pdf`
      } catch (fillErr) {
        console.warn('[FormPath] XFA fill failed, falling back to reference PDF:', fillErr)
        // Fallback: branded reference document with all answers
        pdfBytes = await generateFormPDF(form, answers)
        filename = `${form.formId}_FormPath_Answers.pdf`
      }
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      clearStorage(form.formId)
      setStatus('done')
    } catch (err) {
      console.error('[FormPath] PDF generation error:', err)
      setErrorMsg('PDF generation failed. Please try again.')
      setStatus('error')
    }
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
        <div className={`text-7xl mb-6 ${status !== 'loading' ? 'animate-bounce' : ''}`}>
          {status === 'loading' ? '⏳' : status === 'done' ? '✅' : status === 'error' ? '⚠️' : '🎉'}
        </div>
        <h1 className="text-4xl font-bold text-white mb-3" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
          {status === 'done' ? 'Download complete!' : t.formComplete}
        </h1>
        <p className="text-navy-300 text-lg mb-8 max-w-lg mx-auto">
          {status === 'loading'
            ? 'Rendering the official USCIS form and filling in your answers…'
            : status === 'done'
            ? `Your filled ${form.formId} is in your downloads folder. Review all fields before filing.`
            : status === 'error'
            ? errorMsg
            : `Download the official USCIS ${form.formId} with your answers pre-filled directly on the form.`}
        </p>

        {/* Primary download button */}
        <button
          onClick={handleDownload}
          disabled={status === 'loading' || status === 'done'}
          className={`btn-amber text-xl px-10 py-5 shadow-2xl shadow-amber-500/30 disabled:opacity-60 disabled:cursor-not-allowed ${status === 'loading' ? 'animate-pulse' : ''}`}
        >
          {status === 'loading'
            ? <><span className="inline-block animate-spin mr-2">⚙</span> Generating PDF…</>
            : status === 'done'
            ? <><Icon.Check /> Downloaded!</>
            : <><Icon.Download /> {t.downloadPDF}</>}
        </button>

        {status === 'done' && (
          <button onClick={handleDownload} className="block mx-auto mt-4 text-amber-300 hover:text-amber-200 text-sm underline underline-offset-2">
            Download again
          </button>
        )}

        {/* Info box */}
        <div className="mt-6 max-w-md mx-auto bg-navy-800/50 rounded-xl p-4 text-left border border-navy-600">
          <p className="text-amber-300 text-xs font-bold uppercase tracking-widest mb-2">What you'll get</p>
          <ul className="text-navy-200 text-xs space-y-1.5">
            <li>✔ The official USCIS {form.formId} form with your answers pre-filled</li>
            <li>✔ All key fields completed — name, address, dates, contact info</li>
            <li>✔ Ready to print and sign before mailing to USCIS</li>
          </ul>
          <p className="text-navy-400 text-xs mt-3">
            Review every field carefully before filing. Some supplemental fields may need to be filled manually.
          </p>
        </div>
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
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <p className="text-amber-800 font-semibold mb-3">📎 Official USCIS Resources</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`https://www.uscis.gov/sites/default/files/document/forms/${form.formId.toLowerCase()}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-400 transition-colors text-sm"
            >
              <Icon.Download /> Download Blank {form.formId} (official)
            </a>
            <a
              href={`https://www.uscis.gov/forms/${form.formId.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-amber-800 font-semibold rounded-xl border-2 border-amber-300 hover:bg-amber-50 transition-colors text-sm"
            >
              View instructions &amp; fees →
            </a>
          </div>
          <p className="text-amber-600 text-xs mt-3 text-center">Opens uscis.gov — the official U.S. government website</p>
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
