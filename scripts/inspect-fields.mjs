// Inspect AcroForm field names in the downloaded USCIS PDFs
// Run: node scripts/inspect-fields.mjs
import { PDFDocument } from 'pdf-lib'
import { readFileSync } from 'fs'

const forms = ['I-90', 'N-400', 'I-131']

for (const formId of forms) {
  const bytes = readFileSync(`public/forms/${formId}.pdf`)
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const pdfForm = pdfDoc.getForm()
  const fields = pdfForm.getFields()

  console.log(`\n${'='.repeat(60)}`)
  console.log(`  FORM ${formId}  —  ${fields.length} AcroForm fields found`)
  console.log('='.repeat(60))

  if (fields.length === 0) {
    console.log('  ⚠  No AcroForm fields detected — form is likely XFA-only.')
    console.log('     Will use overlay/fallback PDF generation.')
    continue
  }

  fields.forEach(f => {
    const type = f.constructor.name.replace('PDF', '')
    console.log(`  ${type.padEnd(18)} ${f.getName()}`)
  })
}
